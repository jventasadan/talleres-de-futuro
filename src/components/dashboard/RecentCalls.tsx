import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAllAppointments } from "@/hooks/useAppointments";
import { Car, User, Wrench } from "lucide-react";
import { Loader2 } from "lucide-react";

function formatTime(dateStr: string | null): string {
  if (!dateStr) return "--:--";
  try {
    const d = new Date(dateStr);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch {
    return "--:--";
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
  } catch {
    return "";
  }
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  recepcionado: { label: "Recepcionado", variant: "secondary" },
  en_proceso: { label: "En proceso", variant: "outline" },
  reparado: { label: "Reparado", variant: "default" },
  entregado: { label: "Entregado", variant: "secondary" },
  cancelado: { label: "Cancelado", variant: "destructive" },
};

export function RecentCalls() {
  const { data: appointments, isLoading } = useAllAppointments();

  // Show latest 5 appointments as "recent activity"
  const recent = (appointments ?? []).slice(-5).reverse();

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-display text-base">Actividad reciente</CardTitle>
          <Badge variant="outline" className="text-xs">
            {(appointments ?? []).length} total
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-2">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !recent.length ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No hay actividad</p>
        ) : (
          recent.map((apt) => {
            const status = statusConfig[apt.status ?? "recepcionado"] ?? statusConfig.recepcionado;
            return (
              <div key={apt.id} className="flex items-center gap-3 rounded-xl border p-3 transition-all hover:bg-accent/50">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Wrench className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="truncate text-sm font-medium">{apt.name || "Sin nombre"}</p>
                    <span className="ml-2 shrink-0 text-[11px] text-muted-foreground">
                      {formatDate(apt.appointment_start)}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground truncate">
                      {[apt.license_plate, apt.problem].filter(Boolean).join(" · ")}
                    </span>
                    <Badge variant={status.variant} className="text-[10px] ml-2 shrink-0">
                      {status.label}
                    </Badge>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
