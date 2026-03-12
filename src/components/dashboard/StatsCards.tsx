import { Calendar, Clock, TrendingUp, Euro } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useAllAppointments } from "@/hooks/useAppointments";
import { useInvoices } from "@/hooks/useInvoices";
import { startOfMonth, endOfMonth, isWithinInterval } from "date-fns";

export function StatsCards() {
  const { data: appointments } = useAllAppointments();
  const { data: invoices } = useInvoices();

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const activeOrders = (appointments ?? []).filter(
    (a) => a.status === "recepcionado" || a.status === "en_reparacion"
  ).length;

  const monthRepairs = (appointments ?? []).filter((a) => {
    const d = new Date(a.date);
    return (a.status === "listo" || a.status === "entregado") &&
      isWithinInterval(d, { start: monthStart, end: monthEnd });
  }).length;

  const monthBilling = (invoices ?? []).filter((inv) => {
    const d = new Date(inv.created_at);
    return isWithinInterval(d, { start: monthStart, end: monthEnd });
  }).reduce((sum, inv) => sum + Number(inv.total), 0);

  const stats = [
    { title: "Órdenes Activas", value: String(activeOrders), subtitle: "En Taller", icon: Calendar, iconBg: "bg-warning/80" },
    { title: "Reparaciones (Mes)", value: String(monthRepairs), subtitle: "Completadas", subtitleColor: "text-success", icon: TrendingUp, iconBg: "bg-info/80" },
    { title: "Tiempo Medio", value: "0h", subtitle: "Por reparación", icon: Clock, iconBg: "bg-muted-foreground/60" },
    { title: "Facturación Mes", value: `${monthBilling.toFixed(0)} €`, subtitle: "Taller", subtitleColor: "text-primary", icon: Euro, iconBg: "bg-info/80" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title} className="border-border/50">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${stat.iconBg}`}>
                <stat.icon className="h-6 w-6 text-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{stat.title}</p>
                <p className="font-display text-3xl font-bold tracking-tight mt-0.5">{stat.value}</p>
                <p className={`text-xs mt-0.5 ${stat.subtitleColor ?? "text-muted-foreground"}`}>{stat.subtitle}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
