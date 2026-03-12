import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Clock, User } from "lucide-react";
import { useState } from "react";

const mockAppointments = [
  { id: 1, client: "Carlos García", plate: "1234 ABC", date: "2026-03-12", time: "09:00", service: "Revisión general", status: "confirmed", createdBy: "IA" },
  { id: 2, client: "María López", plate: "5678 DEF", date: "2026-03-12", time: "10:30", service: "Cambio de aceite", status: "confirmed", createdBy: "Manual" },
  { id: 3, client: "Pedro Martín", plate: "9012 GHI", date: "2026-03-12", time: "12:00", service: "Frenos", status: "pending", createdBy: "IA" },
  { id: 4, client: "Ana Ruiz", plate: "3456 JKL", date: "2026-03-13", time: "14:00", service: "ITV Pre-inspección", status: "confirmed", createdBy: "IA" },
  { id: 5, client: "Luis Fernández", plate: "7890 MNO", date: "2026-03-13", time: "16:30", service: "Neumáticos", status: "cancelled", createdBy: "Manual" },
  { id: 6, client: "Sara Moreno", plate: "2345 PQR", date: "2026-03-14", time: "09:30", service: "Diagnóstico", status: "pending", createdBy: "IA" },
];

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  confirmed: { label: "Confirmada", variant: "default" },
  pending: { label: "Pendiente", variant: "secondary" },
  cancelled: { label: "Cancelada", variant: "destructive" },
};

const Appointments = () => {
  const [search, setSearch] = useState("");
  const filtered = mockAppointments.filter(
    (a) =>
      a.client.toLowerCase().includes(search.toLowerCase()) ||
      a.plate.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout title="Citas" subtitle="Gestiona las citas de tu taller">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente o matrícula..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nueva cita
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Cliente</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Matrícula</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Fecha</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Hora</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Servicio</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Origen</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((apt) => {
                    const status = statusConfig[apt.status];
                    return (
                      <tr key={apt.id} className="border-b last:border-0 transition-colors hover:bg-accent/50">
                        <td className="px-4 py-3 font-medium">{apt.client}</td>
                        <td className="px-4 py-3 font-mono text-xs">{apt.plate}</td>
                        <td className="px-4 py-3">{apt.date}</td>
                        <td className="px-4 py-3">{apt.time}</td>
                        <td className="px-4 py-3">{apt.service}</td>
                        <td className="px-4 py-3">
                          <Badge variant={apt.createdBy === "IA" ? "outline" : "secondary"} className="text-xs">
                            {apt.createdBy}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Appointments;
