import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Save, Wrench, Phone, DollarSign, Loader2, Upload, Package, Trash2 } from "lucide-react";
import { useCompanySettings, useSaveCompanySettings } from "@/hooks/useCompanySettings";
import { usePartsCatalog, useImportPartsCatalog, useDeletePartsCatalog } from "@/hooks/usePartsCatalog";
import { useWorkshop } from "@/contexts/WorkshopContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { parsePartsFile } from "@/lib/partsImport";
import { MechanicsManager } from "@/components/settings/MechanicsManager";
import { toast } from "sonner";

const SettingsPage = () => {
  const { data: settings, isLoading } = useCompanySettings();
  const saveSettings = useSaveCompanySettings();
  const { data: partsCatalog } = usePartsCatalog();
  const importParts = useImportPartsCatalog();
  const deleteCatalog = useDeletePartsCatalog();
  const { workshopComplete } = useWorkshop();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    company_name: "",
    cif: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    postal_code: "",
    province: "",
    labor_rate: "35",
    default_vat: "21",
  });

  useEffect(() => {
    if (settings) {
      setForm({
        company_name: settings.company_name ?? "",
        cif: settings.cif ?? "",
        phone: settings.phone ?? "",
        email: settings.email ?? "",
        address: settings.address ?? "",
        city: settings.city ?? "",
        postal_code: settings.postal_code ?? "",
        province: settings.province ?? "",
        labor_rate: String(settings.labor_rate ?? 35),
        default_vat: String(settings.default_vat ?? 21),
      });
    }
  }, [settings]);

  const handleSave = () => {
    saveSettings.mutate({
      company_name: form.company_name,
      cif: form.cif,
      phone: form.phone,
      email: form.email,
      address: form.address,
      city: form.city,
      postal_code: form.postal_code,
      province: form.province,
      labor_rate: Number(form.labor_rate) || 35,
      default_vat: Number(form.default_vat) || 21,
    });
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const rows = await parsePartsFile(file);
      importParts.mutate(rows);
    } catch (err: any) {
      toast.error(err?.message ?? "Error al leer el archivo");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
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
        {!workshopComplete && (
          <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
            <AlertDescription className="text-orange-800 dark:text-orange-200 font-medium">
              ⚠️ Completa todos los datos del taller (nombre, CIF, teléfono, email, dirección, ciudad, código postal y provincia) para poder utilizar la aplicación.
            </AlertDescription>
          </Alert>
        )}
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
                <Input value={form.company_name} onChange={(e) => setForm(f => ({ ...f, company_name: e.target.value }))} placeholder="Taller García e Hijos" />
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
                <Input value={form.address} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Calle del Motor 42" />
              </div>
              <div className="space-y-2">
                <Label>Ciudad</Label>
                <Input value={form.city} onChange={(e) => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Madrid" />
              </div>
              <div className="space-y-2">
                <Label>Código Postal</Label>
                <Input value={form.postal_code} onChange={(e) => setForm(f => ({ ...f, postal_code: e.target.value }))} placeholder="28001" />
              </div>
              <div className="space-y-2">
                <Label>Provincia</Label>
                <Input value={form.province} onChange={(e) => setForm(f => ({ ...f, province: e.target.value }))} placeholder="Madrid" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rates */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="font-display text-base">Tarifas</CardTitle>
                <CardDescription>Mano de obra e IVA por defecto</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Tarifa mano de obra</Label>
                <div className="flex items-center gap-2">
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
              </div>
              <div className="space-y-2">
                <Label>IVA por defecto</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={form.default_vat}
                    onChange={(e) => setForm(f => ({ ...f, default_vat: e.target.value }))}
                    className="max-w-[120px]"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Parts Catalog Import */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="font-display text-base">Catálogo de piezas</CardTitle>
                <CardDescription>Importa tu base de datos de piezas con referencias y precios (Excel, CSV o Word)</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,.docx"
                onChange={handleFileImport}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={importParts.isPending}
              >
                {importParts.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                Importar archivo
              </Button>
              {(partsCatalog?.length ?? 0) > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => deleteCatalog.mutate()}
                >
                  <Trash2 className="mr-2 h-3 w-3" />
                  Borrar catálogo
                </Button>
              )}
            </div>

            {(partsCatalog?.length ?? 0) > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{partsCatalog?.length} piezas</Badge>
                  <span className="text-xs text-muted-foreground">en el catálogo</span>
                </div>
                <div className="max-h-48 overflow-y-auto rounded-md border">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="px-3 py-1.5 text-left font-medium">Referencia</th>
                        <th className="px-3 py-1.5 text-left font-medium">Nombre</th>
                        <th className="px-3 py-1.5 text-right font-medium">Precio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(partsCatalog ?? []).slice(0, 50).map((part) => (
                        <tr key={part.id} className="border-t border-border/50">
                          <td className="px-3 py-1 font-mono text-muted-foreground">{part.ref}</td>
                          <td className="px-3 py-1">{part.name}</td>
                          <td className="px-3 py-1 text-right">{part.price.toFixed(2)} €</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {(partsCatalog?.length ?? 0) > 50 && (
                    <div className="px-3 py-1.5 text-xs text-muted-foreground text-center bg-muted/30">
                      ... y {(partsCatalog?.length ?? 0) - 50} más
                    </div>
                  )}
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              El archivo debe tener columnas: <strong>nombre/descripción</strong>, <strong>referencia</strong> y <strong>precio</strong>.
              Formatos soportados: .xlsx, .xls, .csv, .docx
            </p>
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
              <Input defaultValue="Hola, bienvenido a nuestro taller. ¿En qué puedo ayudarle?" />
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
