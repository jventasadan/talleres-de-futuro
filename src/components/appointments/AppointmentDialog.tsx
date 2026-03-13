import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import type { Appointment } from "@/hooks/useAppointments";
import { SERVICES, getEstimatedMinutes, formatDuration } from "@/lib/serviceEstimates";

const TIME_SLOTS = [
  "07:00","07:30","08:00","08:30","09:00","09:30","10:00","10:30",
  "11:00","11:30","12:00","12:30","13:00","13:30",
  "14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30","18:00",
];

const STATUSES = [
  { value: "recepcionado", label: "Recepcionado" },
  { value: "en_reparacion", label: "En reparación" },
  { value: "esperando_piezas", label: "Esperando piezas" },
  { value: "listo", label: "Listo" },
  { value: "cancelado", label: "Cancelado" },
];

interface AppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment?: Appointment | null;
  onSubmit: (data: Partial<Appointment>) => void;
  isLoading?: boolean;
}

export function AppointmentDialog({ open, onOpenChange, appointment, onSubmit, isLoading }: AppointmentDialogProps) {
  const isEditing = !!appointment;

  const [form, setForm] = useState({
    client_name: appointment?.client_name ?? "",
    license_plate: appointment?.license_plate ?? "",
    service: appointment?.service ?? "",
    problem: appointment?.notes ?? "",
    time_slot: appointment?.time_slot ?? "",
    status: appointment?.status ?? "recepcionado",
    notes: appointment?.notes ?? "",
  });

  const [dateObj, setDateObj] = useState<Date>(
    appointment?.date ? new Date(appointment.date) : new Date()
  );

  const estimatedTime = form.service ? formatDuration(getEstimatedMinutes(form.service)) : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      client_name: form.client_name,
      license_plate: form.license_plate.toUpperCase(),
      service: form.service,
      date: format(dateObj, "yyyy-MM-dd"),
      time_slot: form.time_slot || "09:00",
      status: form.status,
      notes: [form.problem, form.notes].filter(Boolean).join(" | ") || null,
    });
  };

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setForm({
        client_name: appointment?.client_name ?? "",
        license_plate: appointment?.license_plate ?? "",
        service: appointment?.service ?? "",
        problem: "",
        time_slot: appointment?.time_slot ?? "",
        status: appointment?.status ?? "recepcionado",
        notes: appointment?.notes ?? "",
      });
      setDateObj(appointment?.date ? new Date(appointment.date) : new Date());
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">{isEditing ? "Editar orden" : "Nueva orden"}</DialogTitle>
          <DialogDescription>{isEditing ? "Modifica los datos de la orden" : "Rellena los datos para crear una nueva orden"}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nombre del cliente</Label>
              <Input placeholder="Ej: Carlos García" value={form.client_name} onChange={(e) => setForm(f => ({ ...f, client_name: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>Matrícula</Label>
              <Input placeholder="Ej: 5454TRT" value={form.license_plate} onChange={(e) => setForm(f => ({ ...f, license_plate: e.target.value.toUpperCase() }))} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Tipo de servicio</Label>
            <Select value={form.service} onValueChange={(v) => setForm(f => ({ ...f, service: v }))}>
              <SelectTrigger><SelectValue placeholder="Selecciona servicio" /></SelectTrigger>
              <SelectContent>
                {SERVICES.map(s => <SelectItem key={s} value={s}>{s} ({formatDuration(getEstimatedMinutes(s))})</SelectItem>)}
              </SelectContent>
            </Select>
            {estimatedTime && <p className="text-[10px] text-muted-foreground">Tiempo estimado: {estimatedTime}</p>}
          </div>
          <div className="space-y-2">
            <Label>Descripción del problema</Label>
            <Textarea placeholder="Describe qué le pasa al vehículo..." value={form.problem} onChange={(e) => setForm(f => ({ ...f, problem: e.target.value }))} rows={2} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />{format(dateObj, "PPP", { locale: es })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateObj} onSelect={(d) => d && setDateObj(d)} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Hora</Label>
              <Select value={form.time_slot} onValueChange={(v) => setForm(f => ({ ...f, time_slot: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecciona hora" /></SelectTrigger>
                <SelectContent>{TIME_SLOTS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Estado</Label>
            <Select value={form.status} onValueChange={(v) => setForm(f => ({ ...f, status: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Notas adicionales (opcional)</Label>
            <Textarea placeholder="Notas adicionales..." value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isLoading}>{isLoading ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear orden"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
