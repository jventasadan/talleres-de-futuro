import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, MailX, CheckCircle, AlertTriangle } from "lucide-react";

const SUPABASE_URL = "https://swumbruebgokkoevxggs.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3dW1icnVlYmdva2tvZXZ4Z2dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMjY4NzksImV4cCI6MjA4ODkwMjg3OX0.DV5NB7ZeM264HzO793wdWevixa6z0dVORgLcIqVEyGs";

type Status = "loading" | "valid" | "already" | "invalid" | "success" | "error";

const Unsubscribe = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    if (!token) { setStatus("invalid"); return; }
    (async () => {
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${token}`, {
          headers: { apikey: SUPABASE_ANON_KEY },
        });
        const data = await res.json();
        if (!res.ok) { setStatus("invalid"); return; }
        if (data.valid === false && data.reason === "already_unsubscribed") { setStatus("already"); return; }
        setStatus("valid");
      } catch { setStatus("error"); }
    })();
  }, [token]);

  const handleUnsubscribe = async () => {
    try {
      const { error } = await supabase.functions.invoke("handle-email-unsubscribe", { body: { token } });
      if (error) throw error;
      setStatus("success");
    } catch { setStatus("error"); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardContent className="p-8 text-center space-y-4">
          {status === "loading" && <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />}
          {status === "valid" && (
            <>
              <MailX className="h-12 w-12 mx-auto text-primary" />
              <h1 className="text-xl font-bold text-foreground">Cancelar suscripción</h1>
              <p className="text-muted-foreground text-sm">¿Desea dejar de recibir notificaciones por email?</p>
              <Button onClick={handleUnsubscribe} className="w-full">Confirmar cancelación</Button>
            </>
          )}
          {status === "success" && (
            <>
              <CheckCircle className="h-12 w-12 mx-auto text-emerald-500" />
              <h1 className="text-xl font-bold text-foreground">Suscripción cancelada</h1>
              <p className="text-muted-foreground text-sm">No recibirá más notificaciones por email.</p>
            </>
          )}
          {status === "already" && (
            <>
              <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground" />
              <h1 className="text-xl font-bold text-foreground">Ya cancelada</h1>
              <p className="text-muted-foreground text-sm">Su suscripción ya fue cancelada anteriormente.</p>
            </>
          )}
          {(status === "invalid" || status === "error") && (
            <>
              <AlertTriangle className="h-12 w-12 mx-auto text-destructive" />
              <h1 className="text-xl font-bold text-foreground">Enlace no válido</h1>
              <p className="text-muted-foreground text-sm">Este enlace ha expirado o no es válido.</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Unsubscribe;
