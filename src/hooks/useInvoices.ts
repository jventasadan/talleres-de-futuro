import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkshop } from "@/contexts/WorkshopContext";
import { toast } from "sonner";

export interface Invoice {
  id: string;
  invoice_number: string;
  work_order_id: string | null;
  appointment_id: string | null;
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
  workshop_id: string | null;
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

const db = supabase as any;

export function useInvoices() {
  const { workshopId } = useWorkshop();

  return useQuery({
    queryKey: ["invoices", workshopId],
    queryFn: async () => {
      if (!workshopId) return [];

      const { data, error } = await db
        .from("invoices")
        .select("*")
        .eq("workshop_id", workshopId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as Invoice[];
    },
    enabled: !!workshopId,
  });
}

export function useInvoiceLines(invoiceId: string | null) {
  const { workshopId } = useWorkshop();

  return useQuery({
    queryKey: ["invoice_lines", invoiceId, workshopId],
    queryFn: async () => {
      if (!invoiceId || !workshopId) return [];

      const { data, error } = await db
        .from("invoice_lines")
        .select("*")
        .eq("invoice_id", invoiceId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data ?? []) as InvoiceLine[];
    },
    enabled: !!invoiceId && !!workshopId,
  });
}

export async function generateInvoiceNumber(userId: string): Promise<string> {
  const year = new Date().getFullYear();

  const { data: series } = await db
    .from("invoice_series")
    .select("*")
    .eq("year", year)
    .maybeSingle();

  let nextNumber: number;

  if (series) {
    nextNumber = (series.last_number ?? 0) + 1;
    await db
      .from("invoice_series")
      .update({ last_number: nextNumber })
      .eq("id", series.id);
  } else {
    nextNumber = 1;
    await db
      .from("invoice_series")
      .insert({ user_id: userId, year, last_number: 1, prefix: "" });
  }

  return `${year}-${String(nextNumber).padStart(4, "0")}`;
}

interface CreateInvoiceInput {
  work_order_id?: string;
  invoice_number?: string;
  client_name: string;
  license_plate: string;
  service: string;
  parts_total: number;
  labor_cost: number;
  tax_rate: number;
  total: number;
  lines?: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
    line_type: string;
  }>;
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invoice: CreateInvoiceInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id ?? "";
      const invoiceNumber = invoice.invoice_number ?? await generateInvoiceNumber(userId);

      const { data, error } = await db
        .from("invoices")
        .insert({
          work_order_id: invoice.work_order_id ?? null,
          invoice_number: invoiceNumber,
          client_name: invoice.client_name ?? "",
          license_plate: invoice.license_plate ?? "",
          service: invoice.service ?? "",
          parts_total: Number(invoice.parts_total ?? 0),
          labor_cost: Number(invoice.labor_cost ?? 0),
          tax_rate: Number(invoice.tax_rate ?? 21),
          total: Number(invoice.total ?? 0),
          status: "emitida",
          user_id: userId,
        })
        .select("*")
        .single();

      if (error) throw error;

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

        await db.from("invoice_lines").insert(lineRows);
      }

      return data as Invoice;
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
      const { error } = await db
        .from("invoices")
        .update({ status })
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
