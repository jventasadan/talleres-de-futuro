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

async function fetchInvoiceLines(invoiceId: string, workshopId: string | null) {
  if (!workshopId) return [];
  const { data, error } = await db
    .from("invoice_lines")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("created_at", { ascending: true });
  if (!error && data?.length) return data;
  return [];
}

async function generateProfessionalPdf(invoice: Invoice, settings: any, workshopId: string | null) {
  const lines = await fetchInvoiceLines(invoice.id, workshopId);

  const partLines = lines.filter((line: any) => line.line_type === "part");
  const laborLines = lines.filter((line: any) => line.line_type === "labor");
  const discountLines = lines.filter((line: any) => line.line_type === "discount");

  const partsTotal = partLines.length
    ? partLines.reduce((sum: number, line: any) => sum + Number(line.total ?? 0), 0)
    : Number(invoice.parts_total ?? 0);
  const laborTotal = laborLines.length
    ? laborLines.reduce((sum: number, line: any) => sum + Number(line.total ?? 0), 0)
    : Number(invoice.labor_cost ?? 0);
  const discountTotal = Math.abs(discountLines.reduce((sum: number, line: any) => sum + Number(line.total ?? 0), 0));
  const subtotal = partsTotal + laborTotal;
  const taxableBase = subtotal - discountTotal;
  const taxAmount = Number((Number(invoice.total) - taxableBase).toFixed(2));

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const wName = settings?.company_name || "Mi Taller";
  const wCif = settings?.cif || "";
  const wAddress = [settings?.address, settings?.city, settings?.postal_code, settings?.province].filter(Boolean).join(", ") || "";
  const wPhone = settings?.phone || "";
  const wEmail = settings?.email || "";

  doc.setFillColor(34, 197, 94);
  doc.rect(0, 0, pageWidth, 40, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(22); doc.setTextColor(255, 255, 255);
  doc.text(wName, margin, 18);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(220, 255, 220);
  doc.text([wCif ? `CIF: ${wCif}` : "", wPhone ? `Tlf: ${wPhone}` : "", wEmail].filter(Boolean).join(" | "), margin, 27);
  if (wAddress) doc.text(wAddress, margin, 33);
  y = 50;

  doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(30, 30, 30);
  doc.text(`FACTURA ${invoice.invoice_number}`, margin, y);
  y += 8;
  doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(100, 100, 100);
  doc.text(`Fecha: ${new Date(invoice.created_at).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })}`, margin, y);

  y += 12;
  doc.setFillColor(245, 245, 245); doc.roundedRect(margin, y, contentWidth, 28, 3, 3, "F");
  y += 7;
  doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(30, 30, 30);
  doc.text("DATOS DEL CLIENTE", margin + 5, y);
  y += 6; doc.setFont("helvetica", "normal"); doc.setTextColor(60, 60, 60);
  doc.text(`Cliente: ${invoice.client_name}`, margin + 5, y);
  y += 5; doc.text(`Matrícula: ${invoice.license_plate}`, margin + 5, y);
  y += 5; doc.text(`Servicio: ${invoice.service}`, margin + 5, y);

  y += 15;
  const colX = { name: margin, qty: margin + contentWidth * 0.55, price: margin + contentWidth * 0.7, total: margin + contentWidth * 0.85 };
  doc.setFillColor(34, 197, 94); doc.rect(margin, y - 5, contentWidth, 8, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(255, 255, 255);
  doc.text("DESCRIPCIÓN", colX.name + 3, y); doc.text("CANT.", colX.qty, y); doc.text("P. UNIT.", colX.price, y); doc.text("TOTAL", colX.total, y);
  y += 6; doc.setFont("helvetica", "normal"); doc.setTextColor(50, 50, 50);

  if (!lines.length) {
    if (Number(invoice.parts_total) > 0) {
      doc.setFontSize(9);
      doc.text("Piezas y materiales", colX.name + 3, y + 1);
      doc.text("1", colX.qty + 5, y + 1);
      doc.text(`${Number(invoice.parts_total).toFixed(2)} €`, colX.price, y + 1);
      doc.text(`${Number(invoice.parts_total).toFixed(2)} €`, colX.total, y + 1);
      y += 7;
    }
    if (Number(invoice.labor_cost) > 0) {
      doc.setFontSize(9);
      doc.text("Mano de obra", colX.name + 3, y + 1);
      doc.text("1", colX.qty + 5, y + 1);
      doc.text(`${Number(invoice.labor_cost).toFixed(2)} €`, colX.price, y + 1);
      doc.text(`${Number(invoice.labor_cost).toFixed(2)} €`, colX.total, y + 1);
      y += 7;
    }
  } else {
    lines.forEach((line: any, index: number) => {
      if (index % 2 === 0) { doc.setFillColor(250, 250, 250); doc.rect(margin, y - 3, contentWidth, 7, "F"); }
      doc.setFontSize(9);
      doc.text(String(line.description ?? "Concepto"), colX.name + 3, y + 1);
      doc.text(String(line.quantity ?? 1), colX.qty + 5, y + 1);
      doc.text(`${Number(line.unit_price ?? 0).toFixed(2)} €`, colX.price, y + 1);
      doc.text(`${Number(line.total ?? 0).toFixed(2)} €`, colX.total, y + 1);
      y += 7;
    });
  }

  y += 3; doc.setDrawColor(200, 200, 200); doc.line(margin, y, margin + contentWidth, y);
  y += 8;
  const totalsX = margin + contentWidth * 0.6; const valuesX = margin + contentWidth * 0.85;
  doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(80, 80, 80);
  doc.text("Piezas:", totalsX, y); doc.text(`${partsTotal.toFixed(2)} €`, valuesX, y);
  y += 6; doc.text("Mano de obra:", totalsX, y); doc.text(`${laborTotal.toFixed(2)} €`, valuesX, y);
  if (discountTotal > 0) {
    y += 6; doc.text("Descuento:", totalsX, y); doc.text(`-${discountTotal.toFixed(2)} €`, valuesX, y);
  }
  y += 6; doc.text(`IVA (${Number(invoice.tax_rate)}%):`, totalsX, y); doc.text(`${taxAmount.toFixed(2)} €`, valuesX, y);
  y += 8;
  doc.setFillColor(34, 197, 94); doc.roundedRect(totalsX - 5, y - 5, contentWidth * 0.45, 12, 2, 2, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(255, 255, 255);
  doc.text("TOTAL:", totalsX, y + 3); doc.text(`${Number(invoice.total).toFixed(2)} €`, valuesX, y + 3);

  const footerY = doc.internal.pageSize.getHeight() - 20;
  doc.setDrawColor(200, 200, 200); doc.line(margin, footerY - 5, margin + contentWidth, footerY - 5);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(150, 150, 150);
  doc.text([wName, wCif ? `CIF: ${wCif}` : "", wAddress].filter(Boolean).join(" · "), pageWidth / 2, footerY, { align: "center" });
  doc.text("Gracias por confiar en nosotros", pageWidth / 2, footerY + 5, { align: "center" });
  doc.save(`${invoice.invoice_number}.pdf`);
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
