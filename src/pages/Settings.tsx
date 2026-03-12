import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Save, Wrench, Phone, Clock } from "lucide-react";

const SettingsPage = () => {
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
                <CardDescription>Información básica de tu negocio</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre del taller</Label>
                <Input id="name" defaultValue="Taller García e Hijos" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input id="phone" defaultValue="+34 912 345 678" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="address">Dirección</Label>
                <Input id="address" defaultValue="Calle del Motor 42, Madrid" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Business Hours */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="font-display text-base">Horario de atención</CardTitle>
                <CardDescription>Configura tu horario para las citas</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="open">Hora de apertura</Label>
                <Input id="open" type="time" defaultValue="08:00" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="close">Hora de cierre</Label>
                <Input id="close" type="time" defaultValue="18:00" />
              </div>
            </div>
            <div className="space-y-3">
              <Label>Días laborables</Label>
              <div className="flex flex-wrap gap-2">
                {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((day, i) => (
                  <Button key={day} variant={i < 5 ? "default" : "outline"} size="sm">
                    {day}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

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
                <p className="text-xs text-muted-foreground">
                  El asistente contestará las llamadas automáticamente
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="greeting">Mensaje de bienvenida</Label>
              <Input
                id="greeting"
                defaultValue="Hola, bienvenido a Taller García e Hijos. ¿En qué puedo ayudarle?"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vapi-key">VAPI API Key</Label>
              <Input id="vapi-key" type="password" placeholder="vapi_xxxxxxxxxxxx" />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button size="lg">
            <Save className="mr-2 h-4 w-4" />
            Guardar cambios
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;
