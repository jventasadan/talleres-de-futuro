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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { Appointment } from "@/hooks/useAppointments";

const TIME_SLOTS = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
  "17:00", "17:30",
];

const SERVICES = [
  "Revisión general",
  "Cambio de aceite",
  "Frenos",
  "Neumáticos",
  "ITV Pre-inspección",
  "Diagnóstico",
  "Electricidad",
  "Aire acondicionado",
  "Chapa y pintura",
  "Otro",
];

interface AppointmentFormData {
  client_name: string;
  license_plate: string;
  service: string;
  date: string;
  time_slot: string;
  status: string;
  notes: string;
}

interface AppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment?: Appointment | null;
  onSubmit: (data: AppointmentFormData) => void;
  isLoading?: boolean;
}

export function AppointmentDialog({
  open,
  onOpenChange,
  appointment,
  onSubmit,
  isLoading,
}: AppointmentDialogProps) {
  const isEditing = !!appointment;

  const [form, setForm] = useState<AppointmentFormData>(() => ({
    client_name: appointment?.client_name ?? "",
    license_plate: appointment?.license_plate ?? "",
    service: appointment?.service ?? "",
    date: appointment?.date ?? format(new Date(), "yyyy-MM-dd"),
    time_slot: appointment?.time_slot ?? "",
    status: appointment?.status ?? "pending",
    notes: appointment?.notes ?? "",
  }));

  const [dateObj, setDateObj] = useState<Date | undefined>(
    appointment?.date ? new Date(appointment.date + "T00:00:00") : new Date()
  );

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setDateObj(date);
      setForm((f) => ({ ...f, date: format(date, "yyyy-MM-dd") }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  // Reset form when dialog opens with new appointment
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setForm({
        client_name: appointment?.client_name ?? "",
        license_plate: appointment?.license_plate ?? "",
        service: appointment?.service ?? "",
        date: appointment?.date ?? format(new Date(), "yyyy-MM-dd"),
        time_slot: appointment?.time_slot ?? "",
        status: appointment?.status ?? "pending",
        notes: appointment?.notes ?? "",
      });
      setDateObj(
        appointment?.date ? new Date(appointment.date + "T00:00:00") : new Date()
      );
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">
            {isEditing ? "Editar cita" : "Nueva cita"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifica los datos de la cita"
              : "Rellena los datos para crear una nueva cita"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="client_name">Nombre del cliente</Label>
              <Input
                id="client_name"
                placeholder="Ej: Carlos García"
                value={form.client_name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, client_name: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="license_plate">Matrícula</Label>
              <Input
                id="license_plate"
                placeholder="Ej: 1234 ABC"
                value={form.license_plate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, license_plate: e.target.value.toUpperCase() }))
                }
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Servicio</Label>
            <Select
              value={form.service}
              onValueChange={(v) => setForm((f) => ({ ...f, service: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un servicio" />
              </SelectTrigger>
              <SelectContent>
                {SERVICES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateObj && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateObj
                      ? format(dateObj, "PPP", { locale: es })
                      : "Selecciona fecha"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateObj}
                    onSelect={handleDateSelect}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Hora</Label>
              <Select
                value={form.time_slot}
                onValueChange={(v) => setForm((f) => ({ ...f, time_slot: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona hora" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isEditing && (
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="confirmed">Confirmada</SelectItem>
                  <SelectItem value="in_progress">En curso</SelectItem>
                  <SelectItem value="completed">Completada</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Notas adicionales..."
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading
                ? "Guardando..."
                : isEditing
                ? "Guardar cambios"
                : "Crear cita"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
