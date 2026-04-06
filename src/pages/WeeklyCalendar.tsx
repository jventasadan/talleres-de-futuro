import { useState, useMemo, useCallback } from "react";
import {
  format, startOfWeek, startOfMonth, endOfMonth, addDays, subWeeks, addWeeks,
  subMonths, addMonths, isSameDay, isSameMonth, eachDayOfInterval,
} from "date-fns";
import { es } from "date-fns/locale";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2, Plus } from "lucide-react";
import { useAllAppointments, useCreateAppointment, type Appointment } from "@/hooks/useAppointments";
import { useMechanics } from "@/hooks/useMechanics";
import { AppointmentDetailDialog } from "@/components/appointments/AppointmentDetailDialog";
import { ReceptionDialog } from "@/components/appointments/ReceptionDialog";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkshop } from "@/contexts/WorkshopContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { findNearestAvailableSlot, getServiceDurationSlots, getTimeSlotIndex, hasMechanicAvailability } from "@/lib/appointment-utils";

const HOURS = Array.from({ length: 13 }, (_, i) => i + 7);
const SLOTS_PER_HOUR = 4;

const statusColors: Record<string, string> = {
  espera: "bg-amber-500/20 border-amber-500/40 text-amber-200",
  recepcionado: "bg-purple-500/20 border-purple-500/40 text-purple-200",
  en_reparacion: "bg-blue-500/20 border-blue-500/40 text-blue-200",
  esperando_piezas: "bg-emerald-500/20 border-emerald-500/40 text-emerald-200",
  listo: "bg-green-500/20 border-green-500/40 text-green-200",
  facturado: "bg-green-600/20 border-green-600/40 text-green-200",
  pending: "bg-amber-500/20 border-amber-500/40 text-amber-200",
};

