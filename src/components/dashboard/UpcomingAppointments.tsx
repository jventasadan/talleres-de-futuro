import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, User, Wrench } from "lucide-react";

const appointments = [
  { id: 1, client: "Carlos García", plate: "1234 ABC", time: "09:00", service: "Revisión general", status: "confirmed" },
  { id: 2, client: "María López", plate: "5678 DEF", time: "10:30", service: "Cambio de aceite", status: "in_progress" },
  { id: 3, client: "Pedro Martín", plate: "9012 GHI", time: "12:00", service: "Frenos", status: "pending" },
  { id: 4, client: "Ana Ruiz", plate: "3456 JKL", time: "14:00", service: "ITV Pre-inspección", status: "confirmed" },
  { id: 5, client: "Luis Fernández", plate: "7890 MNO", time: "16:30", service: "Neumáticos", status: "pending" },
];

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "outline"; dot: string }> = {
  confirmed: { label: "Confirmada", variant: "default", dot: "bg-success" },
  pending: { label: "Pendiente", variant: "secondary", dot: "bg-warning" },
  in_progress: { label: "En curso", variant: "outline", dot: "bg-primary" },
};

export function UpcomingAppointments() {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-display text-base">Citas de hoy</CardTitle>
          <Badge variant="outline" className="font-mono text-xs">
            {appointments.length} citas
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-2">
        {appointments.map((apt, index) => {
          const status = statusMap[apt.status];
          const isNow = index === 1; // simulate "current" appointment
          return (
            <div
              key={apt.id}
              className={`group flex items-center gap-3 rounded-xl border p-3 transition-all hover:shadow-sm ${
                isNow ? "border-primary/30 bg-primary/5" : "hover:bg-accent/50"
              }`}
            >
              {/* Time column */}
              <div className="flex w-14 shrink-0 flex-col items-center">
                <span className={`font-mono text-sm font-bold ${isNow ? "text-primary" : ""}`}>
                  {apt.time}
                </span>
                {isNow && (
                  <span className="mt-0.5 text-[10px] font-semibold uppercase text-primary">
                    Ahora
                  </span>
                )}
              </div>

              {/* Divider */}
              <div className="relative flex flex-col items-center self-stretch">
                <div className={`h-2.5 w-2.5 rounded-full ${status.dot} ring-2 ring-card`} />
                {index < appointments.length - 1 && (
                  <div className="w-px flex-1 bg-border" />
                )}
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="truncate text-sm font-medium">{apt.client}</p>
                  <Badge variant={status.variant} className="ml-2 shrink-0 text-[10px]">
                    {status.label}
                  </Badge>
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono">{apt.plate}</span>
                  <span>·</span>
                  <Wrench className="h-3 w-3" />
                  <span className="truncate">{apt.service}</span>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
