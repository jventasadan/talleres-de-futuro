import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, User } from "lucide-react";

const appointments = [
  { id: 1, client: "Carlos García", plate: "1234 ABC", time: "09:00", service: "Revisión general", status: "confirmed" },
  { id: 2, client: "María López", plate: "5678 DEF", time: "10:30", service: "Cambio de aceite", status: "confirmed" },
  { id: 3, client: "Pedro Martín", plate: "9012 GHI", time: "12:00", service: "Frenos", status: "pending" },
  { id: 4, client: "Ana Ruiz", plate: "3456 JKL", time: "14:00", service: "ITV Pre-inspección", status: "confirmed" },
  { id: 5, client: "Luis Fernández", plate: "7890 MNO", time: "16:30", service: "Neumáticos", status: "pending" },
];

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  confirmed: { label: "Confirmada", variant: "default" },
  pending: { label: "Pendiente", variant: "secondary" },
};

export function UpcomingAppointments() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-base">Próximas citas de hoy</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {appointments.map((apt) => {
          const status = statusMap[apt.status];
          return (
            <div
              key={apt.id}
              className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-accent/50"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{apt.client}</p>
                  <p className="text-xs text-muted-foreground">
                    {apt.plate} · {apt.service}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {apt.time}
                </div>
                <Badge variant={status.variant}>{status.label}</Badge>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
