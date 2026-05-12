import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
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
  Plus, User, Phone, Loader2, Car, ChevronLeft,
  Upload, Mail, Wrench, FileText, History, ChevronRight, Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkshop } from "@/contexts/WorkshopContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// ── types ──────────────────────────────────────────────────────────────────────

interface Vehicle {
  id: string;
  license_plate: string;
  brand: string | null;
  model: string | null;
  phone: string | null;
  email: string | null;
}

interface ClientGroup {
  key: string;
  name: string;
  phone: string | null;
  email: string | null;
  colorIdx: number;
  vehicles: Vehicle[];
}

interface HistoryEntry {
  id: string;
  date: string;
  order_number: string;
  service: string;
  status: string;
  km: string;
  total: number;
  invoice_number: string | null;
}

type View =
  | { type: "list" }
  | { type: "client"; group: ClientGroup }
  | { type: "vehicle"; group: ClientGroup; vehicle: Vehicle };

// ── helpers ────────────────────────────────────────────────────────────────────

const COLORS = [
  { bg: "bg-blue-500/20", text: "text-blue-400" },
  { bg: "bg-emerald-500/20", text: "text-emerald-400" },
  { bg: "bg-violet-500/20", text: "text-violet-400" },
  { bg: "bg-orange-500/20", text: "text-orange-400" },
  { bg: "bg-rose-500/20", text: "text-rose-400" },
  { bg: "bg-cyan-500/20", text: "text-cyan-400" },
];

const color = (idx: number) => COLORS[idx % COLORS.length];

const initials = (name: string) =>
  name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "??";

const norm = (s: string) =>
  (s || "").trim().toLowerCase().replace(/\s+/g, " ");

