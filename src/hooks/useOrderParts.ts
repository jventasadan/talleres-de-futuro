import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { OrderPartRow } from "@/types/database";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export type OrderPart = OrderPartRow;

export function useOrderParts(appointmentId: string) {
  return useQuery({
    queryKey: ["order_parts", appointmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_parts")
        .select("*")
        .eq("appointment_id", appointmentId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as OrderPart[];
    },
    enabled: !!appointmentId,
  });
}

export function useAddPart() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (part: Partial<OrderPart>) => {
      const { data, error } = await supabase
        .from("order_parts")
        .insert({ ...part, user_id: user?.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["order_parts"] });
      toast.success("Pieza añadida");
    },
    onError: (error) => {
      toast.error("Error: " + error.message);
    },
  });
}

export function useDeletePart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("order_parts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order_parts"] });
    },
  });
}
