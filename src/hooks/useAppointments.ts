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

export function useAppointments(dateFilter?: string) {
  return useQuery({
    queryKey: ["appointments", dateFilter],
    queryFn: async () => {
      let query = supabase.from("appointments").select("*").order("date").order("time_slot");
      if (dateFilter) {
        query = query.eq("date", dateFilter);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as Appointment[];
    },
  });
}

export function useAllAppointments() {
  return useQuery({
    queryKey: ["appointments", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .order("date")
        .order("time_slot");
      if (error) throw error;
      return (data ?? []) as unknown as Appointment[];
    },
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (appointment: Partial<Appointment>) => {
      const { data, error } = await supabase
        .from("appointments")
        .insert({
          client_name: appointment.client_name ?? "",
          license_plate: appointment.license_plate ?? "",
          service: appointment.service ?? "",
          date: appointment.date ?? new Date().toISOString().slice(0, 10),
          time_slot: appointment.time_slot ?? "09:00",
          status: appointment.status ?? "recepcionado",
          notes: appointment.notes ?? null,
          created_by: appointment.created_by ?? "manual",
          user_id: user?.id ?? "",
          ...(appointment.client_id ? { client_id: appointment.client_id } : {}),
        } as any)
        .select("*")
        .single();

      if (error) throw error;
      return data as unknown as Appointment;
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
        .single();

      if (error) throw error;
      return data as unknown as Appointment;
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
        .single();

      if (error) throw error;
      return data as unknown as Appointment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: (error: any) => {
      toast.error("Error al cambiar estado: " + (error?.message ?? "Error desconocido"));
    },
  });
}
