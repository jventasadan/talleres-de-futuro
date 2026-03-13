import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { User, Car, Wrench, Clock, FileText } from "lucide-react";
import type { Appointment } from "@/hooks/useAppointments";

interface Props {
  appointment: Appointment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AppointmentDetailDialog({ appointment, open, onOpenChange }: Props) {
  if (!appointment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Detalle de Cita</DialogTitle>
          <DialogDescription>Información del cliente y servicio</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-primary" />
            <span className="font-medium">{appointment.client_name || "Sin nombre"}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Car className="h-4 w-4 text-muted-foreground" />
            <span className="font-mono">{appointment.license_plate || "---"}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Wrench className="h-4 w-4 text-muted-foreground" />
            <span>{appointment.service || "Sin servicio"}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{appointment.date} · {appointment.time_slot}</span>
          </div>
          {appointment.notes && (
            <div className="flex items-start gap-2 text-sm">
              <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
              <span className="text-muted-foreground">{appointment.notes}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Badge variant="outline">{appointment.status}</Badge>
          </div>
        </div>

        <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full mt-2">
          Cerrar
        </Button>
      </DialogContent>
    </Dialog>
  );
}
