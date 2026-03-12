import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAllAppointments } from "@/hooks/useAppointments";
import { Wrench, Loader2 } from "lucide-react";

const statusStyles: Record<string, string> = {
  recepcionado: "bg-primary/20 text-primary border-primary/30",
  en_reparacion: "bg-info/20 text-info border-info/30",
  listo: "bg-success/20 text-success border-success/30",
  entregado: "bg-muted text-muted-foreground border-border",
  cancelado: "bg-destructive/20 text-destructive border-destructive/30",
};

export function RecentCalls() {
  const { data: appointments, isLoading } = useAllAppointments();
  const recent = (appointments ?? []).slice(-6).reverse();

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-display text-base font-bold">Actividad reciente</CardTitle>
          <Badge variant="outline" className="text-xs border-border/50">
            {(appointments ?? []).length} total
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !recent.length ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No hay actividad</p>
        ) : (
          recent.map((apt) => {
            const statusClass = statusStyles[apt.status ?? "recepcionado"] ?? statusStyles.recepcionado;
            return (
              <div key={apt.id} className="flex items-center gap-3 rounded-lg border border-border/30 bg-secondary/30 p-3 transition-all hover:bg-secondary/60">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Wrench className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="truncate text-sm font-medium">{apt.client_name || "Sin nombre"}</p>
                    <span className="ml-2 shrink-0 text-[11px] text-muted-foreground">{apt.date}</span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground truncate">
                      {[apt.license_plate, apt.service].filter(Boolean).join(" · ")}
                    </span>
                    <Badge variant="outline" className={`text-[10px] ml-2 shrink-0 border ${statusClass}`}>
                      {apt.status ?? "recepcionado"}
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
