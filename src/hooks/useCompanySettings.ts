import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export interface CompanySettings {
  id: string;
  user_id: string;
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
      const { data, error } = await (supabase as any)
        .from("company_settings")
        .select("*")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

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
      const { data: existing } = await (supabase as any)
        .from("company_settings")
        .select("id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (existing?.id) {
        const { data, error } = await (supabase as any)
          .from("company_settings")
          .update(settings)
          .eq("id", existing.id)
          .select("*")
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await (supabase as any)
          .from("company_settings")
          .insert({ ...settings, user_id: user?.id ?? "" })
          .select("*")
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company_settings"] });
      toast.success("Configuración guardada");
    },
    onError: (e: any) => toast.error("Error: " + e.message),
  });
}
