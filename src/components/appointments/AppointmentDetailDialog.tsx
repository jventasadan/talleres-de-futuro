import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { User, Car, Wrench, Clock, FileText, Phone, ArrowRight } from "lucide-react";
import type { Appointment } from "@/hooks/useAppointments";
import { useUpdateAppointmentStatus } from "@/hooks/useAppointments";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const statusLabels: Record<string, string> = {
  espera: "En espera",
  recepcionado: "Recepcionado",
  en_reparacion: "En reparación",
  esperando_piezas: "Esperando piezas",
  listo: "Listo",
  facturado: "Facturado",
  entregado: "Entregado",
};

const statusColors: Record<string, string> = {
  espera: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  recepcionado: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  en_reparacion: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  esperando_piezas: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  listo: "bg-green-500/15 text-green-400 border-green-500/30",
  facturado: "bg-green-600/15 text-green-400 border-green-600/30",
  entregado: "bg-slate-500/15 text-slate-400 border-slate-500/30",
};

interface Props {
  appointment: Appointment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AppointmentDetailDialog({ appointment, open, onOpenChange }: Props) {
  const updateStatus = useUpdateAppointmentStatus();
  const navigate = useNavigate();

  if (!appointment) return null;

  const handleRecepcionar = () => {
    updateStatus.mutate({ id: appointment.id, status: "recepcionado" }, {
      onSuccess: () => {
        toast.success("Vehículo recepcionado. Aparecerá en el tablero de órdenes.");
        onOpenChange(false);
        navigate("/appointments");
      },
    });
  };

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
            <span className="font-semibold">{appointment.client_name || "Sin nombre"}</span>
          </div>
          {appointment.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <a href={`tel:${appointment.phone}`} className="hover:text-primary transition-colors">{appointment.phone}</a>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <Car className="h-4 w-4 text-muted-foreground" />
            <span className="font-mono">{appointment.license_plate || "---"}</span>
            {appointment.brand && <span className="text-muted-foreground">· {appointment.brand}</span>}
            {appointment.model && <span className="text-muted-foreground">{appointment.model}</span>}
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
            <Badge variant="outline" className={statusColors[appointment.status] ?? ""}>
              {statusLabels[appointment.status] ?? appointment.status}
            </Badge>
          </div>
        </div>

        <div className="flex gap-2 mt-2">
          {appointment.status === "espera" && (
            <Button onClick={handleRecepcionar} className="flex-1" disabled={updateStatus.isPending}>
              <ArrowRight className="mr-2 h-4 w-4" />
              Recepcionar vehículo
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} className={appointment.status === "espera" ? "" : "w-full"}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
