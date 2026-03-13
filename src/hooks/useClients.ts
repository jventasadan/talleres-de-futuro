import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ClientRow } from "@/types/database";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export type Client = ClientRow;

function mapClientRow(row: Record<string, any>): Client {
  return {
    id: row.id,
    user_id: row.user_id ?? "",
    name: row.name ?? row.full_name ?? "",
    full_name: row.full_name ?? row.name ?? "",
    phone: row.phone ?? null,
    license_plate: row.license_plate ?? "",
    brand: row.brand ?? null,
    model: row.model ?? null,
    created_at: row.created_at ?? new Date().toISOString(),
    updated_at: row.updated_at ?? row.created_at ?? new Date().toISOString(),
    nif: row.nif ?? null,
    email: row.email ?? null,
    address: row.address ?? null,
    city: row.city ?? null,
    postal_code: row.postal_code ?? null,
    province: row.province ?? null,
  };
}

async function tryInsertClient(payloads: Array<Record<string, any>>) {
  let lastError: any = null;

  for (const payload of payloads) {
    const { data, error } = await supabase
      .from("clients")
      .insert(payload as any)
      .select("*")
      .single();

    if (!error) {
      return data;
    }

    lastError = error;
  }

  throw lastError;
}

export function useClients() {
  return useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const query = supabase
        .from("clients")
        .select("*") as any;

      const { data, error } = await query.order("created_at", {
        ascending: false,
      });

      if (error) {
        throw error;
      }

      return (data ?? []).map((row: Record<string, any>) => mapClientRow(row));
    },
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (client: Partial<Client>) => {
      const displayName = (client.name ?? client.full_name ?? "").trim();

      const commonPayload = {
        phone: client.phone ?? null,
        license_plate: client.license_plate ?? "",
        brand: client.brand ?? null,
        model: client.model ?? null,
      };

      const payloads = [
        {
          ...commonPayload,
          name: displayName,
          ...(user?.id ? { user_id: user.id } : {}),
        },
        {
          ...commonPayload,
          full_name: displayName,
          ...(user?.id ? { user_id: user.id } : {}),
        },
        {
          ...commonPayload,
          full_name: displayName,
        },
        {
          ...commonPayload,
          name: displayName,
        },
      ];

      const inserted = await tryInsertClient(payloads);
      return mapClientRow(inserted as Record<string, any>);
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
