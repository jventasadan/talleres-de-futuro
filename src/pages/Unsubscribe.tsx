import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type Status = "loading" | "valid" | "already" | "invalid" | "success" | "error";

const Unsubscribe = () => {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    if (!token) { setStatus("invalid"); return; }
    const url = `${(import.meta as any).env.VITE_SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${token}`;
    fetch(url, { headers: { apikey: (import.meta as any).env.VITE_SUPABASE_PUBLISHABLE_KEY } })
      .then(r => r.json())
      .then(d => {
        if (d.valid === false && d.reason === "already_unsubscribed") setStatus("already");
        else if (d.valid) setStatus("valid");
        else setStatus("invalid");
      })
      .catch(() => setStatus("invalid"));
  }, [token]);

  const handleConfirm = async () => {
    setStatus("loading");
    try {
      const { data } = await supabase.functions.invoke("handle-email-unsubscribe", { body: { token } });
      if (data?.success) setStatus("success");
      else if (data?.reason === "already_unsubscribed") setStatus("already");
      else setStatus("error");
    } catch { setStatus("error"); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full bg-card rounded-xl p-8 shadow-lg text-center space-y-4">
        {status === "loading" && <p className="text-muted-foreground">Cargando...</p>}
        {status === "valid" && (
          <>
            <h1 className="text-xl font-bold text-foreground">Cancelar suscripción</h1>
            <p className="text-muted-foreground">¿Desea dejar de recibir notificaciones por email?</p>
            <button onClick={handleConfirm} className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium hover:opacity-90 transition">
              Confirmar
            </button>
          </>
        )}
        {status === "success" && (
          <>
            <h1 className="text-xl font-bold text-foreground">¡Listo!</h1>
            <p className="text-muted-foreground">Se ha cancelado su suscripción correctamente.</p>
          </>
        )}
        {status === "already" && (
          <>
            <h1 className="text-xl font-bold text-foreground">Ya cancelada</h1>
            <p className="text-muted-foreground">Su suscripción ya estaba cancelada previamente.</p>
          </>
        )}
        {status === "invalid" && (
          <>
            <h1 className="text-xl font-bold text-foreground">Enlace inválido</h1>
            <p className="text-muted-foreground">Este enlace no es válido o ha expirado.</p>
          </>
        )}
        {status === "error" && (
          <>
            <h1 className="text-xl font-bold text-foreground">Error</h1>
            <p className="text-muted-foreground">Ha ocurrido un error. Inténtelo de nuevo más tarde.</p>
          </>
        )}
      </div>
    </div>
  );
};

export default Unsubscribe;
