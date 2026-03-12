import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2, MoreVertical, User, Car, Wrench, Plus } from "lucide-react";
import {
  useAllAppointments,
  useCreateAppointment,
  useUpdateAppointment,
  useUpdateAppointmentStatus,
  type Appointment,
} from "@/hooks/useAppointments";
import { useCreateInvoice, generateInvoiceNumber } from "@/hooks/useInvoices";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { OrderPartsDialog } from "@/components/appointments/OrderPartsDialog";
import { ReceptionDialog } from "@/components/appointments/ReceptionDialog";

const KANBAN_COLUMNS = [
  { key: "recepcionado", label: "RECEPCIONADO", color: "border-t-purple-500" },
  { key: "en_reparacion", label: "EN REPARACIÓN", color: "border-t-pink-500" },
  { key: "esperando_piezas", label: "ESPERANDO PIEZAS", color: "border-t-emerald-500" },
  { key: "listo", label: "LISTO", color: "border-t-green-400" },
] as const;

type StatusKey = (typeof KANBAN_COLUMNS)[number]["key"];

const NEXT_STATUS: Record<string, StatusKey> = {
  recepcionado: "en_reparacion",
  en_reparacion: "esperando_piezas",
  esperando_piezas: "listo",
};

const Appointments = () => {
  const [view, setView] = useState<"active" | "history">("active");
  const [receptionOpen, setReceptionOpen] = useState(false);
  const [partsDialogId, setPartsDialogId] = useState<string | null>(null);
  const { data: appointments, isLoading } = useAllAppointments();
  const updateStatus = useUpdateAppointmentStatus();
  const createMutation = useCreateAppointment();
  const createInvoice = useCreateInvoice();

  const activeStatuses = ["recepcionado", "en_reparacion", "esperando_piezas", "listo"];
  const historyStatuses = ["listo", "cancelado", "entregado"];

  const filtered = (appointments ?? []).filter((a) =>
    view === "active"
      ? activeStatuses.includes(a.status) && a.status !== "listo"
        ? true
        : a.status === "listo"
      : historyStatuses.includes(a.status)
  );

  // Actually simpler: for active view show all active, for history show completed
  const activeAppointments = (appointments ?? []).filter((a) =>
    activeStatuses.includes(a.status)
  );
  const historyAppointments = (appointments ?? []).filter((a) =>
    ["listo", "cancelado", "entregado"].includes(a.status)
  );

  const displayedAppointments = view === "active" ? activeAppointments : historyAppointments;

  const getColumnAppointments = (status: string) =>
    displayedAppointments.filter((a) => a.status === status);

  const handleStatusChange = async (appointment: Appointment, newStatus: string) => {
    updateStatus.mutate({ id: appointment.id, status: newStatus });

    // Auto-generate invoice when moved to "listo"
    if (newStatus === "listo") {
      try {
        // Get parts total
        const { data: parts } = await supabase
          .from("order_parts")
          .select("*")
          .eq("appointment_id", appointment.id);
        
        const partsTotal = (parts ?? []).reduce(
          (sum: number, p: any) => sum + (p.quantity * p.unit_price), 0
        );
        const laborCost = 0; // Can be set manually
        const subtotal = partsTotal + laborCost;
        const taxRate = 21;
        const total = subtotal * (1 + taxRate / 100);
        const invoiceNumber = await generateInvoiceNumber();

        createInvoice.mutate({
          appointment_id: appointment.id,
          invoice_number: invoiceNumber,
          client_name: appointment.client_name,
          license_plate: appointment.license_plate,
          service: appointment.service,
          parts_total: partsTotal,
          labor_cost: laborCost,
          tax_rate: taxRate,
          total: Math.round(total * 100) / 100,
        });
      } catch (err) {
        console.error("Error generating invoice:", err);
      }
    }
  };

  const handleCreate = (data: any) => {
    createMutation.mutate(data, {
      onSuccess: () => setReceptionOpen(false),
    });
  };

  const orderNumber = (id: string) => `ORD-${id.slice(0, 4).toUpperCase()}`;

  return (
    <DashboardLayout title="Órdenes de Trabajo" subtitle="Gestión de órdenes del taller">
      <div className="space-y-4">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div />
          <div className="flex items-center gap-1 rounded-lg bg-secondary p-1">
            <Button
              variant={view === "active" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("active")}
              className="text-xs"
            >
              TABLERO ACTIVO
            </Button>
            <Button
              variant={view === "history" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("history")}
              className="text-xs"
            >
              HISTÓRICO
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {KANBAN_COLUMNS.map((col) => {
              const colAppointments = getColumnAppointments(col.key);
              return (
                <div
                  key={col.key}
                  className={`rounded-xl border-t-4 ${col.color} bg-card min-h-[400px]`}
                >
                  {/* Column header */}
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-xs font-bold tracking-wider text-muted-foreground">
                      {col.label}
                    </span>
                    <Badge variant="secondary" className="text-xs font-mono">
                      {colAppointments.length}
                    </Badge>
                  </div>

                  {/* Cards */}
                  <div className="space-y-3 px-3 pb-4">
                    {colAppointments.map((apt) => (
                      <Card key={apt.id} className="bg-secondary/50 border-border/50">
                        <CardContent className="p-3 space-y-2">
                          {/* Header with order number and menu */}
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono font-semibold text-primary">
                              {orderNumber(apt.id)}
                            </span>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                  <MoreVertical className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {NEXT_STATUS[apt.status] && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleStatusChange(apt, NEXT_STATUS[apt.status])
                                    }
                                  >
                                    Mover a{" "}
                                    {KANBAN_COLUMNS.find(
                                      (c) => c.key === NEXT_STATUS[apt.status]
                                    )?.label}
                                  </DropdownMenuItem>
                                )}
                                {(apt.status === "recepcionado" ||
                                  apt.status === "en_reparacion") && (
                                  <DropdownMenuItem
                                    onClick={() => setPartsDialogId(apt.id)}
                                  >
                                    <Wrench className="mr-2 h-3 w-3" />
                                    Gestionar piezas
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          {/* Client info */}
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-sm">
                              <User className="h-3 w-3 text-muted-foreground" />
                              <span className="font-medium truncate">
                                {apt.client_name || "Sin Nombre"}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Car className="h-3 w-3" />
                              <span className="font-mono">
                                {apt.license_plate || "---"}
                              </span>
                            </div>
                          </div>

                          {/* Service */}
                          <div className="rounded-md bg-background/50 px-2 py-1.5 text-xs">
                            {apt.service || "Sin servicio"}
                          </div>

                          {/* Time slot */}
                          <div className="text-[10px] text-muted-foreground">
                            {apt.date} · {apt.time_slot}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ReceptionDialog
        open={receptionOpen}
        onOpenChange={setReceptionOpen}
        onSubmit={handleCreate}
        isLoading={createMutation.isPending}
      />

      {partsDialogId && (
        <OrderPartsDialog
          open={!!partsDialogId}
          onOpenChange={(open) => !open && setPartsDialogId(null)}
          appointmentId={partsDialogId}
        />
      )}
    </DashboardLayout>
  );
};

export default Appointments;
