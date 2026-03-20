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
  item_type: string;
  created_at: string;
}

const db = supabase as any;

const normalizeWorkOrderItem = (row: Record<string, any>): WorkOrderItem => ({
  id: String(row.id ?? ""),
  work_order_id: String(row.work_order_id ?? ""),
  description: String(row.description ?? row.descripcion ?? ""),
  quantity: Number(row.quantity ?? row.cantidad ?? 0),
  unit_price: Number(row.unit_price ?? row.precio_unitario ?? 0),
  discount_percent: Number(row.discount_percent ?? row.descuento ?? 0),
  total: Number(row.total ?? 0),
  item_type: String(row.item_type ?? row.tipo ?? "pieza"),
  created_at: String(row.created_at ?? ""),
});

const isLegacyWorkOrderItemsError = (error: any) => {
  const message = String(error?.message ?? "").toLowerCase();
  const details = String(error?.details ?? "").toLowerCase();

  return ["descripcion", "cantidad", "precio_unitario", "descuento", "tipo"].some((term) =>
    message.includes(term) || details.includes(term)
  );
};

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
      return (data ?? []).map((row: Record<string, any>) => normalizeWorkOrderItem(row));
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

      const description = (item.description ?? "").trim();
      if (!description) {
        throw new Error(item.item_type === "mano_obra" ? "Descripción de mano de obra requerida" : "Introduce o selecciona una pieza");
      }

      const quantity = Math.max(0.01, Number(item.quantity) || 1);
      const unitPrice = Number(item.unit_price ?? 0);
      const discountPercent = Number(item.discount_percent ?? 0);
      const lineTotal = quantity * unitPrice;
      const discountAmount = lineTotal * (discountPercent / 100);
      const total = Number((lineTotal - discountAmount).toFixed(2));

      const basePayload = {
        work_order_id: item.work_order_id,
        description,
        quantity,
        unit_price: unitPrice,
        discount_percent: discountPercent,
        total,
        item_type: item.item_type,
        user_id: user?.id ?? "",
        workshop_id: workshopId,
      };

      const primaryResult = await db
        .from("work_order_items")
        .insert(basePayload)
        .select("*")
        .single();

      if (!primaryResult.error) {
        return normalizeWorkOrderItem(primaryResult.data as Record<string, any>);
      }

      if (!isLegacyWorkOrderItemsError(primaryResult.error)) {
        throw primaryResult.error;
      }

      const legacyCompatiblePayload = {
        ...basePayload,
        descripcion: description,
        cantidad: quantity,
        precio_unitario: unitPrice,
        descuento: discountPercent,
        tipo: item.item_type,
      };

      const legacyResult = await db
        .from("work_order_items")
        .insert(legacyCompatiblePayload)
        .select("*")
        .single();

      if (legacyResult.error) throw legacyResult.error;
      return normalizeWorkOrderItem(legacyResult.data as Record<string, any>);
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
