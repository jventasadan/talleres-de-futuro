import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkshop } from "@/contexts/WorkshopContext";
import { toast } from "sonner";

export interface Quote {
  id: string;
  appointment_id: string | null;
  client_name: string;
  license_plate: string;
  service: string;
  brand: string | null;
  model: string | null;
  phone: string | null;
  notes: string | null;
  estimated_hours: number;
  labor_rate: number;
  labor_cost: number;
  parts_total: number;
  tax_rate: number;
  total: number;
  status: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface QuoteLine {
  id: string;
  quote_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  line_type: string;
  created_at: string;
}

const db = supabase as any;

const isSchemaMismatchError = (error: any) => {
  const code = String(error?.code ?? "");
  const message = String(error?.message ?? "").toLowerCase();
  return code === "42703" || message.includes("does not exist");
};

export function useQuotes() {
  const { workshopId } = useWorkshop();

  return useQuery({
    queryKey: ["quotes", workshopId],
    queryFn: async () => {
      if (!workshopId) return [];

      const { data: d1, error: e1 } = await db
        .from("quotes")
        .select("*")
        .eq("workshop_id", workshopId)
        .order("created_at", { ascending: false });

      if (!e1) return (d1 ?? []) as Quote[];

      if (isSchemaMismatchError(e1)) {
        const { data: d2, error: e2 } = await db
          .from("quotes")
          .select("*")
          .order("created_at", { ascending: false });
        if (!e2) return (d2 ?? []) as Quote[];
        throw e2;
      }

      throw e1;
    },
    enabled: !!workshopId,
  });
}

export function useQuoteLines(quoteId: string | null) {
  const { workshopId } = useWorkshop();

  return useQuery({
    queryKey: ["quote_lines", quoteId, workshopId],
    queryFn: async () => {
      if (!quoteId) return [];

      const { data, error } = await db
        .from("quote_lines")
        .select("*")
        .eq("quote_id", quoteId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data ?? []) as QuoteLine[];
    },
    enabled: !!quoteId,
  });
}

interface CreateQuoteInput {
  client_name: string;
  license_plate: string;
  service: string;
  brand?: string | null;
  model?: string | null;
  phone?: string | null;
  notes?: string | null;
  estimated_hours: number;
  labor_rate: number;
  tax_rate: number;
  lines: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
    line_type: string;
  }>;
}

export function useCreateQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateQuoteInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id ?? "";

      const laborCost = input.estimated_hours * input.labor_rate;
      const partsTotal = input.lines
        .filter((l) => l.line_type === "part")
        .reduce((sum, l) => sum + l.total, 0);
      const subtotal = laborCost + partsTotal;
      const total = Number((subtotal * (1 + input.tax_rate / 100)).toFixed(2));

      const { data, error } = await db
        .from("quotes")
        .insert({
          client_name: input.client_name,
          license_plate: input.license_plate,
          service: input.service,
          brand: input.brand ?? null,
          model: input.model ?? null,
          phone: input.phone ?? null,
          notes: input.notes ?? null,
          estimated_hours: input.estimated_hours,
          labor_rate: input.labor_rate,
          labor_cost: laborCost,
          parts_total: partsTotal,
          tax_rate: input.tax_rate,
          total,
          status: "pendiente",
          user_id: userId,
        })
        .select("*")
        .single();

      if (error) throw error;

      // Insert lines
      if (input.lines.length > 0 && data) {
        const lineRows = input.lines.map((line) => ({
          quote_id: (data as any).id,
          description: line.description,
          quantity: line.quantity,
          unit_price: line.unit_price,
          total: line.total,
          line_type: line.line_type,
          user_id: userId,
        }));

        await db.from("quote_lines").insert(lineRows);
      }

      return data as Quote;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast.success("Presupuesto creado correctamente");
    },
    onError: (error: any) => {
      toast.error("Error al crear presupuesto: " + (error?.message ?? "Error desconocido"));
    },
  });
}

export function useUpdateQuoteStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await db
        .from("quotes")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast.success("Estado actualizado");
    },
    onError: (error: any) => {
      toast.error("Error: " + (error?.message ?? "Error desconocido"));
    },
  });
}

export function useDeleteQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("quotes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast.success("Presupuesto eliminado");
    },
    onError: (error: any) => {
      toast.error("Error: " + (error?.message ?? "Error desconocido"));
    },
  });
}
