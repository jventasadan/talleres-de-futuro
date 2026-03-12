import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, User, Car } from "lucide-react";
import { useState } from "react";

const mockClients = [
  { id: 1, name: "Carlos García", phone: "+34 612 345 678", plate: "1234 ABC", visits: 8, lastVisit: "2026-03-10" },
  { id: 2, name: "María López", phone: "+34 698 765 432", plate: "5678 DEF", visits: 3, lastVisit: "2026-03-08" },
  { id: 3, name: "Pedro Martín", phone: "+34 655 111 222", plate: "9012 GHI", visits: 12, lastVisit: "2026-03-05" },
  { id: 4, name: "Ana Ruiz", phone: "+34 677 333 444", plate: "3456 JKL", visits: 5, lastVisit: "2026-02-28" },
  { id: 5, name: "Luis Fernández", phone: "+34 644 555 666", plate: "7890 MNO", visits: 1, lastVisit: "2026-03-11" },
  { id: 6, name: "Sara Moreno", phone: "+34 611 777 888", plate: "2345 PQR", visits: 6, lastVisit: "2026-03-01" },
];

const Clients = () => {
  const [search, setSearch] = useState("");
  const filtered = mockClients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.plate.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
  );

  return (
    <DashboardLayout title="Clientes" subtitle="Base de datos de clientes del taller">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, matrícula o teléfono..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo cliente
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((client) => (
            <Card key={client.id} className="cursor-pointer transition-shadow hover:shadow-md">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium truncate">{client.name}</h3>
                    <p className="text-xs text-muted-foreground">{client.phone}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        <Car className="mr-1 h-3 w-3" />
                        {client.plate}
                      </Badge>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{client.visits} visitas</span>
                      <span>Última: {client.lastVisit}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Clients;
