import { useState } from "react";
import { format, addDays, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  CalendarIcon,
  Loader2,
} from "lucide-react";
import {
  useAppointments,
  useCreateAppointment,
  useUpdateAppointment,
  useCancelAppointment,
  type Appointment,
} from "@/hooks/useAppointments";
import { AppointmentDialog } from "@/components/appointments/AppointmentDialog";
import { AppointmentCard } from "@/components/appointments/AppointmentCard";

const Appointments = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);

  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const { data: appointments, isLoading } = useAppointments(dateStr);
  const createMutation = useCreateAppointment();
  const updateMutation = useUpdateAppointment();
  const cancelMutation = useCancelAppointment();

  const handleCreate = (data: any) => {
    createMutation.mutate(data, {
      onSuccess: () => setDialogOpen(false),
    });
  };

  const handleEdit = (appointment: Appointment) => {
    setEditingAppointment(appointment);
  };

  const handleUpdate = (data: any) => {
    if (!editingAppointment) return;
    updateMutation.mutate(
      { id: editingAppointment.id, ...data },
      { onSuccess: () => setEditingAppointment(null) }
    );
  };

  const handleCancel = (id: string) => {
    cancelMutation.mutate(id);
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) setSelectedDate(date);
  };

  const activeCount = appointments?.filter(
    (a) => a.status !== "cancelled" && a.status !== "completed"
  ).length ?? 0;

  return (
    <DashboardLayout title="Gestión de citas" subtitle="Agenda de tu taller">
      <div className="space-y-4">
        {/* Top bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSelectedDate((d) => subDays(d, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="min-w-[200px] justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(selectedDate, "EEEE, d MMM yyyy", { locale: es })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setSelectedDate((d) => addDays(d, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedDate(new Date())}
              className="text-xs"
            >
              Hoy
            </Button>
          </div>

          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva cita
          </Button>
        </div>

        {/* Content */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="font-display text-base">
                Citas del día
              </CardTitle>
              <Badge variant="outline" className="font-mono text-xs">
                {activeCount} activas
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !appointments?.length ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CalendarIcon className="h-10 w-10 text-muted-foreground/40" />
                <p className="mt-3 text-sm font-medium text-muted-foreground">
                  No hay citas para este día
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => setDialogOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Añadir primera cita
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {appointments.map((apt) => (
                  <AppointmentCard
                    key={apt.id}
                    appointment={apt}
                    onEdit={handleEdit}
                    onCancel={handleCancel}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create dialog */}
      <AppointmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleCreate}
        isLoading={createMutation.isPending}
      />

      {/* Edit dialog */}
      <AppointmentDialog
        open={!!editingAppointment}
        onOpenChange={(open) => !open && setEditingAppointment(null)}
        appointment={editingAppointment}
        onSubmit={handleUpdate}
        isLoading={updateMutation.isPending}
      />
    </DashboardLayout>
  );
};

export default Appointments;
