import { useState, useMemo, useEffect } from "react";
import {
  format, startOfWeek, startOfMonth, endOfMonth, addDays, subWeeks, addWeeks,
  subMonths, addMonths, isSameDay, isSameMonth, eachDayOfInterval,
} from "date-fns";
import { es } from "date-fns/locale";
import { useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useAllAppointments, type Appointment } from "@/hooks/useAppointments";
import { AppointmentDetailDialog } from "@/components/appointments/AppointmentDetailDialog";
import { cn } from "@/lib/utils";

const WeeklyCalendar = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<"week" | "month">("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const { data: allAppointments, isLoading } = useAllAppointments();
  const today = new Date();

  // Handle ?today=true query param
  useEffect(() => {
    if (searchParams.get("today") === "true") {
      setCurrentDate(new Date());
      setViewMode("week");
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  const monthDays = useMemo(() => {
    const start = startOfWeek(monthStart, { weekStartsOn: 1 });
    const end = addDays(startOfWeek(addDays(monthEnd, 6), { weekStartsOn: 1 }), -1);
    const days = eachDayOfInterval({ start, end: addDays(end, end.getDay() === 0 ? 0 : 7 - end.getDay()) });
    const fullWeeks = eachDayOfInterval({ start, end: addDays(start, Math.ceil(days.length / 7) * 7 - 1) });
    return fullWeeks;
  }, [monthStart, monthEnd]);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const displayDays = viewMode === "week" ? weekDays : monthDays;

  const appointmentsByDay = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    displayDays.forEach((d) => map.set(format(d, "yyyy-MM-dd"), []));
    (allAppointments ?? []).forEach((apt) => {
      const key = apt.date;
      if (map.has(key)) {
        map.get(key)!.push(apt);
      }
    });
    return map;
  }, [allAppointments, displayDays]);

  const statusDot: Record<string, string> = {
    recepcionado: "bg-purple-500",
    en_reparacion: "bg-pink-500",
    esperando_piezas: "bg-emerald-500",
    listo: "bg-green-400",
    pending: "bg-warning",
  };

  const navigate = (dir: number) => {
    if (viewMode === "week") {
      setCurrentDate(d => dir > 0 ? addWeeks(d, 1) : subWeeks(d, 1));
    } else {
      setCurrentDate(d => dir > 0 ? addMonths(d, 1) : subMonths(d, 1));
    }
  };

  const goToday = () => {
    setCurrentDate(new Date());
    setViewMode("week");
  };

  const handleAppointmentClick = (apt: Appointment) => {
    setSelectedApt(apt);
    setDetailOpen(true);
  };

  const headerLabel = viewMode === "week"
    ? `${format(weekStart, "d MMM", { locale: es })} — ${format(addDays(weekStart, 6), "d MMM yyyy", { locale: es })}`
    : format(currentDate, "MMMM yyyy", { locale: es });

  return (
    <DashboardLayout title="Calendario" subtitle="Vista de citas del taller">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="min-w-[220px] justify-center font-medium capitalize">
              {headerLabel}
            </Button>
            <Button variant="outline" size="icon" onClick={() => navigate(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="default" size="sm" onClick={goToday} className="text-xs">
              Hoy
            </Button>
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-secondary p-1">
            <Button variant={viewMode === "week" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("week")} className="text-xs">SEMANA</Button>
            <Button variant={viewMode === "month" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("month")} className="text-xs">MES</Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : viewMode === "week" ? (
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const dayAppts = appointmentsByDay.get(key) ?? [];
              const isToday = isSameDay(day, today);
              return (
                <Card key={key} className={cn("min-h-[280px]", isToday && "ring-2 ring-primary/40 shadow-md")}>
                  <div className={cn("px-3 py-2 text-center border-b", isToday ? "bg-primary/10" : "bg-muted/30")}>
                    <p className="text-[11px] font-medium uppercase text-muted-foreground">{format(day, "EEE", { locale: es })}</p>
                    <p className={cn("text-lg font-display font-bold", isToday ? "text-primary" : "text-foreground")}>{format(day, "d")}</p>
                  </div>
                  <CardContent className="p-2 space-y-1.5">
                    {dayAppts.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground text-center py-4">Sin citas</p>
                    ) : dayAppts.map((apt) => (
                      <div
                        key={apt.id}
                        onClick={() => handleAppointmentClick(apt)}
                        className="rounded-md border bg-secondary/50 p-2 text-[11px] leading-tight cursor-pointer hover:bg-secondary transition-colors"
                      >
                        <div className="flex items-center gap-1 font-semibold">
                          <div className={cn("h-2 w-2 rounded-full", statusDot[apt.status] ?? "bg-muted-foreground")} />
                          {apt.time_slot || "--:--"}
                        </div>
                        <p className="font-medium mt-0.5 truncate">{apt.client_name || "Sin nombre"}</p>
                        <p className="text-[10px] opacity-75 truncate">{apt.license_plate}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-7 gap-1 mb-1">
              {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map(d => (
                <div key={d} className="text-center text-[11px] font-medium text-muted-foreground py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {monthDays.map((day) => {
                const key = format(day, "yyyy-MM-dd");
                const dayAppts = appointmentsByDay.get(key) ?? [];
                const isToday = isSameDay(day, today);
                const isCurrentMonth = isSameMonth(day, currentDate);
                return (
                  <div
                    key={key}
                    className={cn(
                      "min-h-[90px] rounded-lg border p-1.5 transition-colors",
                      isToday && "ring-2 ring-primary/40 bg-primary/5",
                      !isCurrentMonth && "opacity-40",
                      "bg-card"
                    )}
                  >
                    <p className={cn("text-xs font-medium mb-1", isToday ? "text-primary font-bold" : "text-muted-foreground")}>
                      {format(day, "d")}
                    </p>
                    <div className="space-y-0.5">
                      {dayAppts.slice(0, 3).map((apt) => (
                        <div
                          key={apt.id}
                          onClick={() => handleAppointmentClick(apt)}
                          className="flex items-center gap-1 text-[10px] truncate cursor-pointer hover:text-primary transition-colors"
                        >
                          <div className={cn("h-1.5 w-1.5 rounded-full shrink-0", statusDot[apt.status] ?? "bg-muted-foreground")} />
                          <span className="truncate">{apt.time_slot} {apt.client_name}</span>
                        </div>
                      ))}
                      {dayAppts.length > 3 && (
                        <p className="text-[10px] text-muted-foreground">+{dayAppts.length - 3} más</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <AppointmentDetailDialog
        appointment={selectedApt}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </DashboardLayout>
  );
};

export default WeeklyCalendar;
