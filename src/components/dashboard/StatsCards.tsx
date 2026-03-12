import { Calendar, Phone, Users, TrendingUp, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAllAppointments } from "@/hooks/useAppointments";
import { useClients } from "@/hooks/useClients";
import { format } from "date-fns";

export function StatsCards() {
  const { data: appointments } = useAllAppointments();
  const { data: clients } = useClients();

  const today = format(new Date(), "yyyy-MM-dd");
  const todayAppts = (appointments ?? []).filter((a) => {
    if (!a.appointment_start) return false;
    return a.appointment_start.startsWith(today);
  });

  const totalAppts = (appointments ?? []).length;
  const totalClients = (clients ?? []).length;
  const reparados = (appointments ?? []).filter((a) => a.status === "reparado" || a.status === "entregado").length;
  const conversionRate = totalAppts > 0 ? Math.round((reparados / totalAppts) * 100) : 0;

  const stats = [
    {
      title: "Citas hoy",
      value: String(todayAppts.length),
      icon: Calendar,
      progress: Math.min(todayAppts.length * 10, 100),
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Total citas",
      value: String(totalAppts),
      icon: Phone,
      progress: Math.min(totalAppts * 5, 100),
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "Clientes",
      value: String(totalClients),
      icon: Users,
      progress: Math.min(totalClients * 10, 100),
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Tasa completado",
      value: `${conversionRate}%`,
      icon: TrendingUp,
      progress: conversionRate,
      color: "text-success",
      bgColor: "bg-success/10",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title} className="group relative overflow-hidden transition-shadow hover:shadow-md">
          <div className="absolute left-0 top-0 h-full w-1 bg-primary/20 transition-colors group-hover:bg-primary" />
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{stat.title}</p>
                <p className="font-display text-3xl font-bold tracking-tight">{stat.value}</p>
              </div>
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </div>
            <div className="mt-3">
              <Progress value={stat.progress} className="h-1.5" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
