import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, FileText, Download, CheckCircle, Search } from "lucide-react";
import { useInvoices, useUpdateInvoiceStatus, type Invoice } from "@/hooks/useInvoices";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useWorkshop } from "@/contexts/WorkshopContext";
import { supabase } from "@/integrations/supabase/client";
import { jsPDF } from "jspdf";

const db = supabase as any;

type PdfLine = {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  line_type: "part" | "labor" | "discount";
  discount_percent: number;
};

const safeText = (value: unknown, fallback = "") =>
  String(value ?? fallback)
    .replace(/[\r\n]+/g, " ")
    .trim() || fallback;

async function fetchInvoicePdfData(invoice: Invoice, workshopId: string | null): Promise<{
  lines: PdfLine[];
  comment: string;
}> {
  if (!workshopId) {
    return { lines: [], comment: "" };
  }

  const [invoiceLinesResult, workOrderItemsResult, workOrderResult] = await Promise.all([
    db
      .from("invoice_lines")
      .select("*")
      .eq("invoice_id", invoice.id)
      .order("created_at", { ascending: true }),
    invoice.work_order_id
      ? db
          .from("work_order_items")
          .select("*")
          .eq("work_order_id", invoice.work_order_id)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    invoice.work_order_id
      ? db
          .from("work_orders")
          .select("comentario_factura")
          .eq("id", invoice.work_order_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  const invoiceLines = (invoiceLinesResult.data ?? []) as any[];
  const workOrderItems = (workOrderItemsResult.data ?? []) as any[];
  const comment = safeText(workOrderResult.data?.comentario_factura ?? "", "");

  if (invoiceLines.length > 0) {
    return {
      lines: invoiceLines.map((line) => {
        // Extract discount % from description if embedded like "Disco (-5%)"
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
      }),
      comment,
    };
  }

  if (workOrderItems.length > 0) {
    return {
      lines: workOrderItems.map((item) => ({
        description: safeText(item.description ?? item.descripcion, "Concepto"),
        quantity: Number(item.quantity ?? item.cantidad ?? 1),
        unit_price: Number(item.unit_price ?? item.precio_unitario ?? 0),
        total: Number(item.total ?? 0),
        line_type: (item.item_type ?? item.tipo ?? "pieza") === "mano_obra" ? "labor" : "part",
        discount_percent: Number(item.discount_percent ?? item.descuento ?? 0),
      })),
      comment,
    };
  }

  return {
    lines: [],
    comment,
  };
}

async function generateProfessionalPdf(invoice: Invoice, settings: any, workshopId: string | null) {
  const { lines, comment } = await fetchInvoicePdfData(invoice, workshopId);

  const partLines = lines.filter((l) => l.line_type === "part");
  const laborLines = lines.filter((l) => l.line_type === "labor");
  const discountLines = lines.filter((l) => l.line_type === "discount");

  // Use net totals directly from each line (already includes line-level discount)
  const partsNet = partLines.reduce((s, l) => s + Number(l.total ?? 0), 0);
  const laborNet = laborLines.reduce((s, l) => s + Number(l.total ?? 0), 0);
  const globalDiscount = Math.abs(discountLines.reduce((s, l) => s + Number(l.total ?? 0), 0));
  const taxableBase = Number((partsNet + laborNet - globalDiscount).toFixed(2));
  const taxRate = Number(invoice.tax_rate ?? 21);
  const taxAmount = Number(((taxableBase * taxRate) / 100).toFixed(2));
  const displayTotal = Number((taxableBase + taxAmount).toFixed(2));

  // Lines to render in the table (exclude discount meta-lines)
  const tableLines = lines.filter((l) => l.line_type !== "discount");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const wName = safeText(settings?.company_name, "Mi Taller");
  const wCif = safeText(settings?.cif, "");
  const wAddress = safeText([settings?.address, settings?.city, settings?.postal_code, settings?.province].filter(Boolean).join(", "), "");
  const wPhone = safeText(settings?.phone, "");
  const wEmail = safeText(settings?.email, "");

  // Header
  doc.setFillColor(34, 197, 94);
  doc.rect(0, 0, pageWidth, 40, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text(wName, margin, 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(220, 255, 220);
  doc.text([wCif ? `CIF: ${wCif}` : "", wPhone ? `Tlf: ${wPhone}` : "", wEmail].filter(Boolean).join(" | "), margin, 27);
  if (wAddress) doc.text(wAddress, margin, 33);
  y = 50;

  // Invoice number + date
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(30, 30, 30);
  doc.text(`FACTURA ${safeText(invoice.invoice_number)}`, margin, y);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Fecha: ${new Date(invoice.created_at).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })}`, margin, y);

  // Client data box - fetch brand/model from appointment
  y += 12;
  let vehicleBrand = "";
  let vehicleModel = "";
  if (invoice.appointment_id) {
    const { data: aptData } = await db.from("appointments").select("brand, model").eq("id", invoice.appointment_id).maybeSingle();
    if (aptData) {
      vehicleBrand = safeText(aptData.brand, "");
      vehicleModel = safeText(aptData.model, "");
    }
  }
  const vehicleInfo = [vehicleBrand, vehicleModel].filter(Boolean).join(" ");
  const clientBoxH = comment ? 43 : (vehicleInfo ? 33 : 28);
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(margin, y, contentWidth, clientBoxH, 3, 3, "F");
  y += 7;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  doc.text("DATOS DEL CLIENTE", margin + 5, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  doc.text(`Cliente: ${safeText(invoice.client_name)}`, margin + 5, y);
  y += 5;
  doc.text(`Matrícula: ${safeText(invoice.license_plate)}${vehicleInfo ? ` — ${vehicleInfo}` : ""}`, margin + 5, y);
  y += 5;
  doc.text(`Servicio: ${safeText(invoice.service)}`, margin + 5, y);
  if (comment) {
    y += 7;
    doc.setFont("helvetica", "bold");
    doc.text("Comentario:", margin + 5, y);
    const commentX = margin + 28;
    const maxCommentW = contentWidth - 33;
    doc.setFont("helvetica", "normal");
    const commentLines = doc.splitTextToSize(safeText(comment), maxCommentW);
    doc.text(commentLines, commentX, y);
  }

  // Items table
  y += 15;
  const colX = {
    name: margin,
    qty: margin + contentWidth * 0.5,
    discount: margin + contentWidth * 0.6,
    price: margin + contentWidth * 0.72,
    total: margin + contentWidth * 0.87,
  };
  doc.setFillColor(34, 197, 94);
  doc.rect(margin, y - 5, contentWidth, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text("DESCRIPCIÓN", colX.name + 3, y);
  doc.text("CANT.", colX.qty, y);
  doc.text("DTO.", colX.discount, y);
  doc.text("P. UNIT.", colX.price, y);
  doc.text("TOTAL", colX.total, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(50, 50, 50);

  if (!tableLines.length) {
    doc.setFontSize(9);
    doc.text("No hay conceptos añadidos", colX.name + 3, y + 1);
    y += 7;
  } else {
    tableLines.forEach((line, index) => {
      if (index % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(margin, y - 3, contentWidth, 7, "F");
      }
      // Clean description: remove embedded discount text for display, show in DTO column
      const rawDesc = safeText(line.description, "Concepto");
      const cleanDesc = rawDesc.replace(/\s*\(-?\d+(\.\d+)?%\)\s*$/, "");
      doc.setFontSize(9);
      doc.text(cleanDesc, colX.name + 3, y + 1);
      doc.text(String(Number(line.quantity ?? 1)), colX.qty + 2, y + 1);
      doc.text(line.discount_percent > 0 ? `${line.discount_percent}%` : "—", colX.discount + 1, y + 1);
      doc.text(`${Number(line.unit_price ?? 0).toFixed(2)} €`, colX.price, y + 1);
      doc.text(`${Number(line.total ?? 0).toFixed(2)} €`, colX.total, y + 1);
      y += 7;
    });
  }

  // Summary
  y += 3;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, margin + contentWidth, y);
  y += 8;

  const totalsX = margin + contentWidth * 0.62;
  const valuesX = margin + contentWidth * 0.85;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text("Piezas:", totalsX, y);
  doc.text(`${partsNet.toFixed(2)} €`, valuesX, y);
  y += 6;
  doc.text("Mano de obra:", totalsX, y);
  doc.text(`${laborNet.toFixed(2)} €`, valuesX, y);
  if (globalDiscount > 0) {
    y += 6;
    doc.text("Descuento:", totalsX, y);
    doc.text(`-${globalDiscount.toFixed(2)} €`, valuesX, y);
  }
  y += 6;
  doc.text(`IVA (${taxRate}%):`, totalsX, y);
  doc.text(`${taxAmount.toFixed(2)} €`, valuesX, y);
  y += 8;
  doc.setFillColor(34, 197, 94);
  doc.roundedRect(totalsX - 5, y - 5, contentWidth * 0.45, 12, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text("TOTAL:", totalsX, y + 3);
  doc.text(`${displayTotal.toFixed(2)} €`, valuesX, y + 3);

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 20;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, footerY - 5, margin + contentWidth, footerY - 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text([wName, wCif ? `CIF: ${wCif}` : "", wAddress].filter(Boolean).join(" · "), pageWidth / 2, footerY, { align: "center" });
  doc.text("Gracias por confiar en nosotros", pageWidth / 2, footerY + 5, { align: "center" });
  doc.save(`${safeText(invoice.invoice_number, "factura")}.pdf`);
}

const Invoices = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "emitida" | "pagada">("all");
  const { data: invoices, isLoading } = useInvoices();
  const { data: settings } = useCompanySettings();
  const { workshopId } = useWorkshop();
  const updateStatus = useUpdateInvoiceStatus();

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
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => generateProfessionalPdf(inv, settings, workshopId)} title="Descargar factura PDF">
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
    </DashboardLayout>
  );
};

export default Invoices;
