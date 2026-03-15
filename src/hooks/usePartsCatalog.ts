import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWorkshop } from "@/contexts/WorkshopContext";
import type { ParsedPartRow } from "@/lib/partsImport";

export interface PartsCatalogItem {
  id: string;
  name: string;
  ref: string;
  price: number;
}

const db = supabase as any;

const mapCatalogRow = (row: Record<string, any>): PartsCatalogItem => ({
  id: String(row.id),
  name: String(row.name ?? ""),
  ref: String(row.ref ?? ""),
  price: Number(row.price ?? 0),
});

const isSchemaMismatchError = (error: any) => {
  const code = String(error?.code ?? "");
  const message = String(error?.message ?? "").toLowerCase();
  return code === "42703" || message.includes("does not exist");
};

/**
 * Resilient fetch: tries with workshop_id filter first,
 * falls back to no filter (relying on RLS) if column doesn't exist.
 */
const fetchCatalogRows = async (workshopId: string): Promise<Record<string, any>[]> => {
  // Attempt 1: filter by workshop_id
  const { data: d1, error: e1 } = await db
    .from("parts_catalog")
    .select("*")
    .eq("workshop_id", workshopId)
    .order("name", { ascending: true });

  if (!e1) return d1 ?? [];

  if (!isSchemaMismatchError(e1)) throw e1;

  // Attempt 2: no workshop_id filter (column doesn't exist, rely on RLS/user_id)
  const { data: d2, error: e2 } = await db
    .from("parts_catalog")
    .select("*")
    .order("name", { ascending: true });

  if (!e2) return d2 ?? [];

  // Attempt 3: no ordering
  const { data: d3, error: e3 } = await db
    .from("parts_catalog")
    .select("*");

  if (!e3) return d3 ?? [];
  throw e3;
};

export function usePartsCatalog() {
  const { workshopId } = useWorkshop();

  return useQuery({
    queryKey: ["parts_catalog", workshopId],
    queryFn: async () => {
      if (!workshopId) return [];
      return (await fetchCatalogRows(workshopId)).map(mapCatalogRow);
    },
    enabled: !!workshopId,
  });
}

export function useImportPartsCatalog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rows: ParsedPartRow[]) => {
      if (!rows.length) throw new Error("No hay filas para importar.");

      // Delete existing catalog (RLS ensures only own data is deleted)
      await db.from("parts_catalog").delete().neq("id", "00000000-0000-0000-0000-000000000000");

      const batchSize = 50;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize).map((part) => ({
          name: part.name,
          ref: part.ref,
          price: part.price,
          // workshop_id set by DB trigger if column exists
        }));
        const { error } = await db.from("parts_catalog").insert(batch);
        if (error) throw error;
      }

      return rows.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["parts_catalog"] });
      toast.success(`${count} piezas importadas correctamente`);
    },
    onError: (error: any) => {
      toast.error(`Error al importar piezas: ${error?.message ?? "Error desconocido"}`);
    },
  });
}

export function useDeletePartsCatalog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await db.from("parts_catalog").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parts_catalog"] });
      toast.success("Catálogo eliminado");
    },
  });
}
