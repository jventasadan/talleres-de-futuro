import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
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
import { generatePdf, type PdfLine, type PdfSettings } from "@/lib/pdf-utils";

const db = supabase as any;


const safeText = (value: unknown, fallback = "") =>
  String(value ?? fallback)
    .replace(/[\r\n]+/g, " ")
    .trim() || fallback;


const Invoices = () => {
  const [urlParams] = useSearchParams();
  const [search, setSearch] = useState(urlParams.get("search") || "");
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
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => generatePdf({
                              title: `FACTURA ${inv.invoice_number}`,
                              date: new Date(inv.created_at).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" }),
                              filename: `${inv.invoice_number}.pdf`,
                              clientName: inv.client_name,
                              licensePlate: inv.license_plate,
                              service: inv.service,
                              lines: [],
                              taxRate: Number(inv.tax_rate ?? 21),
                            }, settings ?? {})} title="Descargar factura PDF">
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
