import { useState, useEffect, useRef, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Wrench, Phone, Euro, Loader2, Upload, Package, Trash2, Building2, Users, TrendingUp, ImageIcon } from "lucide-react";
import { useCompanySettings, useSaveCompanySettings } from "@/hooks/useCompanySettings";
import { usePartsCatalog, useImportPartsCatalog, useDeletePartsCatalog } from "@/hooks/usePartsCatalog";
import { useWorkshop } from "@/contexts/WorkshopContext";
import { useInvoices } from "@/hooks/useInvoices";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { parsePartsFile } from "@/lib/partsImport";
import { MechanicsManager } from "@/components/settings/MechanicsManager";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLogoUrl } from "@/hooks/useLogoUrl";

const MAX_LOGO_DIMENSION = 512;

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("No se pudo leer el archivo"));
    };

    reader.onerror = () => {
      reject(reader.error ?? new Error("No se pudo leer el archivo"));
    };

    reader.readAsDataURL(file);
  });

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("No se pudo procesar la imagen"));
    image.src = src;
  });

const createInlineLogoUrl = async (file: File) => {
  const dataUrl = await fileToDataUrl(file);

  if (file.type === "image/svg+xml") {
    return dataUrl;
  }

  const image = await loadImage(dataUrl);
  const scale = Math.min(1, MAX_LOGO_DIMENSION / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");

  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("No se pudo preparar el logo");
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL("image/webp", 0.85);
};

const isMissingLogosBucketError = (message?: string | null) => /bucket not found/i.test(message ?? "");

const SettingsPage = () => {
  const { data: settings, isLoading } = useCompanySettings();
  const saveSettings = useSaveCompanySettings();
  const { data: partsCatalog } = usePartsCatalog();
  const importParts = useImportPartsCatalog();
  const deleteCatalog = useDeletePartsCatalog();
  const { workshopComplete } = useWorkshop();
  const { data: invoices } = useInvoices();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const { logoUrl: currentLogoUrl, saveLogo } = useLogoUrl();

  const monthlyRevenue = useMemo(() => {
    if (!invoices?.length) return [];
    const now = new Date();
    const months: { label: string; total: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const label = d.toLocaleDateString("es-ES", { month: "short", year: "numeric" });
      const total = invoices
        .filter((inv: any) => {
          const invDate = new Date(inv.created_at);
          return invDate.getFullYear() === year && invDate.getMonth() === month;
        })
        .reduce((sum: number, inv: any) => sum + Number(inv.total ?? 0), 0);
      months.push({ label, total });
    }
    return months;
  }, [invoices]);

  const [form, setForm] = useState({
    company_name: "",
    cif: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    postal_code: "",
    province: "",
    opening_time: "",
    closing_time: "",
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
        opening_time: settings.opening_time ?? "",
        closing_time: settings.closing_time ?? "",
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
      opening_time: form.opening_time,
      closing_time: form.closing_time,
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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    setLogoUploading(true);
    try {
      await saveLogo(file);
      toast.success("Logo guardado");
    } catch (err: any) {
      toast.error("Error al subir logo: " + (err?.message ?? "Error desconocido"));
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  const handleLogoDelete = async () => {
    try {
      await saveLogo(null);
      toast.success("Logo eliminado");
    } catch (err: any) {
      toast.error("Error al eliminar logo: " + (err?.message ?? "Error desconocido"));
    }
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
    <DashboardLayout title="Configuración" subtitle="Ajustes del taller y operaciones">
      <div className="max-w-3xl">
        {!workshopComplete && (
          <Alert className="border-warning/50 bg-warning/10 mb-6">
            <AlertDescription className="text-warning font-medium text-sm">
              ⚠️ Completa todos los datos del taller para poder utilizar la aplicación.
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="taller" className="space-y-6">
          <TabsList className="bg-muted/50 w-full justify-start">
            <TabsTrigger value="taller" className="gap-2"><Building2 className="h-3.5 w-3.5" />Datos del taller</TabsTrigger>
            <TabsTrigger value="tarifas" className="gap-2"><Euro className="h-3.5 w-3.5" />Tarifas</TabsTrigger>
            <TabsTrigger value="catalogo" className="gap-2"><Package className="h-3.5 w-3.5" />Catálogo</TabsTrigger>
            <TabsTrigger value="mecanicos" className="gap-2"><Users className="h-3.5 w-3.5" />Mecánicos</TabsTrigger>
            <TabsTrigger value="facturacion" className="gap-2"><TrendingUp className="h-3.5 w-3.5" />Facturación</TabsTrigger>
            <TabsTrigger value="ia" className="gap-2"><Phone className="h-3.5 w-3.5" />IA</TabsTrigger>
          </TabsList>

          <TabsContent value="taller">
            <Card className="border-border/30">
              <CardHeader>
                <CardTitle className="font-display text-base">Datos del taller</CardTitle>
                <CardDescription>Información básica para facturas y presupuestos</CardDescription>
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
                <Separator className="my-4" />
                <div className="space-y-3">
                  <div>
                    <Label>Horario del taller</Label>
                    <p className="text-xs text-muted-foreground">Hora habitual de apertura y cierre</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Apertura</Label>
                      <Input type="time" value={form.opening_time} onChange={(e) => setForm(f => ({ ...f, opening_time: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Cierre</Label>
                      <Input type="time" value={form.closing_time} onChange={(e) => setForm(f => ({ ...f, closing_time: e.target.value }))} />
                    </div>
                  </div>
                </div>
                <Separator className="my-4" />
                <div className="space-y-3">
                  <Label>Logo del taller</Label>
                  <div className="flex items-center gap-4">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-border/50 bg-muted/30 overflow-hidden">
                      {currentLogoUrl ? (
                        <img src={currentLogoUrl} alt="Logo" className="h-full w-full object-contain" />
                      ) : (
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="space-y-2">
                      <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => logoInputRef.current?.click()} disabled={logoUploading}>
                          {logoUploading ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Upload className="mr-2 h-3 w-3" />}
                          {currentLogoUrl ? "Cambiar logo" : "Subir logo"}
                        </Button>
                        {currentLogoUrl && (
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={handleLogoDelete}>
                            <Trash2 className="mr-1 h-3 w-3" />Eliminar
                          </Button>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground">PNG, JPG o SVG. Máximo 2MB.</p>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button onClick={handleSave} disabled={saveSettings.isPending}>
                    {saveSettings.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Guardar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tarifas">
            <Card className="border-border/30">
              <CardHeader>
                <CardTitle className="font-display text-base">Tarifas</CardTitle>
                <CardDescription>Mano de obra e IVA por defecto</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Tarifa mano de obra</Label>
                    <div className="flex items-center gap-2">
                      <Input type="number" min="0" step="0.5" value={form.labor_rate} onChange={(e) => setForm(f => ({ ...f, labor_rate: e.target.value }))} className="max-w-[120px]" />
                      <span className="text-sm text-muted-foreground">€ / hora</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>IVA por defecto</Label>
                    <div className="flex items-center gap-2">
                      <Input type="number" min="0" max="100" value={form.default_vat} onChange={(e) => setForm(f => ({ ...f, default_vat: e.target.value }))} className="max-w-[120px]" />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end pt-4">
                  <Button onClick={handleSave} disabled={saveSettings.isPending}>
                    {saveSettings.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Guardar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="catalogo">
            <Card className="border-border/30">
              <CardHeader>
                <CardTitle className="font-display text-base">Catálogo de piezas</CardTitle>
                <CardDescription>Importa tu base de datos de piezas con referencias y precios</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv,.docx" onChange={handleFileImport} className="hidden" />
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importParts.isPending}>
                    {importParts.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                    Importar archivo
                  </Button>
                  {(partsCatalog?.length ?? 0) > 0 && (
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => deleteCatalog.mutate()}>
                      <Trash2 className="mr-2 h-3 w-3" />Borrar catálogo
                    </Button>
                  )}
                </div>

                {(partsCatalog?.length ?? 0) > 0 && (
                  <div className="space-y-2">
                    <Badge variant="secondary">{partsCatalog?.length} piezas en catálogo</Badge>
                    <div className="max-h-64 overflow-y-auto rounded-lg border border-border/30">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/30 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium">Referencia</th>
                            <th className="px-3 py-2 text-left font-medium">Nombre</th>
                            <th className="px-3 py-2 text-right font-medium">Precio</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(partsCatalog ?? []).slice(0, 50).map((part) => (
                            <tr key={part.id} className="border-t border-border/20">
                              <td className="px-3 py-1.5 font-mono text-muted-foreground">{part.ref}</td>
                              <td className="px-3 py-1.5">{part.name}</td>
                              <td className="px-3 py-1.5 text-right font-mono">{part.price.toFixed(2)} €</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {(partsCatalog?.length ?? 0) > 50 && (
                        <div className="px-3 py-2 text-xs text-muted-foreground text-center bg-muted/20">
                          ... y {(partsCatalog?.length ?? 0) - 50} más
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Formatos soportados: .xlsx, .xls, .csv, .docx. Columnas: <strong>nombre</strong>, <strong>referencia</strong>, <strong>precio</strong>.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mecanicos">
            <MechanicsManager />
          </TabsContent>

          <TabsContent value="facturacion">
            <Card className="border-border/30">
              <CardHeader>
                <CardTitle className="font-display text-base">Ingresos mensuales</CardTitle>
                <CardDescription>Resumen de facturación de los últimos 6 meses</CardDescription>
              </CardHeader>
              <CardContent>
                {monthlyRevenue.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay facturas registradas aún.</p>
                ) : (
                  <div className="space-y-3">
                    {monthlyRevenue.map((m) => {
                      const maxTotal = Math.max(...monthlyRevenue.map(r => r.total), 1);
                      const pct = Math.round((m.total / maxTotal) * 100);
                      return (
                        <div key={m.label} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="capitalize font-medium">{m.label}</span>
                            <span className="font-mono font-semibold">{m.total.toFixed(2)} €</span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                    <Separator className="my-2" />
                    <div className="flex items-center justify-between text-sm font-bold">
                      <span>Total 6 meses</span>
                      <span className="font-mono">{monthlyRevenue.reduce((s, m) => s + m.total, 0).toFixed(2)} €</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ia">
            <Card className="border-border/30">
              <CardHeader>
                <CardTitle className="font-display text-base">Asistente de voz IA</CardTitle>
                <CardDescription>Configuración de llamadas automáticas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Asistente activado</p>
                    <p className="text-xs text-muted-foreground">Contestará las llamadas automáticamente</p>
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
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;
