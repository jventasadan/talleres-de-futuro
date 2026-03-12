import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, Download } from "lucide-react";
import { useInvoices, type Invoice } from "@/hooks/useInvoices";

function generatePdfDownload(invoice: Invoice) {
  // Generate a simple text-based invoice for download
  const lines = [
    `FACTURA: ${invoice.invoice_number}`,
    `Fecha: ${new Date(invoice.created_at).toLocaleDateString("es-ES")}`,
    ``,
    `Cliente: ${invoice.client_name}`,
    `Matrícula: ${invoice.license_plate}`,
    `Servicio: ${invoice.service}`,
    ``,
    `--- DETALLE ---`,
    `Piezas: ${Number(invoice.parts_total).toFixed(2)} €`,
    `Mano de obra: ${Number(invoice.labor_cost).toFixed(2)} €`,
    `Subtotal: ${(Number(invoice.parts_total) + Number(invoice.labor_cost)).toFixed(2)} €`,
    `IVA (${Number(invoice.tax_rate)}%): ${((Number(invoice.parts_total) + Number(invoice.labor_cost)) * Number(invoice.tax_rate) / 100).toFixed(2)} €`,
    ``,
    `TOTAL: ${Number(invoice.total).toFixed(2)} €`,
    ``,
    `--- Talleres de Futuro ---`,
  ];

  const blob = new Blob([lines.join("\n")], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${invoice.invoice_number}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

const Invoices = () => {
  const { data: invoices, isLoading } = useInvoices();

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
            <p className="mt-3 text-sm font-medium text-muted-foreground">
              No hay facturas todavía
            </p>
            <p className="text-xs text-muted-foreground">
              Las facturas se generan automáticamente cuando una orden pasa a "Listo"
            </p>
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
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-primary">
                          {inv.invoice_number}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {new Date(inv.created_at).toLocaleDateString("es-ES")}
                        </td>
                        <td className="px-4 py-3 font-medium">{inv.client_name}</td>
                        <td className="px-4 py-3 font-mono text-xs">{inv.license_plate}</td>
                        <td className="px-4 py-3 text-xs">{inv.service}</td>
                        <td className="px-4 py-3 text-right font-mono font-semibold">
                          {Number(inv.total).toFixed(2)} €
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={inv.status === "pagada" ? "default" : "secondary"}>
                            {inv.status === "pagada" ? "Pagada" : "Emitida"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => generatePdfDownload(inv)}
                            title="Descargar factura"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </Button>
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
