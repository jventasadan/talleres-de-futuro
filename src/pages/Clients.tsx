import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Plus, Search, User, Phone, Loader2, Car, ChevronLeft, Upload,
  Mail, Wrench, FileText, History, ChevronRight, Edit2, Trash2,
} from "lucide-react";
import { useClients, useCreateClient, useDeleteClient, type Client } from "@/hooks/useClients";
import { useAllAppointments } from "@/hooks/useAppointments";
import { useState, useEffect, useRef, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWorkshop } from "@/contexts/WorkshopContext";
import { useAuth } from "@/contexts/AuthContext";

// ── helpers ────────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  { bg: "bg-blue-500/20", text: "text-blue-400" },
  { bg: "bg-emerald-500/20", text: "text-emerald-400" },
  { bg: "bg-violet-500/20", text: "text-violet-400" },
  { bg: "bg-orange-500/20", text: "text-orange-400" },
  { bg: "bg-rose-500/20", text: "text-rose-400" },
  { bg: "bg-cyan-500/20", text: "text-cyan-400" },
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "??";
}

function avatarColor(idx: number) {
  return AVATAR_COLORS[idx % AVATAR_COLORS.length];
}

function parseCSV(text: string): Array<Record<string, string>> {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(/[,;\t]/).map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));
  return lines
    .slice(1)
    .map((line) => {
      const values = line.split(/[,;\t]/).map((v) => v.trim().replace(/^["']|["']$/g, ""));
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = values[i] ?? ""; });
      return row;
    })
    .filter((r) => Object.values(r).some((v) => v));
}

function mapImportRow(row: Record<string, string>) {
  const name = row.nombre || row.name || row.cliente || row["nombre completo"] || "";
  const phone = row.telefono || row.teléfono || row.phone || row.tel || row.móvil || row.movil || "";
  const plate = (row.matricula || row.matrícula || row.license_plate || row.plate || "").toUpperCase();
  const brand = row.marca || row.brand || "";
  const model = row.modelo || row.model || "";
  if (!name && !plate) return null;
  return { name: name || "Sin nombre", phone, license_plate: plate || "SIN-MAT", brand, model };
}

// ── types ──────────────────────────────────────────────────────────────────────

interface ClientGroup {
  key: string;
  name: string;
  phone: string | null;
  email: string | null;
  colorIdx: number;
  vehicles: Client[];
}

