import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, Download, CheckCircle } from "lucide-react";
import { useInvoices, useUpdateInvoiceStatus, type Invoice } from "@/hooks/useInvoices";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useWorkshop } from "@/contexts/WorkshopContext";
import { supabase } from "@/integrations/supabase/client";
import { jsPDF } from "jspdf";

async function fetchInvoiceLines(invoiceId: string, workshopId: string | null) {
  if (!workshopId) return [];

  const { data, error } = await (supabase as any)
    .from("invoice_lines")
    .select("*")
    .eq("invoice_id", invoiceId)
    .eq("workshop_id", workshopId)
    .order("created_at", { ascending: true });

  if (!error && data?.length) return data;

  // Fallback: fetch from order_parts via appointment
  return [];
}

async function fetchInvoiceParts(appointmentId: string, workshopId: string | null) {
  if (!workshopId) return [];

  const { data: orderParts } = await supabase
    .from("order_parts")
    .select("*")
    .eq("appointment_id", appointmentId)
    .eq("workshop_id", workshopId) as any;

  return orderParts ?? [];
}

async function generateProfessionalPdf(
  invoice: Invoice,
  settings: any,
  workshopId: string | null,
) {
  // Try invoice_lines first, fallback to order_parts
  let lines = await fetchInvoiceLines(invoice.id, workshopId);
  if (!lines.length) {
    const parts = await fetchInvoiceParts(invoice.appointment_id, workshopId);
    lines = parts.map((p: any) => ({
      description: p.name ?? "Pieza",
      quantity: p.quantity ?? 1,
      unit_price: Number(p.unit_price ?? 0),
      total: (p.quantity ?? 1) * Number(p.unit_price ?? 0),
      line_type: "part",
    }));
    if (Number(invoice.labor_cost) > 0) {
      lines.push({
        description: "Mano de obra",
        quantity: 1,
        unit_price: Number(invoice.labor_cost),
        total: Number(invoice.labor_cost),
        line_type: "labor",
      });
    }
  }

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

  // Header bar
  doc.setFillColor(34, 197, 94);
  doc.rect(0, 0, pageWidth, 40, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text(wName, margin, 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(220, 255, 220);
  const headerLine = [wCif ? `CIF: ${wCif}` : "", wPhone ? `Tlf: ${wPhone}` : "", wEmail].filter(Boolean).join(" | ");
  doc.text(headerLine, margin, 27);
  if (wAddress) doc.text(wAddress, margin, 33);

  y = 50;

  // Invoice title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(30, 30, 30);
  doc.text(`FACTURA ${invoice.invoice_number}`, margin, y);

  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Fecha: ${new Date(invoice.created_at).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })}`, margin, y);

  // Client info box
  y += 12;
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(margin, y, contentWidth, 28, 3, 3, "F");
  y += 7;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  doc.text("DATOS DEL CLIENTE", margin + 5, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.text(`Cliente: ${invoice.client_name}`, margin + 5, y);
  y += 5;
  doc.text(`Matrícula: ${invoice.license_plate}`, margin + 5, y);
  y += 5;
  doc.text(`Servicio: ${invoice.service}`, margin + 5, y);

  // Lines table
  y += 15;
  const colX = {
    name: margin,
    qty: margin + contentWidth * 0.55,
    price: margin + contentWidth * 0.7,
    total: margin + contentWidth * 0.85,
  };

  doc.setFillColor(34, 197, 94);
  doc.rect(margin, y - 5, contentWidth, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text("DESCRIPCIÓN", colX.name + 3, y);
  doc.text("CANT.", colX.qty, y);
  doc.text("P. UNIT.", colX.price, y);
  doc.text("TOTAL", colX.total, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(50, 50, 50);

  if (!lines.length) {
    doc.setFontSize(9);
    doc.text("Sin conceptos registrados", colX.name + 3, y + 4);
    y += 10;
  } else {
    lines.forEach((line: any, index: number) => {
      if (index % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(margin, y - 3, contentWidth, 7, "F");
      }
      doc.setFontSize(9);
      doc.text(String(line.description ?? "Concepto"), colX.name + 3, y + 1);
      doc.text(String(line.quantity ?? 1), colX.qty + 5, y + 1);
      doc.text(`${Number(line.unit_price ?? 0).toFixed(2)} €`, colX.price, y + 1);
      doc.text(`${Number(line.total ?? 0).toFixed(2)} €`, colX.total, y + 1);
      y += 7;
    });
  }

  // Separator
  y += 3;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, margin + contentWidth, y);

  // Totals
  y += 8;
  const totalsX = margin + contentWidth * 0.6;
  const valuesX = margin + contentWidth * 0.85;
  const subtotal = Number(invoice.parts_total) + Number(invoice.labor_cost);
  const taxAmount = subtotal * (Number(invoice.tax_rate) / 100);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text("Subtotal:", totalsX, y);
  doc.text(`${subtotal.toFixed(2)} €`, valuesX, y);
  y += 6;
  doc.text(`IVA (${Number(invoice.tax_rate)}%):`, totalsX, y);
  doc.text(`${taxAmount.toFixed(2)} €`, valuesX, y);
  y += 8;
  doc.setFillColor(34, 197, 94);
  doc.roundedRect(totalsX - 5, y - 5, contentWidth * 0.45, 12, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text("TOTAL:", totalsX, y + 3);
  doc.text(`${Number(invoice.total).toFixed(2)} €`, valuesX, y + 3);

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 20;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, footerY - 5, margin + contentWidth, footerY - 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  const footerParts = [wName, wCif ? `CIF: ${wCif}` : "", wAddress].filter(Boolean).join(" · ");
  doc.text(footerParts, pageWidth / 2, footerY, { align: "center" });
  doc.text("Gracias por confiar en nosotros", pageWidth / 2, footerY + 5, { align: "center" });

  doc.save(`${invoice.invoice_number}.pdf`);
}

const Invoices = () => {
  const { data: invoices, isLoading } = useInvoices();
  const { data: settings } = useCompanySettings();
  const { workshopId } = useWorkshop();
  const updateStatus = useUpdateInvoiceStatus();

  const handleDownload = (inv: Invoice) => {
    generateProfessionalPdf(inv, settings, workshopId);
  };

  const handleMarkPaid = (inv: Invoice) => {
    updateStatus.mutate({ id: inv.id, status: "pagada" });
  };

  return (
    <DashboardLayout title="Facturas" subtitle="Facturas generadas automáticamente">
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !invoices?.length ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/40" />
            <p className="mt-3 text-sm font-medium text-muted-foreground">No hay facturas todavía</p>
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
                    {invoices.map((inv) => (
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
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleMarkPaid(inv)} title="Marcar como pagada">
                                <CheckCircle className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownload(inv)} title="Descargar factura PDF">
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
