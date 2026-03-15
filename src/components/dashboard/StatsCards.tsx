import { Calendar, Clock, Car, Euro, Wrench } from "lucide-react";
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
  const readyToday = all.filter((a) => a.status === "listo" && a.date === todayStr).length;
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
    { title: "En espera", value: String(waitingCars), subtitle: "Recepcionados", icon: Car, iconBg: "bg-warning/80" },
    { title: "En reparación", value: String(inRepair), subtitle: "Ahora mismo", subtitleColor: "text-info", icon: Wrench, iconBg: "bg-info/80" },
    { title: "Listos hoy", value: String(readyToday), subtitle: `${todayAppointments} citas del día`, subtitleColor: "text-success", icon: Calendar, iconBg: "bg-success/80" },
    { title: "Facturación", value: `${todayBilling.toFixed(0)}€`, subtitle: `${monthBilling.toFixed(0)}€ este mes`, subtitleColor: "text-primary", icon: Euro, iconBg: "bg-primary/80" },
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
