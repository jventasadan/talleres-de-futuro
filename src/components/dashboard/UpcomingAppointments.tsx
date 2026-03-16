import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAppointments } from "@/hooks/useAppointments";
import { format } from "date-fns";
import { Loader2, Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const statusLabels: Record<string, string> = {
  espera: "En espera",
  recepcionado: "Recepcionado",
  en_reparacion: "En reparación",
  esperando_piezas: "Esperando piezas",
  listo: "Listo",
  facturado: "Facturado",
  entregado: "Entregado",
};

const statusStyles: Record<string, string> = {
  espera: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  recepcionado: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  en_reparacion: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  esperando_piezas: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  listo: "bg-green-500/15 text-green-400 border-green-500/30",
  facturado: "bg-green-600/15 text-green-400 border-green-600/30",
  entregado: "bg-muted text-muted-foreground border-border",
  cancelado: "bg-destructive/15 text-destructive border-destructive/30",
};

export function UpcomingAppointments() {
  const today = format(new Date(), "yyyy-MM-dd");
  const { data: appointments, isLoading } = useAppointments(today);
  const active = (appointments ?? []).filter((a) => a.status !== "cancelado");
  const navigate = useNavigate();

  return (
    <Card className="border-border/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle
            className="font-display text-base font-bold cursor-pointer hover:text-primary transition-colors"
            onClick={() => navigate("/weekly?today=true")}
          >
            Citas del día →
          </CardTitle>
          <Badge variant="secondary" className="text-xs">{active.length} citas</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !active.length ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No hay citas para hoy</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border/20 hover:bg-transparent">
                <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground">Hora</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground">Cliente</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground">Servicio</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {active.map((apt) => {
                const statusClass = statusStyles[apt.status ?? "espera"] ?? statusStyles.espera;
                return (
                  <TableRow key={apt.id} className="border-border/10 hover:bg-muted/30 cursor-pointer" onClick={() => navigate("/appointments")}>
                    <TableCell className="font-mono text-xs font-semibold text-primary/80">{apt.time_slot}</TableCell>
                    <TableCell>
                      <p className="font-medium text-sm">{apt.client_name || "Desconocido"}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{apt.license_plate}</p>
                      {apt.phone && (
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Phone className="h-2.5 w-2.5" />
                          {apt.phone}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{apt.service || "Sin servicio"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] font-semibold border ${statusClass}`}>
                        {statusLabels[apt.status] ?? apt.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
