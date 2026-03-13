import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

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

const mapAppointmentRow = (row: AnyRecord): Appointment => ({
  id: row.id,
  status: row.status ?? "recepcionado",
  client_name: row.client_name ?? row.name ?? "",
  license_plate: row.license_plate ?? "",
  service: row.service ?? row.problem ?? "",
  date: row.date ?? row.appointment_date ?? (row.created_at ? String(row.created_at).slice(0, 10) : ""),
  time_slot: row.time_slot ?? row.time ?? "09:00",
  notes: row.notes ?? null,
  created_at: row.created_at ?? new Date().toISOString(),
  updated_at: row.updated_at ?? row.created_at ?? new Date().toISOString(),
  user_id: row.user_id ?? "",
  client_id: row.client_id ?? null,
  created_by: row.created_by ?? "manual",
  mechanic_id: row.mechanic_id ?? null,
});

const fetchAppointmentsRows = async (dateFilter?: string): Promise<AnyRecord[]> => {
  const attempts: Array<{ dateColumn: "date" | "appointment_date" | null; orderColumns: string[] }> = [
    { dateColumn: "date", orderColumns: ["date", "time_slot"] },
    { dateColumn: "appointment_date", orderColumns: ["appointment_date", "time_slot"] },
    { dateColumn: null, orderColumns: ["created_at"] },
    { dateColumn: null, orderColumns: [] },
  ];

  let lastError: any;

  for (const attempt of attempts) {
    let query: any = supabase.from("appointments").select("*");

    for (const column of attempt.orderColumns) {
      query = query.order(column);
    }

    if (dateFilter && attempt.dateColumn) {
      query = query.eq(attempt.dateColumn, dateFilter);
    }

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
    const { data, error } = await supabase
      .from("appointments")
      .insert(attemptPayload as any)
      .select("*")
      .single();

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
  return useQuery({
    queryKey: ["appointments", dateFilter],
    queryFn: async () => {
      const rows = await fetchAppointmentsRows(dateFilter);
      return rows.map(mapAppointmentRow);
    },
  });
}

export function useAllAppointments() {
  return useQuery({
    queryKey: ["appointments", "all"],
    queryFn: async () => {
      const rows = await fetchAppointmentsRows();
      return rows.map(mapAppointmentRow);
    },
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (appointment: Partial<Appointment> & AnyRecord) => {
      const appointmentDate = appointment.date ?? new Date().toISOString().slice(0, 10);

      const payload: AnyRecord = {
        client_name: appointment.client_name ?? "",
        name: appointment.client_name ?? "",
        license_plate: appointment.license_plate ?? "",
        service: appointment.service ?? "",
        problem: appointment.problem ?? appointment.service ?? "",
        date: appointmentDate,
        appointment_date: appointmentDate,
        time_slot: appointment.time_slot ?? "09:00",
        status: appointment.status ?? "recepcionado",
        notes: appointment.notes ?? null,
        created_by: appointment.created_by ?? "manual",
        user_id: user?.id ?? "",
      };

      if (appointment.client_id) payload.client_id = appointment.client_id;
      if (appointment.brand) payload.brand = appointment.brand;
      if (appointment.model) payload.model = appointment.model;

      const data = await insertAppointmentWithFallback(payload);
      return mapAppointmentRow(data as AnyRecord);
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
      const { data, error } = await supabase
        .from("appointments")
        .update(updates as any)
        .eq("id", id)
        .select("*")
        .maybeSingle();

      if (error) throw error;
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
      const { data, error } = await supabase
        .from("appointments")
        .update({ status } as any)
        .eq("id", id)
        .select("*")
        .maybeSingle();

      if (error) throw error;
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
