import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, FileText, Download, CheckCircle, Search, Pencil } from "lucide-react";
import { useInvoices, useUpdateInvoiceStatus, type Invoice } from "@/hooks/useInvoices";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useWorkshop } from "@/contexts/WorkshopContext";
import { supabase } from "@/integrations/supabase/client";
import { generatePdf, type PdfLine, type PdfSettings } from "@/lib/pdf-utils";
import { EditInvoiceDialog } from "@/components/invoices/EditInvoiceDialog";

const db = supabase as any;


const safeText = (value: unknown, fallback = "") =>
  String(value ?? fallback)
    .replace(/[\r\n]+/g, " ")
    .trim() || fallback;

async function fetchInvoicePdfData(invoice: Invoice, workshopId: string | null): Promise<{
  lines: PdfLine[];
  comment: string;
  vehicleInfo: string;
  vehicleKm: string;
  clientPhone: string;
  clientEmail: string;
}> {
  const empty = { lines: [], comment: "", vehicleInfo: "", vehicleKm: "", clientPhone: "", clientEmail: "" };
  if (!workshopId) return empty;

  const [invoiceLinesResult, workOrderItemsResult, workOrderResult] = await Promise.all([
    db.from("invoice_lines").select("*").eq("invoice_id", invoice.id),
    invoice.work_order_id
      ? db.from("work_order_items").select("*").eq("work_order_id", invoice.work_order_id).order("created_at", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    invoice.work_order_id
      ? db.from("work_orders").select("comentario_factura, appointment_id").eq("id", invoice.work_order_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  const invoiceLines = (invoiceLinesResult.data ?? []) as any[];
  const workOrderItems = (workOrderItemsResult.data ?? []) as any[];
  const comment = safeText(workOrderResult.data?.comentario_factura ?? "", "");

  // Resolve vehicle & contact info
  let vehicleInfo = "";
  let vehicleKm = "";
  let clientPhone = "";
  let clientEmail = "";

  const resolvedAppointmentId = invoice.appointment_id ?? workOrderResult.data?.appointment_id ?? null;

  const [clientResult, appointmentResult] = await Promise.all([
    db.from("clients").select("brand, model, phone, email, license_plate").eq("workshop_id", workshopId).ilike("license_plate", invoice.license_plate).maybeSingle(),
    resolvedAppointmentId
      ? db.from("appointments").select("km, email").eq("id", resolvedAppointmentId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  console.log("[Invoice PDF] license_plate:", JSON.stringify(invoice.license_plate), "clientResult:", JSON.stringify(clientResult.data), "error:", clientResult.error?.message);

  if (clientResult.data) {
    vehicleInfo = [safeText(clientResult.data.brand), safeText(clientResult.data.model)].filter(Boolean).join(" ");
    clientPhone = safeText(clientResult.data.phone);
    clientEmail = safeText(clientResult.data.email);
  }
  if (appointmentResult?.data) {
    vehicleKm = safeText(appointmentResult.data.km);
    if (!clientEmail) clientEmail = safeText(appointmentResult.data.email);
  }

  const mapLine = (line: any, fromInvoiceLines: boolean): PdfLine => {
    if (fromInvoiceLines) {
      const descMatch = String(line.description ?? "").match(/\(-?(\d+(?:\.\d+)?)%\)\s*$/);
      const discountFromDesc = descMatch ? Number(descMatch[1]) : 0;
      return {
        description: safeText(line.description, "Concepto"),
        quantity: Number(line.quantity ?? 1),
        unit_price: Number(line.unit_price ?? 0),
        total: Number(line.total ?? 0),
        line_type: line.line_type === "labor" ? "labor" : line.line_type === "discount" ? "discount" : "part",
        discount_percent: discountFromDesc,
      };
    }
    return {
      description: safeText(line.description ?? line.descripcion, "Concepto"),
      quantity: Number(line.quantity ?? line.cantidad ?? 1),
      unit_price: Number(line.unit_price ?? line.precio_unitario ?? 0),
      total: Number(line.total ?? 0),
      line_type: (line.item_type ?? line.tipo ?? "pieza") === "mano_obra" ? "labor" : "part",
      discount_percent: Number(line.discount_percent ?? line.descuento ?? 0),
    };
  };

  const lines: PdfLine[] = invoiceLines.length > 0
    ? invoiceLines.map((l: any) => mapLine(l, true))
    : workOrderItems.map((l: any) => mapLine(l, false));

  return { lines, comment, vehicleInfo, vehicleKm, clientPhone, clientEmail };
}

async function handleDownloadPdf(invoice: Invoice, settings: any, workshopId: string | null) {
  const { lines, comment, vehicleInfo, vehicleKm, clientPhone, clientEmail } =
    await fetchInvoicePdfData(invoice, workshopId);

  generatePdf({
    title: `FACTURA ${invoice.invoice_number}`,
    date: new Date(invoice.created_at).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" }),
    filename: `${invoice.invoice_number}.pdf`,
    clientName: invoice.client_name,
    licensePlate: invoice.license_plate,
    service: invoice.service,
    vehicleInfo: vehicleInfo || undefined,
    vehicleKm: vehicleKm || undefined,
    clientPhone: clientPhone || undefined,
    clientEmail: clientEmail || undefined,
    comment: comment || undefined,
    lines,
    taxRate: Number(invoice.tax_rate ?? 21),
  }, settings ?? {});
}

const Invoices = () => {
  const [urlParams] = useSearchParams();
  const [search, setSearch] = useState(urlParams.get("search") || "");
  const [statusFilter, setStatusFilter] = useState<"all" | "emitida" | "pagada">("all");
  const { data: invoices, isLoading } = useInvoices();
  const { data: settings } = useCompanySettings();
  const { workshopId } = useWorkshop();
  const updateStatus = useUpdateInvoiceStatus();
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

  const filtered = (invoices ?? []).filter((inv) => {
    if (statusFilter !== "all" && inv.status !== statusFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      inv.invoice_number.toLowerCase().includes(q) ||
      inv.client_name.toLowerCase().includes(q) ||
      inv.license_plate.toLowerCase().includes(q) ||
      inv.service.toLowerCase().includes(q)
    );
  });

  const totalEmitidas = (invoices ?? []).filter((i) => i.status === "emitida").reduce((s, i) => s + Number(i.total), 0);
  const totalPagadas = (invoices ?? []).filter((i) => i.status === "pagada").reduce((s, i) => s + Number(i.total), 0);

  return (
    <DashboardLayout title="Facturas" subtitle="Facturas generadas automáticamente">
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => setStatusFilter("all")}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase">Total facturas</p>
              <p className="text-2xl font-bold font-mono">{(invoices ?? []).length}</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => setStatusFilter("emitida")}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase">Pendientes de cobro</p>
              <p className="text-2xl font-bold font-mono text-orange-500">{totalEmitidas.toFixed(2)} €</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => setStatusFilter("pagada")}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase">Cobradas</p>
              <p className="text-2xl font-bold font-mono text-green-500">{totalPagadas.toFixed(2)} €</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar por nº, cliente, matrícula..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-secondary p-1">
            <Button variant={statusFilter === "all" ? "default" : "ghost"} size="sm" onClick={() => setStatusFilter("all")} className="text-xs">TODAS</Button>
            <Button variant={statusFilter === "emitida" ? "default" : "ghost"} size="sm" onClick={() => setStatusFilter("emitida")} className="text-xs">EMITIDAS</Button>
            <Button variant={statusFilter === "pagada" ? "default" : "ghost"} size="sm" onClick={() => setStatusFilter("pagada")} className="text-xs">PAGADAS</Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !filtered.length ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/40" />
            <p className="mt-3 text-sm font-medium text-muted-foreground">
              {search || statusFilter !== "all" ? "No se encontraron facturas con estos filtros" : "No hay facturas todavía"}
            </p>
            <p className="text-xs text-muted-foreground">Las facturas se generan automáticamente cuando una orden pasa a "Listo"</p>
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nº Factura</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Fecha</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Cliente</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Matrícula</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Servicio</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Estado</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((inv) => (
                      <tr key={inv.id} className="border-b last:border-0 transition-colors hover:bg-accent/50">
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-primary">{inv.invoice_number}</td>
                        <td className="px-4 py-3 text-xs">{new Date(inv.created_at).toLocaleDateString("es-ES")}</td>
                        <td className="px-4 py-3 font-medium">{inv.client_name}</td>
                        <td className="px-4 py-3 font-mono text-xs">{inv.license_plate}</td>
                        <td className="px-4 py-3 text-xs">{inv.service}</td>
                        <td className="px-4 py-3 text-right font-mono font-semibold">{Number(inv.total).toFixed(2)} €</td>
                        <td className="px-4 py-3">
                          <Badge variant={inv.status === "pagada" ? "default" : "secondary"}>
                            {inv.status === "pagada" ? "Pagada" : "Emitida"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {inv.status !== "pagada" && (
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateStatus.mutate({ id: inv.id, status: "pagada" })} title="Marcar como pagada">
                                <CheckCircle className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {inv.status === "emitida" && (
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingInvoice(inv)} title="Editar factura">
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownloadPdf(inv, settings, workshopId)} title="Descargar factura PDF">
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <EditInvoiceDialog
        invoice={editingInvoice}
        open={!!editingInvoice}
        onOpenChange={(open) => !open && setEditingInvoice(null)}
      />
    </DashboardLayout>
  );
};

export default Invoices;
