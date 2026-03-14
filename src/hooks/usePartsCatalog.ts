import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { ParsedPartRow } from "@/lib/partsImport";

export interface PartsCatalogItem {
  id: string;
  name: string;
  ref: string;
  price: number;
}

const db = supabase as any;
const isMissingTableError = (error: any) => String(error?.code ?? "") === "PGRST205";

const mapCatalogRow = (row: Record<string, any>): PartsCatalogItem => ({
  id: String(row.id),
  name: String(row.name ?? row.description ?? ""),
  ref: String(row.ref ?? row.reference ?? ""),
  price: Number(row.price ?? row.sale_price ?? 0),
});

const fetchPartsCatalogRows = async (): Promise<PartsCatalogItem[]> => {
  const { data, error } = await db
    .from("parts_catalog")
    .select("*")
    .order("name", { ascending: true });

  if (!error) {
    return (data ?? []).map((row: Record<string, any>) => mapCatalogRow(row));
  }

  if (!isMissingTableError(error)) throw error;

  const fallback = await db
    .from("parts")
    .select("*")
    .order("description", { ascending: true });

  if (fallback.error) throw fallback.error;

  return (fallback.data ?? []).map((row: Record<string, any>) => mapCatalogRow(row));
};

const upsertPartsCatalogRows = async (rows: ParsedPartRow[]) => {
  const { error } = await db
    .from("parts_catalog")
    .upsert(rows.map((part) => ({ name: part.name, ref: part.ref, price: part.price })), { onConflict: "ref" });

  if (!error) return;
  if (!isMissingTableError(error)) throw error;

  for (const part of rows) {
    const { data: existing, error: findError } = await db
      .from("parts")
      .select("id")
      .eq("reference", part.ref)
      .maybeSingle();

    if (findError) throw findError;

    if (existing?.id) {
      const { error: updateError } = await db
        .from("parts")
        .update({ description: part.name, sale_price: part.price })
        .eq("id", existing.id);
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await db
        .from("parts")
        .insert({
          reference: part.ref,
          description: part.name,
          cost_price: part.price,
          sale_price: part.price,
          stock: 0,
          minimum_stock: 0,
        });
      if (insertError) throw insertError;
    }
  }
};

export function usePartsCatalog() {
  return useQuery({
    queryKey: ["parts_catalog"],
    queryFn: fetchPartsCatalogRows,
  });
}

export function useImportPartsCatalog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rows: ParsedPartRow[]) => {
      if (!rows.length) throw new Error("No hay filas para importar.");
      await upsertPartsCatalogRows(rows);
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
