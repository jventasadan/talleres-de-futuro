import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface CourtesyVehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
  km: string;
  assigned_client: string;
  delivery_date: string;
  return_date: string;
  status: string;
}

const db = supabase as any;

const normalizeCourtesyVehicle = (row: Record<string, any>): CourtesyVehicle => ({
  id: String(row.id),
  plate: String(row.plate ?? ""),
  brand: String(row.brand ?? ""),
  model: String(row.model ?? ""),
  km: String(row.km ?? ""),
  assigned_client: String(row.assigned_client ?? ""),
  delivery_date: String(row.delivery_date ?? ""),
  return_date: String(row.return_date ?? ""),
  status: String(row.status ?? "disponible"),
});

export function useCourtesyVehicles() {
  return useQuery({
    queryKey: ["substitution_vehicles"],
    queryFn: async () => {
      const { data, error } = await db
        .from("substitution_vehicles")
        .select("*")
        .order("plate", { ascending: true });

      if (error) throw error;
      return (data ?? []).map((row: Record<string, any>) => normalizeCourtesyVehicle(row));
    },
  });
}

export function useCreateCourtesyVehicle() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (payload: Omit<CourtesyVehicle, "id">) => {
      const { data, error } = await db
        .from("substitution_vehicles")
        .insert({ ...payload, user_id: user?.id ?? "" })
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
      const { data, error } = await db
        .from("substitution_vehicles")
        .update(updates)
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
      const { error } = await db.from("substitution_vehicles").delete().eq("id", id);
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
