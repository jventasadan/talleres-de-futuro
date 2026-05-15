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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SERVICES, getEstimatedMinutes, formatDuration } from "@/lib/serviceEstimates";

const TIME_SLOTS = ["07:00","07:30","08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30","12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30","18:00"];

interface ReceptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
  isLoading?: boolean;
  defaultStatus?: string;
}

export function ReceptionDialog({ open, onOpenChange, onSubmit, isLoading, defaultStatus }: ReceptionDialogProps) {
  const [form, setForm] = useState({
    client_name: "", license_plate: "", brand: "", model: "",
    phone: "", email: "", nif: "", address: "", city: "",
    postal_code: "", province: "", km: "", service: "",
    problem: "", time_slot: "", notes: "",
  });
  const [dateObj, setDateObj] = useState(new Date());

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

  const handleOpenChange = (o: boolean) => {
    if (o) {
      setForm({ client_name: "", license_plate: "", brand: "", model: "", phone: "", email: "", nif: "", address: "", city: "", postal_code: "", province: "", km: "", service: "", problem: "", time_slot: "", notes: "" });
      setDateObj(new Date());
    }
    onOpenChange(o);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Nueva Cita</DialogTitle>
          <DialogDescription>Agenda una nueva cita en el taller</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Nombre del cliente</Label>
              <Input placeholder="Ej: Carlos Garcia" value={form.client_name} onChange={(e) => setForm(f => ({ ...f, client_name: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>Telefono</Label>
              <div className="relative">
                <Phone className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="612345678" className="pl-9" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <div className="relative">
                <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="email" placeholder="cliente@email.com" className="pl-9" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>NIF / NIE</Label>
              <div className="relative">
                <CreditCard className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="12345678A" className="pl-9" value={form.nif} onChange={(e) => setForm(f => ({ ...f, nif: e.target.value.toUpperCase() }))} />
              </div>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Direccion</Label>
              <div className="relative">
                <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Calle Mayor 1" className="pl-9" value={form.address} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} />
              </div>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Ciudad</Label>
              <Input placeholder="Madrid" value={form.city} onChange={(e) => setForm(f => ({ ...f, city: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>C.P.</Label>
              <Input placeholder="28001" value={form.postal_code} onChange={(e) => setForm(f => ({ ...f, postal_code: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Provincia</Label>
              <Input placeholder="Madrid" value={form.province} onChange={(e) => setForm(f => ({ ...f, province: e.target.value }))} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2​​​​​​​​​​​​​​​​
