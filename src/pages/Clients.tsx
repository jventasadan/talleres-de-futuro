import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Plus, Search, User, Phone, Loader2, Car } from "lucide-react";
import { useClients, useCreateClient, type Client } from "@/hooks/useClients";
import { useState } from "react";

const avatarColors = [
  "bg-primary/15 text-primary",
  "bg-success/15 text-success",
  "bg-warning/15 text-warning",
  "bg-destructive/15 text-destructive",
];

function getInitials(name: string | null): string {
  if (!name) return "??";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const Clients = () => {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    license_plate: "",
    brand: "",
    model: "",
  });
  const { data: clients, isLoading } = useClients();
  const createClient = useCreateClient();

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
          setForm({
            name: "",
            phone: "",
            license_plate: "",
            brand: "",
            model: "",
          });
        },
      }
    );
  };

  return (
    <DashboardLayout
      title="Clientes"
      subtitle="Base de datos de clientes del taller"
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, teléfono, matrícula, marca..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo cliente
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !filtered.length ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <User className="h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 text-sm font-medium text-muted-foreground">
              No se encontraron clientes
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((client, i) => (
              <Card
                key={client.id}
                className="cursor-pointer transition-shadow hover:shadow-md"
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-display text-xs font-bold ${avatarColors[i % avatarColors.length]}`}
                    >
                      {getInitials(client.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium truncate">
                        {client.name || "Sin nombre"}
                      </h3>
                      {client.phone && (
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {client.phone}
                        </p>
                      )}
                      {(client.brand || client.model) && (
                        <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <Car className="h-3 w-3" />
                          {[client.brand, client.model]
                            .filter(Boolean)
                            .join(" ")}
                        </p>
                      )}
                      {client.license_plate && (
                        <Badge
                          variant="outline"
                          className="mt-1 text-[10px] font-mono"
                        >
                          {client.license_plate}
                        </Badge>
                      )}
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
            <DialogDescription>
              Añade un nuevo cliente al taller
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                placeholder="Ej: Carlos García"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input
                placeholder="Ej: 656232325"
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Matrícula</Label>
              <Input
                placeholder="Ej: 5454TRT"
                value={form.license_plate}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    license_plate: e.target.value.toUpperCase(),
                  }))
                }
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Marca</Label>
                <Input
                  placeholder="Ej: Volkswagen"
                  value={form.brand}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, brand: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Modelo</Label>
                <Input
                  placeholder="Ej: Golf GTI"
                  value={form.model}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, model: e.target.value }))
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createClient.isPending}>
                {createClient.isPending ? "Guardando..." : "Crear cliente"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Clients;
