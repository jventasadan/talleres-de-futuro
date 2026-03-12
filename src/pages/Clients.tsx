import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, User, Mail, Phone, MapPin } from "lucide-react";
import { useClients, type Client } from "@/hooks/useClients";
import { useState } from "react";
import { Loader2 } from "lucide-react";

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
  const [search, setSearch] = useState("");
  const { data: clients, isLoading } = useClients();

  const filtered = (clients ?? []).filter(
    (c) =>
      (c.full_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (c.phone ?? "").includes(search) ||
      (c.email ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (c.nif ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout title="Clientes" subtitle="Base de datos de clientes del taller">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar por nombre, teléfono, email o NIF..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Button>
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
            <p className="mt-3 text-sm font-medium text-muted-foreground">No se encontraron clientes</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((client, i) => (
              <Card key={client.id} className="cursor-pointer transition-shadow hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-display text-xs font-bold ${avatarColors[i % avatarColors.length]}`}>
                      {getInitials(client.full_name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium truncate">{client.full_name || "Sin nombre"}</h3>
                      {client.phone && (
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" />{client.phone}
                        </p>
                      )}
                      {client.email && (
                        <p className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                          <Mail className="h-3 w-3" />{client.email}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {client.nif && <Badge variant="outline" className="text-[10px]">NIF: {client.nif}</Badge>}
                        {client.city && (
                          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <MapPin className="h-3 w-3" />{client.city}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Clients;
