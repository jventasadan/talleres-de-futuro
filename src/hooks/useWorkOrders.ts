import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export interface WorkOrder {
  id: string;
  appointment_id: string;
  user_id: string;
  status: string;
  repair_start_time: string | null;
  repair_end_time: string | null;
  repair_time_hours: number;
  labor_rate: number;
  labor_cost: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useWorkOrder(appointmentId: string | null) {
  return useQuery({
    queryKey: ["work_orders", appointmentId],
    queryFn: async () => {
      if (!appointmentId) return null;
      const { data, error } = await (supabase as any)
        .from("work_orders")
        .select("*")
        .eq("appointment_id", appointmentId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as WorkOrder | null;
    },
    enabled: !!appointmentId,
  });
}

export function useCreateWorkOrder() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: { appointment_id: string; labor_rate: number }) => {
      const { data, error } = await (supabase as any)
        .from("work_orders")
        .insert({
          appointment_id: params.appointment_id,
          user_id: user?.id ?? "",
          status: "in_progress",
          repair_start_time: new Date().toISOString(),
          labor_rate: params.labor_rate,
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

  return useMutation({
    mutationFn: async (params: { id: string; labor_rate: number }) => {
      // Get current work order to calculate hours
      const { data: wo, error: fetchError } = await (supabase as any)
        .from("work_orders")
        .select("*")
        .eq("id", params.id)
        .single();
      if (fetchError) throw fetchError;

      const startTime = wo.repair_start_time ? new Date(wo.repair_start_time) : new Date(wo.created_at);
      const endTime = new Date();
      const diffMs = endTime.getTime() - startTime.getTime();
      const hours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
      const laborCost = Math.round(hours * params.labor_rate * 100) / 100;

      const { data, error } = await (supabase as any)
        .from("work_orders")
        .update({
          status: "completed",
          repair_end_time: endTime.toISOString(),
          repair_time_hours: hours,
          labor_rate: params.labor_rate,
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
