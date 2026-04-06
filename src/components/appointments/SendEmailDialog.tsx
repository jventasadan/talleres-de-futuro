import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Mail, User, Car, Wrench, Building2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SendEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: {
    id: string;
    client_name: string;
    email: string;
    phone?: string | null;
    license_plate: string;
    brand?: string | null;
    model?: string | null;
    service: string;
    km?: string | null;
  };
  workshop: {
    company_name?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
  };
}

export function SendEmailDialog({ open, onOpenChange, appointment, workshop }: SendEmailDialogProps) {
  const vehicle = [appointment.brand, appointment.model].filter(Boolean).join(" ");
  const vehicleInfo = vehicle ? `${vehicle} (${appointment.license_plate})` : appointment.license_plate;

  const defaultMessage = `Estimado/a ${appointment.client_name},\n\nNos complace informarle de que su vehículo ${vehicleInfo} ya está listo y puede pasar a recogerlo cuando le resulte conveniente.\n\nLe agradecemos su confianza y esperamos que quede satisfecho con el servicio realizado. Si tiene cualquier duda o consulta, no dude en contactarnos.\n\n¡Le esperamos!`;

  const [message, setMessage] = useState(defaultMessage);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    setSending(true);
    try {
      const cloudUrl = import.meta.env.VITE_SUPABASE_URL || "https://swumbruebgokkoevxggs.supabase.co";
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(`${cloudUrl}/functions/v1/send-transactional-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3dW1icnVlYmdva2tvZXZ4Z2dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMjY4NzksImV4cCI6MjA4ODkwMjg3OX0.DV5NB7ZeM264HzO793wdWevixa6z0dVORgLcIqVEyGs",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          templateName: "vehicle-ready",
          recipientEmail: appointment.email,
          idempotencyKey: `vehicle-ready-${appointment.id}-${Date.now()}`,
          templateData: {
            clientName: appointment.client_name,
            licensePlate: appointment.license_plate,
            brand: appointment.brand || "",
            model: appointment.model || "",
            customMessage: message,
            workshopName: workshop.company_name || "",
            workshopPhone: workshop.phone || "",
            workshopEmail: workshop.email || "",
            workshopAddress: workshop.address || "",
          },
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(body || `HTTP ${res.status}`);
      }
      toast.success("Email enviado al cliente correctamente");
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Error al enviar email: " + (err?.message ?? ""));
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Enviar email al cliente
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Workshop info */}
          <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Building2 className="h-4 w-4 text-primary" />
              Datos del taller
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground pl-6">
              {workshop.company_name && <span className="font-medium text-foreground">{workshop.company_name}</span>}
              {workshop.phone && <span>📞 {workshop.phone}</span>}
              {workshop.email && <span>✉️ {workshop.email}</span>}
              {workshop.address && <span className="col-span-2">📍 {workshop.address}</span>}
            </div>
          </div>

          {/* Client info */}
          <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <User className="h-4 w-4 text-primary" />
              Datos del cliente
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground pl-6">
              <span className="font-medium text-foreground">{appointment.client_name}</span>
              {appointment.phone && <span>📞 {appointment.phone}</span>}
              <span>✉️ {appointment.email}</span>
            </div>
          </div>

          {/* Vehicle info */}
          <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Car className="h-4 w-4 text-primary" />
              Datos del vehículo
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground pl-6">
              <span className="font-medium text-foreground">{appointment.license_plate}</span>
              {vehicle && <span>{vehicle}</span>}
              {appointment.km && <span>🛣️ {appointment.km} km</span>}
              <span className="col-span-2 flex items-center gap-1">
                <Wrench className="h-3 w-3" /> {appointment.service}
              </span>
            </div>
          </div>

          <Separator />

          {/* Editable message */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">
              Mensaje del email (editable)
            </label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={8}
              className="resize-y text-sm"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={sending}>
            {sending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</>
            ) : (
              <><Mail className="mr-2 h-4 w-4" /> Enviar email</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
