import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkshop } from "@/contexts/WorkshopContext";
import { toast } from "sonner";

export interface Client {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  license_plate: string;
  brand: string | null;
  model: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

type AnyRecord = Record<string, any>;

const isSchemaMismatchError = (error: any) => {
  const code = String(error?.code ?? "");
  const message = String(error?.message ?? "").toLowerCase();
  return code === "42703" || code === "PGRST204" || message.includes("does not exist") || message.includes("schema cache");
};

const extractMissingColumn = (error: any): string | null => {
  const message = String(error?.message ?? "");
  const pgrstMatch = message.match(/Could not find the '([^']+)' column/i);
  if (pgrstMatch?.[1]) return pgrstMatch[1];

  const pgMatch = message.match(/column\s+[\w.]+\.([a-zA-Z0-9_]+)\s+does not exist/i);
  if (pgMatch?.[1]) return pgMatch[1];

  return null;
};

function mapRow(row: AnyRecord): Client {
  return {
    id: row.id,
    user_id: row.user_id ?? "",
    name: row.full_name ?? row.name ?? "",
    phone: row.phone ?? null,
    license_plate: row.license_plate ?? "",
    brand: row.brand ?? null,
    model: row.model ?? null,
    email: row.email ?? null,
    created_at: row.created_at ?? new Date().toISOString(),
    updated_at: row.updated_at ?? row.created_at ?? new Date().toISOString(),
  };
}

const insertClientWithFallback = async (payload: AnyRecord) => {
  let attemptPayload: AnyRecord = { ...payload };
  let lastError: any;

  for (let i = 0; i < 12; i += 1) {
    const { data, error } = await supabase
      .from("clients")
      .insert(attemptPayload as any)
      .select("*")
      .maybeSingle();

    if (!error) return data as AnyRecord | null;

    lastError = error;
    const missingColumn = extractMissingColumn(error);

    if (!isSchemaMismatchError(error) || !missingColumn) break;
    if (!(missingColumn in attemptPayload)) break;

    delete attemptPayload[missingColumn];
  }

  throw lastError;
};

const updateClientWithFallback = async (id: string, payload: AnyRecord) => {
  let attemptPayload: AnyRecord = { ...payload };
  let lastError: any;

  for (let i = 0; i < 12; i += 1) {
    const { data, error } = await supabase
      .from("clients")
      .update(attemptPayload as any)
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (!error) return data as AnyRecord | null;

    lastError = error;
    const missingColumn = extractMissingColumn(error);

    if (!isSchemaMismatchError(error) || !missingColumn) break;
    if (!(missingColumn in attemptPayload)) break;

    delete attemptPayload[missingColumn];
  }

  throw lastError;
};

export function useClients() {
  const { workshopId } = useWorkshop();

  return useQuery({
    queryKey: ["clients", workshopId],
    queryFn: async () => {
      if (!workshopId) return [];

      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("workshop_id", workshopId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []).map(mapRow);
    },
    enabled: !!workshopId,
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (client: Partial<Client>) => {
      const payload: AnyRecord = {
        full_name: (client.name ?? "").trim(),
        name: (client.name ?? "").trim(),
        phone: client.phone ?? null,
        license_plate: (client.license_plate ?? "").toUpperCase() || null,
        email: client.email ?? null,
        brand: client.brand ?? null,
        model: client.model ?? null,
        // workshop_id is set automatically by DB trigger
      };

      const data = await insertClientWithFallback(payload);
      return mapRow(data ?? payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Cliente creado correctamente");
    },
    onError: (error: any) => {
      toast.error("Error al crear cliente: " + (error?.message ?? "Error desconocido"));
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Client> & { id: string }) => {
      const payload: AnyRecord = {};
      if (updates.name !== undefined) {
        payload.full_name = updates.name;
        payload.name = updates.name;
      }
      if (updates.phone !== undefined) payload.phone = updates.phone;
      if (updates.license_plate !== undefined) payload.license_plate = updates.license_plate?.toUpperCase() ?? null;
      if (updates.brand !== undefined) payload.brand = updates.brand;
      if (updates.model !== undefined) payload.model = updates.model;
      if (updates.email !== undefined) payload.email = updates.email;

      if (Object.keys(payload).length === 0) return null;

      const data = await updateClientWithFallback(id, payload);
      return data ? mapRow(data) : null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Cliente actualizado");
    },
    onError: (error: any) => {
      toast.error("Error al actualizar: " + (error?.message ?? "Error desconocido"));
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Cliente eliminado");
    },
    onError: (error: any) => {
      toast.error("Error al eliminar: " + (error?.message ?? "Error desconocido"));
    },
  });
}
