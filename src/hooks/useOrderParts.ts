import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface OrderPart {
  id: string;
  appointment_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  created_at?: string;
}

const db = supabase as any;

const isMissingTableError = (error: any) => String(error?.code ?? "") === "PGRST205";

const normalizePart = (row: Record<string, any>, appointmentId: string): OrderPart => ({
  id: String(row.id ?? crypto.randomUUID()),
  appointment_id: appointmentId,
  name: String(row.name ?? row.description ?? ""),
  quantity: Number(row.quantity ?? 1),
  unit_price: Number(row.unit_price ?? row.price ?? 0),
  created_at: row.created_at ? String(row.created_at) : undefined,
});

const ensureWorkOrder = async (appointmentId: string) => {
  const { data: existing, error: existingError } = await db
    .from("work_orders")
    .select("id, parts")
    .eq("appointment_id", appointmentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing?.id) return existing;

  const orderNumber = `ORD-${appointmentId.slice(0, 4).toUpperCase()}`;

  const { data, error } = await db
    .from("work_orders")
    .insert({
      appointment_id: appointmentId,
      description: "Orden generada automáticamente",
      status: "open",
      labor_hours: 0,
      parts: [],
      photos: [],
      pending_repair: [],
      invoice_created: false,
      order_number: orderNumber,
    })
    .select("id, parts")
    .maybeSingle();

  if (error) throw error;
  return data;
};

const getPartsFromWorkOrder = async (appointmentId: string): Promise<OrderPart[]> => {
  const { data, error } = await db
    .from("work_orders")
    .select("id, parts")
    .eq("appointment_id", appointmentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  const rawParts = Array.isArray(data?.parts) ? data.parts : [];
  return rawParts.map((part: Record<string, any>) => normalizePart(part, appointmentId));
};

export function useOrderParts(appointmentId: string) {
  return useQuery({
    queryKey: ["order_parts", appointmentId],
    queryFn: async () => {
      // RLS filters by workshop_id automatically
      const { data, error } = await db
        .from("order_parts")
        .select("*")
        .eq("appointment_id", appointmentId)
        .order("created_at", { ascending: true });

      if (!error) {
        return (data ?? []).map((row: Record<string, any>) => normalizePart(row, appointmentId));
      }

      if (!isMissingTableError(error)) throw error;
      return getPartsFromWorkOrder(appointmentId);
    },
    enabled: !!appointmentId,
  });
}

export function useAddPart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (part: Partial<OrderPart>) => {
      const appointmentId = String(part.appointment_id ?? "");
      if (!appointmentId) throw new Error("appointment_id es obligatorio");

      const payload = {
        appointment_id: appointmentId,
        name: String(part.name ?? "").trim(),
        quantity: Number(part.quantity ?? 1),
        unit_price: Number(part.unit_price ?? 0),
        // workshop_id is set automatically by DB trigger
      };

      const { data, error } = await db.from("order_parts").insert(payload).select("*").maybeSingle();
      if (!error) return normalizePart((data ?? payload) as Record<string, any>, appointmentId);
      if (!isMissingTableError(error)) throw error;

      const workOrder = await ensureWorkOrder(appointmentId);
      const currentParts = Array.isArray(workOrder?.parts) ? workOrder.parts : [];
      const nextPart = { id: crypto.randomUUID(), ...payload, created_at: new Date().toISOString() };

      const { error: updateError } = await db
        .from("work_orders")
        .update({ parts: [...currentParts, nextPart] })
        .eq("id", workOrder.id);

      if (updateError) throw updateError;
      return normalizePart(nextPart, appointmentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order_parts"] });
      toast.success("Pieza añadida");
    },
    onError: (error: any) => {
      toast.error("Error al añadir pieza: " + (error?.message ?? "Error desconocido"));
    },
  });
}

export function useDeletePart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, appointmentId }: { id: string; appointmentId: string }) => {
      const { error } = await db.from("order_parts").delete().eq("id", id);
      if (!error) return;
      if (!isMissingTableError(error)) throw error;

      const workOrder = await ensureWorkOrder(appointmentId);
      const currentParts = Array.isArray(workOrder?.parts) ? workOrder.parts : [];
      const nextParts = currentParts.filter((part: Record<string, any>) => String(part.id) !== id);

      const { error: updateError } = await db
        .from("work_orders")
        .update({ parts: nextParts })
        .eq("id", workOrder.id);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order_parts"] });
      toast.success("Pieza eliminada");
    },
    onError: (error: any) => {
      toast.error("Error al eliminar pieza: " + (error?.message ?? "Error desconocido"));
    },
  });
}
