import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export interface CompanySettings {
  id: string;
  user_id: string;
  owner_user_id: string;
  company_name: string;
  cif: string;
  address: string;
  city: string;
  postal_code: string;
  province: string;
  phone: string;
  email: string;
  labor_rate: number;
  default_vat: number;
  created_at: string;
  updated_at: string;
}

export function useCompanySettings() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["company_settings", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Try owner_user_id first, then fallback to user_id
      let { data, error } = await (supabase as any)
        .from("company_settings")
        .select("*")
        .eq("owner_user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (error && error.message?.includes("does not exist")) {
        // Column doesn't exist yet, fallback
        const res = await (supabase as any)
          .from("company_settings")
          .select("*")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();
        data = res.data;
        error = res.error;
      }

      if (!data && !error) {
        // Try user_id fallback
        const res = await (supabase as any)
          .from("company_settings")
          .select("*")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();
        data = res.data;
        error = res.error;
      }

      if (error) throw error;
      return data as CompanySettings | null;
    },
    enabled: !!user?.id,
  });
}

export function useSaveCompanySettings() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (settings: Partial<CompanySettings>) => {
      if (!user?.id) throw new Error("No autenticado");

      // Find existing record
      let existing: any = null;
      const { data: byOwner } = await (supabase as any)
        .from("company_settings")
        .select("id")
        .eq("owner_user_id", user.id)
        .limit(1)
        .maybeSingle();

      existing = byOwner;

      if (!existing) {
        const { data: byUser } = await (supabase as any)
          .from("company_settings")
          .select("id")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();
        existing = byUser;
      }

      if (existing?.id) {
        const { data, error } = await (supabase as any)
          .from("company_settings")
          .update({ ...settings, owner_user_id: user.id })
          .eq("id", existing.id)
          .eq("user_id", user.id)
          .select("*")
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await (supabase as any)
          .from("company_settings")
          .insert({ ...settings, user_id: user.id, owner_user_id: user.id })
          .select("*")
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company_settings"] });
      // Force WorkshopContext to re-evaluate
      window.dispatchEvent(new Event("workshop-settings-updated"));
      toast.success("Configuración guardada");
    },
    onError: (e: any) => toast.error("Error: " + e.message),
  });
}
