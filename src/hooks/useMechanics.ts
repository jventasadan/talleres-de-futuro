import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export interface Mechanic {
  id: string;
  user_id: string;
  name: string;
  active: boolean;
  created_at: string;
}

export function useMechanics() {
  return useQuery({
    queryKey: ["mechanics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mechanics")
        .select("*")
        .eq("active", true)
        .order("name") as any;
      if (error) throw error;
      return (data ?? []) as Mechanic[];
    },
  });
}

export function useCreateMechanic() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from("mechanics")
        .insert({ name, user_id: user?.id ?? "" } as any)
        .select("*")
        .single();
      if (error) throw error;
      return data as unknown as Mechanic;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mechanics"] });
      toast.success("Mecánico añadido");
    },
    onError: (e: any) => toast.error("Error: " + e.message),
  });
}

export function useDeleteMechanic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("mechanics").delete().eq("id", id) as any;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mechanics"] });
      toast.success("Mecánico eliminado");
    },
    onError: (e: any) => toast.error("Error: " + e.message),
  });
}
