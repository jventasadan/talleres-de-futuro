import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Plus, Search, User, Phone, Loader2, Car, ChevronLeft, Upload } from "lucide-react";
import { useClients, useCreateClient, type Client } from "@/hooks/useClients";
import { ClientDetailDialog } from "@/components/clients/ClientDetailDialog";
import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWorkshop } from "@/contexts/WorkshopContext";
import { useAuth } from "@/contexts/AuthContext";

const avatarColors = [
  "bg-primary/15 text-primary",
  "bg-success/15 text-success",
  "bg-warning/15 text-warning",
  "bg-destructive/15 text-destructive",
];

function getInitials(name: string | null): string {
  if (!name) return "??";
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function parseCSV(text: string): Array<Record<string, string>> {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(/[,;\t]/).map(h => h.trim().toLowerCase().replace(/['"]/g, ""));
  return lines.slice(1).map(line => {
    const values = line.split(/[,;\t]/).map(v => v.trim().replace(/^["']|["']$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ""; });
    return row;
  }).filter(r => Object.values(r).some(v => v));
}

function mapImportRow(row: Record<string, string>): { name: string; phone: string; license_plate: string; brand: string; model: string } | null {
  const name = row.nombre || row.name || row.cliente || row["nombre completo"] || "";
  const phone = row.telefono || row.teléfono || row.phone || row.tel || row.móvil || row.movil || "";
  const plate = (row.matricula || row.matrícula || row.license_plate || row.plate || row.matricula_vehiculo || "").toUpperCase();
  const brand = row.marca || row.brand || "";
  const model = row.modelo || row.model || "";
  if (!name && !plate) return null;
  return { name: name || "Sin nombre", phone, license_plate: plate || "SIN-MAT", brand, model };
}

interface ClientGroup {
  key: string;
  name: string;
  phone: string | null;
  email: string | null;
  vehicles: Client[];
}

function groupClients(clients: Client[]): ClientGroup[] {
  const map = new Map<string, ClientGroup>();
  for (const c of clients) {
    const name = (c.name ?? "").trim() || "Sin nombre";
    const phone = (c.phone ?? "").trim();
    const key = `${name.toLowerCase()}|${phone}`;
    let group = map.get(key);
    if (!group) {
      group = { key, name, phone: phone || null, email: c.email ?? null, vehicles: [] };
      map.set(key, group);
    }
    if (!group.email && c.email) group.email = c.email;
    group.vehicles.push(c);
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

const Clients = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<ClientGroup | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", license_plate: "", brand: "", model: "" });
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: clients, isLoading } = useClients();
  const createClient = useCreateClient();
  const { workshopId } = useWorkshop();
  const { user } = useAuth();

  useEffect(() => {
    const q = searchParams.get("search");
    if (q) setSearch(q);
  }, [searchParams]);

  const groups = groupClients(clients ?? []);
  const filteredGroups = groups.filter((g) => {
    const q = search.toLowerCase();
    if (!q) return true;
    if (g.name.toLowerCase().includes(q)) return true;
    if ((g.phone ?? "").includes(search)) return true;
    return g.vehicles.some(
      (v) =>
        (v.license_plate ?? "").toLowerCase().includes(q) ||
        (v.brand ?? "").toLowerCase().includes(q) ||
        (v.model ?? "").toLowerCase().includes(q)
    );
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createClient.mutate(
      { name: form.name, phone: form.phone || null, license_plate: form.license_plate, brand: form.brand || null, model: form.model || null },
      { onSuccess: () => { setDialogOpen(false); setForm({ name: "", phone: "", license_plate: "", brand: "", model: "" }); } }
    );
  };

  const handleVehicleClick = (vehicle: Client) => {
    if (vehicle.license_plate) {
      navigate(`/vehicle-history?plate=${encodeURIComponent(vehicle.license_plate)}`);
    } else {
      setSelectedClient(vehicle);
      setDetailOpen(true);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setImporting(true);

    try {
      let rows: Array<Record<string, string>> = [];

      if (file.name.endsWith(".csv") || file.name.endsWith(".txt")) {
        const text = await file.text();
        rows = parseCSV(text);
      } else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        const XLSX = await import("xlsx");
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { raw: false });
        rows = jsonData.map(r => {
          const mapped: Record<string, string> = {};
          Object.entries(r).forEach(([k, v]) => { mapped[k.toLowerCase().trim()] = String(v ?? ""); });
          return mapped;
        });
      } else {
        toast.error("Formato no soportado. Usa CSV, TXT o Excel (.xlsx/.xls)");
        setImporting(false);
        return;
      }

      const mapped = rows.map(mapImportRow).filter(Boolean) as Array<{ name: string; phone: string; license_plate: string; brand: string; model: string }>;
      if (!mapped.length) {
        toast.error("No se encontraron clientes válidos en el archivo");
        setImporting(false);
        return;
      }

      let imported = 0;
      let skipped = 0;

      for (const client of mapped) {
        const { data: existing } = await supabase
          .from("clients")
          .select("id")
          .eq("workshop_id", workshopId)
          .eq("license_plate", client.license_plate)
          .maybeSingle() as any;
        if (existing) { skipped++; continue; }

        await supabase.from("clients").insert({
          name: client.name,
          phone: client.phone || null,
          license_plate: client.license_plate,
          brand: client.brand || null,
          model: client.model || null,
          user_id: user.id,
        } as any);
        imported++;
      }

      toast.success(`${imported} clientes importados, ${skipped} duplicados omitidos`);
      window.location.reload();
    } catch (err: any) {
      toast.error("Error al importar: " + (err?.message ?? "Error desconocido"));
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const subtitle = selectedGroup
    ? `${selectedGroup.name} · ${selectedGroup.vehicles.length} vehículo${selectedGroup.vehicles.length !== 1 ? "s" : ""}`
    : "Base de datos de clientes del taller";

  return (
    <DashboardLayout title="Clientes" subtitle={subtitle}>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={selectedGroup ? "Buscar matrícula o modelo..." : "Buscar por nombre, teléfono, matrícula..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            {selectedGroup && (
              <Button variant="outline" onClick={() => setSelectedGroup(null)}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                Volver a clientes
              </Button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt,.xlsx,.xls"
              className="hidden"
              onChange={handleImportFile}
            />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importing}>
              <Upload className="mr-2 h-4 w-4" />
              {importing ? "Importando..." : "Importar"}
            </Button>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo cliente
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : selectedGroup ? (
          (() => {
            const q = search.toLowerCase();
            const vehicles = selectedGroup.vehicles.filter((v) => {
              if (!q) return true;
              return (
                (v.license_plate ?? "").toLowerCase().includes(q) ||
                (v.brand ?? "").toLowerCase().includes(q) ||
                (v.model ?? "").toLowerCase().includes(q)
              );
            });
            return (
              <div className="space-y-4">
                <Card>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary font-display text-sm font-bold">
                      {getInitials(selectedGroup.name)}
                    </div>
                    <div className="min-w-0">
                      <h2 className="font-display text-lg font-bold truncate">{selectedGroup.name}</h2>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        {selectedGroup.phone && (
                          <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{selectedGroup.phone}</span>
                        )}
                        {selectedGroup.email && (<span className="truncate">{selectedGroup.email}</span>)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                {!vehicles.length ? (
                  <p className="text-center text-sm text-muted-foreground py-12">Este cliente no tiene vehículos.</p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {vehicles.map((v) => (
                      <Card key={v.id} className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => handleVehicleClick(v)}>
                        <CardContent className="p-4 flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                            <Car className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{[v.brand, v.model].filter(Boolean).join(" ") || "Vehículo sin marca"}</p>
                            {v.license_plate && (
                              <Badge variant="outline" className="mt-1 text-[10px] font-mono">{v.license_plate}</Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            );
          })()
        ) : !filteredGroups.length ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <User className="h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 text-sm font-medium text-muted-foreground">No se encontraron clientes</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredGroups.map((g, i) => (
              <Card
                key={g.key}
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => setSelectedGroup(g)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-display text-xs font-bold ${avatarColors[i % avatarColors.length]}`}>
                      {getInitials(g.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium truncate">{g.name}</h3>
                      {g.phone && (
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" />{g.phone}
                        </p>
                      )}
                      <p className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Car className="h-3 w-3" />
                        {g.vehicles.length} vehículo{g.vehicles.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Nuevo Cliente</DialogTitle>
            <DialogDescription>Añade un nuevo cliente al taller</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input placeholder="Ej: Carlos García" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input placeholder="Ej: 656232325" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Matrícula</Label>
              <Input placeholder="Ej: 5454TRT" value={form.license_plate} onChange={(e) => setForm((f) => ({ ...f, license_plate: e.target.value.toUpperCase() }))} required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Marca</Label>
                <Input placeholder="Ej: Volkswagen" value={form.brand} onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Modelo</Label>
                <Input placeholder="Ej: Golf GTI" value={form.model} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createClient.isPending}>{createClient.isPending ? "Guardando..." : "Crear cliente"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ClientDetailDialog client={selectedClient} open={detailOpen} onOpenChange={setDetailOpen} />
    </DashboardLayout>
  );
};

export default Clients;
