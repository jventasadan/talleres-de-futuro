import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export interface AppointmentPhoto {
  id: string;
  appointment_id: string;
  user_id: string;
  photo_url: string;
  created_at: string;
}

export function useAppointmentPhotos(appointmentId: string) {
  return useQuery({
    queryKey: ["appointment_photos", appointmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointment_photos")
        .select("*")
        .eq("appointment_id", appointmentId)
        .order("created_at", { ascending: false }) as any;
      if (error) throw error;
      return (data ?? []) as AppointmentPhoto[];
    },
    enabled: !!appointmentId,
  });
}

export function useUploadPhoto() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ appointmentId, file }: { appointmentId: string; file: File }) => {
      const ext = file.name.split(".").pop();
      const filePath = `${user?.id}/${appointmentId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("appointment-photos")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("appointment-photos")
        .getPublicUrl(filePath);

      const { error } = await supabase
        .from("appointment_photos")
        .insert({
          appointment_id: appointmentId,
          user_id: user?.id ?? "",
          photo_url: urlData.publicUrl,
        } as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointment_photos"] });
      toast.success("Foto subida");
    },
    onError: (e: any) => toast.error("Error al subir foto: " + e.message),
  });
}

export function useDeletePhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("appointment_photos").delete().eq("id", id) as any;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointment_photos"] });
    },
  });
}
