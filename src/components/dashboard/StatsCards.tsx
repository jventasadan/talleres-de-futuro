import { Calendar, Clock, Car, Euro, Wrench, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useAllAppointments } from "@/hooks/useAppointments";
import { useInvoices } from "@/hooks/useInvoices";
import { format, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";

export function StatsCards() {
  const { data: appointments } = useAllAppointments();
  const { data: invoices } = useInvoices();

  const now = new Date();
  const todayStr = format(now, "yyyy-MM-dd");
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const all = appointments ?? [];

  const waitingCars = all.filter((a) => a.status === "espera" || a.status === "recepcionado").length;
  const inRepair = all.filter((a) => a.status === "en_reparacion").length;
  const readyToday = all.filter((a) => (a.status === "listo" || a.status === "facturado") && a.date === todayStr).length;
  const todayAppointments = all.filter((a) => a.date === todayStr).length;

  const todayBilling = (invoices ?? []).filter((inv) => {
    const d = format(new Date(inv.created_at), "yyyy-MM-dd");
    return d === todayStr;
  }).reduce((sum, inv) => sum + Number(inv.total), 0);

  const monthBilling = (invoices ?? []).filter((inv) => {
    const d = new Date(inv.created_at);
    return isWithinInterval(d, { start: monthStart, end: monthEnd });
  }).reduce((sum, inv) => sum + Number(inv.total), 0);

  const stats = [
    { title: "En espera", value: String(waitingCars), subtitle: "Vehículos recepcionados", icon: Car, color: "text-warning" },
    { title: "En reparación", value: String(inRepair), subtitle: "Ahora mismo", icon: Wrench, color: "text-info" },
    { title: "Listos hoy", value: String(readyToday), subtitle: `${todayAppointments} citas del día`, icon: CheckCircle, color: "text-success" },
    { title: "Citas hoy", value: String(todayAppointments), subtitle: "Programadas", icon: Calendar, color: "text-primary" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title} className="border-border/30 hover:border-border/60 transition-colors">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{stat.title}</p>
                <p className="font-display text-3xl font-bold tracking-tight mt-1">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.subtitle}</p>
              </div>
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