const WeeklyCalendar = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<"week" | "month" | "taller">("taller");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [receptionOpen, setReceptionOpen] = useState(false);
  const { data: allAppointments, isLoading } = useAllAppointments();
  const { data: mechanics } = useMechanics();
  const createMutation = useCreateAppointment();
  const { user } = useAuth();
  const { workshopId } = useWorkshop();
  const navigate = useNavigate();
  const today = new Date();

  // Filter out entregado/cancelado from calendar
  const visibleAppointments = useMemo(() => {
    return (allAppointments ?? []).filter(a => !["entregado", "cancelado"].includes(a.status));
  }, [allAppointments]);

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
    visibleAppointments.forEach((apt) => {
      const key = apt.date;
      if (map.has(key)) map.get(key)!.push(apt);
    });
    return map;
  }, [visibleAppointments, displayDays]);

  const todayAppointments = useMemo(() => {
    return visibleAppointments.filter((a) => a.date === todayStr);
  }, [visibleAppointments, todayStr]);

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
    return getTimeSlotIndex(apt.time_slot);
  };

  const getAppointmentDuration = (apt: Appointment): number => {
    return getServiceDurationSlots(apt.service || "");
  };

  const statusDot: Record<string, string> = {
    espera: "bg-amber-500",
    recepcionado: "bg-purple-500",
    en_reparacion: "bg-blue-500",
    esperando_piezas: "bg-emerald-500",
    listo: "bg-green-400",
    facturado: "bg-green-600",
    pending: "bg-warning",
  };

  const navigate_ = (dir: number) => {
    if (viewMode === "taller") {
      setCurrentDate(d => addDays(d, dir));
    } else if (viewMode === "week") {
      setCurrentDate(d => dir > 0 ? addWeeks(d, 1) : subWeeks(d, 1));
    } else {
      setCurrentDate(d => dir > 0 ? addMonths(d, 1) : subMonths(d, 1));
    }
  };

  const goToday = () => setCurrentDate(new Date());

  const handleAppointmentClick = (apt: Appointment) => {
    setSelectedApt(apt);
    setDetailOpen(true);
  };

  // Find nearest available slot considering mechanic availability
  const findNearestSlot = useCallback((date: string, requestedTime: string, serviceName: string) => {
    return findNearestAvailableSlot({
      appointments: visibleAppointments,
      date,
      requestedTime,
      serviceName,
      mechanicCount: (mechanics ?? []).length || 1,
    });
  }, [mechanics, visibleAppointments]);

  const [pendingAppointment, setPendingAppointment] = useState<{ data: any; suggestedSlot: string } | null>(null);

  const handleCreateAppointment = async (data: any) => {
    if (!user || !workshopId) return;

    // Smart scheduling: find nearest available slot
    const dateStr = data.date;
    const requestedTime = data.time_slot || "09:00";
    const mechanicCount = (mechanics ?? []).length || 1;

    const hasAvailability = hasMechanicAvailability({
      appointments: visibleAppointments,
      date: dateStr,
      requestedTime,
      serviceName: data.service || "",
      mechanicCount,
    });

    if (!hasAvailability) {
      const availableSlot = findNearestSlot(dateStr, requestedTime, data.service || "");
      if (!availableSlot) {
        toast.error("No hay huecos disponibles en esta fecha. Todos los mecánicos están ocupados.");
        return;
      }
      // Ask user to confirm the alternative slot
      setPendingAppointment({ data, suggestedSlot: availableSlot });
      return;
    }

    await confirmCreateAppointment(data, requestedTime);
  };

  const confirmCreateAppointment = async (data: any, timeSlot: string) => {
    if (!user || !workshopId) return;

    // Auto-create client if not exists
    if (data.client_name && data.license_plate) {
      try {
        const plate = data.license_plate.toUpperCase();
        const { data: existingByPlate } = await supabase
          .from("clients")
          .select("id")
          .eq("workshop_id", workshopId)
          .eq("license_plate", plate)
          .maybeSingle() as any;

        if (!existingByPlate) {
          let existingByPhone = null;
          if (data.phone) {
            const { data: phoneMatch } = await supabase
              .from("clients")
              .select("id")
              .eq("workshop_id", workshopId)
              .eq("phone", data.phone)
              .maybeSingle() as any;
            existingByPhone = phoneMatch;
          }

          if (!existingByPhone) {
            await supabase.from("clients").insert({
              name: data.client_name,
              phone: data.phone ?? null,
              email: data.email ?? null,
              license_plate: plate,
              brand: data.brand ?? null,
              model: data.model ?? null,
              user_id: user.id,
            } as any);
          }
        }
      } catch (_) { /* best effort */ }
    }

    createMutation.mutate({ ...data, time_slot: timeSlot, status: "espera" }, {
      onSuccess: () => { setReceptionOpen(false); setPendingAppointment(null); },
    });
  };

  const headerLabel = viewMode === "taller"
    ? format(currentDate, "EEEE, d 'de' MMMM yyyy", { locale: es })
    : viewMode === "week"
      ? `${format(weekStart, "d MMM", { locale: es })} — ${format(addDays(weekStart, 6), "d MMM yyyy", { locale: es })}`
      : format(currentDate, "MMMM yyyy", { locale: es });

  return (
    <DashboardLayout title="Calendario" subtitle="Vista de citas del taller">
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigate_(-1)} className="h-9 w-9">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="min-w-[240px] justify-center font-medium capitalize text-sm">
              {headerLabel}
            </Button>
            <Button variant="outline" size="icon" onClick={() => navigate_(1)} className="h-9 w-9">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="default" size="sm" onClick={goToday} className="text-xs">Hoy</Button>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setReceptionOpen(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Nueva cita
            </Button>
            <div className="flex items-center gap-1 rounded-xl bg-muted p-1">
              <Button variant={viewMode === "taller" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("taller")} className="text-xs rounded-lg">TALLER</Button>
              <Button variant={viewMode === "week" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("week")} className="text-xs rounded-lg">SEMANA</Button>
              <Button variant={viewMode === "month" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("month")} className="text-xs rounded-lg">MES</Button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : viewMode === "taller" ? (
          <div className="overflow-x-auto rounded-xl border border-border/30">
            <div className="min-w-[700px]">
              <div className="grid gap-0" style={{ gridTemplateColumns: `64px repeat(${mechanicNames.length}, 1fr)` }}>
                <div className="p-3 text-[10px] font-bold text-muted-foreground border-r border-b border-border/30 bg-muted/20 uppercase tracking-wider">Hora</div>
                {mechanicNames.map((name) => (
                  <div key={name} className="p-3 text-xs font-bold text-center border-r border-b border-border/30 bg-muted/20 truncate">
                    {name}
                  </div>
                ))}
              </div>

              {HOURS.map((hour) => (
                Array.from({ length: SLOTS_PER_HOUR }, (_, slotIdx) => {
                  const minute = slotIdx * 15;
                  const timeStr = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
                  const slotIndex = (hour - 7) * SLOTS_PER_HOUR + slotIdx;
                  const isHourStart = slotIdx === 0;

                  return (
                    <div
                      key={timeStr}
                      className={cn("grid gap-0", isHourStart ? "border-t border-border/40" : "border-t border-border/10")}
                      style={{ gridTemplateColumns: `64px repeat(${mechanicNames.length}, 1fr)` }}
                    >
                      <div className={cn(
                        "px-3 py-1 text-[10px] font-mono text-muted-foreground border-r border-border/30",
                        isHourStart ? "font-bold" : "opacity-40"
                      )}>
                        {timeStr}
                      </div>
                      {mechanicNames.map((mechName) => {
                        const apt = todayAppointments.find((a) => {
                          const aptMechanic = a.mechanic || "Sin asignar";
                          if (aptMechanic !== mechName) return false;
                          return getAppointmentSlot(a) === slotIndex;
                        });

                        const occupyingApt = !apt ? todayAppointments.find((a) => {
                          const aptMechanic = a.mechanic || "Sin asignar";
                          if (aptMechanic !== mechName) return false;
                          const startSlot = getAppointmentSlot(a);
                          const duration = getAppointmentDuration(a);
                          return slotIndex > startSlot && slotIndex < startSlot + duration;
                        }) : null;

                        if (occupyingApt) {
                          return <div key={mechName} className="border-r border-border/10 min-h-[26px]" />;
                        }

                        if (apt) {
                          const duration = getAppointmentDuration(apt);
                          const colorClass = statusColors[apt.status] ?? "bg-secondary/50 border-border/30 text-foreground";
                          return (
                            <div key={mechName} className="border-r border-border/10 relative">
                              <div
                                className={cn(
                                  "absolute inset-x-1 top-0 rounded-lg border px-2 py-1 text-[10px] leading-tight z-10 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity",
                                  colorClass
                                )}
                                style={{ height: `${duration * 26}px` }}
                                onClick={() => handleAppointmentClick(apt)}
                              >
                                <div className="font-bold truncate">{apt.client_name}</div>
                                <div className="truncate opacity-80">{apt.license_plate} · {apt.service}</div>
                                {apt.phone && <div className="truncate opacity-60">📞 {apt.phone}</div>}
                              </div>
                            </div>
                          );
                        }

                        return <div key={mechName} className="border-r border-border/10 min-h-[26px]" />;
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
                <Card key={key} className={cn("min-h-[280px] border-border/30", isToday && "ring-2 ring-primary/30 shadow-lg")}>
                  <div className={cn("px-3 py-2 text-center border-b border-border/20", isToday ? "bg-primary/10" : "bg-muted/20")}>
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
                        className="rounded-lg border border-border/20 bg-muted/30 p-2 text-[11px] leading-tight cursor-pointer hover:bg-muted/60 transition-colors"
                      >
                        <div className="flex items-center gap-1 font-semibold">
                          <div className={cn("h-2 w-2 rounded-full shrink-0", statusDot[apt.status] ?? "bg-muted-foreground")} />
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
                      "min-h-[90px] rounded-lg border border-border/20 p-1.5 transition-colors bg-card",
                      isToday && "ring-2 ring-primary/30 bg-primary/5",
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

      <ReceptionDialog
        open={receptionOpen}
        onOpenChange={setReceptionOpen}
        onSubmit={handleCreateAppointment}
        isLoading={createMutation.isPending}
        defaultStatus="espera"
      />

      {/* Slot conflict confirmation dialog */}
      <AlertDialog open={!!pendingAppointment} onOpenChange={(open) => !open && setPendingAppointment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Horario no disponible</AlertDialogTitle>
            <AlertDialogDescription>
              La hora solicitada está ocupada (todos los mecánicos tienen citas). 
              El hueco libre más cercano es a las <strong>{pendingAppointment?.suggestedSlot}</strong>. 
              ¿Deseas agendar la cita a esa hora?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (pendingAppointment) {
                confirmCreateAppointment(pendingAppointment.data, pendingAppointment.suggestedSlot);
              }
            }}>
              Aceptar ({pendingAppointment?.suggestedSlot})
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default WeeklyCalendar;
