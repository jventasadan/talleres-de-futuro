import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkshop } from "@/contexts/WorkshopContext";
import { buildKilometersPayload } from "@/lib/appointment-utils";
import { toast } from "sonner";

export interface Appointment {
  id: string;
  status: string;
  client_name: string;
  license_plate: string;
  service: string;
  date: string;
  time_slot: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
  client_id: string | null;
  created_by: string;
  mechanic_id?: string | null;
  mechanic?: string | null;
  brand?: string | null;
  model?: string | null;
  phone?: string | null;
  email?: string | null;
  km?: string | null;
  problem?: string | null;
  appointment_start?: string | null;
  appointment_end?: string | null;
}

type AnyRecord = Record<string, any>;

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

const normalizeDate = (value: unknown): string => {
  if (!value) return "";
  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  if (raw.includes("T")) return raw.slice(0, 10);

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);

  return "";
};

const normalizeTime = (value: unknown): string | null => {
  if (!value) return null;
  const raw = String(value);

  if (/^\d{2}:\d{2}$/.test(raw)) return raw;
  if (raw.includes("T") && raw.length >= 16) return raw.slice(11, 16);

  const timeMatch = raw.match(/(\d{2}:\d{2})/);
  if (timeMatch?.[1]) return timeMatch[1];

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(11, 16);

  return null;
};

const normalizeKilometros = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const mapStatus = (status: string | null | undefined) => {
  if (!status) return "recepcionado";
  if (status === "reparado") return "listo";
  return status;
};

const mapAppointmentRow = (row: AnyRecord): Appointment => {
  const sourceDate = row.date ?? row.appointment_date ?? row.appointment_start ?? row.created_at;
  const sourceTime = row.time_slot ?? row.appointment_start ?? row.appointment_date;

  return {
    id: row.id,
    status: mapStatus(row.status),
    client_name: row.client_name ?? row.name ?? "",
    license_plate: row.license_plate ?? "",
    service: row.service ?? row.service_type ?? row.problem ?? "",
    date: normalizeDate(sourceDate),
    time_slot: normalizeTime(sourceTime) ?? "09:00",
    notes: row.notes ?? null,
    created_at: row.created_at ?? new Date().toISOString(),
    updated_at: row.updated_at ?? row.created_at ?? new Date().toISOString(),
    user_id: row.user_id ?? "",
    client_id: row.client_id ?? null,
    created_by: row.created_by ?? "manual",
    mechanic_id: row.mechanic_id ?? null,
    mechanic: row.mechanic ?? null,
    brand: row.brand ?? null,
    model: row.model ?? null,
    phone: row.phone ?? null,
    email: row.email ?? row.Email ?? null,
    km: row.km ?? row.kilometros ?? (row.Kilometros != null ? String(row.Kilometros) : null),
    problem: row.problem ?? null,
    appointment_start: row.appointment_start ?? null,
    appointment_end: row.appointment_end ?? null,
  };
};

const applyDateFilter = (query: any, dateColumn: string | null, dateFilter?: string) => {
  if (!dateFilter || !dateColumn) return query;

  if (dateColumn === "date") {
    return query.eq("date", dateFilter);
  }

  const start = `${dateFilter}T00:00:00`;
  const end = `${dateFilter}T23:59:59.999`;
  return query.gte(dateColumn, start).lte(dateColumn, end);
};

const fetchAppointmentsRows = async (workshopId: string, dateFilter?: string): Promise<AnyRecord[]> => {
  const attempts: Array<{ dateColumn: "date" | "appointment_date" | "appointment_start" | null; orderColumns: string[] }> = [
    { dateColumn: "appointment_date", orderColumns: ["appointment_date", "appointment_start"] },
    { dateColumn: "date", orderColumns: ["date", "time_slot"] },
    { dateColumn: "appointment_start", orderColumns: ["appointment_start"] },
    { dateColumn: null, orderColumns: ["created_at"] },
    { dateColumn: null, orderColumns: [] },
  ];

  let lastError: any;

  for (const attempt of attempts) {
    let query: any = supabase.from("appointments").select("*").eq("workshop_id", workshopId);

    for (const column of attempt.orderColumns) {
      query = query.order(column);
    }

    query = applyDateFilter(query, attempt.dateColumn, dateFilter);

    const { data, error } = await query;

    if (!error) return (data ?? []) as AnyRecord[];
    lastError = error;

    if (!isSchemaMismatchError(error)) throw error;
  }

  throw lastError;
};

const insertAppointmentWithFallback = async (payload: AnyRecord) => {
  let attemptPayload: AnyRecord = { ...payload };
  let lastError: any;

  for (let i = 0; i < 12; i += 1) {
    console.log(`[insertFallback] attempt ${i}, keys:`, Object.keys(attemptPayload));
    const { data, error } = await supabase
      .from("appointments")
      .insert(attemptPayload as any)
      .select("*")
      .maybeSingle();

    if (!error) {
      console.log("[insertFallback] success, data:", JSON.stringify(data));
      return data;
    }

    lastError = error;
    console.log(`[insertFallback] error:`, error.message, error.code);
    const missingColumn = extractMissingColumn(error);
    console.log(`[insertFallback] missingColumn:`, missingColumn);

    if (!isSchemaMismatchError(error) || !missingColumn) break;
    if (!(missingColumn in attemptPayload)) break;

    delete attemptPayload[missingColumn];
  }

  throw lastError;
};

