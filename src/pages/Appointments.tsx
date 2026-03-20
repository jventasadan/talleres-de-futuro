import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkshop } from "@/contexts/WorkshopContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, MoreVertical, User, Car, Wrench, Plus, Camera, Trash2, UserCog, Phone, FileText, ArrowRight, Clock, CheckCircle, Receipt } from "lucide-react";
import {
  useAllAppointments, useCreateAppointment, useUpdateAppointmentStatus,
  type Appointment,
} from "@/hooks/useAppointments";
import { useCreateInvoice, generateInvoiceNumber } from "@/hooks/useInvoices";
import { useQuotes, useUpdateQuoteStatus } from "@/hooks/useQuotes";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useMechanics } from "@/hooks/useMechanics";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { OrderPartsDialog } from "@/components/appointments/OrderPartsDialog";
import { ReceptionDialog } from "@/components/appointments/ReceptionDialog";
import { LaborDialog } from "@/components/appointments/LaborDialog";
import { PhotoGallery } from "@/components/appointments/PhotoGallery";
import { KanbanQuoteDialog } from "@/components/appointments/KanbanQuoteDialog";

const KANBAN_COLUMNS = [
  { key: "recepcionado", label: "RECEPCIONADO", borderColor: "border-purple-500", bgGlow: "from-purple-500/5 to-transparent" },
  { key: "en_reparacion", label: "EN REPARACIÓN", borderColor: "border-blue-500", bgGlow: "from-blue-500/5 to-transparent" },
  { key: "esperando_piezas", label: "ESPERANDO PIEZAS", borderColor: "border-amber-500", bgGlow: "from-amber-500/5 to-transparent" },
  { key: "listo", label: "LISTO", borderColor: "border-emerald-500", bgGlow: "from-emerald-500/5 to-transparent" },
] as const;

type StatusKey = (typeof KANBAN_COLUMNS)[number]["key"];
type AnyRecord = Record<string, any>;

const NEXT_STATUS: Record<string, StatusKey> = {
  recepcionado: "en_reparacion",
  en_reparacion: "esperando_piezas",
  esperando_piezas: "listo",
};

const STATUS_LABELS: Record<string, string> = {
  recepcionado: "En reparación",
  en_reparacion: "Esperando piezas",
  esperando_piezas: "Listo",
};

const isSchemaMismatchError = (error: any) => {
  const code = String(error?.code ?? "");
  const message = String(error?.message ?? "").toLowerCase();
  return code === "42703" || code === "PGRST204" || message.includes("does not exist") || message.includes("schema cache");
};

const extractMissingColumn = (error: any): string | null => {
  const message = String(error?.message ?? "");
  const pgrstMatch = message.match(/Could not find the '([^']+)' column/i);
  if (pgrstMatch?.[1]) return pgrstMatch[1];
  const pgMatch = message.match(/column\s+[\w.]+\.([a-zA-Z0-9_]+)\s+does not exist/i);
  if (pgMatch?.[1]) return pgMatch[1];
  return null;
};

const insertClientWithFallback = async (payload: AnyRecord) => {
  let attemptPayload: AnyRecord = { ...payload };
  for (let i = 0; i < 10; i += 1) {
    const { error } = await supabase
      .from("clients")
      .insert(attemptPayload as any)
      .select("id")
      .maybeSingle();
    if (!error) return;
    const missingColumn = extractMissingColumn(error);
    if (!isSchemaMismatchError(error) || !missingColumn || !(missingColumn in attemptPayload)) throw error;
    delete attemptPayload[missingColumn];
  }
};

const updateAppointmentWithFallback = async (appointmentId: string, payload: AnyRecord) => {
  let attemptPayload: AnyRecord = { ...payload };
  for (let i = 0; i < 10; i += 1) {
    const { error } = await supabase
      .from("appointments")
      .update(attemptPayload as any)
      .eq("id", appointmentId);
    if (!error) return;
    const missingColumn = extractMissingColumn(error);
    if (!isSchemaMismatchError(error) || !missingColumn || !(missingColumn in attemptPayload)) throw error;
    delete attemptPayload[missingColumn];
  }
};

