import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export interface WorkshopSettings {
  id: string;
  user_id: string;
  workshop_name: string;
  cif: string;
  address: string;
  phone: string;
  email: string;
  labor_rate: number;
  created_at: string;
  updated_at: string;
}

export function useWorkshopSettings() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["workshop_settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workshop_settings")
        .select("*")
        .limit(1)
        .maybeSingle() as any;

      if (error) throw error;
      return data as WorkshopSettings | null;
    },
    enabled: !!user,
  });
}

export function useSaveWorkshopSettings() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (settings: Partial<WorkshopSettings>) => {
      // Check if settings already exist
      const { data: existing } = await supabase
        .from("workshop_settings")
        .select("id")
        .limit(1)
        .maybeSingle() as any;

      if (existing?.id) {
        const { data, error } = await supabase
          .from("workshop_settings")
          .update(settings as any)
          .eq("id", existing.id)
          .select("*")
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("workshop_settings")
          .insert({ ...settings, user_id: user?.id ?? "" } as any)
          .select("*")
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workshop_settings"] });
      toast.success("Configuración guardada");
    },
    onError: (e: any) => toast.error("Error: " + e.message),
  });
}
