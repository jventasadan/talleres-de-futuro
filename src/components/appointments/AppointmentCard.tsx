import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Edit, MoreVertical, XCircle, Car, User } from "lucide-react";
import type { Appointment } from "@/hooks/useAppointments";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; dot: string }> = {
  recepcionado: { label: "Recepcionado", variant: "secondary", dot: "bg-warning" },
  en_reparacion: { label: "En reparación", variant: "outline", dot: "bg-primary" },
  esperando_piezas: { label: "Esperando piezas", variant: "outline", dot: "bg-emerald-500" },
  listo: { label: "Listo", variant: "default", dot: "bg-success" },
  entregado: { label: "Entregado", variant: "secondary", dot: "bg-muted-foreground" },
  cancelado: { label: "Cancelado", variant: "destructive", dot: "bg-destructive" },
};

interface AppointmentCardProps {
  appointment: Appointment;
  onEdit: (appointment: Appointment) => void;
  onCancel: (id: string) => void;
}

export function AppointmentCard({ appointment, onEdit, onCancel }: AppointmentCardProps) {
  const status = statusConfig[appointment.status ?? "recepcionado"] ?? statusConfig.recepcionado;
  const isCancelled = appointment.status === "cancelado";

  return (
    <div className={`group flex items-center gap-3 rounded-xl border p-3 transition-all hover:shadow-sm ${isCancelled ? "opacity-60" : "hover:bg-accent/50"}`}>
      <div className="flex w-14 shrink-0 flex-col items-center">
        <span className="font-mono text-sm font-bold">{appointment.time_slot}</span>
      </div>
      <div className="relative flex flex-col items-center self-stretch">
        <div className={`h-2.5 w-2.5 rounded-full ${status.dot} ring-2 ring-card`} />
        <div className="w-px flex-1 bg-border" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <p className="truncate text-sm font-medium">{appointment.client_name || "Sin nombre"}</p>
          <div className="flex items-center gap-2">
            <Badge variant={status.variant} className="text-[10px]">{status.label}</Badge>
            {!isCancelled && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(appointment)}>
                    <Edit className="mr-2 h-4 w-4" />Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onCancel(appointment.id)} className="text-destructive">
                    <XCircle className="mr-2 h-4 w-4" />Cancelar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          {appointment.license_plate && (
            <span className="flex items-center gap-1">
              <Car className="h-3 w-3" />
              <span className="font-mono">{appointment.license_plate}</span>
            </span>
          )}
          {appointment.service && <span className="truncate">{appointment.service}</span>}
        </div>
      </div>
    </div>
  );
}
