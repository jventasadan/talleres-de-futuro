import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Car, FileText, ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkshop } from "@/contexts/WorkshopContext";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

interface VehicleRecord {
  license_plate: string;
  client_name: string;
  email: string | null;
  brand: string | null;
  model: string | null;
  km: string | null;
  visit_count: number;
  last_visit: string;
  last_service: string;
}

interface ClientGroup {
  client_name: string;
  email: string | null;
  vehicles: VehicleRecord[];
}

interface HistoryEntry {
  id: string;
  date: string;
  order_number: string;
  service: string;
  status: string;
  client_name: string;
  brand: string;
  model: string;
  km: string;
  labor_cost: number;
  parts_total: number;
  total: number;
  invoice_number: string | null;
}

const db = supabase as any;

const VehicleHistory = () => {
  const [searchParams] = useSearchParams();
  const [searchText, setSearchText] = useState("");
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [selectedPlate, setSelectedPlate] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const { workshopId } = useWorkshop();

  useEffect(() => {
    if (!workshopId) return;
    loadAllVehicles();
  }, [workshopId]);

  useEffect(() => {
    const paramPlate = searchParams.get("plate");
    if (paramPlate && workshopId) {
      setSelectedPlate(paramPlate.toUpperCase());
      setSearchText(paramPlate.toUpperCase());
      loadHistory(paramPlate.toUpperCase());
    }
  }, [searchParams, workshopId]);

  const getAptClientName = (apt: any): string => {
    return apt.client_name || apt.name || "Sin nombre";
  };

  const loadAllVehicles = async () => {
    if (!workshopId) return;
    setLoading(true);
    try {
      const { data: appointments } = await supabase
        .from("appointments")
        .select("id, license_plate, client_name, name, email, brand, model, km, date, created_at, service, status")
        .eq("workshop_id", workshopId)
        .order("created_at", { ascending: false }) as any;

      // Also fetch clients for email fallback
      const { data: clients } = await supabase
        .from("clients")
        .select("license_plate, email, brand, model")
        .eq("workshop_id", workshopId) as any;

      const clientMap: Record<string, any> = {};
      (clients ?? []).forEach((c: any) => {
        if (c.license_plate) clientMap[c.license_plate.toUpperCase()] = c;
      });

      if (!appointments?.length) {
        setVehicles([]);
        setLoading(false);
        return;
      }

      const plateMap: Record<string, VehicleRecord> = {};
      appointments.forEach((apt: any) => {
        const plate = (apt.license_plate || "").toUpperCase();
        if (!plate) return;
        const name = getAptClientName(apt);
        const client = clientMap[plate];
        if (!plateMap[plate]) {
          plateMap[plate] = {
            license_plate: plate,
            client_name: name,
            email: apt.email || client?.email || null,
            brand: apt.brand || client?.brand || null,
            model: apt.model || client?.model || null,
            km: apt.km || null,
            visit_count: 0,
            last_visit: apt.date || apt.created_at?.slice(0, 10) || "",
            last_service: apt.service || "",
          };
        } else {
          if (name !== "Sin nombre" && plateMap[plate].client_name === "Sin nombre") plateMap[plate].client_name = name;
          if (apt.brand && !plateMap[plate].brand) plateMap[plate].brand = apt.brand;
          if (apt.model && !plateMap[plate].model) plateMap[plate].model = apt.model;
          if (!plateMap[plate].email) plateMap[plate].email = apt.email || client?.email || null;
          if (apt.km && !plateMap[plate].km) plateMap[plate].km = apt.km;
        }
        plateMap[plate].visit_count += 1;
      });

      setVehicles(Object.values(plateMap));
    } catch (e) {
      console.error("Error loading vehicles:", e);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async (plate: string) => {
    if (!workshopId) return;
    setDetailLoading(true);
    setSelectedPlate(plate);
    try {
      const { data: appointments } = await supabase
        .from("appointments")
        .select("*")
        .eq("workshop_id", workshopId)
        .ilike("license_plate", plate)
        .order("created_at", { ascending: false }) as any;

      if (!appointments?.length) {
        setHistory([]);
        setDetailLoading(false);
        return;
      }

      const appointmentIds = appointments.map((a: any) => a.id);
      const { data: workOrders } = await db
        .from("work_orders")
        .select("*")
        .eq("workshop_id", workshopId)
        .in("appointment_id", appointmentIds);

      const woMap: Record<string, any> = {};
      (workOrders ?? []).forEach((wo: any) => { woMap[wo.appointment_id] = wo; });

      const woIds = (workOrders ?? []).map((wo: any) => wo.id);
      let invoiceMap: Record<string, any> = {};
      if (woIds.length > 0) {
        const { data: invoices } = await db
          .from("invoices").select("*").eq("workshop_id", workshopId).in("work_order_id", woIds);
        (invoices ?? []).forEach((inv: any) => {
          if (inv.work_order_id) invoiceMap[inv.work_order_id] = inv;
        });
      }

      const entries: HistoryEntry[] = appointments.map((apt: any) => {
        const wo = woMap[apt.id];
        const inv = wo ? invoiceMap[wo.id] : null;
        return {
          id: apt.id,
          date: apt.date || apt.created_at?.slice(0, 10) || "",
          order_number: `ORD-${apt.id.slice(0, 4).toUpperCase()}`,
          service: apt.service || apt.service_type || "Sin servicio",
          status: apt.status || "pendiente",
          client_name: getAptClientName(apt),
          brand: apt.brand || "",
          model: apt.model || "",
          km: apt.km || "",
          labor_cost: inv ? Number(inv.labor_cost) : 0,
          parts_total: inv ? Number(inv.parts_total) : 0,
          total: inv ? Number(inv.total) : 0,
          invoice_number: inv?.invoice_number ?? null,
        };
      });

      setHistory(entries);
    } catch (e) {
      console.error("Error fetching history:", e);
    } finally {
      setDetailLoading(false);
    }
  };

  const filteredVehicles = vehicles.filter((v) => {
    if (!searchText.trim()) return true;
    const q = searchText.toLowerCase();
    return v.license_plate.toLowerCase().includes(q) || v.client_name.toLowerCase().includes(q) || (v.brand || "").toLowerCase().includes(q);
  });

  // Group by client name and sort alphabetically
  const clientGroups = useMemo<ClientGroup[]>(() => {
    const groups: Record<string, ClientGroup> = {};
    filteredVehicles.forEach((v) => {
      const key = v.client_name.toLowerCase();
      if (!groups[key]) {
        groups[key] = { client_name: v.client_name, email: v.email, vehicles: [] };
      }
      if (!groups[key].email && v.email) groups[key].email = v.email;
      groups[key].vehicles.push(v);
    });
    return Object.values(groups).sort((a, b) => a.client_name.localeCompare(b.client_name, "es"));
  }, [filteredVehicles]);

  const toggleClient = (name: string) => {
    setExpandedClients((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  // Auto-expand all groups on first render or when there's only one
  useEffect(() => {
    if (clientGroups.length <= 5) {
      setExpandedClients(new Set(clientGroups.map(g => g.client_name)));
    }
  }, [clientGroups.length]);

  return (
    <DashboardLayout title="Historial de Vehículos" subtitle="Todos los vehículos que han pasado por el taller">
      <div className="space-y-4 max-w-6xl">
        <div className="flex gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por matrícula, cliente o marca..."
              value={searchText}
              onChange={(e) => { setSearchText(e.target.value.toUpperCase()); setSelectedPlate(null); }}
              className="pl-9 font-mono"
            />
          </div>
          {selectedPlate && (
            <Button variant="outline" onClick={() => { setSelectedPlate(null); setHistory([]); }}>
              ← Volver al listado
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !selectedPlate ? (
          !filteredVehicles.length ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Car className="h-12 w-12 text-muted-foreground/40" />
              <p className="mt-3 text-sm font-medium text-muted-foreground">
                {searchText ? `No se encontraron vehículos para "${searchText}"` : "No hay vehículos registrados aún"}
              </p>
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="px-4 py-3 border-b bg-muted/30">
                  <h3 className="font-display text-sm font-bold">{filteredVehicles.length} vehículo(s) · {clientGroups.length} cliente(s)</h3>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-xs w-8"></TableHead>
                      <TableHead className="text-xs">Cliente</TableHead>
                      <TableHead className="text-xs">Email</TableHead>
                      <TableHead className="text-xs">Vehículo</TableHead>
                      <TableHead className="text-xs">Matrícula</TableHead>
                      <TableHead className="text-xs">Km</TableHead>
                      <TableHead className="text-xs text-center">Visitas</TableHead>
                      <TableHead className="text-xs">Última visita</TableHead>
                      <TableHead className="text-xs">Último servicio</TableHead>
                      <TableHead className="text-xs"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientGroups.map((group) => {
                      const isExpanded = expandedClients.has(group.client_name);
                      const hasMultiple = group.vehicles.length > 1;
                      return (
                        <>
                          {hasMultiple && (
                            <TableRow
                              key={`group-${group.client_name}`}
                              className="cursor-pointer hover:bg-accent/50 bg-muted/20"
                              onClick={() => toggleClient(group.client_name)}
                            >
                              <TableCell className="w-8">
                                {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                              </TableCell>
                              <TableCell className="text-xs font-semibold" colSpan={2}>
                                {group.client_name} <span className="text-muted-foreground font-normal">({group.vehicles.length} vehículos)</span>
                              </TableCell>
                              <TableCell colSpan={7} className="text-xs text-muted-foreground">{group.email || ""}</TableCell>
                            </TableRow>
                          )}
                          {(hasMultiple ? isExpanded : true) && group.vehicles.map((v) => (
                            <TableRow key={v.license_plate} className="cursor-pointer hover:bg-accent/50" onClick={() => loadHistory(v.license_plate)}>
                              <TableCell className="w-8">{!hasMultiple && <Car className="h-3 w-3 text-muted-foreground" />}</TableCell>
                              <TableCell className="text-xs font-medium">{v.client_name}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{v.email || "—"}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{[v.brand, v.model].filter(Boolean).join(" ") || "—"}</TableCell>
                              <TableCell className="font-mono text-xs font-semibold text-primary">{v.license_plate}</TableCell>
                              <TableCell className="text-xs font-mono">{v.km || "—"}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant="secondary" className="text-[10px]">{v.visit_count}</Badge>
                              </TableCell>
                              <TableCell className="text-xs">{v.last_visit ? new Date(v.last_visit).toLocaleDateString("es-ES") : "—"}</TableCell>
                              <TableCell className="text-xs truncate max-w-[150px]">{v.last_service || "—"}</TableCell>
                              <TableCell>
                                <Button variant="ghost" size="sm" className="h-6 text-[10px]">Ver historial →</Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )
        ) : (
          detailLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !history.length ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Car className="h-12 w-12 text-muted-foreground/40" />
              <p className="mt-3 text-sm font-medium text-muted-foreground">No se encontraron reparaciones para "{selectedPlate}"</p>
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="px-4 py-3 border-b bg-muted/30">
                  <h3 className="font-display text-sm font-bold">Historial de: <span className="font-mono text-primary">{selectedPlate}</span></h3>
                  <p className="text-xs text-muted-foreground">{history.length} registro(s)</p>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-xs">Fecha</TableHead>
                      <TableHead className="text-xs">Orden</TableHead>
                      <TableHead className="text-xs">Cliente</TableHead>
                      <TableHead className="text-xs">Matrícula</TableHead>
                      <TableHead className="text-xs">Vehículo</TableHead>
                      <TableHead className="text-xs">Km</TableHead>
                      <TableHead className="text-xs">Reparación</TableHead>
                      <TableHead className="text-xs">Estado</TableHead>
                      <TableHead className="text-xs text-right">Coste</TableHead>
                      <TableHead className="text-xs">Factura</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="text-xs">{entry.date ? new Date(entry.date).toLocaleDateString("es-ES") : "—"}</TableCell>
                        <TableCell className="font-mono text-xs font-semibold text-primary">{entry.order_number}</TableCell>
                        <TableCell className="text-xs">{entry.client_name}</TableCell>
                        <TableCell className="font-mono text-xs font-semibold">{selectedPlate}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {[entry.brand, entry.model].filter(Boolean).join(" ") || "—"}
                        </TableCell>
                        <TableCell className="text-xs font-mono">{entry.km || "—"}</TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate">{entry.service}</TableCell>
                        <TableCell>
                          <Badge variant={entry.status === "entregado" ? "default" : "secondary"} className="text-[10px]">
                            {entry.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-semibold">
                          {entry.total > 0 ? `${entry.total.toFixed(2)} €` : "—"}
                        </TableCell>
                        <TableCell>
                          {entry.invoice_number ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-[10px] px-1 text-primary"
                              onClick={() => window.open(`/invoices?search=${encodeURIComponent(entry.invoice_number!)}`, "_self")}
                            >
                              <FileText className="h-3 w-3 mr-1" />
                              {entry.invoice_number}
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )
        )}
      </div>
    </DashboardLayout>
  );
};

export default VehicleHistory;
