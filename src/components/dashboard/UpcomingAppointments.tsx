import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PhoneCall, Wrench, Car } from "lucide-react";
import { useAppointments, type Appointment } from "@/hooks/useAppointments";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const statusStyles: Record<string, string> = {
  recepcionado: "bg-primary/20 text-primary border-primary/30",
  en_proceso: "bg-info/20 text-info border-info/30",
  reparado: "bg-success/20 text-success border-success/30",
  entregado: "bg-muted text-muted-foreground border-border",
  cancelado: "bg-destructive/20 text-destructive border-destructive/30",
};

export function UpcomingAppointments() {
  const today = format(new Date(), "yyyy-MM-dd");
  const { data: appointments, isLoading } = useAppointments(today);
  const active = (appointments ?? []).filter((a) => a.status !== "cancelado");

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-base font-bold">
          Llamadas Pendientes (VAPI & Presupuestos)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !active.length ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No hay citas pendientes para hoy
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Cliente</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Asunto / Vehículo</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Estado / Origen</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {active.map((apt) => {
                const vehicle = [apt.brand, apt.model].filter(Boolean).join(" ");
                const statusClass = statusStyles[apt.status ?? "recepcionado"] ?? statusStyles.recepcionado;
                return (
                  <TableRow key={apt.id} className="border-border/30 hover:bg-secondary/50">
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{apt.name || "Desconocido"}</p>
                        <p className="text-xs text-muted-foreground">{apt.phone || "Sin teléfono"}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{apt.problem || "Sin asunto"}</p>
                        <p className="text-xs text-muted-foreground">
                          {vehicle} {apt.license_plate ? `(${apt.license_plate})` : ""}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] font-semibold border ${statusClass}`}>
                        {apt.status ?? "Recepcionado"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" className="text-xs border-border/50">
                        <PhoneCall className="mr-1.5 h-3 w-3" />
                        Llamar
                      </Button>
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
