import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, X } from "lucide-react";
import { useAppointmentPhotos, useUploadPhoto, useDeletePhoto } from "@/hooks/useAppointmentPhotos";

interface Props {
  appointmentId: string;
}

export function PhotoGallery({ appointmentId }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { data: photos, isLoading } = useAppointmentPhotos(appointmentId);
  const uploadPhoto = useUploadPhoto();
  const deletePhoto = useDeletePhoto();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadPhoto.mutate({ appointmentId, file });
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploadPhoto.isPending}>
          {uploadPhoto.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Camera className="h-3 w-3 mr-1" />}
          Subir foto
        </Button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      </div>
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : (photos ?? []).length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {(photos ?? []).map((photo) => (
            <div key={photo.id} className="relative group rounded-md overflow-hidden border">
              <img src={photo.photo_url} alt="" className="w-full h-20 object-cover" />
              <button
                onClick={() => deletePhoto.mutate({ id: photo.id, appointmentId })}
                className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
