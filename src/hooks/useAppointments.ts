import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AppointmentRow } from "@/types/database";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export type Appointment = AppointmentRow;

type RawRow = Record<string, any>;

function toIsoDate(value: unknown): string {
  if (!value) {
    return "";
  }

  const raw = String(value);

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return raw.slice(0, 10);
  }

  return parsed.toISOString().slice(0, 10);
}

function toTimeSlot(value: unknown): string {
  if (!value) {
    return "";
  }

  const raw = String(value);
  const match = raw.match(/(\d{2}:\d{2})/);
  return match ? match[1] : raw.slice(0, 5);
}

function buildDateTime(date: string, time: string): string {
  const safeDate = date || new Date().toISOString().slice(0, 10);
  const safeTime = (time || "09:00").slice(0, 5);
  return `${safeDate}T${safeTime}:00`;
}

function mapAppointmentRow(row: RawRow): Appointment {
  const mappedDate = row.date ?? toIsoDate(row.appointment_date ?? row.appointment_start);
  const mappedTime = row.time_slot ?? toTimeSlot(row.appointment_start ?? row.appointment_date);

  return {
    id: row.id,
    status: row.status ?? "recepcionado",
    client_name: row.client_name ?? row.name ?? "",
    license_plate: row.license_plate ?? "",
    service: row.service ?? row.service_type ?? "",
    date: mappedDate,
    time_slot: mappedTime || "09:00",
    notes: row.notes ?? null,
    created_at: row.created_at ?? new Date().toISOString(),
    updated_at: row.updated_at ?? row.created_at ?? new Date().toISOString(),
    user_id: row.user_id,
    client_id: row.client_id ?? null,
    created_by: row.created_by ?? "manual",
    name: row.name,
    appointment_date: row.appointment_date,
    appointment_start: row.appointment_start,
    appointment_end: row.appointment_end,
    service_type: row.service_type,
    problem: row.problem,
    phone: row.phone,
    brand: row.brand,
    model: row.model,
    mechanic: row.mechanic,
    vehicle_id: row.vehicle_id,
  };
}

function sortAppointments(items: Appointment[]): Appointment[] {
  return [...items].sort((a, b) => {
    const keyA = `${a.date} ${a.time_slot}`;
    const keyB = `${b.date} ${b.time_slot}`;
    return keyA.localeCompare(keyB);
  });
}

async function fetchAppointmentsFromDatabase(): Promise<Appointment[]> {
  const { data, error } = await (supabase
    .from("appointments")
    .select("*") as any);

  if (error) {
    throw error;
  }

  return sortAppointments(
    (data ?? []).map((row: RawRow) => mapAppointmentRow(row))
  );
}

async function tryCreateAppointment(payloads: RawRow[]): Promise<Appointment> {
  let lastError: any = null;

  for (const payload of payloads) {
    const { data, error } = await supabase
      .from("appointments")
      .insert(payload as any)
      .select("*")
      .single();

    if (!error) {
      return mapAppointmentRow(data as RawRow);
    }

    lastError = error;
  }

  throw lastError;
}

async function tryUpdateAppointment(
  id: string,
  payloads: RawRow[]
): Promise<Appointment> {
  let lastError: any = null;

  for (const payload of payloads) {
    const { data, error } = await supabase
      .from("appointments")
      .update(payload as any)
      .eq("id", id)
      .select("*")
      .single();

    if (!error) {
      return mapAppointmentRow(data as RawRow);
    }

    lastError = error;
  }

  throw lastError;
}

export function useAppointments(dateFilter?: string) {
  return useQuery({
    queryKey: ["appointments", dateFilter],
    queryFn: async () => {
      const appointments = await fetchAppointmentsFromDatabase();

      if (!dateFilter) {
        return appointments;
      }

      return appointments.filter((apt) => apt.date === dateFilter);
    },
  });
}

export function useAllAppointments() {
  return useQuery({
    queryKey: ["appointments", "all"],
    queryFn: fetchAppointmentsFromDatabase,
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (appointment: Partial<Appointment>) => {
      const clientName = appointment.client_name ?? appointment.name ?? "";
      const service = appointment.service ?? appointment.service_type ?? "";
      const date = appointment.date ?? toIsoDate(appointment.appointment_date) ?? new Date().toISOString().slice(0, 10);
      const time = appointment.time_slot ?? toTimeSlot(appointment.appointment_start) ?? "09:00";

      const legacyPayload = {
        client_name: clientName,
        license_plate: appointment.license_plate ?? "",
        service,
        date,
        time_slot: time,
        status: appointment.status ?? "recepcionado",
        notes: appointment.notes ?? null,
        created_by: appointment.created_by ?? "manual",
        ...(appointment.client_id ? { client_id: appointment.client_id } : {}),
        ...(user?.id ? { user_id: user.id } : {}),
      };

      const modernPayload = {
        name: clientName,
        license_plate: appointment.license_plate ?? "",
        service_type: service,
        appointment_date: buildDateTime(date, time),
        appointment_start: buildDateTime(date, time),
        status: appointment.status ?? "recepcionado",
        notes: appointment.notes ?? null,
        problem: appointment.problem ?? appointment.notes ?? null,
        brand: appointment.brand ?? null,
        model: appointment.model ?? null,
        phone: appointment.phone ?? null,
        mechanic: appointment.mechanic ?? null,
        ...(appointment.client_id ? { client_id: appointment.client_id } : {}),
        ...(appointment.vehicle_id ? { vehicle_id: appointment.vehicle_id } : {}),
      };

      return tryCreateAppointment([legacyPayload, modernPayload]);
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
      const clientName = updates.client_name ?? updates.name;
      const service = updates.service ?? updates.service_type;
      const date = updates.date ?? toIsoDate(updates.appointment_date);
      const time = updates.time_slot ?? toTimeSlot(updates.appointment_start);

      const legacyUpdates = {
        ...(clientName !== undefined ? { client_name: clientName } : {}),
        ...(updates.license_plate !== undefined ? { license_plate: updates.license_plate } : {}),
        ...(service !== undefined ? { service } : {}),
        ...(date ? { date } : {}),
        ...(time ? { time_slot: time } : {}),
        ...(updates.status !== undefined ? { status: updates.status } : {}),
        ...(updates.notes !== undefined ? { notes: updates.notes } : {}),
      };

      const modernUpdates = {
        ...(clientName !== undefined ? { name: clientName } : {}),
        ...(updates.license_plate !== undefined ? { license_plate: updates.license_plate } : {}),
        ...(service !== undefined ? { service_type: service } : {}),
        ...((date || time)
          ? {
              appointment_date: buildDateTime(
                date || new Date().toISOString().slice(0, 10),
                time || "09:00"
              ),
              appointment_start: buildDateTime(
                date || new Date().toISOString().slice(0, 10),
                time || "09:00"
              ),
            }
          : {}),
        ...(updates.status !== undefined ? { status: updates.status } : {}),
        ...(updates.notes !== undefined ? { notes: updates.notes } : {}),
      };

      return tryUpdateAppointment(id, [legacyUpdates, modernUpdates]);
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

      if (error) {
        throw error;
      }
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
        .single();

      if (error) {
        throw error;
      }

      return mapAppointmentRow(data as RawRow);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: (error: any) => {
      toast.error("Error al cambiar estado: " + (error?.message ?? "Error desconocido"));
    },
  });
}
