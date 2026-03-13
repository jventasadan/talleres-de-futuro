import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, MoreVertical, User, Car, Wrench, Plus, Camera, Trash2, UserCog } from "lucide-react";
import {
  useAllAppointments, useCreateAppointment, useUpdateAppointmentStatus,
  type Appointment,
} from "@/hooks/useAppointments";
import { useCreateInvoice, generateInvoiceNumber } from "@/hooks/useInvoices";
import { useMechanics } from "@/hooks/useMechanics";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { OrderPartsDialog } from "@/components/appointments/OrderPartsDialog";
import { ReceptionDialog } from "@/components/appointments/ReceptionDialog";
import { LaborDialog } from "@/components/appointments/LaborDialog";
import { PhotoGallery } from "@/components/appointments/PhotoGallery";

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
  const [laborDialogData, setLaborDialogData] = useState<{ appointment: Appointment; partsTotal: number } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [expandedPhotos, setExpandedPhotos] = useState<string | null>(null);

  const { data: appointments, isLoading } = useAllAppointments();
  const { data: mechanics } = useMechanics();
  const updateStatus = useUpdateAppointmentStatus();
  const createMutation = useCreateAppointment();
  const createInvoice = useCreateInvoice();

  const activeStatuses = ["recepcionado", "en_reparacion", "esperando_piezas", "listo"];
  const activeAppointments = (appointments ?? []).filter((a) => activeStatuses.includes(a.status));
  const historyAppointments = (appointments ?? []).filter((a) => ["listo", "cancelado", "entregado"].includes(a.status));
  const displayedAppointments = view === "active" ? activeAppointments : historyAppointments;
  const getColumnAppointments = (status: string) => displayedAppointments.filter((a) => a.status === status);

  const handleMoveToListo = async (appointment: Appointment) => {
    // Get parts total first
    const { data: parts } = await supabase
      .from("order_parts")
      .select("*")
      .eq("appointment_id", appointment.id) as any;

    const partsTotal = (parts ?? []).reduce(
      (sum: number, p: any) => sum + (p.quantity * p.unit_price), 0
    );

    // Open labor dialog instead of auto-generating invoice
    setLaborDialogData({ appointment, partsTotal });
  };

  const handleStatusChange = async (appointment: Appointment, newStatus: string) => {
    if (newStatus === "listo") {
      await handleMoveToListo(appointment);
      return;
    }
    updateStatus.mutate({ id: appointment.id, status: newStatus });
  };

  const handleLaborConfirm = async (laborCost: number, discount: number) => {
    if (!laborDialogData) return;
    const { appointment, partsTotal } = laborDialogData;

    // Update status first
    updateStatus.mutate({ id: appointment.id, status: "listo" });

    const subtotal = partsTotal + laborCost;
    const discountAmount = subtotal * (discount / 100);
    const beforeTax = subtotal - discountAmount;
    const taxRate = 21;
    const total = Number((beforeTax * (1 + taxRate / 100)).toFixed(2));
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
      total,
    });

    setLaborDialogData(null);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("appointments").delete().eq("id", id) as any;
    if (error) {
      toast.error("Error al eliminar: " + error.message);
    } else {
      toast.success("Orden eliminada");
      // Refresh
      window.location.reload();
    }
    setDeleteConfirm(null);
  };

  const handleAssignMechanic = async (appointmentId: string, mechanicId: string) => {
    const { error } = await supabase
      .from("appointments")
      .update({ mechanic_id: mechanicId } as any)
      .eq("id", appointmentId);
    if (error) toast.error("Error al asignar mecánico");
    else toast.success("Mecánico asignado");
  };

  const handleCreate = (data: any) => {
    createMutation.mutate(data, { onSuccess: () => setReceptionOpen(false) });
  };

  const orderNumber = (id: string) => `ORD-${id.slice(0, 4).toUpperCase()}`;

  return (
    <DashboardLayout title="Órdenes de Trabajo" subtitle="Gestión de órdenes del taller">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button onClick={() => setReceptionOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Recepcionar vehículo
          </Button>
          <div className="flex items-center gap-1 rounded-lg bg-secondary p-1">
            <Button variant={view === "active" ? "default" : "ghost"} size="sm" onClick={() => setView("active")} className="text-xs">TABLERO ACTIVO</Button>
            <Button variant={view === "history" ? "default" : "ghost"} size="sm" onClick={() => setView("history")} className="text-xs">HISTÓRICO</Button>
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
                <div key={col.key} className={`rounded-xl border-t-4 ${col.color} bg-card min-h-[400px]`}>
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-xs font-bold tracking-wider text-muted-foreground">{col.label}</span>
                    <Badge variant="secondary" className="text-xs font-mono">{colAppointments.length}</Badge>
                  </div>
                  <div className="space-y-3 px-3 pb-4">
                    {colAppointments.map((apt) => (
                      <Card key={apt.id} className="bg-secondary/50 border-border/50">
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono font-semibold text-primary">{orderNumber(apt.id)}</span>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6"><MoreVertical className="h-3 w-3" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {NEXT_STATUS[apt.status] && (
                                  <DropdownMenuItem onClick={() => handleStatusChange(apt, NEXT_STATUS[apt.status])}>
                                    Mover a {KANBAN_COLUMNS.find((c) => c.key === NEXT_STATUS[apt.status])?.label}
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => setPartsDialogId(apt.id)}>
                                  <Wrench className="mr-2 h-3 w-3" />Gestionar piezas
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setExpandedPhotos(expandedPhotos === apt.id ? null : apt.id)}>
                                  <Camera className="mr-2 h-3 w-3" />Fotos
                                </DropdownMenuItem>
                                {(mechanics ?? []).length > 0 && (
                                  <>
                                    <DropdownMenuSeparator />
                                    {(mechanics ?? []).map((m) => (
                                      <DropdownMenuItem key={m.id} onClick={() => handleAssignMechanic(apt.id, m.id)}>
                                        <UserCog className="mr-2 h-3 w-3" />{m.name}
                                      </DropdownMenuItem>
                                    ))}
                                  </>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setDeleteConfirm(apt.id)} className="text-destructive">
                                  <Trash2 className="mr-2 h-3 w-3" />Eliminar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-sm">
                              <User className="h-3 w-3 text-muted-foreground" />
                              <span className="font-medium truncate">{apt.client_name || "Sin Nombre"}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Car className="h-3 w-3" />
                              <span className="font-mono">{apt.license_plate || "---"}</span>
                            </div>
                          </div>

                          <div className="rounded-md bg-background/50 px-2 py-1.5 text-xs">{apt.service || "Sin servicio"}</div>
                          {apt.notes && <div className="text-[10px] text-muted-foreground italic">{apt.notes}</div>}
                          <div className="text-[10px] text-muted-foreground">{apt.date} · {apt.time_slot}</div>

                          {expandedPhotos === apt.id && <PhotoGallery appointmentId={apt.id} />}
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

      <ReceptionDialog open={receptionOpen} onOpenChange={setReceptionOpen} onSubmit={handleCreate} isLoading={createMutation.isPending} />

      {partsDialogId && (
        <OrderPartsDialog open={!!partsDialogId} onOpenChange={(open) => !open && setPartsDialogId(null)} appointmentId={partsDialogId} />
      )}

      {laborDialogData && (
        <LaborDialog
          open={!!laborDialogData}
          onOpenChange={(open) => !open && setLaborDialogData(null)}
          partsTotal={laborDialogData.partsTotal}
          onConfirm={handleLaborConfirm}
        />
      )}

      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta orden?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default Appointments;
