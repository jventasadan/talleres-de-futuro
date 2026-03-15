import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Mechanic {
  id: string;
  user_id: string;
  name: string;
  active: boolean;
  photo?: string | null;
  created_at: string;
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

const mapMechanicRow = (row: AnyRecord): Mechanic => ({
  id: row.id,
  user_id: row.user_id ?? "",
  name: row.name ?? "",
  active: row.active ?? true,
  photo: row.photo ?? null,
  created_at: row.created_at ?? new Date().toISOString(),
});

// RLS handles workshop isolation
const fetchMechanicsRows = async (): Promise<AnyRecord[]> => {
  const attempts = [
    () => supabase.from("mechanics").select("*").eq("active", true).order("name"),
    () => supabase.from("mechanics").select("*").order("name"),
    () => supabase.from("mechanics").select("*").order("created_at", { ascending: false }),
    () => supabase.from("mechanics").select("*"),
  ];

  let lastError: any;

  for (const runAttempt of attempts) {
    const { data, error } = await runAttempt();

    if (!error) return (data ?? []) as AnyRecord[];
    lastError = error;

    if (!isSchemaMismatchError(error)) throw error;
  }

  throw lastError;
};

const insertMechanicWithFallback = async (payload: AnyRecord) => {
  let attemptPayload: AnyRecord = { ...payload };
  let lastError: any;

  for (let i = 0; i < 12; i += 1) {
    const { data, error } = await supabase
      .from("mechanics")
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

export function useMechanics() {
  return useQuery({
    queryKey: ["mechanics"],
    queryFn: async () => {
      const rows = await fetchMechanicsRows();
      return rows.map(mapMechanicRow);
    },
  });
}

export function useCreateMechanic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      const payload: AnyRecord = {
        name,
        active: true,
        // workshop_id is set automatically by DB trigger
      };

      const data = await insertMechanicWithFallback(payload);
      return mapMechanicRow(data ?? payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mechanics"] });
      toast.success("Mecánico añadido");
    },
    onError: (e: any) => toast.error("Error: " + (e?.message ?? "Error desconocido")),
  });
}

export function useDeleteMechanic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("mechanics").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mechanics"] });
      toast.success("Mecánico eliminado");
    },
    onError: (e: any) => toast.error("Error: " + (e?.message ?? "Error desconocido")),
  });
}