function parseCSV(text: string): Array<Record<string, string>> {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(/[,;\t]/).map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));
  return lines.slice(1).map((line) => {
    const values = line.split(/[,;\t]/).map((v) => v.trim().replace(/^["']|["']$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ""; });
    return row;
  }).filter((r) => Object.values(r).some((v) => v));
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

// ── component ──────────────────────────────────────────────────────────────────

const Clients = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { workshopId } = useWorkshop();
  const { user } = useAuth();

  const [groups, setGroups] = useState<ClientGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<View>({ type: "list" });

  const [dialogOpen, setDialogOpen] = useState(false);
    const [form, setForm] = useState({ name: "", phone: "", email: "", nif: "", address: "", city: "", postal_code: "", province: "", license_plate: "", brand: "", model: "" });
  const [saving, setSaving] = useState(false);

  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [histLoading, setHistLoading] = useState(false);

  // ── Load data exactly like VehicleHistory ────────────────────────────────────
  const loadData = async () => {
    if (!workshopId) return;
    setLoading(true);
    try {
      // 1. clients table (trusted source of truth)
      // Fetch ALL accessible clients (RLS handles permissions)
      // Don't filter by workshop_id - clients table may not have it populated yet
      // New appointments will auto-populate clients via syncClientFromAppointment
      const { data: clientsRaw = [] } = await (supabase as any)
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });

      // 2. appointments (for vehicles that may not be in clients table)
      const { data: aptsRaw } = await (supabase as any)
        .from("appointments")
        .select("id,license_plate,client_name,name,phone,email,brand,model")
        .eq("workshop_id", workshopId)
        .order("created_at", { ascending: false });

      // If clients table is empty, auto-populate it from appointments (one-time backfill)
      if ((clientsRaw ?? []).length === 0 && (aptsRaw ?? []).length > 0) {
        const plateMap: Record<string, any> = {};
        for (const apt of aptsRaw) {
          const plate = (apt.license_plate || "").toUpperCase();
          const name = (apt.client_name || apt.name || "").trim();
          if (!plate || !name || plateMap[plate]) continue;
          plateMap[plate] = {
            name,
            license_plate: plate,
            phone: apt.phone || null,
            email: apt.email || null,
            brand: apt.brand || null,
            model: apt.model || null,
            workshop_id: workshopId,
          };
        }
        const toInsert = Object.values(plateMap);
        if (toInsert.length > 0) {
          // Insert in batches of 20
          for (let i = 0; i < toInsert.length; i += 20) {
            const batch = toInsert.slice(i, i + 20);
            const { error } = await (supabase as any).from("clients").insert(batch);
            if (error?.code === "42703") {
              const batchNoWid = batch.map((r: any) => { const c = {...r}; delete c.workshop_id; return c; });
              await (supabase as any).from("clients").insert(batchNoWid);
            }
          }
          // Re-fetch clients after backfill
          const { data: refetched } = await (supabase as any).from("clients").select("*").order("created_at", { ascending: false });
          if ((refetched ?? []).length > 0) {
            // Use refetched data below by reassigning
            (clientsRaw as any[]).push(...(refetched ?? []));
          }
        }
      }

      // Build groups: norm(name) -> ClientGroup
      const groupMap = new Map<string, ClientGroup>();
      let idx = 0;

      const getOrCreate = (rawName: string, phone: string | null, email: string | null) => {
        const key = norm(rawName) || "sin nombre";
        if (!groupMap.has(key)) {
          groupMap.set(key, { key, name: rawName.trim() || "Sin nombre", phone: phone || null, email: email || null, colorIdx: idx++, vehicles: [] });
        }
        const g = groupMap.get(key)!;
        if (!g.phone && phone) g.phone = phone;
        if (!g.email && email) g.email = email;
        return g;
      };

      // Process clients table
      const platesSeen = new Set<string>();
      for (const c of clientsRaw ?? []) {
        const name = (c.full_name || c.name || "").trim() || "Sin nombre";
        const plate = (c.license_plate || "").toUpperCase();
        const g = getOrCreate(name, c.phone || null, c.email || null);
        const plateKey = plate || `client-${c.id}`;
        if (!platesSeen.has(plateKey)) {
          platesSeen.add(plateKey);
          g.vehicles.push({
            id: c.id,
            license_plate: plate,
            brand: c.brand || null,
            model: c.model || null,
            phone: c.phone || null,
            email: c.email || null,
          });
        }
      }

      // Process appointments — add vehicles not already in clients
      for (const a of aptsRaw ?? []) {
        const plate = (a.license_plate || "").toUpperCase();
        if (!plate || platesSeen.has(plate)) continue;
        const name = (a.client_name || a.name || "").trim() || "Sin nombre";
        const g = getOrCreate(name, a.phone || null, a.email || null);
        platesSeen.add(plate);
        g.vehicles.push({
          id: `apt-${a.id}`,
          license_plate: plate,
          brand: a.brand || null,
          model: a.model || null,
          phone: a.phone || null,
          email: a.email || null,
        });
      }

      const sorted = Array.from(groupMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name, "es")
      );
      setGroups(sorted);
    } catch (e) {
      console.error("Error loading clients:", e);
      toast.error("Error al cargar clientes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [workshopId]);

  // Deep-link from global search: ?plate= or ?client=
  // Pre-fill search so results appear as soon as data loads
  useEffect(() => {
    const plateParam = searchParams.get("plate");
    const clientParam = searchParams.get("client");
    if (plateParam) setSearch(plateParam.toUpperCase());
    else if (clientParam) setSearch(clientParam);
  }, [searchParams]);

  // Once groups load, auto-open the matching group
  useEffect(() => {
    if (!groups.length) return;
    const plateParam = searchParams.get("plate");
    const clientParam = searchParams.get("client");
    if (plateParam) {
      const p = plateParam.toUpperCase();
      for (const g of groups) {
        const v = g.vehicles.find((v) => v.license_plate === p);
        if (v) { setView({ type: "client", group: g }); return; }
      }
    }
    if (clientParam) {
      const q = norm(clientParam);
      const g = groups.find((g) => norm(g.name).includes(q));
      if (g) { setView({ type: "client", group: g }); }
    }
  }, [groups]);

  // Load history for a vehicle
  const loadHistory = async (plate: string) => {
    if (!workshopId || !plate) return;
    setHistLoading(true);
    try {
      const { data: apts } = await (supabase as any)
        .from("appointments")
        .select("*")
        .eq("workshop_id", workshopId)
        .ilike("license_plate", plate)
        .order("created_at", { ascending: false });

      if (!apts?.length) { setHistory([]); return; }

      const aptIds = apts.map((a: any) => a.id);
      const { data: wos } = await (supabase as any)
        .from("work_orders").select("*").eq("workshop_id", workshopId).in("appointment_id", aptIds);
      const woMap: Record<string, any> = {};
      (wos ?? []).forEach((wo: any) => { woMap[wo.appointment_id] = wo; });

      const woIds = (wos ?? []).map((wo: any) => wo.id);
      let invMap: Record<string, any> = {};
      if (woIds.length) {
        const { data: invs } = await (supabase as any)
          .from("invoices").select("*").eq("workshop_id", workshopId).in("work_order_id", woIds);
        (invs ?? []).forEach((inv: any) => { if (inv.work_order_id) invMap[inv.work_order_id] = inv; });
      }

      setHistory(apts.map((apt: any) => {
        const wo = woMap[apt.id];
        const inv = wo ? invMap[wo.id] : null;
        return {
          id: apt.id,
          date: apt.date || apt.created_at?.slice(0, 10) || "",
          order_number: `ORD-${apt.id.slice(0, 4).toUpperCase()}`,
          service: apt.service || apt.service_type || "Sin servicio",
          status: apt.status || "pendiente",
          km: apt.km || "",
          total: inv ? Number(inv.total) : 0,
          invoice_number: inv?.invoice_number ?? null,
        };
      }));
    } catch (e) {
      console.error(e);
    } finally {
      setHistLoading(false);
    }
  };

  // When entering vehicle view, load history
  useEffect(() => {
    if (view.type === "vehicle" && view.vehicle.license_plate) {
      loadHistory(view.vehicle.license_plate);
    } else {
      setHistory([]);
    }
  }, [view]);

  // Delete vehicle (client record)
  const handleDelete = async (vehicle: Vehicle) => {
    if (vehicle.id.startsWith("apt-")) { toast.error("Este vehículo viene de una cita, no se puede eliminar aquí"); return; }
    try {
      await (supabase as any).from("clients").delete().eq("id", vehicle.id);
      toast.success("Vehículo eliminado");
      if (view.type === "vehicle") setView({ type: "client", group: view.group });
      loadData();
    } catch (e) {
      toast.error("Error al eliminar");
    }
  };

  // Create client
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: any = {
        name: form.name,
        phone: form.phone || null,
        license_plate: form.license_plate.toUpperCase(),
        brand: form.brand || null,
        model: form.model || null,
        workshop_id: workshopId,
        user_id: user?.id,
      };
      let { error } = await (supabase as any).from("clients").insert(payload);
      if (error?.code === "42703" || error?.message?.toLowerCase().includes("does not exist")) {
        delete payload.workshop_id;
        const res = await (supabase as any).from("clients").insert(payload);
        error = res.error;
      }
      if (error) throw error;
      toast.success("Cliente creado");
      setDialogOpen(false);
      setForm({ name: "", phone: "", license_plate: "", brand: "", model: "" });
      loadData();
    } catch (err: any) {
      toast.error("Error: " + (err?.message ?? ""));
    } finally {
      setSaving(false);
    }
  };

  // Import CSV/Excel
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      } else { toast.error("Formato no soportado"); return; }

      const mapped = rows.map(mapImportRow).filter(Boolean) as any[];
      if (!mapped.length) { toast.error("Sin clientes válidos"); return; }
      let imported = 0, skipped = 0;
      for (const c of mapped) {
        const { data: ex } = await (supabase as any).from("clients").select("id").eq("license_plate", c.license_plate).maybeSingle();
        if (ex) { skipped++; continue; }
        const payload: any = { name: c.name, phone: c.phone || null, license_plate: c.license_plate, brand: c.brand || null, model: c.model || null, user_id: user.id, workshop_id: workshopId };
        let { error } = await (supabase as any).from("clients").insert(payload);
        if (error?.code === "42703") { delete payload.workshop_id; await (supabase as any).from("clients").insert(payload); }
        imported++;
      }
      toast.success(`${imported} importados, ${skipped} duplicados omitidos`);
      loadData();
    } catch (err: any) { toast.error("Error al importar: " + (err?.message ?? "")); }
    finally { setImporting(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const filtered = useMemo(() => {
    const q = norm(search);
    if (!q) return groups;
    return groups.filter((g) =>
      norm(g.name).includes(q) ||
      (g.phone ?? "").includes(q) ||
      g.vehicles.some((v) =>
        v.license_plate.toLowerCase().includes(q) ||
        norm(v.brand ?? "").includes(q) ||
        norm(v.model ?? "").includes(q)
      )
    );
  }, [groups, search]);

  const subtitle =
    view.type === "vehicle"
      ? `${view.group.name} › ${[view.vehicle.brand, view.vehicle.model].filter(Boolean).join(" ") || view.vehicle.license_plate}`
      : view.type === "client"
      ? `${view.group.name} · ${view.group.vehicles.length} vehículo${view.group.vehicles.length !== 1 ? "s" : ""}`
      : `${groups.length} cliente${groups.length !== 1 ? "s" : ""}`;

  return (
    <DashboardLayout title="Clientes" subtitle={subtitle}>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {view.type !== "list" && (
              <Button variant="ghost" size="sm" className="shrink-0"
                onClick={() => setView(view.type === "vehicle" ? { type: "client", group: view.group } : { type: "list" })}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                {view.type === "vehicle" ? view.group.name : "Clientes"}
              </Button>
            )}
          </div>
          {view.type === "list" && (
            <div className="flex items-center gap-2">
              <input ref={fileRef} type="file" accept=".csv,.txt,.xlsx,.xls" className="hidden" onChange={handleImport} />
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={importing}>
                <Upload className="mr-2 h-4 w-4" />{importing ? "Importando…." : "Importar"}
              </Button>
              <Button size="sm" onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />Nuevo cliente
              </Button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>
        ) : view.type === "vehicle" ? (
          <VehicleView
            vehicle={view.vehicle}
            group={view.group}
            history={history}
            histLoading={histLoading}
            onNavigateHistory={(p) => navigate(`/vehicle-history?plate=${encodeURIComponent(p)}`)}
            onNavigateInvoices={(p) => navigate(`/invoices?plate=${encodeURIComponent(p)}`)}
            onDelete={handleDelete}
          />
        ) : view.type === "client" ? (
          <ClientView group={view.group} onSelectVehicle={(v) => setView({ type: "vehicle", group: view.group, vehicle: v })} />
        ) : (
          <>
            <div className="relative max-w-sm">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, teléfono, matrícula…."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            {filtered.length === 0 ? (
              <EmptyState hasSearch={!!search} onAdd={() => setDialogOpen(true)} />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((g) => (
                  <ClientCard key={g.key} group={g} onClick={() => setView({ type: "client", group: g })} />
                ))}
              </div>
            )}
          </>
         )}
      </div>
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
                <Input placeholder="Ej: Carlos García" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input placeholder="656 232 325" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" placeholder="correo@ejemplo.com" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>NIF</Label>
                <Input placeholder="12345678A" value={form.nif} onChange={(e) => setForm((f) => ({ ...f, nif: e.target.value }))} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Dirección</Label>
                <Input placeholder="Calle Mayor 1" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Ciudad</Label>
                <Input placeholder="Madrid" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Código Postal</Label>
                <Input placeholder="28001" value={form.postal_code} onChange={(e) => setForm((f) => ({ ...f, postal_code: e.target.value }))} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Provincia</Label>
                <Input placeholder="Madrid" value={form.province} onChange={(e) => setForm((f) => ({ ...f, province: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Matrícula *</Label>
                <Input placeholder="5454 TRT" value={form.license_plate} onChange={(e) => setForm((f) => ({ ...f, license_plate: e.target.value.toUpperCase() }))} required />
              </div>
              <div className="space-y-2">
                <Label>Marca</Label>
                <Input placeholder="Volkswagen" value={form.brand} onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Modelo</Label>
                <Input placeholder="Golf GTI" value={form.model} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Crear cliente
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

function ClientCard({ group, onClick }: { group: ClientGroup; onClick: () => void }) {
  const c = color(group.colorIdx);
  return (
    <Card className="cursor-pointer border border-border/60 transition-all hover:border-primary/40 hover:shadow-md hover:shadow-primary/5" onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold ${c.bg} ${c.text}`}>
            {initials(group.name)}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold truncate">{group.name}</h3>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              {group.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{group.phone}</span>}
              <span className="flex items-center gap-1"><Car className="h-3 w-3" />{group.vehicles.length} vehículo{group.vehicles.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {group.vehicles.slice(0, 3).map((v) => (
                <Badge key={v.id} variant="secondary" className="text-[10px] font-mono px-1.5">{v.license_plate || "—"}</Badge>
              ))}
              {group.vehicles.length > 3 && <Badge variant="secondary" className="text-[10px] px-1.5">+{group.vehicles.length - 3}</Badge>}
            </div>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50" />
        </div>
      </CardContent>
    </Card>
  );
}

function ClientView({ group, onSelectVehicle }: { group: ClientGroup; onSelectVehicle: (v: Vehicle) => void }) {
  const c = color(group.colorIdx);
  return (
    <div className="space-y-4">
      <Card className="border-border/60">
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full font-display text-lg font-bold ${c.bg} ${c.text}`}>
              {initials(group.name)}
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-xl font-bold">{group.name}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {group.phone && <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{group.phone}</span>}
                {group.email && <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{group.email}</span>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <p className="text-sm font-medium text-muted-foreground">Selecciona un vehículo para ver su historial y facturas</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {group.vehicles.map((v) => (
          <Card key={v.id} className="cursor-pointer border border-border/60 transition-all hover:border-primary/40 hover:shadow-md hover:shadow-primary/5" onClick={() => onSelectVehicle(v)}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Car className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">{[v.brand, v.model].filter(Boolean).join(" ") || "Vehículo sin marca"}</p>
                  {v.license_plate && <Badge variant="outline" className="mt-1 text-[10px] font-mono">{v.license_plate}</Badge>}
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function VehicleView({ vehicle, group, history, histLoading, onNavigateHistory, onNavigateInvoices, onDelete }: {
  vehicle: Vehicle; group: ClientGroup; history: HistoryEntry[]; histLoading: boolean;
  onNavigateHistory: (p: string) => void; onNavigateInvoices: (p: string) => void; onDelete: (v: Vehicle) => void;
}) {
  const c = color(group.colorIdx);
  return (
    <div className="space-y-4">
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
                {vehicle.license_plate && <Badge variant="outline" className="mt-1 font-mono text-sm">{vehicle.license_plate}</Badge>}
              </div>
            </div>
            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => onDelete(vehicle)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <Separator className="my-4" />
          <div className="flex items-center gap-3">
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${c.bg} ${c.text}`}>
              {initials(group.name)}
            </div>
            <div className="text-sm">
              <p className="font-medium">{group.name}</p>
              {group.phone && <p className="text-muted-foreground text-xs">{group.phone}</p>}
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" className="h-auto py-3 flex-col gap-1.5"
          onClick={() => vehicle.license_plate && onNavigateHistory(vehicle.license_plate)} disabled={!vehicle.license_plate}>
          <History className="h-5 w-5 text-primary" />
          <span className="text-xs font-medium">Ver historial completo</span>
        </Button>
        <Button variant="outline" className="h-auto py-3 flex-col gap-1.5"
          onClick={() => vehicle.license_plate && onNavigateInvoices(vehicle.license_plate)} disabled={!vehicle.license_plate}>
          <FileText className="h-5 w-5 text-primary" />
          <span className="text-xs font-medium">Ver facturas</span>
        </Button>
      </div>
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Wrench className="h-4 w-4 text-primary" />
            Reparaciones recientes ({history.length})
          </h3>
          {vehicle.license_plate && history.length > 0 && (
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => onNavigateHistory(vehicle.license_plate!)}>Ver todas</Button>
          )}
        </div>
        {histLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : history.length === 0 ? (
          <Card className="border-dashed border-border/40">
            <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
              <Wrench className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Sin reparaciones registradas</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {history.slice(0, 5).map((h) => (
              <Card key={h.id} className="border-border/40">
                <CardContent className="p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{h.service}</p>
                    {h.date && <p className="text-xs text-muted-foreground">{new Date(h.date).toLocaleDateString("es-ES")}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {h.total > 0 && <span className="text-xs font-mono font-semibold">{h.total.toFixed(2)} €</span>}
                    <Badge variant="outline" className={`text-[10px] capitalize ${
                      h.status === "completada" || h.status === "entregado" ? "border-emerald-500/30 text-emerald-400"
                      : h.status === "pendiente" ? "border-orange-500/30 text-orange-400"
                      : "border-border"
                    }`}>{h.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
            {history.length > 5 && (
              <p className="text-center text-xs text-muted-foreground pt-1">+{history.length - 5} más — usa «Ver historial completo»</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ hasSearch, onAdd }: { hasSearch: boolean; onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/40 mb-4">
        <User className="h-8 w-8 text-muted-foreground/50" />
      </div>
      <p className="font-semibold">{hasSearch ? "Sin resultados" : "No hay clientes aún"}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {hasSearch ? "Prueba con otro nombre, teléfono o matrícula" : "Añade tu primer cliente o importa desde un CSV"}
      </p>
      {!hasSearch && (
        <Button className="mt-4" onClick={onAdd}><Plus className="mr-2 h-4 w-4" />Nuevo cliente</Button>
      )}
    </div>
  );
}

export default Clients;
