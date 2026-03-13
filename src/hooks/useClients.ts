import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export interface Client {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  license_plate: string;
  brand: string | null;
  model: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

function mapRow(row: any): Client {
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.full_name ?? row.name ?? "",
    phone: row.phone ?? null,
    license_plate: row.license_plate ?? "",
    brand: row.brand ?? null,
    model: row.model ?? null,
    email: row.email ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at ?? row.created_at,
  };
}

export function useClients() {
  return useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []).map(mapRow);
    },
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (client: Partial<Client>) => {
      const payload: Record<string, any> = {
        full_name: (client.name ?? "").trim(),
        phone: client.phone ?? null,
        user_id: user?.id ?? "",
      };
      if (client.license_plate) payload.license_plate = client.license_plate;
      if (client.brand) payload.brand = client.brand;
      if (client.model) payload.model = client.model;
      if (client.email) payload.email = client.email;

      const { data, error } = await supabase
        .from("clients")
        .insert(payload as any)
        .select("*")
        .single();

      if (error) throw error;
      return mapRow(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Cliente creado correctamente");
    },
    onError: (error: any) => {
      toast.error("Error al crear cliente: " + (error?.message ?? "Error desconocido"));
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Client> & { id: string }) => {
      const payload: Record<string, any> = {};
      if (updates.name !== undefined) payload.full_name = updates.name;
      if (updates.phone !== undefined) payload.phone = updates.phone;
      if (updates.license_plate !== undefined) payload.license_plate = updates.license_plate;
      if (updates.brand !== undefined) payload.brand = updates.brand;
      if (updates.model !== undefined) payload.model = updates.model;
      if (updates.email !== undefined) payload.email = updates.email;

      const { data, error } = await supabase
        .from("clients")
        .update(payload as any)
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw error;
      return mapRow(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Cliente actualizado");
    },
    onError: (error: any) => {
      toast.error("Error al actualizar: " + (error?.message ?? "Error desconocido"));
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Cliente eliminado");
    },
    onError: (error: any) => {
      toast.error("Error al eliminar: " + (error?.message ?? "Error desconocido"));
    },
  });
}
