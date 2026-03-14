import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface CourtesyVehicle {
  id: string;
  plate: string;
  model: string;
  km: string;
  assigned_client: string;
  return_date: string;
  status: string;
}

const normalizeCourtesyVehicle = (row: Record<string, any>): CourtesyVehicle => ({
  id: String(row.id),
  plate: String(row.plate ?? ""),
  model: String(row.model ?? ""),
  km: String(row.km ?? ""),
  assigned_client: String(row.assigned_client ?? ""),
  return_date: String(row.return_date ?? ""),
  status: String(row.status ?? "disponible"),
});

export function useCourtesyVehicles() {
  return useQuery({
    queryKey: ["substitution_vehicles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("substitution_vehicles")
        .select("*")
        .order("plate", { ascending: true });

      if (error) throw error;
      return (data ?? []).map((row) => normalizeCourtesyVehicle(row as Record<string, any>));
    },
  });
}

export function useCreateCourtesyVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Omit<CourtesyVehicle, "id">) => {
      const { data, error } = await supabase
        .from("substitution_vehicles")
        .insert(payload as any)
        .select("*")
        .maybeSingle();

      if (error) throw error;
      return normalizeCourtesyVehicle((data ?? payload) as Record<string, any>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["substitution_vehicles"] });
      toast.success("Coche de cortesía guardado");
    },
    onError: (error: any) => {
      toast.error(`Error al guardar: ${error?.message ?? "Error desconocido"}`);
    },
  });
}

export function useUpdateCourtesyVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: CourtesyVehicle) => {
      const { data, error } = await supabase
        .from("substitution_vehicles")
        .update(updates as any)
        .eq("id", id)
        .select("*")
        .maybeSingle();

      if (error) throw error;
      return normalizeCourtesyVehicle((data ?? { id, ...updates }) as Record<string, any>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["substitution_vehicles"] });
      toast.success("Coche de cortesía actualizado");
    },
    onError: (error: any) => {
      toast.error(`Error al actualizar: ${error?.message ?? "Error desconocido"}`);
    },
  });
}

export function useDeleteCourtesyVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("substitution_vehicles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["substitution_vehicles"] });
      toast.success("Coche eliminado");
    },
    onError: (error: any) => {
      toast.error(`Error al eliminar: ${error?.message ?? "Error desconocido"}`);
    },
  });
}
