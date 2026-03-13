import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { InvoiceRow } from "@/types/database";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export type Invoice = InvoiceRow;

type RawRow = Record<string, any>;

function mapInvoiceRow(row: RawRow): Invoice {
  return {
    id: row.id,
    invoice_number: row.invoice_number ?? "",
    status: row.status ?? "emitida",
    created_at: row.created_at ?? new Date().toISOString(),

    appointment_id: row.appointment_id ?? row.work_order_id ?? undefined,
    user_id: row.user_id ?? undefined,
    client_name: row.client_name ?? row.name ?? "",
    license_plate: row.license_plate ?? "",
    service: row.service ?? row.type ?? "",
    parts_total: Number(row.parts_total ?? row.subtotal ?? 0),
    labor_cost: Number(row.labor_cost ?? 0),
    tax_rate: Number(row.tax_rate ?? row.vat_rate ?? row.vat_percentage ?? 21),
    total: Number(row.total ?? row.total_amount ?? 0),

    client_id: row.client_id ?? null,
    work_order_id: row.work_order_id ?? null,
    series_id: row.series_id ?? null,
    issue_date: row.issue_date ?? null,
    due_date: row.due_date ?? null,
    subtotal: row.subtotal ?? null,
    vat_percentage: row.vat_percentage ?? null,
    vat_amount: row.vat_amount ?? null,
    payment_method: row.payment_method ?? null,
    notes: row.notes ?? null,
    type: row.type ?? null,
    parent_invoice_id: row.parent_invoice_id ?? null,
    vat_rate: row.vat_rate ?? null,
    total_amount: row.total_amount ?? null,
    pdf_url: row.pdf_url ?? null,
  };
}

async function resolveClientId(
  currentClientId: string | null | undefined,
  licensePlate: string | undefined
): Promise<string | null> {
  if (currentClientId) {
    return currentClientId;
  }

  if (!licensePlate) {
    return null;
  }

  const { data } = await supabase
    .from("clients")
    .select("id")
    .eq("license_plate", licensePlate)
    .limit(1)
    .maybeSingle();

  return (data as any)?.id ?? null;
}

async function tryInsertInvoice(payloads: RawRow[]): Promise<Invoice> {
  let lastError: any = null;

  for (const payload of payloads) {
    const { data, error } = await supabase
      .from("invoices")
      .insert(payload as any)
      .select("*")
      .single();

    if (!error) {
      return mapInvoiceRow(data as RawRow);
    }

    lastError = error;
  }

  throw lastError;
}

export function useInvoices() {
  return useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const query = supabase
        .from("invoices")
        .select("*") as any;

      const { data, error } = await query.order("created_at", {
        ascending: false,
      });

      if (error) {
        throw error;
      }

      return (data ?? []).map((row: RawRow) => mapInvoiceRow(row));
    },
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (invoice: Partial<Invoice>) => {
      const partsTotal = Number(invoice.parts_total ?? 0);
      const laborCost = Number(invoice.labor_cost ?? 0);
      const subtotal = partsTotal + laborCost;
      const taxRate = Number(invoice.tax_rate ?? invoice.vat_rate ?? 21);
      const vatAmount = Number(((subtotal * taxRate) / 100).toFixed(2));
      const total = Number((subtotal + vatAmount).toFixed(2));
      const issueDate = invoice.issue_date ?? new Date().toISOString().slice(0, 10);
      const clientId = await resolveClientId(invoice.client_id, invoice.license_plate);

      const legacyPayload = {
        appointment_id: invoice.appointment_id ?? invoice.work_order_id ?? "",
        invoice_number: invoice.invoice_number,
        client_name: invoice.client_name ?? "",
        license_plate: invoice.license_plate ?? "",
        service: invoice.service ?? "",
        parts_total: partsTotal,
        labor_cost: laborCost,
        tax_rate: taxRate,
        total,
        status: invoice.status ?? "emitida",
        ...(user?.id ? { user_id: user.id } : {}),
      };

      const modernPayload = {
        client_id: clientId,
        work_order_id: invoice.work_order_id ?? invoice.appointment_id ?? null,
        invoice_number: invoice.invoice_number,
        issue_date: issueDate,
        subtotal,
        vat_percentage: taxRate,
        vat_amount: vatAmount,
        total,
        status: invoice.status ?? "issued",
        payment_method: invoice.payment_method ?? null,
        notes: invoice.notes ?? null,
        type: invoice.type ?? "standard",
        vat_rate: taxRate,
        total_amount: total,
      };

      return tryInsertInvoice([legacyPayload, modernPayload]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Factura generada");
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
