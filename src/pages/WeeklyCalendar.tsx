import { useState, useMemo } from "react";
import { format, startOfWeek, addDays, subWeeks, addWeeks, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2, Clock, Wrench as WrenchIcon } from "lucide-react";
import { useAllAppointments, type Appointment } from "@/hooks/useAppointments";
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 13 }, (_, i) => i + 7); // 7:00 - 19:00

const statusColors: Record<string, string> = {
  recepcionado: "bg-blue-500/15 border-blue-500/30 text-blue-700",
  reparado: "bg-green-500/15 border-green-500/30 text-green-700",
  cancelado: "bg-destructive/15 border-destructive/30 text-destructive",
  pendiente: "bg-warning/15 border-warning/30 text-warning",
  pending: "bg-warning/15 border-warning/30 text-warning",
};

function getHourFromDate(dateStr: string | null): number {
  if (!dateStr) return 9;
  const d = new Date(dateStr);
  return d.getHours();
}

const WeeklyCalendar = () => {
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  const { data: allAppointments, isLoading } = useAllAppointments();

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const appointmentsByDay = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    weekDays.forEach((d) => map.set(format(d, "yyyy-MM-dd"), []));
    (allAppointments ?? []).forEach((apt) => {
      if (!apt.appointment_start) return;
      const aptDate = new Date(apt.appointment_start);
      const key = format(aptDate, "yyyy-MM-dd");
      if (map.has(key)) {
        map.get(key)!.push(apt);
      }
    });
    return map;
  }, [allAppointments, weekDays]);

  const today = new Date();

  return (
    <DashboardLayout title="Vista semanal" subtitle="Calendario de citas de la semana">
      <div className="space-y-4">
        {/* Navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setWeekStart((w) => subWeeks(w, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" className="min-w-[260px] justify-center font-medium">
            {format(weekStart, "d MMM", { locale: es })} — {format(addDays(weekStart, 6), "d MMM yyyy", { locale: es })}
          </Button>
          <Button variant="outline" size="icon" onClick={() => setWeekStart((w) => addWeeks(w, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            className="text-xs"
          >
            Esta semana
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const dayAppts = appointmentsByDay.get(key) ?? [];
              const isToday = isSameDay(day, today);

              return (
                <Card
                  key={key}
                  className={cn(
                    "min-h-[280px] transition-shadow",
                    isToday && "ring-2 ring-primary/40 shadow-md"
                  )}
                >
                  <div
                    className={cn(
                      "px-3 py-2 text-center border-b",
                      isToday ? "bg-primary/10" : "bg-muted/30"
                    )}
                  >
                    <p className="text-[11px] font-medium uppercase text-muted-foreground">
                      {format(day, "EEE", { locale: es })}
                    </p>
                    <p
                      className={cn(
                        "text-lg font-display font-bold",
                        isToday ? "text-primary" : "text-foreground"
                      )}
                    >
                      {format(day, "d")}
                    </p>
                  </div>
                  <CardContent className="p-2 space-y-1.5">
                    {dayAppts.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground text-center py-4">
                        Sin citas
                      </p>
                    ) : (
                      dayAppts.map((apt) => (
                        <div
                          key={apt.id}
                          className={cn(
                            "rounded-md border p-2 text-[11px] leading-tight",
                            statusColors[apt.status ?? ""] ?? "bg-muted/50 border-border"
                          )}
                        >
                          <div className="flex items-center gap-1 font-semibold">
                            <Clock className="h-3 w-3 shrink-0" />
                            {apt.appointment_start
                              ? format(new Date(apt.appointment_start), "HH:mm")
                              : "--:--"}
                          </div>
                          <p className="font-medium mt-0.5 truncate">
                            {apt.name || "Sin nombre"}
                          </p>
                          <p className="text-[10px] opacity-75 truncate">
                            {[apt.brand, apt.model].filter(Boolean).join(" ") || apt.license_plate}
                          </p>
                          {apt.mechanic && (
                            <div className="flex items-center gap-1 mt-1 text-[10px] opacity-60">
                              <WrenchIcon className="h-2.5 w-2.5" />
                              {apt.mechanic}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default WeeklyCalendar;
