import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkshop } from "@/contexts/WorkshopContext";
import { toast } from "sonner";

export interface WorkOrderPart {
  id: string;
  work_order_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  total: number;
  created_at: string;
}

const db = supabase as any;

export function useWorkOrderParts(workOrderId: string | null) {
  const { workshopId } = useWorkshop();

  return useQuery({
    queryKey: ["work_order_parts", workOrderId, workshopId],
    queryFn: async () => {
      if (!workOrderId || !workshopId) return [];

      const { data, error } = await db
        .from("work_order_parts")
        .select("*")
        .eq("work_order_id", workOrderId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data ?? []) as WorkOrderPart[];
    },
    enabled: !!workOrderId && !!workshopId,
  });
}

export function useAddWorkOrderPart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (part: { work_order_id: string; name: string; quantity: number; unit_price: number }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await db
        .from("work_order_parts")
        .insert({
          work_order_id: part.work_order_id,
          name: part.name.trim(),
          quantity: part.quantity,
          unit_price: part.unit_price,
          user_id: user?.id ?? "",
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as WorkOrderPart;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work_order_parts"] });
      toast.success("Pieza añadida");
    },
    onError: (error: any) => {
      toast.error("Error al añadir pieza: " + (error?.message ?? "Error desconocido"));
    },
  });
}

export function useDeleteWorkOrderPart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("work_order_parts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work_order_parts"] });
      toast.success("Pieza eliminada");
    },
    onError: (error: any) => {
      toast.error("Error al eliminar pieza: " + (error?.message ?? "Error desconocido"));
    },
  });
}
