import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkshop } from "@/contexts/WorkshopContext";
import { useAuth } from "@/contexts/AuthContext";
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
  nif: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  province: string | null;
  created_at: string;
  updated_at: string;
}

type AnyRecord = Record<string, any>;

const isSchemaMismatchError = (error: any) => {
  const code = String(error?.code ?? "");
  const message = String(error?.message ?? "").toLowerCase();
  return (
    code === "42703" ||
    code === "PGRST204" ||
    message.includes("does not exist") ||
    message.includes("schema cache") ||
    message.includes("could not find")
  );
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
    nif: row.nif ?? null,
    address: row.address ?? null,
    city: row.city ?? null,
    postal_code: row.postal_code ?? null,
    province: row.province ?? null,
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
  const { user } = useAuth();

  return useQuery({
    queryKey: ["clients", workshopId, user?.id],
    queryFn: async () => {
      // Strategy 1: filter by workshop_id
      if (workshopId) {
        const { data, error } = await supabase
          .from("clients")
          .select("*")
          .eq("workshop_id", workshopId)
          .order("created_at", { ascending: false });
        if (!error && (data ?? []).length > 0) return data!.map(mapRow);
        if (error && !isSchemaMismatchError(error)) throw error;
      }

      // Strategy 2: filter by user_id (older records without workshop_id)
      if (user?.id) {
        const { data, error } = await supabase
          .from("clients")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        if (!error && (data ?? []).length > 0) return data!.map(mapRow);
        if (error && !isSchemaMismatchError(error)) throw error;
      }

      // Strategy 3: fetch all (RLS handles permissions)
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapRow);
    },
    enabled: !!(workshopId || user?.id),
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  const { workshopId } = useWorkshop();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      name: string;
      phone: string | null;
      license_plate: string;
      brand: string | null;
      model: string | null;
    }) => {
      const payload: AnyRecord = {
        name: input.name,
        phone: input.phone,
        license_plate: input.license_plate,
        brand: input.brand,
        model: input.model,
        workshop_id: workshopId,        user_id: user?.id,
      };
      return insertClientWithFallback(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Cliente creado correctamente");
    },
    onError: (error: any) => {
      toast.error("Error al crear cliente: " + (error?.message ?? ""));
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();
  const { workshopId } = useWorkshop();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      name: string;
      phone: string | null;
      license_plate: string;
      brand: string | null;
      model: string | null;
    }) => {
      const { id, name, ...rest } = input;
      const payload: AnyRecord = { full_name: name, ...rest, workshop_id: workshopId };
      return updateClientWithFallback(id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Cliente actualizado");
    },
    onError: (error: any) => {
      toast.error("Error al actualizar cliente: " + (error?.message ?? ""));
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
      toast.error("Error al eliminar cliente: " + (error?.message ?? ""));
    },
  });
}
