import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWorkshop } from "@/contexts/WorkshopContext";

export interface CourtesyVehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
  km: string;
  assigned_client: string;
  delivery_date: string;
  return_date: string;
  status: string;
}

const db = supabase as any;

const isSchemaMismatchError = (error: any) => {
  const code = String(error?.code ?? "");
  const message = String(error?.message ?? "").toLowerCase();
  return code === "42703" || code === "PGRST204" || message.includes("does not exist") || message.includes("could not find") || message.includes("schema cache");
};

const extractMissingColumn = (error: any): string | null => {
  const message = String(error?.message ?? "");
  const pgrstMatch = message.match(/Could not find the '([^']+)' column/i);
  if (pgrstMatch?.[1]) return pgrstMatch[1];
  const pgMatch = message.match(/column\s+[\w.]+\.([a-zA-Z0-9_]+)\s+does not exist/i);
  if (pgMatch?.[1]) return pgMatch[1];
  return null;
};

const normalizeCourtesyVehicle = (row: Record<string, any>): CourtesyVehicle => ({
  id: String(row.id),
  plate: String(row.plate ?? ""),
  brand: String(row.brand ?? ""),
  model: String(row.model ?? ""),
  km: String(row.km ?? ""),
  assigned_client: String(row.assigned_client ?? ""),
  delivery_date: String(row.delivery_date ?? ""),
  return_date: String(row.return_date ?? ""),
  status: String(row.status ?? "disponible"),
});

const insertWithFallback = async (payload: Record<string, any>) => {
  let attemptPayload = { ...payload };
  let lastError: any;

  for (let i = 0; i < 10; i++) {
    const { data, error } = await db
      .from("substitution_vehicles")
      .insert(attemptPayload)
      .select("*")
      .maybeSingle();

    if (!error) return data;

    lastError = error;
    const missingColumn = extractMissingColumn(error);
    if (!isSchemaMismatchError(error) || !missingColumn || !(missingColumn in attemptPayload)) break;
    delete attemptPayload[missingColumn];
  }

  throw lastError;
};

const updateWithFallback = async (id: string, payload: Record<string, any>) => {
  let attemptPayload = { ...payload };
  let lastError: any;

  for (let i = 0; i < 10; i++) {
    const { data, error } = await db
      .from("substitution_vehicles")
      .update(attemptPayload)
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (!error) return data;

    lastError = error;
    const missingColumn = extractMissingColumn(error);
    if (!isSchemaMismatchError(error) || !missingColumn || !(missingColumn in attemptPayload)) break;
    delete attemptPayload[missingColumn];
  }

  throw lastError;
};

export function useCourtesyVehicles() {
  const { workshopId } = useWorkshop();

  return useQuery({
    queryKey: ["substitution_vehicles", workshopId],
    queryFn: async () => {
      if (!workshopId) return [];

      // Try with workshop_id, fallback without
      const { data: d1, error: e1 } = await db
        .from("substitution_vehicles")
        .select("*")
        .eq("workshop_id", workshopId)
        .order("plate", { ascending: true });

      if (!e1) return (d1 ?? []).map(normalizeCourtesyVehicle);

      if (isSchemaMismatchError(e1)) {
        const { data: d2, error: e2 } = await db
          .from("substitution_vehicles")
          .select("*")
          .order("plate", { ascending: true });
        if (!e2) return (d2 ?? []).map(normalizeCourtesyVehicle);
        if (isSchemaMismatchError(e2)) {
          const { data: d3, error: e3 } = await db
            .from("substitution_vehicles")
            .select("*");
          if (!e3) return (d3 ?? []).map(normalizeCourtesyVehicle);
          throw e3;
        }
        throw e2;
      }

      throw e1;
    },
    enabled: !!workshopId,
  });
}

export function useCreateCourtesyVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Omit<CourtesyVehicle, "id">) => {
      const data = await insertWithFallback({ ...payload });
      return normalizeCourtesyVehicle((data ?? payload) as Record<string, any>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["substitution_vehicles"] });
      toast.success("Coche de cortesía guardado");
    },
    onError: (error: any) => {
      toast.error(`Error al guardar: ${error?.message ?? "Error desconocido"}`);
    },
  });
}

export function useUpdateCourtesyVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: CourtesyVehicle) => {
      const data = await updateWithFallback(id, updates);
      return normalizeCourtesyVehicle((data ?? { id, ...updates }) as Record<string, any>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["substitution_vehicles"] });
      toast.success("Coche de cortesía actualizado");
    },
    onError: (error: any) => {
      toast.error(`Error al actualizar: ${error?.message ?? "Error desconocido"}`);
    },
  });
}

export function useDeleteCourtesyVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("substitution_vehicles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["substitution_vehicles"] });
      toast.success("Coche eliminado");
    },
    onError: (error: any) => {
      toast.error(`Error al eliminar: ${error?.message ?? "Error desconocido"}`);
    },
  });
}
