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

const mapCatalogRow = (row: Record<string, any>): PartsCatalogItem => ({
  id: String(row.id),
  name: String(row.name ?? ""),
  ref: String(row.ref ?? ""),
  price: Number(row.price ?? 0),
});

export function usePartsCatalog() {
  return useQuery({
    queryKey: ["parts_catalog"],
    queryFn: async () => {
      // RLS filters by workshop_id automatically
      const { data, error } = await db
        .from("parts_catalog")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      return (data ?? []).map((row: Record<string, any>) => mapCatalogRow(row));
    },
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
          // workshop_id is set automatically by DB trigger
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
