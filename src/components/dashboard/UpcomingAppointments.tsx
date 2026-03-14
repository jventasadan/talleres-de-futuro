import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAppointments } from "@/hooks/useAppointments";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const statusStyles: Record<string, string> = {
  recepcionado: "bg-primary/20 text-primary border-primary/30",
  en_reparacion: "bg-info/20 text-info border-info/30",
  listo: "bg-success/20 text-success border-success/30",
  entregado: "bg-muted text-muted-foreground border-border",
  cancelado: "bg-destructive/20 text-destructive border-destructive/30",
};

export function UpcomingAppointments() {
  const today = format(new Date(), "yyyy-MM-dd");
  const { data: appointments, isLoading } = useAppointments(today);
  const active = (appointments ?? []).filter((a) => a.status !== "cancelado");
  const navigate = useNavigate();

  const handleTitleClick = () => {
    navigate("/weekly?today=true");
  };

  const handleClientClick = (clientName: string, licensePlate: string) => {
    navigate(`/clients?search=${encodeURIComponent(clientName || licensePlate)}`);
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle
          className="font-display text-base font-bold cursor-pointer hover:text-primary transition-colors"
          onClick={handleTitleClick}
        >
          Órdenes del día →
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !active.length ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No hay órdenes para hoy</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Cliente</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Servicio</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {active.map((apt) => {
                const statusClass = statusStyles[apt.status ?? "recepcionado"] ?? statusStyles.recepcionado;
                return (
                  <TableRow key={apt.id} className="border-border/30 hover:bg-secondary/50">
                    <TableCell>
                      <div
                        className="cursor-pointer hover:text-primary transition-colors"
                        onClick={() => handleClientClick(apt.client_name, apt.license_plate)}
                      >
                        <p className="font-medium text-sm">{apt.client_name || "Desconocido"}</p>
                        <p className="text-xs text-muted-foreground font-mono">{apt.license_plate}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{apt.service || "Sin servicio"}</p>
                      <p className="text-xs text-muted-foreground">{apt.time_slot}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] font-semibold border ${statusClass}`}>
                        {apt.status ?? "Recepcionado"}
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
