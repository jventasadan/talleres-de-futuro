import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Save, Wrench, Phone, Clock, DollarSign, Loader2 } from "lucide-react";
import { useWorkshopSettings, useSaveWorkshopSettings } from "@/hooks/useWorkshopSettings";
import { MechanicsManager } from "@/components/settings/MechanicsManager";
import { toast } from "sonner";

const SettingsPage = () => {
  const { data: settings, isLoading } = useWorkshopSettings();
  const saveSettings = useSaveWorkshopSettings();

  const [form, setForm] = useState({
    workshop_name: "",
    cif: "",
    phone: "",
    email: "",
    address: "",
    labor_rate: "35",
  });

  useEffect(() => {
    if (settings) {
      setForm({
        workshop_name: settings.workshop_name ?? "",
        cif: settings.cif ?? "",
        phone: settings.phone ?? "",
        email: settings.email ?? "",
        address: settings.address ?? "",
        labor_rate: String(settings.labor_rate ?? 35),
      });
    }
  }, [settings]);

  const handleSave = () => {
    saveSettings.mutate({
      workshop_name: form.workshop_name,
      cif: form.cif,
      phone: form.phone,
      email: form.email,
      address: form.address,
      labor_rate: Number(form.labor_rate) || 35,
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Configuración" subtitle="Ajustes del taller">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Configuración" subtitle="Ajustes del taller y asistente de voz">
      <div className="max-w-2xl space-y-6">
        {/* Workshop Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="font-display text-base">Datos del taller</CardTitle>
                <CardDescription>Información básica para facturas</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nombre del taller</Label>
                <Input value={form.workshop_name} onChange={(e) => setForm(f => ({ ...f, workshop_name: e.target.value }))} placeholder="Taller García e Hijos" />
              </div>
              <div className="space-y-2">
                <Label>CIF / NIF</Label>
                <Input value={form.cif} onChange={(e) => setForm(f => ({ ...f, cif: e.target.value }))} placeholder="B12345678" />
              </div>
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+34 912 345 678" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} placeholder="taller@ejemplo.com" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Dirección</Label>
                <Input value={form.address} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Calle del Motor 42, Madrid" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Labor Rate */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="font-display text-base">Tarifa de mano de obra</CardTitle>
                <CardDescription>Precio por hora usado en facturación</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min="0"
                step="0.5"
                value={form.labor_rate}
                onChange={(e) => setForm(f => ({ ...f, labor_rate: e.target.value }))}
                className="max-w-[120px]"
              />
              <span className="text-sm text-muted-foreground">€ / hora</span>
            </div>
          </CardContent>
        </Card>

        {/* Mechanics */}
        <MechanicsManager />

        {/* Voice Assistant */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="font-display text-base">Asistente de voz IA</CardTitle>
                <CardDescription>Configuración de VAPI para llamadas automáticas</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Asistente activado</p>
                <p className="text-xs text-muted-foreground">El asistente contestará las llamadas automáticamente</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Mensaje de bienvenida</Label>
              <Input defaultValue="Hola, bienvenido a Taller García e Hijos. ¿En qué puedo ayudarle?" />
            </div>
            <div className="space-y-2">
              <Label>VAPI API Key</Label>
              <Input type="password" placeholder="vapi_xxxxxxxxxxxx" />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button size="lg" onClick={handleSave} disabled={saveSettings.isPending}>
            {saveSettings.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Guardar cambios
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;
