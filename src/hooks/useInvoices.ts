import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export interface Invoice {
  id: string;
  invoice_number: string;
  appointment_id: string;
  user_id: string;
  client_name: string;
  license_plate: string;
  service: string;
  parts_total: number;
  labor_cost: number;
  tax_rate: number;
  total: number;
  status: string;
  created_at: string;
}

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
      const invoiceNumber = invoice.invoice_number ?? await generateInvoiceNumber();

      const { data, error } = await supabase
        .from("invoices")
        .insert({
          appointment_id: invoice.appointment_id ?? "",
          invoice_number: invoiceNumber,
          client_name: invoice.client_name ?? "",
          license_plate: invoice.license_plate ?? "",
          service: invoice.service ?? "",
          parts_total: Number(invoice.parts_total ?? 0),
          labor_cost: Number(invoice.labor_cost ?? 0),
          tax_rate: Number(invoice.tax_rate ?? 21),
          total: Number(invoice.total ?? 0),
          status: invoice.status ?? "emitida",
          user_id: user?.id ?? "",
        } as any)
        .select("*")
        .single();

      if (error) throw error;
      return data as unknown as Invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Factura generada correctamente");
    },
    onError: (error: any) => {
      toast.error("Error al crear factura: " + (error?.message ?? "Error desconocido"));
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
