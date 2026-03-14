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

export interface InvoiceLine {
  id: string;
  invoice_id: string;
  user_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  line_type: string;
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

export function useInvoiceLines(invoiceId: string | null) {
  return useQuery({
    queryKey: ["invoice_lines", invoiceId],
    queryFn: async () => {
      if (!invoiceId) return [];
      const { data, error } = await (supabase as any)
        .from("invoice_lines")
        .select("*")
        .eq("invoice_id", invoiceId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as InvoiceLine[];
    },
    enabled: !!invoiceId,
  });
}

export async function generateInvoiceNumber(userId: string): Promise<string> {
  const year = new Date().getFullYear();

  // Try to get or create the series for this year
  const { data: series } = await (supabase as any)
    .from("invoice_series")
    .select("*")
    .eq("user_id", userId)
    .eq("year", year)
    .maybeSingle();

  let nextNumber: number;

  if (series) {
    nextNumber = (series.last_number ?? 0) + 1;
    await (supabase as any)
      .from("invoice_series")
      .update({ last_number: nextNumber })
      .eq("id", series.id);
  } else {
    nextNumber = 1;
    await (supabase as any)
      .from("invoice_series")
      .insert({ user_id: userId, year, last_number: 1, prefix: "" });
  }

  return `${year}-${String(nextNumber).padStart(4, "0")}`;
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (invoice: Partial<Invoice> & { lines?: Array<{ description: string; quantity: number; unit_price: number; total: number; line_type: string }> }) => {
      const userId = user?.id ?? "";
      const invoiceNumber = invoice.invoice_number ?? await generateInvoiceNumber(userId);

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
          user_id: userId,
        } as any)
        .select("*")
        .single();

      if (error) throw error;

      // Insert invoice lines if provided
      if (invoice.lines?.length && data) {
        const invoiceId = (data as any).id;
        const lineRows = invoice.lines.map((line) => ({
          invoice_id: invoiceId,
          user_id: userId,
          description: line.description,
          quantity: line.quantity,
          unit_price: line.unit_price,
          total: line.total,
          line_type: line.line_type,
        }));

        await (supabase as any)
          .from("invoice_lines")
          .insert(lineRows);
      }

      return data as unknown as Invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoice_lines"] });
      toast.success("Factura generada correctamente");
    },
    onError: (error: any) => {
      toast.error("Error al crear factura: " + (error?.message ?? "Error desconocido"));
    },
  });
}

export function useUpdateInvoiceStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("invoices")
        .update({ status } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Estado de factura actualizado");
    },
    onError: (error: any) => {
      toast.error("Error: " + (error?.message ?? "Error desconocido"));
    },
  });
}