function groupClients(clients: Client[]): ClientGroup[] {
  const map = new Map<string, ClientGroup>();
  let idx = 0;
  for (const c of clients) {
    const name = (c.name ?? "").trim() || "Sin nombre";
    const phone = (c.phone ?? "").trim();
    const key = `${name.toLowerCase()}|${phone}`;
    if (!map.has(key)) {
      map.set(key, { key, name, phone: phone || null, email: c.email ?? null, colorIdx: idx++, vehicles: [] });
    }
    const group = map.get(key)!;
    if (!group.email && c.email) group.email = c.email;
    group.vehicles.push(c);
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

// ── sub-views ──────────────────────────────────────────────────────────────────

type View =
  | { type: "list" }
  | { type: "client"; group: ClientGroup }
  | { type: "vehicle"; group: ClientGroup; vehicle: Client };

// ── component ──────────────────────────────────────────────────────────────────

const Clients = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [view, setView] = useState<View>({ type: "list" });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", license_plate: "", brand: "", model: "" });
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: clients, isLoading } = useClients();
  const { data: appointments } = useAllAppointments();
  const createClient = useCreateClient();
  const deleteClient = useDeleteClient();
  const { workshopId } = useWorkshop();
  const { user } = useAuth();

  useEffect(() => {
    const q = searchParams.get("search");
    if (q) setSearch(q);
  }, [searchParams]);

  // Reset search when view changes
  useEffect(() => { setSearch(""); }, [view.type]);

  const groups = useMemo(() => groupClients(clients ?? []), [clients]);

  const filteredGroups = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return groups;
    return groups.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        (g.phone ?? "").includes(q) ||
        g.vehicles.some(
          (v) =>
            (v.license_plate ?? "").toLowerCase().includes(q) ||
            (v.brand ?? "").toLowerCase().includes(q) ||
            (v.model ?? "").toLowerCase().includes(q)
        )
    );
  }, [groups, search]);

  // vehicle history for current vehicle view
  const vehicleHistory = useMemo(() => {
    if (view.type !== "vehicle") return [];
    const v = view.vehicle;
    return (appointments ?? []).filter(
      (a) =>
        (v.license_plate && a.license_plate === v.license_plate) ||
        (v.name && a.client_name === v.name)
    );
  }, [view, appointments]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createClient.mutate(
      {
        name: form.name,
        phone: form.phone || null,
        license_plate: form.license_plate,
        brand: form.brand || null,
        model: form.model || null,
      },
      {
        onSuccess: () => {
          setDialogOpen(false);
          setForm({ name: "", phone: "", license_plate: "", brand: "", model: "" });
        },
      }
    );
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setImporting(true);
    try {
      let rows: Array<Record<string, string>> = [];
      if (file.name.match(/\.(csv|txt)$/i)) {
        rows = parseCSV(await file.text());
      } else if (file.name.match(/\.xlsx?$/i)) {
        const XLSX = await import("xlsx");
        const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        rows = (XLSX.utils.sheet_to_json<Record<string, string>>(ws, { raw: false })).map((r) => {
          const m: Record<string, string> = {};
          Object.entries(r).forEach(([k, v]) => { m[k.toLowerCase().trim()] = String(v ?? ""); });
          return m;
        });
      } else {
        toast.error("Formato no soportado. Usa CSV, TXT o Excel");
        return;
      }
      const mapped = rows.map(mapImportRow).filter(Boolean) as any[];
      if (!mapped.length) { toast.error("No se encontraron clientes válidos"); return; }
      let imported = 0, skipped = 0;
      for (const c of mapped) {
        const { data: ex } = await (supabase as any)
          .from("clients").select("id").eq("license_plate", c.license_plate).maybeSingle();
        if (ex) { skipped++; continue; }
        await (supabase as any).from("clients").insert({
          name: c.name, phone: c.phone || null, license_plate: c.license_plate,
          brand: c.brand || null, model: c.model || null,
          user_id: user.id, workshop_id: workshopId,
        });
        imported++;
      }
      toast.success(`${imported} clientes importados, ${skipped} duplicados omitidos`);
      window.location.reload();
    } catch (err: any) {
      toast.error("Error al importar: " + (err?.message ?? ""));
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ── breadcrumb title ─────────────────────────────────────────────────────────

  const subtitle =
    view.type === "vehicle"
      ? `${view.group.name} › ${[view.vehicle.brand, view.vehicle.model].filter(Boolean).join(" ") || view.vehicle.license_plate}`
      : view.type === "client"
      ? `${view.group.name} · ${view.group.vehicles.length} vehículo${view.group.vehicles.length !== 1 ? "s" : ""}`
      : `${groups.length} cliente${groups.length !== 1 ? "s" : ""}`;

  // ── render ───────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout title="Clientes" subtitle={subtitle}>
      <div className="space-y-4">

        {/* ── toolbar ── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            {view.type !== "list" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setView(view.type === "vehicle" ? { type: "client", group: view.group } : { type: "list" })
                }
                className="shrink-0"
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                {view.type === "vehicle" ? view.group.name : "Clientes"}
              </Button>
            )}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={
                  view.type === "vehicle"
                    ? "Buscar en historial…"
                    : view.type === "client"
                    ? "Buscar matrícula o modelo…"
                    : "Buscar por nombre, teléfono, matrícula…"
                }
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {view.type === "list" && (
            <div className="flex items-center gap-2">
              <input ref={fileInputRef} type="file" accept=".csv,.txt,.xlsx,.xls" className="hidden" onChange={handleImportFile} />
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={importing}>
                <Upload className="mr-2 h-4 w-4" />
                {importing ? "Importando…" : "Importar"}
              </Button>
              <Button size="sm" onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo cliente
              </Button>
            </div>
          )}
        </div>

        {/* ── loading ── */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
          </div>

        /* ── VEHICLE detail view ── */
        ) : view.type === "vehicle" ? (
          <VehicleDetail
            vehicle={view.vehicle}
            group={view.group}
            history={vehicleHistory}
            search={search}
            onNavigate={(plate) => navigate(`/vehicle-history?plate=${encodeURIComponent(plate)}`)}
            onNavigateInvoices={(plate) => navigate(`/invoices?plate=${encodeURIComponent(plate)}`)}
            onDelete={(id) => {
              deleteClient.mutate(id, {
                onSuccess: () => setView({ type: "client", group: view.group }),
              });
            }}
          />

        /* ── CLIENT vehicles view ── */
        ) : view.type === "client" ? (
          <ClientVehiclesView
            group={view.group}
            search={search}
            onSelectVehicle={(v) => setView({ type: "vehicle", group: view.group, vehicle: v })}
          />

        /* ── LIST view ── */
        ) : filteredGroups.length === 0 ? (
          <EmptyState onAdd={() => setDialogOpen(true)} hasSearch={!!search} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredGroups.map((g) => (
              <ClientCard
                key={g.key}
                group={g}
                onClick={() => setView({ type: "client", group: g })}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── New client dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Nuevo Cliente</DialogTitle>
            <DialogDescription>Añade un cliente y su vehículo al taller</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Nombre *</Label>
                <Input
                  placeholder="Ej: Carlos García"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input
                  placeholder="656 232 325"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Matrícula *</Label>
                <Input
                  placeholder="5454 TRT"
                  value={form.license_plate}
                  onChange={(e) => setForm((f) => ({ ...f, license_plate: e.target.value.toUpperCase() }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Marca</Label>
                <Input
                  placeholder="Volkswagen"
                  value={form.brand}
                  onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Modelo</Label>
                <Input
                  placeholder="Golf GTI"
                  value={form.model}
                  onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createClient.isPending}>
                {createClient.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Crear cliente
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

// ── CLIENT CARD ────────────────────────────────────────────────────────────────

function ClientCard({ group, onClick }: { group: ClientGroup; onClick: () => void }) {
  const color = avatarColor(group.colorIdx);
  return (
    <Card
      className="cursor-pointer border border-border/60 transition-all hover:border-primary/40 hover:shadow-md hover:shadow-primary/5"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold ${color.bg} ${color.text}`}
          >
            {getInitials(group.name)}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold truncate">{group.name}</h3>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              {group.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />{group.phone}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Car className="h-3 w-3" />
                {group.vehicles.length} vehículo{group.vehicles.length !== 1 ? "s" : ""}
              </span>
            </div>
            {group.vehicles.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {group.vehicles.slice(0, 3).map((v) => (
                  <Badge key={v.id} variant="secondary" className="text-[10px] font-mono px-1.5">
                    {v.license_plate || "—"}
                  </Badge>
                ))}
                {group.vehicles.length > 3 && (
                  <Badge variant="secondary" className="text-[10px] px-1.5">
                    +{group.vehicles.length - 3}
                  </Badge>
                )}
              </div>
            )}
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50" />
        </div>
      </CardContent>
    </Card>
  );
}

// ── CLIENT VEHICLES VIEW ───────────────────────────────────────────────────────

function ClientVehiclesView({
  group,
  search,
  onSelectVehicle,
}: {
  group: ClientGroup;
  search: string;
  onSelectVehicle: (v: Client) => void;
}) {
  const color = avatarColor(group.colorIdx);
  const q = search.toLowerCase();
  const vehicles = group.vehicles.filter(
    (v) =>
      !q ||
      (v.license_plate ?? "").toLowerCase().includes(q) ||
      (v.brand ?? "").toLowerCase().includes(q) ||
      (v.model ?? "").toLowerCase().includes(q)
  );

  return (
    <div className="space-y-4">
      {/* Client header card */}
      <Card className="border-border/60">
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full font-display text-lg font-bold ${color.bg} ${color.text}`}>
              {getInitials(group.name)}
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-xl font-bold">{group.name}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {group.phone && (
                  <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{group.phone}</span>
                )}
                {group.email && (
                  <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{group.email}</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vehicles */}
      <div>
        <p className="mb-3 text-sm font-medium text-muted-foreground">
          Selecciona un vehículo para ver su historial y facturas
        </p>
        {vehicles.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">No hay vehículos.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {vehicles.map((v) => (
              <Card
                key={v.id}
                className="cursor-pointer border border-border/60 transition-all hover:border-primary/40 hover:shadow-md hover:shadow-primary/5"
                onClick={() => onSelectVehicle(v)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Car className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate">
                        {[v.brand, v.model].filter(Boolean).join(" ") || "Vehículo sin marca"}
                      </p>
                      {v.license_plate && (
                        <Badge variant="outline" className="mt-1 text-[10px] font-mono">
                          {v.license_plate}
                        </Badge>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── VEHICLE DETAIL VIEW ────────────────────────────────────────────────────────

function VehicleDetail({
  vehicle,
  group,
  history,
  search,
  onNavigate,
  onNavigateInvoices,
  onDelete,
}: {
  vehicle: Client;
  group: ClientGroup;
  history: any[];
  search: string;
  onNavigate: (plate: string) => void;
  onNavigateInvoices: (plate: string) => void;
  onDelete: (id: string) => void;
}) {
  const color = avatarColor(group.colorIdx);
  const q = search.toLowerCase();

  const filteredHistory = history.filter(
    (a) =>
      !q ||
      (a.service ?? "").toLowerCase().includes(q) ||
      (a.status ?? "").toLowerCase().includes(q)
  );

  return (
    <div className="space-y-4">
      {/* Vehicle header */}
      <Card className="border-border/60">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Car className="h-7 w-7" />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold">
                  {[vehicle.brand, vehicle.model].filter(Boolean).join(" ") || "Vehículo"}
                </h2>
                {vehicle.license_plate && (
                  <Badge variant="outline" className="mt-1 font-mono text-sm">
                    {vehicle.license_plate}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => onDelete(vehicle.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Owner info */}
          <div className="flex items-center gap-3">
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${color.bg} ${color.text}`}>
              {getInitials(group.name)}
            </div>
            <div className="text-sm">
              <p className="font-medium">{group.name}</p>
              {group.phone && <p className="text-muted-foreground text-xs">{group.phone}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          className="h-auto py-3 flex-col gap-1.5"
          onClick={() => vehicle.license_plate && onNavigate(vehicle.license_plate)}
          disabled={!vehicle.license_plate}
        >
          <History className="h-5 w-5 text-primary" />
          <span className="text-xs font-medium">Ver historial completo</span>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-3 flex-col gap-1.5"
          onClick={() => vehicle.license_plate && onNavigateInvoices(vehicle.license_plate)}
          disabled={!vehicle.license_plate}
        >
          <FileText className="h-5 w-5 text-primary" />
          <span className="text-xs font-medium">Ver facturas</span>
        </Button>
      </div>

      {/* Recent repairs */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Wrench className="h-4 w-4 text-primary" />
            Reparaciones recientes ({history.length})
          </h3>
          {vehicle.license_plate && history.length > 0 && (
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => onNavigate(vehicle.license_plate!)}>
              Ver todas
            </Button>
          )}
        </div>

        {filteredHistory.length === 0 ? (
          <Card className="border-dashed border-border/40">
            <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
              <Wrench className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                {search ? "No hay resultados para esa búsqueda" : "Sin reparaciones registradas"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredHistory.slice(0, 5).map((apt) => (
              <Card key={apt.id} className="border-border/40">
                <CardContent className="p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{apt.service || "Sin servicio"}</p>
                    {apt.scheduled_date && (
                      <p className="text-xs text-muted-foreground">
                        {new Date(apt.scheduled_date).toLocaleDateString("es-ES")}
                      </p>
                    )}
                  </div>
                  {apt.status && (
                    <Badge
                      variant="outline"
                      className={`shrink-0 text-[10px] capitalize ${
                        apt.status === "completada"
                          ? "border-emerald-500/30 text-emerald-400"
                          : apt.status === "pendiente"
                          ? "border-orange-500/30 text-orange-400"
                          : "border-border"
                      }`}
                    >
                      {apt.status}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
            {history.length > 5 && (
              <p className="text-center text-xs text-muted-foreground pt-1">
                +{history.length - 5} más — usa «Ver historial completo»
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── EMPTY STATE ────────────────────────────────────────────────────────────────

function EmptyState({ onAdd, hasSearch }: { onAdd: () => void; hasSearch: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/40 mb-4">
        <User className="h-8 w-8 text-muted-foreground/50" />
      </div>
      <p className="font-semibold">{hasSearch ? "Sin resultados" : "No hay clientes aún"}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {hasSearch
          ? "Prueba con otro nombre, teléfono o matrícula"
          : "Añade tu primer cliente o importa desde un CSV"}
      </p>
      {!hasSearch && (
        <Button className="mt-4" onClick={onAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo cliente
        </Button>
      )}
    </div>
  );
}

export default Clients;
