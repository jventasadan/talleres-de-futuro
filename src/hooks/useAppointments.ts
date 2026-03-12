import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AppointmentRow } from "@/types/database";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export type Appointment = AppointmentRow;

export function useAppointments(dateFilter?: string) {
  return useQuery({
    queryKey: ["appointments", dateFilter],
    queryFn: async () => {
      let query = supabase
        .from("appointments")
        .select("*")
        .order("time_slot", { ascending: true });

      if (dateFilter) {
        query = query.eq("date", dateFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as Appointment[];
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
        .order("date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Appointment[];
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
        .insert({ ...appointment, user_id: user?.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Orden creada correctamente");
    },
    onError: (error) => {
      toast.error("Error al crear orden: " + error.message);
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
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Orden actualizada");
    },
    onError: (error) => {
      toast.error("Error al actualizar: " + error.message);
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
    onError: (error) => {
      toast.error("Error al cancelar: " + error.message);
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
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: (error) => {
      toast.error("Error al cambiar estado: " + error.message);
    },
  });
}
