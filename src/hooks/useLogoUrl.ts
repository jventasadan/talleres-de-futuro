import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "logos"; // storage bucket for workshop logos

export function useLogoUrl() {
  const { user } = useAuth();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Load existing logo_url from company_settings on mount / user change
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!user?.id) {
        setLogoUrl(null);
        return;
      }
      setIsLoading(true);
      try {
        let { data, error } = await (supabase as any)
          .from("company_settings")
          .select("logo_url")
          .eq("owner_user_id", user.id)
          .limit(1)
          .maybeSingle();

        if ((!data || error) && (!error || error.message?.includes("does not exist"))) {
          const res = await (supabase as any)
            .from("company_settings")
            .select("logo_url")
            .eq("user_id", user.id)
            .limit(1)
            .maybeSingle();
          data = res.data;
        }

        if (!cancelled) {
          setLogoUrl((data?.logo_url as string | null) ?? null);
        }
      } catch {
        if (!cancelled) setLogoUrl(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const updateCompanyLogoUrl = useCallback(
    async (url: string | null) => {
      if (!user?.id) throw new Error("No autenticado");

      // Find existing company_settings row (owner_user_id first, then user_id)
      let existingId: string | null = null;
      const { data: byOwner } = await (supabase as any)
        .from("company_settings")
        .select("id")
        .eq("owner_user_id", user.id)
        .limit(1)
        .maybeSingle();
      existingId = byOwner?.id ?? null;

      if (!existingId) {
        const { data: byUser } = await (supabase as any)
          .from("company_settings")
          .select("id")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();
        existingId = byUser?.id ?? null;
      }

      if (existingId) {
        const { error } = await (supabase as any)
          .from("company_settings")
          .update({ logo_url: url })
          .eq("id", existingId);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("company_settings")
          .insert({
            user_id: user.id,
            owner_user_id: user.id,
            logo_url: url,
          });
        if (error) throw error;
      }
    },
    [user?.id]
  );

  const saveLogo = useCallback(
    async (file: File | null) => {
      if (!user?.id) throw new Error("No autenticado");
      setIsLoading(true);
      try {
        const path = `${user.id}/logo`;

        if (file === null) {
          // Delete from storage and clear DB column
          const { error: removeError } = await supabase.storage
            .from(BUCKET)
            .remove([path]);
          if (removeError && !removeError.message?.toLowerCase().includes("not found")) {
            throw removeError;
          }
          await updateCompanyLogoUrl(null);
          setLogoUrl(null);
        } else {
          // Upload to storage and persist public URL
          const { error: uploadError } = await supabase.storage
            .from(BUCKET)
            .upload(path, file, {
              upsert: true,
              contentType: file.type || "image/png",
              cacheControl: "3600",
            });
          if (uploadError) throw uploadError;

          const { data: publicData } = supabase.storage
            .from(BUCKET)
            .getPublicUrl(path);

          // Append a cache-busting query param so the UI refreshes immediately
          const publicUrl = `${publicData.publicUrl}?v=${Date.now()}`;

          await updateCompanyLogoUrl(publicUrl);
          setLogoUrl(publicUrl);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [user?.id, updateCompanyLogoUrl]
  );

  return { logoUrl, saveLogo, isLoading };
}