const updateAppointmentWithFallback = async (id: string, payload: AnyRecord) => {
  let attemptPayload: AnyRecord = { ...payload };
  let lastError: any;

  for (let i = 0; i < 12; i += 1) {
    const { data, error } = await supabase
      .from("appointments")
      .update(attemptPayload as any)
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (!error) return data;

    lastError = error;
    const missingColumn = extractMissingColumn(error);

    if (!isSchemaMismatchError(error) || !missingColumn) break;
    if (!(missingColumn in attemptPayload)) break;

    delete attemptPayload[missingColumn];
  }

  throw lastError;
};

export function useAppointments(dateFilter?: string) {
  const { workshopId } = useWorkshop();

  return useQuery({
    queryKey: ["appointments", workshopId, dateFilter],
    queryFn: async () => {
      if (!workshopId) return [];
      const rows = await fetchAppointmentsRows(workshopId, dateFilter);
      return rows.map(mapAppointmentRow);
    },
    enabled: !!workshopId,
  });
}

export function useAllAppointments() {
  const { workshopId } = useWorkshop();

  return useQuery({
    queryKey: ["appointments", "all", workshopId],
    queryFn: async () => {
      if (!workshopId) return [];
      const rows = await fetchAppointmentsRows(workshopId);
      return rows.map(mapAppointmentRow);
    },
    enabled: !!workshopId,
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (appointment: Partial<Appointment> & AnyRecord) => {
      const appointmentDate = appointment.date ?? (normalizeDate(appointment.appointment_date) || new Date().toISOString().slice(0, 10));
      const timeSlot = appointment.time_slot ?? normalizeTime(appointment.appointment_start) ?? "09:00";
      const appointmentStart = appointment.appointment_start ?? `${appointmentDate}T${timeSlot}:00`;

      const payload: AnyRecord = {
        client_name: appointment.client_name ?? appointment.name ?? "",
        name: appointment.client_name ?? appointment.name ?? "",
        license_plate: (appointment.license_plate ?? "").toUpperCase(),
        service: appointment.service ?? appointment.service_type ?? appointment.problem ?? "",
        service_type: appointment.service ?? appointment.service_type ?? appointment.problem ?? "",
        problem: appointment.problem ?? appointment.service ?? appointment.service_type ?? null,
        phone: appointment.phone ?? null,
        date: appointmentDate,
        appointment_date: appointment.appointment_date ?? `${appointmentDate}T${timeSlot}:00`,
        time_slot: timeSlot,
        appointment_start: appointmentStart,
        appointment_end: appointment.appointment_end ?? null,
        status: appointment.status ?? "recepcionado",
        notes: appointment.notes ?? null,
        created_by: appointment.created_by ?? "manual",
        client_id: appointment.client_id ?? null,
        mechanic_id: appointment.mechanic_id ?? null,
        mechanic: appointment.mechanic ?? null,
        brand: appointment.brand ?? null,
        model: appointment.model ?? null,
        email: appointment.email ?? null,
        Email: appointment.email ?? null,
        ...buildKilometersPayload(appointment.km),
        vehicle_id: appointment.vehicle_id ?? null,
        // workshop_id is set automatically by DB trigger
      };

      console.log("[useCreateAppointment] payload before insert:", JSON.stringify(payload));
      const data = await insertAppointmentWithFallback(payload);
      console.log("[useCreateAppointment] result after insert:", JSON.stringify(data));
      return mapAppointmentRow((data ?? payload) as AnyRecord);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Orden creada correctamente");
    },
    onError: (error: any) => {
      toast.error("Error al crear orden: " + (error?.message ?? "Error desconocido"));
    },
  });
}

export function useUpdateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Appointment> & { id: string }) => {
      const payload: AnyRecord = {};

      if (updates.client_name !== undefined) {
        payload.client_name = updates.client_name;
        payload.name = updates.client_name;
      }
      if (updates.license_plate !== undefined) payload.license_plate = updates.license_plate?.toUpperCase() ?? null;
      if (updates.service !== undefined) {
        payload.service = updates.service;
        payload.service_type = updates.service;
      }
      if (updates.problem !== undefined) payload.problem = updates.problem;
      if (updates.phone !== undefined) payload.phone = updates.phone;
      if (updates.date !== undefined) {
        payload.date = updates.date;
        payload.appointment_date = updates.date;
      }
      if (updates.time_slot !== undefined) payload.time_slot = updates.time_slot;
      if (updates.notes !== undefined) payload.notes = updates.notes;
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.brand !== undefined) payload.brand = updates.brand;
      if (updates.model !== undefined) payload.model = updates.model;
      if (updates.email !== undefined) {
        payload.email = updates.email;
        payload.Email = updates.email;
      }
      if (updates.km !== undefined) {
        Object.assign(payload, buildKilometersPayload(updates.km));
      }
      if (updates.mechanic_id !== undefined) payload.mechanic_id = updates.mechanic_id;
      if (updates.mechanic !== undefined) payload.mechanic = updates.mechanic;

      if (Object.keys(payload).length === 0) return null;

      const data = await updateAppointmentWithFallback(id, payload);
      return data ? mapAppointmentRow(data as AnyRecord) : null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Orden actualizada");
    },
    onError: (error: any) => {
      toast.error("Error al actualizar: " + (error?.message ?? "Error desconocido"));
    },
  });
}

export function useCancelAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("appointments")
        .update({ status: "cancelado" } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Orden cancelada");
    },
    onError: (error: any) => {
      toast.error("Error al cancelar: " + (error?.message ?? "Error desconocido"));
    },
  });
}

export function useUpdateAppointmentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const data = await updateAppointmentWithFallback(id, { status });
      return data ? mapAppointmentRow(data as AnyRecord) : null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: (error: any) => {
      toast.error("Error al cambiar estado: " + (error?.message ?? "Error desconocido"));
    },
  });
}
