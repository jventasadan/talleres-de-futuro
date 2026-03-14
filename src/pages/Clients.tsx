import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Plus, Search, User, Phone, Loader2, Car, List, LayoutGrid } from "lucide-react";
import { useClients, useCreateClient, type Client } from "@/hooks/useClients";
import { ClientDetailDialog } from "@/components/clients/ClientDetailDialog";
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

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

const Clients = () => {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", license_plate: "", brand: "", model: "" });
  const { data: clients, isLoading } = useClients();
  const createClient = useCreateClient();

  // Handle ?search= query param from dashboard navigation
  useEffect(() => {
    const q = searchParams.get("search");
    if (q) setSearch(q);
  }, [searchParams]);

  const filtered = (clients ?? []).filter(
    (c) =>
      (c.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (c.phone ?? "").includes(search) ||
      (c.license_plate ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (c.brand ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (c.model ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createClient.mutate(
      { name: form.name, phone: form.phone || null, license_plate: form.license_plate, brand: form.brand || null, model: form.model || null },
      { onSuccess: () => { setDialogOpen(false); setForm({ name: "", phone: "", license_plate: "", brand: "", model: "" }); } }
    );
  };

  const handleClientClick = (client: Client) => {
    setSelectedClient(client);
    setDetailOpen(true);
  };

  return (
    <DashboardLayout title="Clientes" subtitle="Base de datos de clientes del taller">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar por nombre, teléfono, matrícula, marca..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg bg-secondary p-1">
              <Button variant={viewMode === "grid" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("grid")} className="h-7 w-7 p-0">
                <LayoutGrid className="h-3.5 w-3.5" />
              </Button>
              <Button variant={viewMode === "list" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("list")} className="h-7 w-7 p-0">
                <List className="h-3.5 w-3.5" />
              </Button>
            </div>
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
        ) : !filtered.length ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <User className="h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 text-sm font-medium text-muted-foreground">No se encontraron clientes</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((client, i) => (
              <Card key={client.id} className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => handleClientClick(client)}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-display text-xs font-bold ${avatarColors[i % avatarColors.length]}`}>
                      {getInitials(client.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium truncate">{client.name || "Sin nombre"}</h3>
                      {client.phone && (
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" />{client.phone}
                        </p>
                      )}
                      {(client.brand || client.model) && (
                        <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <Car className="h-3 w-3" />{[client.brand, client.model].filter(Boolean).join(" ")}
                        </p>
                      )}
                      {client.license_plate && (
                        <Badge variant="outline" className="mt-1 text-[10px] font-mono">{client.license_plate}</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs uppercase">Nombre</TableHead>
                    <TableHead className="text-xs uppercase">Teléfono</TableHead>
                    <TableHead className="text-xs uppercase">Matrícula</TableHead>
                    <TableHead className="text-xs uppercase">Marca</TableHead>
                    <TableHead className="text-xs uppercase">Modelo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((client) => (
                    <TableRow
                      key={client.id}
                      className="cursor-pointer hover:bg-accent/50"
                      onClick={() => handleClientClick(client)}
                    >
                      <TableCell className="font-medium">{client.name || "Sin nombre"}</TableCell>
                      <TableCell className="text-muted-foreground">{client.phone || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{client.license_plate || "—"}</TableCell>
                      <TableCell>{client.brand || "—"}</TableCell>
                      <TableCell>{client.model || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* New client dialog */}
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

      {/* Client detail dialog */}
      <ClientDetailDialog client={selectedClient} open={detailOpen} onOpenChange={setDetailOpen} />
    </DashboardLayout>
  );
};

export default Clients;
