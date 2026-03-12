import { Calendar, Phone, Users, TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const stats = [
  {
    title: "Citas hoy",
    value: "12",
    change: "+3",
    changeLabel: "vs ayer",
    icon: Calendar,
    trend: "up" as const,
    progress: 75,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    title: "Llamadas IA",
    value: "28",
    change: "+8",
    changeLabel: "este mes",
    icon: Phone,
    trend: "up" as const,
    progress: 56,
    color: "text-success",
    bgColor: "bg-success/10",
  },
  {
    title: "Clientes activos",
    value: "184",
    change: "+12",
    changeLabel: "este mes",
    icon: Users,
    trend: "up" as const,
    progress: 88,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    title: "Conversión IA",
    value: "87%",
    change: "+5%",
    changeLabel: "vs anterior",
    icon: TrendingUp,
    trend: "up" as const,
    progress: 87,
    color: "text-success",
    bgColor: "bg-success/10",
  },
];

export function StatsCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card
          key={stat.title}
          className="group relative overflow-hidden transition-shadow hover:shadow-md"
        >
          {/* Decorative accent bar */}
          <div className="absolute left-0 top-0 h-full w-1 bg-primary/20 transition-colors group-hover:bg-primary" />

          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {stat.title}
                </p>
                <p className="font-display text-3xl font-bold tracking-tight">
                  {stat.value}
                </p>
              </div>
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </div>

            <div className="mt-3">
              <Progress value={stat.progress} className="h-1.5" />
            </div>

            <div className="mt-2 flex items-center gap-1">
              {stat.trend === "up" ? (
                <ArrowUpRight className="h-3.5 w-3.5 text-success" />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5 text-destructive" />
              )}
              <span className="text-xs font-semibold text-success">{stat.change}</span>
              <span className="text-xs text-muted-foreground">{stat.changeLabel}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
