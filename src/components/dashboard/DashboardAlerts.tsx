import { AlertTriangle, Clock, Package } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useAllAppointments } from "@/hooks/useAppointments";

export function DashboardAlerts() {
  const { data: appointments } = useAllAppointments();
  const all = appointments ?? [];

  const waitingParts = all.filter((a) => a.status === "esperando_piezas");

  // Long repairs: in repair for more than 1 day
  const now = new Date();
  const longRepairs = all.filter((a) => {
    if (a.status !== "en_reparacion") return false;
    const created = new Date(a.created_at);
    const diffHours = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
    return diffHours > 24;
  });

  const alerts: Array<{ icon: React.ElementType; text: string; color: string }> = [];

  if (waitingParts.length > 0) {
    alerts.push({
      icon: Package,
      text: `${waitingParts.length} vehículo${waitingParts.length > 1 ? "s" : ""} esperando piezas`,
      color: "text-warning",
    });
  }

  if (longRepairs.length > 0) {
    alerts.push({
      icon: Clock,
      text: `${longRepairs.length} reparación${longRepairs.length > 1 ? "es" : ""} de más de 24h`,
      color: "text-destructive",
    });
  }

  if (alerts.length === 0) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {alerts.map((alert, i) => (
        <Card key={i} className="border-border/30">
          <CardContent className="flex items-center gap-3 p-4">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted ${alert.color}`}>
              <alert.icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium">{alert.text}</p>
              <p className="text-[10px] text-muted-foreground">Requiere atención</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
