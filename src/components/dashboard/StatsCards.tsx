import { Calendar, Phone, Users, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const stats = [
  {
    title: "Citas hoy",
    value: "12",
    change: "+3 vs ayer",
    icon: Calendar,
    trend: "up" as const,
  },
  {
    title: "Llamadas IA",
    value: "28",
    change: "Este mes",
    icon: Phone,
    trend: "up" as const,
  },
  {
    title: "Clientes",
    value: "184",
    change: "+12 este mes",
    icon: Users,
    trend: "up" as const,
  },
  {
    title: "Tasa conversión",
    value: "87%",
    change: "+5% vs mes anterior",
    icon: TrendingUp,
    trend: "up" as const,
  },
];

export function StatsCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title} className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <stat.icon className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="font-display text-2xl font-bold">{stat.value}</div>
            <p className="mt-1 text-xs text-muted-foreground">{stat.change}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
