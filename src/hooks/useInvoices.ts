import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { InvoiceRow } from "@/types/database";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export type Invoice = InvoiceRow;

export function useInvoices() {
  return useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Invoice[];
    },
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (invoice: Partial<Invoice>) => {
      const { data, error } = await supabase
        .from("invoices")
        .insert({ ...invoice, user_id: user?.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Factura generada");
    },
    onError: (error) => {
      toast.error("Error al crear factura: " + error.message);
    },
  });
}

export async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const { count } = await supabase
    .from("invoices")
    .select("*", { count: "exact", head: true });
  const num = (count ?? 0) + 1;
  return `FAC-${year}-${String(num).padStart(4, "0")}`;
}
