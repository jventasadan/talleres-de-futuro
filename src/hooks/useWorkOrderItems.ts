import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkshop } from "@/contexts/WorkshopContext";
import { toast } from "sonner";

export interface WorkOrderItem {
  id: string;
  work_order_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  total: number;
  item_type: string; // 'pieza' | 'mano_obra'
  created_at: string;
}

const db = supabase as any;

export function useWorkOrderItems(workOrderId: string | null) {
  const { workshopId } = useWorkshop();

  return useQuery({
    queryKey: ["work_order_items", workOrderId, workshopId],
    queryFn: async () => {
      if (!workOrderId || !workshopId) return [];

      const { data, error } = await db
        .from("work_order_items")
        .select("*")
        .eq("work_order_id", workOrderId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data ?? []) as WorkOrderItem[];
    },
    enabled: !!workOrderId && !!workshopId,
  });
}

export function useAddWorkOrderItem() {
  const queryClient = useQueryClient();
  const { workshopId } = useWorkshop();

  return useMutation({
    mutationFn: async (item: {
      work_order_id: string;
      description: string;
      quantity: number;
      unit_price: number;
      discount_percent?: number;
      item_type: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!workshopId) throw new Error("No se encontró el taller activo");

      // Validate description - NEVER allow null or empty
      const description = (item.description ?? "").trim();
      if (!description) {
        throw new Error(item.item_type === "mano_obra" ? "Descripción de mano de obra requerida" : "Selecciona una pieza");
      }

      const quantity = Math.max(0.01, Number(item.quantity) || 1);
      const unitPrice = Number(item.unit_price ?? 0);
      const discountPercent = Number(item.discount_percent ?? 0);
      const lineTotal = quantity * unitPrice;
      const discountAmount = lineTotal * (discountPercent / 100);
      const total = Number((lineTotal - discountAmount).toFixed(2));

      const { data, error } = await db
        .from("work_order_items")
        .insert({
          work_order_id: item.work_order_id,
          description,
          quantity,
          unit_price: unitPrice,
          discount_percent: discountPercent,
          total,
          item_type: item.item_type,
          user_id: user?.id ?? "",
          workshop_id: workshopId,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as WorkOrderItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work_order_items"] });
      toast.success("Item añadido");
    },
    onError: (error: any) => {
      toast.error("Error al añadir item: " + (error?.message ?? "Error desconocido"));
    },
  });
}

export function useDeleteWorkOrderItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("work_order_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work_order_items"] });
      toast.success("Item eliminado");
    },
    onError: (error: any) => {
      toast.error("Error al eliminar item: " + (error?.message ?? "Error desconocido"));
    },
  });
}
