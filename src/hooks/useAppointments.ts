import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";

export type Appointment = Tables<"appointments">;
export type AppointmentInsert = TablesInsert<"appointments">;
export type AppointmentUpdate = TablesUpdate<"appointments">;

export function useAppointments(dateFilter?: string) {
  return useQuery({
    queryKey: ["appointments", dateFilter],
    queryFn: async () => {
      let query = supabase
        .from("appointments")
        .select("*")
        .order("date", { ascending: true })
        .order("time_slot", { ascending: true });

      if (dateFilter) {
        query = query.eq("date", dateFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Appointment[];
    },
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (appointment: Omit<AppointmentInsert, "user_id">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      const { data, error } = await supabase
        .from("appointments")
        .insert({ ...appointment, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Cita creada correctamente");
    },
    onError: (error) => {
      toast.error("Error al crear cita: " + error.message);
    },
  });
}

export function useUpdateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: AppointmentUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("appointments")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Cita actualizada");
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
        .update({ status: "cancelled" })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Cita cancelada");
    },
    onError: (error) => {
      toast.error("Error al cancelar: " + error.message);
    },
  });
}
