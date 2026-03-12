import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wrench, Car, User, Clock } from "lucide-react";
import { useAppointments, type Appointment } from "@/hooks/useAppointments";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; dot: string }> = {
  recepcionado: { label: "Recepcionado", variant: "secondary", dot: "bg-warning" },
  en_proceso: { label: "En proceso", variant: "outline", dot: "bg-primary" },
  reparado: { label: "Reparado", variant: "default", dot: "bg-success" },
  entregado: { label: "Entregado", variant: "secondary", dot: "bg-muted-foreground" },
  cancelado: { label: "Cancelado", variant: "destructive", dot: "bg-destructive" },
};

function formatTime(dateStr: string | null): string {
  if (!dateStr) return "--:--";
  try {
    const d = new Date(dateStr);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch {
    return "--:--";
  }
}

export function UpcomingAppointments() {
  const today = format(new Date(), "yyyy-MM-dd");
  const { data: appointments, isLoading } = useAppointments(today);

  const active = (appointments ?? []).filter((a) => a.status !== "cancelado");

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-display text-base">Citas de hoy</CardTitle>
          <Badge variant="outline" className="font-mono text-xs">
            {active.length} citas
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-2">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !active.length ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No hay citas para hoy
          </p>
        ) : (
          active.slice(0, 6).map((apt, index) => {
            const status = statusConfig[apt.status ?? "recepcionado"] ?? statusConfig.recepcionado;
            const vehicle = [apt.brand, apt.model].filter(Boolean).join(" ");
            return (
              <div key={apt.id} className="group flex items-center gap-3 rounded-xl border p-3 transition-all hover:bg-accent/50">
                <div className="flex w-14 shrink-0 flex-col items-center">
                  <span className="font-mono text-sm font-bold">{formatTime(apt.appointment_start)}</span>
                </div>
                <div className="relative flex flex-col items-center self-stretch">
                  <div className={`h-2.5 w-2.5 rounded-full ${status.dot} ring-2 ring-card`} />
                  {index < active.length - 1 && <div className="w-px flex-1 bg-border" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="truncate text-sm font-medium">{apt.name || "Sin nombre"}</p>
                    <Badge variant={status.variant} className="ml-2 shrink-0 text-[10px]">{status.label}</Badge>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                    {apt.license_plate && <span className="font-mono">{apt.license_plate}</span>}
                    {vehicle && <><span>·</span><span>{vehicle}</span></>}
                    {apt.problem && <><span>·</span><span className="truncate">{apt.problem}</span></>}
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