const Appointments = () => {
  const [view, setView] = useState<"active" | "history">("active");
  const [receptionOpen, setReceptionOpen] = useState(false);
  const [partsDialog, setPartsDialog] = useState<{ appointmentId: string; workOrderId: string | null } | null>(null);
  const [laborDialogData, setLaborDialogData] = useState<{ appointment: Appointment; partsTotal: number; autoHours: number | null; workOrderId: string | null } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [expandedPhotos, setExpandedPhotos] = useState<string | null>(null);
  const [quoteAppointment, setQuoteAppointment] = useState<Appointment | null>(null);
  const [workOrderMap, setWorkOrderMap] = useState<Record<string, string>>({});

  const { data: appointments, isLoading } = useAllAppointments();
  const { data: mechanics } = useMechanics();
  const { data: companySettings } = useCompanySettings();
  const { data: quotes } = useQuotes();
  const updateStatus = useUpdateAppointmentStatus();
  const updateQuoteStatus = useUpdateQuoteStatus();
  const createMutation = useCreateAppointment();
  const createInvoice = useCreateInvoice();
  const { user } = useAuth();
  const { workshopId } = useWorkshop();

  // Fetch work_order map for all active appointments
  const fetchWorkOrderMap = useCallback(async () => {
    if (!workshopId || !appointments?.length) return;
    const activeIds = appointments
      .filter(a => ["recepcionado", "en_reparacion", "esperando_piezas", "listo"].includes(a.status))
      .map(a => a.id);
    if (!activeIds.length) return;

    const { data } = await (supabase as any)
      .from("work_orders")
      .select("id, appointment_id")
      .eq("workshop_id", workshopId)
      .in("appointment_id", activeIds);

    if (data) {
      const map: Record<string, string> = {};
      (data as any[]).forEach((wo) => { map[wo.appointment_id] = wo.id; });
      setWorkOrderMap(map);
    }
  }, [workshopId, appointments]);

  useEffect(() => { fetchWorkOrderMap(); }, [fetchWorkOrderMap]);

  const activeStatuses = ["recepcionado", "en_reparacion", "esperando_piezas", "listo"];
  const activeAppointments = (appointments ?? []).filter((a) => activeStatuses.includes(a.status));
  const historyAppointments = (appointments ?? []).filter((a) => ["listo", "facturado", "entregado", "cancelado"].includes(a.status));
  const displayedAppointments = view === "active" ? activeAppointments : historyAppointments;
  const getColumnAppointments = (status: string) => displayedAppointments.filter((a) => a.status === status);

  const getQuoteForAppointment = (aptId: string) => {
    if (!quotes?.length) return null;
    return quotes.find((q) => q.appointment_id === aptId) ?? null;
  };

  const getQuoteStatusLabel = (status: string) => {
    switch (status) {
      case "esperando_cliente":
        return "A la espera del cliente";
      case "aprobado":
        return "Aceptado";
      case "rechazado":
        return "Cancelado";
      default:
        return status;
    }
  };

  const ensureWorkOrderForAppointment = useCallback(async (appointment: Appointment) => {
    if (!workshopId) throw new Error("No se encontró el taller activo");

    const mappedWorkOrderId = workOrderMap[appointment.id];
    if (mappedWorkOrderId) return mappedWorkOrderId;

    const { data: existing, error: existingError } = await (supabase as any)
      .from("work_orders")
      .select("id")
      .eq("workshop_id", workshopId)
      .eq("appointment_id", appointment.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError) throw existingError;

    if (existing?.id) {
      setWorkOrderMap((prev) => ({ ...prev, [appointment.id]: existing.id }));
      return existing.id;
    }

    const { data: created, error: createdError } = await (supabase as any)
      .from("work_orders")
      .insert({
        appointment_id: appointment.id,
        user_id: user?.id ?? "",
        workshop_id: workshopId,
        status: "in_progress",
        repair_start_time: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (createdError) throw createdError;

    setWorkOrderMap((prev) => ({ ...prev, [appointment.id]: created.id }));
    return created.id;
  }, [user?.id, workOrderMap, workshopId]);

  const openPartsDialogForAppointment = useCallback(async (appointment: Appointment) => {
    try {
      let workOrderId = workOrderMap[appointment.id] ?? null;

      if (!workOrderId && ["en_reparacion", "esperando_piezas", "listo"].includes(appointment.status)) {
        workOrderId = await ensureWorkOrderForAppointment(appointment);
      }

      setPartsDialog({ appointmentId: appointment.id, workOrderId });
    } catch (error: any) {
      toast.error("No se pudieron cargar las piezas: " + (error?.message ?? "Error desconocido"));
    }
  }, [ensureWorkOrderForAppointment, workOrderMap]);

  const openQuoteDialogForAppointment = useCallback(async (appointment: Appointment) => {
    try {
      if (["en_reparacion", "esperando_piezas", "listo"].includes(appointment.status)) {
        await ensureWorkOrderForAppointment(appointment);
      }
      setQuoteAppointment(appointment);
    } catch (error: any) {
      toast.error("No se pudo abrir el presupuesto: " + (error?.message ?? "Error desconocido"));
    }
  }, [ensureWorkOrderForAppointment]);

  const fetchItemsFromWorkOrder = async (workOrderId: string): Promise<{ items: any[]; total: number }> => {
    const { data, error } = await (supabase as any)
      .from("work_order_items")
      .select("*")
      .eq("work_order_id", workOrderId);

    if (!error && data?.length) {
      const total = data.reduce((sum: number, i: any) => sum + Number(i.total ?? 0), 0);
      return { items: data, total };
    }
    return { items: [], total: 0 };
  };

  const handleStatusChange = async (appointment: Appointment, newStatus: string) => {
    if (newStatus === "en_reparacion") {
      if (!appointment.mechanic_id && !appointment.mechanic) {
        toast.error("Debes asignar un mecánico antes de pasar a EN REPARACIÓN");
        return;
      }

      try {
        await ensureWorkOrderForAppointment(appointment);
      } catch (error: any) {
        toast.error("No se pudo preparar la orden de trabajo: " + (error?.message ?? "Error desconocido"));
        return;
      }

      updateStatus.mutate({ id: appointment.id, status: newStatus });
      return;
    }

    if (newStatus === "listo") {
      let woId = workOrderMap[appointment.id] ?? null;
      let autoHours: number | null = null;

      if (!woId) {
        try {
          woId = await ensureWorkOrderForAppointment(appointment);
        } catch (_) {
          woId = null;
        }
      }

      if (woId) {
        try {
          const { data: wo } = await (supabase as any)
            .from("work_orders")
            .select("*")
            .eq("id", woId)
            .single();

          if (wo) {
            const startTime = wo.repair_start_time ? new Date(wo.repair_start_time) : new Date(wo.created_at);
            const endTime = new Date();
            const diffMs = endTime.getTime() - startTime.getTime();
            autoHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;

            await (supabase as any)
              .from("work_orders")
              .update({
                status: "completed",
                repair_end_time: endTime.toISOString(),
                repair_time_hours: autoHours,
                labor_cost: autoHours * (companySettings?.labor_rate ?? 35),
              })
              .eq("id", woId);
          }
        } catch (_) { /* best effort */ }
      }

      const { total: itemsTotal } = woId ? await fetchItemsFromWorkOrder(woId) : { total: 0 };
      setLaborDialogData({ appointment, partsTotal: itemsTotal, autoHours, workOrderId: woId });
      return;
    }

    updateStatus.mutate({ id: appointment.id, status: newStatus });
  };

  const handleLaborConfirm = async (laborCost: number, discount: number, hours: number) => {
    if (!laborDialogData) return;
    if (!workshopId) {
      toast.error("No se encontró el taller activo");
      return;
    }

    const { appointment, workOrderId } = laborDialogData;
    const partsTotal = laborDialogData.partsTotal;

    updateStatus.mutate({ id: appointment.id, status: "listo" });

    const vatRate = companySettings?.default_vat ?? 21;
    const subtotal = partsTotal + laborCost;
    const discountAmount = Number(((subtotal * discount) / 100).toFixed(2));
    const beforeTax = subtotal - discountAmount;
    const total = Number((beforeTax * (1 + vatRate / 100)).toFixed(2));

    const parts = workOrderId ? (await fetchPartsTotalFromWorkOrder(workOrderId)).parts : [];
    const lines: Array<{ description: string; quantity: number; unit_price: number; total: number; line_type: string }> = [];

    parts.forEach((p: any) => {
      lines.push({
        description: p.name ?? "Pieza",
        quantity: p.quantity ?? 1,
        unit_price: Number(p.unit_price ?? 0),
        total: (p.quantity ?? 1) * Number(p.unit_price ?? 0),
        line_type: "part",
      });
    });

    if (laborCost > 0) {
      lines.push({
        description: `Mano de obra (${hours}h × ${companySettings?.labor_rate ?? 35}€/h)`,
        quantity: hours,
        unit_price: companySettings?.labor_rate ?? 35,
        total: laborCost,
        line_type: "labor",
      });
    }

    if (discountAmount > 0) {
      lines.push({
        description: `Descuento aplicado (${discount}%)`,
        quantity: 1,
        unit_price: -discountAmount,
        total: -discountAmount,
        line_type: "discount",
      });
    }

    const invoiceNumber = await generateInvoiceNumber(user?.id ?? "", workshopId);

    createInvoice.mutate({
      work_order_id: workOrderId ?? undefined,
      client_name: appointment.client_name,
      license_plate: appointment.license_plate,
      service: appointment.service,
      parts_total: partsTotal,
      labor_cost: laborCost,
      tax_rate: vatRate,
      total,
      lines,
      invoice_number: invoiceNumber,
    });

    setLaborDialogData(null);
  };

  const handleDeliverVehicle = async (appointment: Appointment) => {
    updateStatus.mutate({ id: appointment.id, status: "entregado" });
    toast.success("Vehículo entregado correctamente");
  };

  const handleQuoteDecision = async (appointment: Appointment, quoteId: string, nextStatus: "aprobado" | "rechazado") => {
    try {
      if (nextStatus === "aprobado") {
        if (!workshopId) throw new Error("No se encontró el taller activo");

        const workOrderId = await ensureWorkOrderForAppointment(appointment);
        const [{ data: quoteLines, error: quoteLinesError }, { data: currentParts, error: currentPartsError }] = await Promise.all([
          (supabase as any)
            .from("quote_lines")
            .select("*")
            .eq("quote_id", quoteId),
          (supabase as any)
            .from("work_order_parts")
            .select("name, quantity, unit_price")
            .eq("work_order_id", workOrderId),
        ]);

        if (quoteLinesError) throw quoteLinesError;
        if (currentPartsError) throw currentPartsError;

        const partsToInsert = (quoteLines ?? [])
          .filter((line: any) => line.line_type === "part")
          .filter((line: any) => {
            return !(currentParts ?? []).some((part: any) => (
              part.name === (line.description ?? "") &&
              Number(part.quantity ?? 1) === Number(line.quantity ?? 1) &&
              Number(part.unit_price ?? 0) === Number(line.unit_price ?? 0)
            ));
          })
          .map((line: any) => ({
            work_order_id: workOrderId,
            name: line.description ?? "Pieza",
            quantity: Number(line.quantity ?? 1),
            unit_price: Number(line.unit_price ?? 0),
            total: Number(line.total ?? 0),
            user_id: user?.id ?? "",
            workshop_id: workshopId,
          }));

        if (partsToInsert.length > 0) {
          const { error: insertError } = await (supabase as any)
            .from("work_order_parts")
            .insert(partsToInsert);

          if (insertError) throw insertError;
        }
      }

      await updateQuoteStatus.mutateAsync({ id: quoteId, status: nextStatus });
      toast.success(nextStatus === "aprobado" ? "Presupuesto aceptado y piezas sincronizadas" : "Presupuesto cancelado");
    } catch (error: any) {
      toast.error("No se pudo actualizar el presupuesto: " + (error?.message ?? "Error desconocido"));
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("appointments").delete().eq("id", id) as any;
    if (error) {
      toast.error("Error al eliminar: " + error.message);
    } else {
      toast.success("Orden eliminada");
      window.location.reload();
    }
    setDeleteConfirm(null);
  };

  const handleAssignMechanic = async (appointmentId: string, mechanic: { id: string; name: string }) => {
    try {
      await updateAppointmentWithFallback(appointmentId, {
        mechanic_id: mechanic.id,
        mechanic: mechanic.name,
      });
      toast.success("Mecánico asignado");
    } catch (error: any) {
      toast.error("Error al asignar mecánico: " + (error?.message ?? "Error desconocido"));
    }
  };

  const handleCreate = async (data: AnyRecord) => {
    // Check mechanic capacity
    if (data.date && data.time_slot && workshopId) {
      const mechanicCount = (mechanics ?? []).length;
      if (mechanicCount > 0) {
        const { count } = await supabase
          .from("appointments")
          .select("id", { count: "exact", head: true })
          .eq("workshop_id", workshopId)
          .eq("date", data.date)
          .eq("time_slot", data.time_slot)
          .not("status", "in", '("cancelado","entregado")') as any;
        
        if ((count ?? 0) >= mechanicCount) {
          toast.error(`No hay mecánicos disponibles en esa franja horaria (${mechanicCount} mecánicos, ${count} citas)`);
          return;
        }
      }
    }

    if (user && data.client_name && data.license_plate) {
      try {
        await insertClientWithFallback({
          full_name: data.client_name,
          name: data.client_name,
          phone: data.phone ?? null,
          license_plate: data.license_plate.toUpperCase(),
          brand: data.brand ?? null,
          model: data.model ?? null,
          user_id: user.id,
        });
      } catch (_) { /* best effort */ }
    }
    createMutation.mutate(data, { onSuccess: () => setReceptionOpen(false) });
  };

  const orderNumber = (id: string) => `ORD-${id.slice(0, 4).toUpperCase()}`;

  const getMechanicName = (apt: Appointment) => {
    if (apt.mechanic) return apt.mechanic;
    if (apt.mechanic_id && mechanics) {
      const m = mechanics.find(m => m.id === apt.mechanic_id);
      return m?.name ?? null;
    }
    return null;
  };

  return (
    <DashboardLayout title="Órdenes de Trabajo" subtitle="Gestión de reparaciones del taller">
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <Button onClick={() => setReceptionOpen(true)} size="lg" className="font-semibold">
            <Plus className="mr-2 h-4 w-4" />
            Nueva cita
          </Button>
          <div className="flex items-center gap-1 rounded-xl bg-muted p-1">
            <Button variant={view === "active" ? "default" : "ghost"} size="sm" onClick={() => setView("active")} className="text-xs rounded-lg">TABLERO ACTIVO</Button>
            <Button variant={view === "history" ? "default" : "ghost"} size="sm" onClick={() => setView("history")} className="text-xs rounded-lg">HISTÓRICO</Button>
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
                <div key={col.key} className={`rounded-xl border ${col.borderColor} bg-gradient-to-b ${col.bgGlow} min-h-[500px]`}>
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
                    <span className="text-xs font-bold tracking-widest text-muted-foreground uppercase">{col.label}</span>
                    <Badge variant="secondary" className="text-[10px] font-mono h-5 min-w-[20px] justify-center rounded-full">{colAppointments.length}</Badge>
                  </div>
                  <div className="space-y-3 px-3 py-3">
                    {colAppointments.map((apt) => {
                      const mechName = getMechanicName(apt);
                      const quote = getQuoteForAppointment(apt.id);
                      return (
                        <Card key={apt.id} className="border-border/30 shadow-sm hover:shadow-md transition-all">
                          <CardContent className="p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono font-bold text-primary">{orderNumber(apt.id)}</span>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6"><MoreVertical className="h-3 w-3" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-52">
                                  {NEXT_STATUS[apt.status] && (
                                    <DropdownMenuItem onClick={() => handleStatusChange(apt, NEXT_STATUS[apt.status])}>
                                      <ArrowRight className="mr-2 h-3 w-3" />
                                      {STATUS_LABELS[apt.status] ?? `Mover a ${NEXT_STATUS[apt.status]}`}
                                    </DropdownMenuItem>
                                  )}
                                  {apt.status === "en_reparacion" && (
                                    <DropdownMenuItem onClick={() => void openQuoteDialogForAppointment(apt)}>
                                      <FileText className="mr-2 h-3 w-3" />Generar presupuesto
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem onClick={() => void openPartsDialogForAppointment(apt)}>
                                    <Wrench className="mr-2 h-3 w-3" />Gestionar piezas
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setExpandedPhotos(expandedPhotos === apt.id ? null : apt.id)}>
                                    <Camera className="mr-2 h-3 w-3" />Fotos
                                  </DropdownMenuItem>
                                  {(mechanics ?? []).length > 0 && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <div className="px-2 py-1 text-[10px] text-muted-foreground font-semibold uppercase">Asignar mecánico</div>
                                      {(mechanics ?? []).map((m) => (
                                        <DropdownMenuItem key={m.id} onClick={() => handleAssignMechanic(apt.id, m)}>
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
                                <User className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="font-semibold truncate text-foreground">{apt.client_name || "Sin Nombre"}</span>
                              </div>
                              {apt.phone && (
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <Phone className="h-3 w-3" />
                                  <a href={`tel:${apt.phone}`} className="hover:text-primary transition-colors">{apt.phone}</a>
                                </div>
                              )}
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Car className="h-3 w-3" />
                                <span className="font-mono font-semibold">{apt.license_plate || "---"}</span>
                              </div>
                            </div>

                            <div className="rounded-lg bg-muted/50 px-2.5 py-1.5 text-xs font-medium">{apt.service || "Sin servicio"}</div>

                            {quote && apt.status === "en_reparacion" && (
                              <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/10 px-2.5 py-2 text-xs">
                                <div className="flex items-center gap-2">
                                  <FileText className="h-3 w-3 text-primary" />
                                  <span className="font-medium text-primary">Presupuesto: {Number(quote.total).toFixed(2)}€</span>
                                  <Badge variant="outline" className="ml-auto h-4 text-[9px]">
                                    {getQuoteStatusLabel(quote.status)}
                                  </Badge>
                                </div>
                                {quote.status === "esperando_cliente" && (
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-6 px-2 text-[10px]"
                                      onClick={() => void handleQuoteDecision(apt, quote.id, "aprobado")}
                                    >
                                      Aceptar
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2 text-[10px]"
                                      onClick={() => void handleQuoteDecision(apt, quote.id, "rechazado")}
                                    >
                                      Cancelar
                                    </Button>
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="flex items-center justify-between">
                              {mechName ? (
                                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                  <Wrench className="h-3 w-3 text-primary/60" />
                                  <span>{mechName}</span>
                                </div>
                              ) : (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-6 text-[10px] px-2">
                                      <UserCog className="mr-1 h-3 w-3" />Asignar
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent>
                                    {(mechanics ?? []).map((m) => (
                                      <DropdownMenuItem key={m.id} onClick={() => handleAssignMechanic(apt.id, m)}>
                                        {m.name}
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                <span>{apt.time_slot}</span>
                              </div>
                            </div>

                            {apt.notes && <div className="text-[10px] text-muted-foreground italic line-clamp-2">{apt.notes}</div>}

                            {/* Quick action buttons */}
                            <div className="flex items-center gap-1 pt-1 border-t border-border/20">
                              {NEXT_STATUS[apt.status] && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-[10px] px-2 text-primary hover:text-primary"
                                  onClick={() => handleStatusChange(apt, NEXT_STATUS[apt.status])}
                                >
                                  <ArrowRight className="mr-1 h-3 w-3" />
                                  {STATUS_LABELS[apt.status]}
                                </Button>
                              )}
                              {["en_reparacion", "esperando_piezas", "listo"].includes(apt.status) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-[10px]"
                                  onClick={() => void openPartsDialogForAppointment(apt)}
                                >
                                  <Wrench className="mr-1 h-3 w-3" />
                                  Piezas
                                </Button>
                              )}
                              {apt.status === "en_reparacion" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-[10px] px-2"
                                  onClick={() => void openQuoteDialogForAppointment(apt)}
                                >
                                  <FileText className="mr-1 h-3 w-3" />
                                  Presupuesto
                                </Button>
                              )}
                              {apt.status === "listo" && (
                                <>
                                  <Button
                                    variant="default"
                                    size="sm"
                                    className="h-6 text-[10px] px-2"
                                    onClick={() => handleDeliverVehicle(apt)}
                                  >
                                    <CheckCircle className="mr-1 h-3 w-3" />
                                    Entregar vehículo
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-[10px] px-2"
                                    title="Ver factura"
                                  >
                                    <Receipt className="h-3 w-3" />
                                  </Button>
                                </>
                              )}
                            </div>

                            {expandedPhotos === apt.id && <PhotoGallery appointmentId={apt.id} />}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ReceptionDialog open={receptionOpen} onOpenChange={setReceptionOpen} onSubmit={handleCreate} isLoading={createMutation.isPending} />

      {partsDialog && (
        <OrderPartsDialog
          open={!!partsDialog}
          onOpenChange={(open) => !open && setPartsDialog(null)}
          appointmentId={partsDialog.appointmentId}
          workOrderId={partsDialog.workOrderId}
        />
      )}

      {laborDialogData && (
        <LaborDialog
          open={!!laborDialogData}
          onOpenChange={(open) => !open && setLaborDialogData(null)}
          partsTotal={laborDialogData.partsTotal}
          autoHours={laborDialogData.autoHours}
          onConfirm={handleLaborConfirm}
        />
      )}

      <KanbanQuoteDialog
        open={!!quoteAppointment}
        onOpenChange={(open) => !open && setQuoteAppointment(null)}
        appointment={quoteAppointment}
      />

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
