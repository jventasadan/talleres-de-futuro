import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Phone, Mail, MapPin, CreditCard } from "lucide-react";
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
import { SERVICES, getEstimatedMinutes, formatDuration } from "@/lib/serviceEstimates";

const TIME_SLOTS = [
    "07:00","07:30","08:00","08:30","09:00","09:30","10:00","10:30",
    "11:00","11:30","12:00","12:30","13:00","13:30",
    "14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30","18:00",
  ];

interface ReceptionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: any) => void;
    isLoading?: boolean;
    defaultStatus?: string;
}

export function ReceptionDialog({ open, onOpenChange, onSubmit, isLoading, defaultStatus }: ReceptionDialogProps) {
    const [form, setForm] = useState({
          client_name: "",
          license_plate: "",
          brand: "",
          model: "",
          phone: "",
          email: "",
          nif: "",
          address: "",
          city: "",
          postal_code: "",
          province: "",
          km: "",
          service: "",
          problem: "",
          time_slot: "",
          notes: "",
    });
    const [dateObj, setDateObj] = useState(new Date());

  const estimatedTime = form.service ? formatDuration(getEstimatedMinutes(form.service)) : null;

  const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.service) return;
        onSubmit({
                client_name: form.client_name,
                license_plate: form.license_plate.toUpperCase(),
                brand: form.brand || null,
                model: form.model || null,
                phone: form.phone || null,
                email: form.email || null,
                nif: form.nif || null,
                address: form.address || null,
                city: form.city || null,
                postal_code: form.postal_code || null,
                province: form.province || null,
                km: form.km || null,
                service: form.service,
                date: format(dateObj, "yyyy-MM-dd"),
                time_slot: form.time_slot || "09:00",
                status: defaultStatus ?? "espera",
                notes: [form.problem, form.notes].filter(Boolean).join(" | ") || null,
                created_by: "manual",
        });
  };

  const handleOpenChange = (open: boolean) => {
        if (open) {
                setForm({ client_name: "", license_plate: "", brand: "", model: "", phone: "", email: "", nif: "", address: "", city: "", postal_code: "", province: "", km: "", service: "", problem: "", time_slot: "", notes: "" });
                setDateObj(new Date());
        }
        onOpenChange(open);
  };

  return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                                  <DialogTitle className="font-display">Nueva Cita</DialogTitle>DialogTitle>
                                  <DialogDescription>Agenda una nueva cita en el taller</DialogDescription>DialogDescription>
                        </DialogHeader>DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                                  <div className="grid gap-4 sm:grid-cols-3">
                                              <div className="space-y-2">
                                                            <Label>Nombre del cliente</Label>Label>
                                                            <Input placeholder="Ej: Carlos Garcia" value={form.client_name} onChange={(e) => setForm(f => ({ ...f, client_name: e.target.value }))} required />
                                              </div>div>
                                              <div className="space-y-2">
                                                            <Label>Telefono</Label>Label>
                                                            <div className="relative">
                                                                            <Phone className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                                                            <Input placeholder="Ej: 612345678" className="pl-9" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} />
                                                            </div>div>
                                              </div>div>
                                              <div className="space-y-2">
                                                            <Label>Email</Label>Label>
                                                            <div className="relative">
                                                                            <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                                                            <Input type="email" placeholder="Ej: cliente@email.com" className="pl-9" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
                                                            </div>div>
                                              </div>div>
                                  </div>div>
                                  <div className="grid gap-4 sm:grid-cols-3">
                                              <div className="space-y-2">
                                                            <Label>NIF / NIE</Label>Label>
                                                            <div className="relative">
                                                                            <CreditCard className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                                                            <Input placeholder="Ej: 12345678A" className="pl-9" value={form.nif} onChange={(e) => setForm(f => ({ ...f, nif: e.target.value.toUpperCase() }))} />
                                                            </div>div>
                                              </div>div>
                                              <div className="space-y-2 sm:col-span-2">
                                                            <Label>Direccion</Label>Label>
                                                            <div className="relative">
                                                                            <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                                                            <Input placeholder="Ej: Calle Mayor 1" className="pl-9" value={form.address} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} />
                                                            </div>div>
                                              </div>div>
                                  </div>div>
                                  <div className="grid gap-4 sm:grid-cols-3">
                                              <div className="space-y-2">
                                                            <Label>Ciudad</Label>Label>
                                                            <Input placeholder="Ej: Madrid" value={form.city} onChange={(e) => setForm(f => ({ ...f, city: e.target.value }))} />
                                              </div>div>
                                              <div className="space-y-2">
                                                            <Label>C.P.</Label>Label>
                                                            <Input placeholder="28001" value={form.postal_code} onChange={(e) => setForm(f => ({ ...f, postal_code: e.target.value }))} />
                                              </div>div>
                                              <div className="space-y-2">
                                                            <Label>Provincia</Label>Label>
                                                            <Input placeholder="Madrid" value={form.province} onChange={(e) => setForm(f => ({ ...f, province: e.target.value }))} />
                                              </div>div>
                                  </div>div>
                                  <div className="grid gap-4 sm:grid-cols-2">
                                              <div className="space-y-2">
                                                            <Label>Matricula</Label>Label>
                                                            <Input placeholder="Ej: 5454TRT" value={form.license_plate} onChange={(e) => setForm(f => ({ ...f, license_plate: e.target.value.toUpperCase() }))} required />
                                              </div>div>
                                              <div className="space-y-2">
                                                            <Label>Marca</Label>Label>
                                                            <Input placeholder="Ej: Volkswagen" value={form.brand} onChange={(e) => setForm(f => ({ ...f, brand: e.target.value }))} />
                                              </div>div>
                                  </div>div>
                                  <div className="grid gap-4 sm:grid-cols-3">
                                              <div className="space-y-2">
                                                            <Label>Modelo</Label>Label>
                                                            <Input placeholder="Ej: Golf GTI" value={form.model} onChange={(e) => setForm(f => ({ ...f, model: e.target.value }))} />
                                              </div>div>
                                              <div className="space-y-2">
                                                            <Label>Kilometros</Label>Label>
                                                            <Input placeholder="Ej: 125000" value={form.km} onChange={(e) => setForm(f => ({ ...f, km: e.target.value }))} />
                                              </div>div>
                                              <div className="space-y-2">
                                                            <Label>Tipo de servicio</Label>Label>
                                                            <Select value={form.service} onValueChange={(v) => setForm(f => ({ ...f, service: v }))}>
                                                                            <SelectTrigger><SelectValue placeholder="Selecciona servicio" /></SelectTrigger>SelectTrigger>
                                                                            <SelectContent>
                                                                              {SERVICES.map(s => {
  const dur = formatDuration(getEstimatedMinutes(s));
  return <SelectItem key={s} value={s}>{s} - {dur}</SelectItem>;
})}

                                                                            </SelectContent>SelectContent>
                                                            </Select>Select>
                                                {estimatedTime && <p className="text-[10px] text-muted-foreground">Tiempo estimado: {estimatedTime}</p>p>}
                                              </div>div>
                                  </div>div>
                                  <div className="space-y-2">
                                              <Label>Descripcion del problema</Label>Label>
                                              <Textarea placeholder="Describe que le pasa al vehiculo..." value={form.problem} onChange={(e) => setForm(f => ({ ...f, problem: e.target.value }))} rows={2} />
                                  </div>div>
                                  <div className="grid gap-4 sm:grid-cols-2">
                                              <div className="space-y-2">
                                                            <Label>Fecha</Label>Label>
                                                            <Popover>
                                                                            <PopoverTrigger asChild>
                                                                                              <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                                                                                                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                                                                                {format(dateObj, "PPP", { locale: es })}
                                                                                                </Button>Button>
                                                                            </PopoverTrigger>PopoverTrigger>
                                                                            <PopoverContent className="w-auto p-0" align="start">
                                                                                              <Calendar mode="single" selected={dateObj} onSelect={(d) => d && setDateObj(d)} initialFocus className="p-3 pointer-events-auto" />
                                                                            </PopoverContent>PopoverContent>
                                                            </Popover>Popover>
                                              </div>div>
                                              <div className="space-y-2">
                                                            <Label>Hora</Label>Label>
                                                            <Select value={form.time_slot} onValueChange={(v) => setForm(f => ({ ...f, time_slot: v }))}>
                                                                            <SelectTrigger><SelectValue placeholder="Selecciona hora" /></SelectTrigger>SelectTrigger>
                                                                            <SelectContent>
                                                                              {TIME_SLOTS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>SelectItem>)}
                                                                            </SelectContent>SelectContent>
                                                            </Select>Select>
                                              </div>div>
                                  </div>div>
                                  <div className="space-y-2">
                                              <Label>Notas adicionales (opcional)</Label>Label>
                                              <Textarea placeholder="Notas adicionales..." value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
                                  </div>div>
                                  <DialogFooter>
                                              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>Button>
                                              <Button type="submit" disabled={isLoading}>{isLoading ? "Guardando..." : "Agendar cita"}</Button>Button>
                                  </DialogFooter>DialogFooter>
                        </form>form>
                </DialogContent>DialogContent>
        </Dialog>Dialog>
      );
}</DialogContent>
