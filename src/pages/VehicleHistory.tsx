import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Car, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkshop } from "@/contexts/WorkshopContext";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

interface HistoryEntry {
  id: string;
  date: string;
  order_number: string;
  service: string;
  status: string;
  labor_cost: number;
  parts_total: number;
  total: number;
  invoice_number: string | null;
}

const VehicleHistory = () => {
  const [plate, setPlate] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const { workshopId } = useWorkshop();

  const handleSearch = async () => {
    if (!plate.trim() || !workshopId) return;
    setLoading(true);
    setSearched(true);

    try {
      // Get appointments for this plate
      const { data: appointments } = await supabase
        .from("appointments")
        .select("*")
        .eq("workshop_id", workshopId)
        .ilike("license_plate", plate.trim().toUpperCase())
        .order("created_at", { ascending: false }) as any;

      if (!appointments?.length) {
        setHistory([]);
        setLoading(false);
        return;
      }

      // Get invoices for these appointments
      const appointmentIds = appointments.map((a: any) => a.id);
      const { data: invoices } = await supabase
        .from("invoices")
        .select("*")
        .eq("workshop_id", workshopId)
        .in("appointment_id", appointmentIds) as any;

      const invoiceMap: Record<string, any> = {};
      (invoices ?? []).forEach((inv: any) => {
        invoiceMap[inv.appointment_id] = inv;
      });

      const entries: HistoryEntry[] = appointments.map((apt: any) => {
        const inv = invoiceMap[apt.id];
        return {
          id: apt.id,
          date: apt.date || apt.created_at?.slice(0, 10) || "",
          order_number: `ORD-${apt.id.slice(0, 4).toUpperCase()}`,
          service: apt.service || "Sin servicio",
          status: apt.status || "pendiente",
          labor_cost: inv ? Number(inv.labor_cost) : 0,
          parts_total: inv ? Number(inv.parts_total) : 0,
          total: inv ? Number(inv.total) : 0,
          invoice_number: inv?.invoice_number ?? null,
        };
      });

      setHistory(entries);
    } catch (e: any) {
      console.error("Error fetching history:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <DashboardLayout title="Historial de Vehículo" subtitle="Consulta el historial completo de reparaciones por matrícula">
      <div className="space-y-4 max-w-4xl">
        <div className="flex gap-2">
          <div className="relative flex-1 max-w-sm">
            <Car className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Introduce la matrícula (ej: 1234ABC)"
              value={plate}
              onChange={(e) => setPlate(e.target.value.toUpperCase())}
              onKeyDown={handleKeyDown}
              className="pl-9 font-mono"
            />
          </div>
          <Button onClick={handleSearch} disabled={loading || !plate.trim()}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
            Buscar
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : searched && !history.length ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Car className="h-12 w-12 text-muted-foreground/40" />
            <p className="mt-3 text-sm font-medium text-muted-foreground">No se encontraron reparaciones para {plate}</p>
          </div>
        ) : history.length > 0 ? (
          <Card>
            <CardContent className="p-0">
              <div className="px-4 py-3 border-b bg-muted/30">
                <h3 className="font-display text-sm font-bold">Vehículo: <span className="font-mono text-primary">{plate}</span></h3>
                <p className="text-xs text-muted-foreground">{history.length} reparación(es) encontrada(s)</p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs">Fecha</TableHead>
                    <TableHead className="text-xs">Orden</TableHead>
                    <TableHead className="text-xs">Reparación</TableHead>
                    <TableHead className="text-xs">Estado</TableHead>
                    <TableHead className="text-xs text-right">Coste</TableHead>
                    <TableHead className="text-xs">Factura</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-xs">{entry.date ? new Date(entry.date).toLocaleDateString("es-ES") : "—"}</TableCell>
                      <TableCell className="font-mono text-xs font-semibold text-primary">{entry.order_number}</TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate">{entry.service}</TableCell>
                      <TableCell>
                        <Badge variant={entry.status === "listo" ? "default" : "secondary"} className="text-[10px]">
                          {entry.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-semibold">
                        {entry.total > 0 ? `${entry.total.toFixed(2)} €` : "—"}
                      </TableCell>
                      <TableCell>
                        {entry.invoice_number ? (
                          <span className="flex items-center gap-1 text-xs text-primary">
                            <FileText className="h-3 w-3" />
                            {entry.invoice_number}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </DashboardLayout>
  );
};

export default VehicleHistory;
