import { useState, useMemo } from "react";
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
import { useMechanics } from "@/hooks/useMechanics";
import { AppointmentDetailDialog } from "@/components/appointments/AppointmentDetailDialog";
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 13 }, (_, i) => i + 7); // 7:00 to 19:00
const SLOTS_PER_HOUR = 4; // 15-min slots

const statusColors: Record<string, string> = {
  espera: "bg-amber-200 border-amber-400 text-amber-900",
  recepcionado: "bg-purple-200 border-purple-400 text-purple-900",
  en_reparacion: "bg-pink-200 border-pink-400 text-pink-900",
  esperando_piezas: "bg-emerald-200 border-emerald-400 text-emerald-900",
  listo: "bg-green-200 border-green-400 text-green-900",
};

const WeeklyCalendar = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<"week" | "month" | "taller">("taller");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const { data: allAppointments, isLoading } = useAllAppointments();
  const { data: mechanics } = useMechanics();
  const today = new Date();

  // Handle ?today=true query param
  useState(() => {
    if (searchParams.get("today") === "true") {
      setCurrentDate(new Date());
      setViewMode("taller");
      setSearchParams({}, { replace: true });
    }
  });

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  const monthDays = useMemo(() => {
    const start = startOfWeek(monthStart, { weekStartsOn: 1 });
    const end = addDays(startOfWeek(addDays(monthEnd, 6), { weekStartsOn: 1 }), -1);
    const days = eachDayOfInterval({ start, end: addDays(end, end.getDay() === 0 ? 0 : 7 - end.getDay()) });
    return eachDayOfInterval({ start, end: addDays(start, Math.ceil(days.length / 7) * 7 - 1) });
  }, [monthStart, monthEnd]);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const displayDays = viewMode === "week" ? weekDays : monthDays;
  const todayStr = format(currentDate, "yyyy-MM-dd");

  const appointmentsByDay = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    displayDays.forEach((d) => map.set(format(d, "yyyy-MM-dd"), []));
    (allAppointments ?? []).forEach((apt) => {
      const key = apt.date;
      if (map.has(key)) map.get(key)!.push(apt);
    });
    return map;
  }, [allAppointments, displayDays]);

  // Taller view: today's appointments grouped by mechanic
  const todayAppointments = useMemo(() => {
    return (allAppointments ?? []).filter((a) => a.date === todayStr);
  }, [allAppointments, todayStr]);

  const mechanicNames = useMemo(() => {
    const names = new Set<string>();
    (mechanics ?? []).forEach((m) => names.add(m.name));
    todayAppointments.forEach((a) => {
      if (a.mechanic) names.add(a.mechanic);
    });
    if (names.size === 0) names.add("Sin asignar");
    return Array.from(names);
  }, [mechanics, todayAppointments]);

  const getAppointmentSlot = (apt: Appointment): number => {
    const time = apt.time_slot || "09:00";
    const [h, m] = time.split(":").map(Number);
    return ((h - 7) * SLOTS_PER_HOUR) + Math.floor((m || 0) / 15);
  };

  const getAppointmentDuration = (apt: Appointment): number => {
    // Duration in 15-min slots based on service type
    const service = apt.service || "";
    const SERVICE_DURATIONS: Record<string, number> = {
      "Cambio de aceite": 3,
      "Cambio de correas": 8,
      "Cambiar correa de distribución": 16,
      "Cambio de filtros": 2,
      "Frenos": 8,
      "Neumáticos": 4,
      "Revisión general": 6,
      "ITV Pre-inspección": 4,
      "Diagnóstico": 4,
      "Electricidad": 8,
      "Aire acondicionado": 6,
      "Chapa y pintura": 32,
      "Cambio de embrague": 20,
      "Cambio de amortiguadores": 8,
      "Alineación y equilibrado": 3,
      "Cambio de batería": 2,
      "Cambio de bujías": 4,
      "Cambio de escape": 6,
      "Reparación de dirección": 12,
      "Cambio de radiador": 8,
    };
    return SERVICE_DURATIONS[service] ?? 4;
  };

  const statusDot: Record<string, string> = {
    espera: "bg-amber-500",
    recepcionado: "bg-purple-500",
    en_reparacion: "bg-pink-500",
    esperando_piezas: "bg-emerald-500",
    listo: "bg-green-400",
    pending: "bg-warning",
  };

  const navigate = (dir: number) => {
    if (viewMode === "taller") {
      setCurrentDate(d => addDays(d, dir));
    } else if (viewMode === "week") {
      setCurrentDate(d => dir > 0 ? addWeeks(d, 1) : subWeeks(d, 1));
    } else {
      setCurrentDate(d => dir > 0 ? addMonths(d, 1) : subMonths(d, 1));
    }
  };

  const goToday = () => {
    setCurrentDate(new Date());
  };

  const handleAppointmentClick = (apt: Appointment) => {
    setSelectedApt(apt);
    setDetailOpen(true);
  };

  const headerLabel = viewMode === "taller"
    ? format(currentDate, "EEEE, d 'de' MMMM yyyy", { locale: es })
    : viewMode === "week"
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
            <Button variant="outline" className="min-w-[260px] justify-center font-medium capitalize">
              {headerLabel}
            </Button>
            <Button variant="outline" size="icon" onClick={() => navigate(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="default" size="sm" onClick={goToday} className="text-xs">Hoy</Button>
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-secondary p-1">
            <Button variant={viewMode === "taller" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("taller")} className="text-xs">TALLER</Button>
            <Button variant={viewMode === "week" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("week")} className="text-xs">SEMANA</Button>
            <Button variant={viewMode === "month" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("month")} className="text-xs">MES</Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : viewMode === "taller" ? (
          /* TALLER VIEW: Mechanics as columns, hours as rows */
          <div className="overflow-x-auto">
            <div className="min-w-[700px]">
              {/* Header row with mechanic names */}
              <div className="grid gap-0 border-b" style={{ gridTemplateColumns: `60px repeat(${mechanicNames.length}, 1fr)` }}>
                <div className="p-2 text-xs font-bold text-muted-foreground border-r bg-muted/30">Hora</div>
                {mechanicNames.map((name) => (
                  <div key={name} className="p-2 text-xs font-bold text-center border-r bg-muted/30 truncate">
                    {name}
                  </div>
                ))}
              </div>

              {/* Time grid */}
              {HOURS.map((hour) => (
                Array.from({ length: SLOTS_PER_HOUR }, (_, slotIdx) => {
                  const minute = slotIdx * 15;
                  const timeStr = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
                  const slotIndex = (hour - 7) * SLOTS_PER_HOUR + slotIdx;
                  const isHourStart = slotIdx === 0;

                  return (
                    <div
                      key={timeStr}
                      className={cn("grid gap-0", isHourStart ? "border-t border-border" : "border-t border-border/30")}
                      style={{ gridTemplateColumns: `60px repeat(${mechanicNames.length}, 1fr)` }}
                    >
                      <div className={cn(
                        "px-2 py-1 text-[10px] font-mono text-muted-foreground border-r",
                        isHourStart ? "font-bold" : "opacity-50"
                      )}>
                        {timeStr}
                      </div>
                      {mechanicNames.map((mechName) => {
                        // Find appointment that starts at this slot for this mechanic
                        const apt = todayAppointments.find((a) => {
                          const aptMechanic = a.mechanic || "Sin asignar";
                          if (aptMechanic !== mechName) return false;
                          return getAppointmentSlot(a) === slotIndex;
                        });

                        // Check if this slot is occupied by a multi-slot appointment
                        const occupyingApt = !apt ? todayAppointments.find((a) => {
                          const aptMechanic = a.mechanic || "Sin asignar";
                          if (aptMechanic !== mechName) return false;
                          const startSlot = getAppointmentSlot(a);
                          const duration = getAppointmentDuration(a);
                          return slotIndex > startSlot && slotIndex < startSlot + duration;
                        }) : null;

                        if (occupyingApt) {
                          // Slot occupied by multi-slot appointment, render nothing
                          return <div key={mechName} className="border-r min-h-[24px]" />;
                        }

                        if (apt) {
                          const duration = getAppointmentDuration(apt);
                          const colorClass = statusColors[apt.status] ?? "bg-secondary border-border text-foreground";
                          return (
                            <div
                              key={mechName}
                              className={cn(
                                "border-r relative cursor-pointer",
                              )}
                              style={{ gridRow: `span 1` }}
                            >
                              <div
                                className={cn(
                                  "absolute inset-x-0.5 top-0 rounded border px-1.5 py-0.5 text-[10px] leading-tight z-10 overflow-hidden",
                                  colorClass
                                )}
                                style={{ height: `${duration * 24}px` }}
                                onClick={() => handleAppointmentClick(apt)}
                              >
                                <div className="font-semibold truncate">{apt.client_name}</div>
                                <div className="truncate opacity-75">{apt.license_plate} · {apt.service}</div>
                                {apt.phone && <div className="truncate opacity-60">📞 {apt.phone}</div>}
                              </div>
                            </div>
                          );
                        }

                        return <div key={mechName} className="border-r min-h-[24px]" />;
                      })}
                    </div>
                  );
                })
              ))}
            </div>
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
                        {apt.phone && <p className="text-[10px] opacity-60">📞 {apt.phone}</p>}
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
                      "min-h-[90px] rounded-lg border p-1.5 transition-colors bg-card",
                      isToday && "ring-2 ring-primary/40 bg-primary/5",
                      !isCurrentMonth && "opacity-40",
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
