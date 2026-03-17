import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkshop } from "@/contexts/WorkshopContext";

export interface WorkOrder {
  id: string;
  appointment_id: string;
  user_id: string;
  status: string;
  repair_start_time: string | null;
  repair_end_time: string | null;
  repair_time_hours: number;
  labor_cost: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useWorkOrder(appointmentId: string | null) {
  const { workshopId } = useWorkshop();

  return useQuery({
    queryKey: ["work_orders", appointmentId, workshopId],
    queryFn: async () => {
      if (!appointmentId || !workshopId) return null;

      const { data, error } = await (supabase as any)
        .from("work_orders")
        .select("*")
        .eq("appointment_id", appointmentId)
        .eq("workshop_id", workshopId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as WorkOrder | null;
    },
    enabled: !!appointmentId && !!workshopId,
  });
}

export function useCreateWorkOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { appointment_id: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await (supabase as any)
        .from("work_orders")
        .insert({
          appointment_id: params.appointment_id,
          user_id: user?.id ?? "",
          status: "in_progress",
          repair_start_time: new Date().toISOString(),
          // workshop_id is set automatically by DB trigger
          // labor_rate comes from company_settings, not stored here
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as WorkOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work_orders"] });
    },
  });
}

export function useCompleteWorkOrder() {
  const queryClient = useQueryClient();
  const { workshopId } = useWorkshop();

  return useMutation({
    mutationFn: async (params: { id: string; laborRate: number }) => {
      if (!workshopId) throw new Error("No se encontró workshop_id");

      const { data: wo, error: fetchError } = await (supabase as any)
        .from("work_orders")
        .select("*")
        .eq("id", params.id)
        .eq("workshop_id", workshopId)
        .single();
      if (fetchError) throw fetchError;

      const startTime = wo.repair_start_time ? new Date(wo.repair_start_time) : new Date(wo.created_at);
      const endTime = new Date();
      const diffMs = endTime.getTime() - startTime.getTime();
      const hours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
      const laborCost = Math.round(hours * params.laborRate * 100) / 100;

      const { data, error } = await (supabase as any)
        .from("work_orders")
        .update({
          status: "completed",
          repair_end_time: endTime.toISOString(),
          repair_time_hours: hours,
          labor_cost: laborCost,
        })
        .eq("id", params.id)
        .select("*")
        .single();
      if (error) throw error;
      return data as WorkOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work_orders"] });
    },
  });
}
