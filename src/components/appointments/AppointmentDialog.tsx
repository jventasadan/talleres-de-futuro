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
  "07:00", "07:30", "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
  "17:00", "17:30", "18:00",
];

const SERVICES = [
  "Cambio de aceite",
  "Cambio de correas",
  "Cambiar correa de distribución",
  "Cambio de filtros",
  "Frenos",
  "Neumáticos",
  "Revisión general",
  "ITV Pre-inspección",
  "Diagnóstico",
  "Electricidad",
  "Aire acondicionado",
  "Chapa y pintura",
  "Otro",
];

const STATUSES = [
  { value: "recepcionado", label: "Recepcionado" },
  { value: "en_proceso", label: "En proceso" },
  { value: "reparado", label: "Reparado" },
  { value: "entregado", label: "Entregado" },
  { value: "cancelado", label: "Cancelado" },
];

interface AppointmentFormData {
  name: string;
  phone: string;
  brand: string;
  model: string;
  license_plate: string;
  problem: string;
  service_type: string;
  appointment_start: string;
  mechanic: string;
  status: string;
  notes: string;
}

interface AppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment?: Appointment | null;
  onSubmit: (data: Partial<Appointment>) => void;
  isLoading?: boolean;
}

function parseTime(dateStr: string | null): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch {
    return "";
  }
}

function parseDate(dateStr: string | null): Date {
  if (!dateStr) return new Date();
  try {
    return new Date(dateStr);
  } catch {
    return new Date();
  }
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
    name: appointment?.name ?? "",
    phone: appointment?.phone ?? "",
    brand: appointment?.brand ?? "",
    model: appointment?.model ?? "",
    license_plate: appointment?.license_plate ?? "",
    problem: appointment?.problem ?? "",
    service_type: appointment?.service_type ?? "",
    appointment_start: parseTime(appointment?.appointment_start ?? null),
    mechanic: appointment?.mechanic ?? "",
    status: appointment?.status ?? "recepcionado",
    notes: appointment?.notes ?? "",
  }));

  const [dateObj, setDateObj] = useState<Date>(
    parseDate(appointment?.appointment_start ?? null)
  );

  const handleDateSelect = (date: Date | undefined) => {
    if (date) setDateObj(date);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dateStr = format(dateObj, "yyyy-MM-dd");
    const startIso = `${dateStr}T${form.appointment_start || "09:00"}:00`;

    onSubmit({
      name: form.name,
      phone: form.phone,
      brand: form.brand,
      model: form.model,
      license_plate: form.license_plate.toUpperCase(),
      problem: form.problem,
      service_type: form.service_type,
      appointment_start: startIso,
      mechanic: form.mechanic,
      status: form.status,
      notes: form.notes || null,
    });
  };

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setForm({
        name: appointment?.name ?? "",
        phone: appointment?.phone ?? "",
        brand: appointment?.brand ?? "",
        model: appointment?.model ?? "",
        license_plate: appointment?.license_plate ?? "",
        problem: appointment?.problem ?? "",
        service_type: appointment?.service_type ?? "",
        appointment_start: parseTime(appointment?.appointment_start ?? null),
        mechanic: appointment?.mechanic ?? "",
        status: appointment?.status ?? "recepcionado",
        notes: appointment?.notes ?? "",
      });
      setDateObj(parseDate(appointment?.appointment_start ?? null));
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">
            {isEditing ? "Editar cita" : "Nueva cita"}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? "Modifica los datos de la cita" : "Rellena los datos para crear una nueva cita"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Client info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del cliente</Label>
              <Input id="name" placeholder="Ej: Carlos García" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input id="phone" placeholder="Ej: 656232325" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
          </div>

          {/* Vehicle info */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="brand">Marca</Label>
              <Input id="brand" placeholder="Ej: Kia" value={form.brand} onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">Modelo</Label>
              <Input id="model" placeholder="Ej: Ceed" value={form.model} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="license_plate">Matrícula</Label>
              <Input id="license_plate" placeholder="Ej: 5454TRT" value={form.license_plate} onChange={(e) => setForm((f) => ({ ...f, license_plate: e.target.value.toUpperCase() }))} required />
            </div>
          </div>

          {/* Service */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Tipo de servicio</Label>
              <Select value={form.service_type} onValueChange={(v) => setForm((f) => ({ ...f, service_type: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecciona servicio" /></SelectTrigger>
                <SelectContent>
                  {SERVICES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="problem">Problema / Avería</Label>
              <Input id="problem" placeholder="Describe el problema" value={form.problem} onChange={(e) => setForm((f) => ({ ...f, problem: e.target.value }))} />
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dateObj && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(dateObj, "PPP", { locale: es })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateObj} onSelect={handleDateSelect} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Hora</Label>
              <Select value={form.appointment_start} onValueChange={(v) => setForm((f) => ({ ...f, appointment_start: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecciona hora" /></SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Mechanic & Status */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="mechanic">Mecánico</Label>
              <Input id="mechanic" placeholder="Ej: Oliver Ventas" value={form.mechanic} onChange={(e) => setForm((f) => ({ ...f, mechanic: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Textarea id="notes" placeholder="Notas adicionales..." value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear cita"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
