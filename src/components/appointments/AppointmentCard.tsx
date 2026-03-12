import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Edit, MoreVertical, Wrench, XCircle, Car } from "lucide-react";
import type { Appointment } from "@/hooks/useAppointments";

const statusConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive"; dot: string }
> = {
  pending: { label: "Pendiente", variant: "secondary", dot: "bg-warning" },
  confirmed: { label: "Confirmada", variant: "default", dot: "bg-success" },
  in_progress: { label: "En curso", variant: "outline", dot: "bg-primary" },
  completed: { label: "Completada", variant: "secondary", dot: "bg-muted-foreground" },
  cancelled: { label: "Cancelada", variant: "destructive", dot: "bg-destructive" },
};

interface AppointmentCardProps {
  appointment: Appointment;
  onEdit: (appointment: Appointment) => void;
  onCancel: (id: string) => void;
}

export function AppointmentCard({ appointment, onEdit, onCancel }: AppointmentCardProps) {
  const status = statusConfig[appointment.status] ?? statusConfig.pending;
  const isCancelled = appointment.status === "cancelled";

  return (
    <div
      className={`group flex items-center gap-3 rounded-xl border p-3 transition-all hover:shadow-sm ${
        isCancelled ? "opacity-60" : "hover:bg-accent/50"
      }`}
    >
      {/* Time */}
      <div className="flex w-14 shrink-0 flex-col items-center">
        <span className="font-mono text-sm font-bold">{appointment.time_slot}</span>
      </div>

      {/* Status dot + line */}
      <div className="relative flex flex-col items-center self-stretch">
        <div className={`h-2.5 w-2.5 rounded-full ${status.dot} ring-2 ring-card`} />
        <div className="w-px flex-1 bg-border" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <p className="truncate text-sm font-medium">{appointment.client_name}</p>
          <div className="flex items-center gap-2">
            <Badge variant={status.variant} className="text-[10px]">
              {status.label}
            </Badge>
            {!isCancelled && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(appointment)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onCancel(appointment.id)}
                    className="text-destructive"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Cancelar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          <Car className="h-3 w-3" />
          <span className="font-mono">{appointment.license_plate}</span>
          <span>·</span>
          <Wrench className="h-3 w-3" />
          <span className="truncate">{appointment.service}</span>
        </div>
        {appointment.notes && (
          <p className="mt-1 truncate text-[11px] text-muted-foreground italic">
            {appointment.notes}
          </p>
        )}
      </div>
    </div>
  );
}
