import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkshop } from "@/contexts/WorkshopContext";
import { toast } from "sonner";

export interface AppointmentPhoto {
  id: string;
  appointment_id: string;
  user_id?: string;
  photo_url: string;
  created_at: string;
}

const db = supabase as any;
const isMissingTableError = (error: any) => String(error?.code ?? "") === "PGRST205";
const isBucketNotFound = (error: any) => String(error?.message ?? "").toLowerCase().includes("bucket not found");

const toPhoto = (row: Record<string, any>, appointmentId: string): AppointmentPhoto => ({
  id: String(row.id ?? crypto.randomUUID()),
  appointment_id: appointmentId,
  user_id: row.user_id ? String(row.user_id) : undefined,
  photo_url: String(row.photo_url ?? row.url ?? ""),
  created_at: String(row.created_at ?? new Date().toISOString()),
});

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("No se pudo leer la imagen"));
    reader.readAsDataURL(file);
  });

const ensureWorkOrder = async (appointmentId: string, workshopId: string) => {
  const { data: existing, error: findError } = await db
    .from("work_orders")
    .select("id, photos")
    .eq("appointment_id", appointmentId)
    .eq("workshop_id", workshopId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (findError) throw findError;
  if (existing?.id) return existing;

  const { data, error } = await db
    .from("work_orders")
    .insert({
      appointment_id: appointmentId,
      description: "Orden generada automáticamente",
      status: "open",
      labor_hours: 0,
      parts: [],
      photos: [],
      pending_repair: [],
      invoice_created: false,
      order_number: `ORD-${appointmentId.slice(0, 4).toUpperCase()}`,
    })
    .select("id, photos")
    .maybeSingle();

  if (error) throw error;
  return data;
};

const getWorkOrderPhotos = async (appointmentId: string, workshopId: string): Promise<AppointmentPhoto[]> => {
  const { data, error } = await db
    .from("work_orders")
    .select("photos")
    .eq("appointment_id", appointmentId)
    .eq("workshop_id", workshopId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  const photos = Array.isArray(data?.photos) ? data.photos : [];
  return photos.map((photo: Record<string, any>) => toPhoto(photo, appointmentId));
};

export function useAppointmentPhotos(appointmentId: string) {
  return useQuery({
    queryKey: ["appointment_photos", appointmentId],
    queryFn: async () => {
      const { data, error } = await db
        .from("appointment_photos")
        .select("*")
        .eq("appointment_id", appointmentId)
        .order("created_at", { ascending: false });

      if (!error) {
        return (data ?? []).map((row: Record<string, any>) => toPhoto(row, appointmentId));
      }

      if (!isMissingTableError(error)) throw error;
      return getWorkOrderPhotos(appointmentId);
    },
    enabled: !!appointmentId,
  });
}

export function useUploadPhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ appointmentId, file }: { appointmentId: string; file: File }) => {
      const ext = file.name.split(".").pop() ?? "jpg";
      const filePath = `${appointmentId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await db.storage.from("appointment-photos").upload(filePath, file);

      if (!uploadError) {
        const { data: urlData } = db.storage.from("appointment-photos").getPublicUrl(filePath);
        const { error } = await db.from("appointment_photos").insert({
          appointment_id: appointmentId,
          photo_url: urlData.publicUrl,
          created_at: new Date().toISOString(),
        });
        if (!error) return;
        if (!isMissingTableError(error)) throw error;
      }

      if (uploadError && !isBucketNotFound(uploadError)) throw uploadError;

      const dataUrl = await readFileAsDataUrl(file);
      const workOrder = await ensureWorkOrder(appointmentId);
      const currentPhotos = Array.isArray(workOrder?.photos) ? workOrder.photos : [];

      const nextPhoto = {
        id: crypto.randomUUID(),
        appointment_id: appointmentId,
        photo_url: dataUrl,
        created_at: new Date().toISOString(),
      };

      const { error: fallbackError } = await db
        .from("work_orders")
        .update({ photos: [...currentPhotos, nextPhoto] })
        .eq("id", workOrder.id);

      if (fallbackError) throw fallbackError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointment_photos"] });
      toast.success("Foto subida");
    },
    onError: (e: any) => toast.error("Error al subir foto: " + (e?.message ?? "Error desconocido")),
  });
}

export function useDeletePhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, appointmentId }: { id: string; appointmentId: string }) => {
      const { error } = await db.from("appointment_photos").delete().eq("id", id);
      if (!error) return;
      if (!isMissingTableError(error)) throw error;

      const workOrder = await ensureWorkOrder(appointmentId);
      const currentPhotos = Array.isArray(workOrder?.photos) ? workOrder.photos : [];
      const nextPhotos = currentPhotos.filter((photo: Record<string, any>) => String(photo.id) !== id);

      const { error: updateError } = await db
        .from("work_orders")
        .update({ photos: nextPhotos })
        .eq("id", workOrder.id);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointment_photos"] });
      toast.success("Foto eliminada");
    },
    onError: (e: any) => toast.error("Error al eliminar foto: " + (e?.message ?? "Error desconocido")),
  });
}
