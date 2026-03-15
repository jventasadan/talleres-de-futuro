import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface WorkshopContextType {
  workshopId: string | null;
  workshopReady: boolean;
  workshopComplete: boolean;
  loading: boolean;
}

const WorkshopContext = createContext<WorkshopContextType>({
  workshopId: null,
  workshopReady: false,
  workshopComplete: false,
  loading: true,
});

export const useWorkshop = () => useContext(WorkshopContext);

const REQUIRED_FIELDS = [
  "company_name",
  "cif",
  "phone",
  "email",
  "address",
  "city",
  "postal_code",
  "province",
] as const;

function isWorkshopComplete(settings: Record<string, any> | null): boolean {
  if (!settings) return false;
  return REQUIRED_FIELDS.every((f) => {
    const val = settings[f];
    return typeof val === "string" && val.trim().length > 0;
  });
}

export function WorkshopProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [workshopId, setWorkshopId] = useState<string | null>(null);
  const [workshopComplete, setWorkshopComplete] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setWorkshopId(null);
      setWorkshopComplete(false);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const ensureWorkshop = async () => {
      setLoading(true);

      try {
        // Check if workshop exists for this user
        const { data: existing, error: fetchError } = await (supabase as any)
          .from("company_settings")
          .select("*")
          .eq("owner_user_id", user.id)
          .limit(1)
          .maybeSingle();

        if (fetchError && !fetchError.message?.includes("does not exist")) {
          // Fallback: try with user_id
          const { data: fallback, error: fallbackError } = await (supabase as any)
            .from("company_settings")
            .select("*")
            .eq("user_id", user.id)
            .limit(1)
            .maybeSingle();

          if (!fallbackError && fallback) {
            if (cancelled) return;
            setWorkshopId(fallback.id);
            setWorkshopComplete(isWorkshopComplete(fallback));
            setLoading(false);
            return;
          }
        }

        if (existing) {
          if (cancelled) return;
          setWorkshopId(existing.id);
          setWorkshopComplete(isWorkshopComplete(existing));
          setLoading(false);
          return;
        }

        // No workshop found — try user_id fallback before creating
        const { data: byUserId } = await (supabase as any)
          .from("company_settings")
          .select("*")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();

        if (byUserId) {
          // Update owner_user_id if missing
          if (!byUserId.owner_user_id) {
            await (supabase as any)
              .from("company_settings")
              .update({ owner_user_id: user.id })
              .eq("id", byUserId.id);
          }
          if (cancelled) return;
          setWorkshopId(byUserId.id);
          setWorkshopComplete(isWorkshopComplete(byUserId));
          setLoading(false);
          return;
        }

        // Create new workshop record
        const { data: created, error: createError } = await (supabase as any)
          .from("company_settings")
          .insert({
            user_id: user.id,
            owner_user_id: user.id,
          })
          .select("*")
          .single();

        if (createError) {
          console.error("Error creating workshop:", createError);
          if (cancelled) return;
          setLoading(false);
          return;
        }

        if (cancelled) return;
        setWorkshopId(created.id);
        setWorkshopComplete(isWorkshopComplete(created));
      } catch (err) {
        console.error("Workshop init error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    ensureWorkshop();

    const handleSettingsUpdate = () => {
      cancelled = false;
      ensureWorkshop();
    };
    window.addEventListener("workshop-settings-updated", handleSettingsUpdate);

    return () => {
      cancelled = true;
      window.removeEventListener("workshop-settings-updated", handleSettingsUpdate);
    };
  }, [user?.id]);

  return (
    <WorkshopContext.Provider
      value={{
        workshopId,
        workshopReady: !!workshopId,
        workshopComplete,
        loading,
      }}
    >
      {children}
    </WorkshopContext.Provider>
  );
}
