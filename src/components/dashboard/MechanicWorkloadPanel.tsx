import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Wrench } from "lucide-react";
import { useAllAppointments } from "@/hooks/useAppointments";
import { useMechanics } from "@/hooks/useMechanics";

const activeStatuses = new Set(["recepcionado", "en_reparacion", "esperando_piezas"]);
const finishedStatuses = new Set(["listo", "entregado", "reparado"]);

const toMinutes = (start?: string | null, end?: string | null): number | null => {
  if (!start || !end) return null;
  const startDate = new Date(start);
  const endDate = new Date(end);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return null;

  const diff = Math.round((endDate.getTime() - startDate.getTime()) / 60000);
  return diff > 0 ? diff : null;
};

const formatMinutes = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
};

export function MechanicWorkloadPanel() {
  const { data: appointments, isLoading: loadingAppointments } = useAllAppointments();
  const { data: mechanics, isLoading: loadingMechanics } = useMechanics();

  const mechanicNames = (mechanics ?? []).map((m) => m.name).filter(Boolean);
  const counters = new Map<string, { active: number; finished: number }>();

  for (const name of mechanicNames) {
    counters.set(name, { active: 0, finished: 0 });
  }

  (appointments ?? []).forEach((apt) => {
    const mechanicName = (apt.mechanic ?? "Sin asignar").trim() || "Sin asignar";
    if (!counters.has(mechanicName)) counters.set(mechanicName, { active: 0, finished: 0 });

    const item = counters.get(mechanicName)!;
    if (activeStatuses.has(apt.status)) item.active += 1;
    if (finishedStatuses.has(apt.status)) item.finished += 1;
  });

  const workload = Array.from(counters.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.active - a.active || b.finished - a.finished);

  const completedDurations = (appointments ?? [])
    .map((apt) => toMinutes(apt.appointment_start, apt.appointment_end))
    .filter((minutes): minutes is number => typeof minutes === "number");

  const averageMinutes = completedDurations.length
    ? Math.round(completedDurations.reduce((sum, m) => sum + m, 0) / completedDurations.length)
    : 0;

  const activeTotal = workload.reduce((sum, item) => sum + item.active, 0);

  const isLoading = loadingAppointments || loadingMechanics;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-base font-bold">Carga de mecánicos</CardTitle>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline">Activos: {activeTotal}</Badge>
          <Badge variant="outline">Tiempo medio: {averageMinutes ? formatMinutes(averageMinutes) : "N/D"}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : workload.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Sin datos de mecánicos</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Mecánico</TableHead>
                <TableHead className="text-center text-xs uppercase tracking-wider text-muted-foreground">Trabajos</TableHead>
                <TableHead className="text-center text-xs uppercase tracking-wider text-muted-foreground">Finalizados</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workload.map((item) => (
                <TableRow key={item.name} className="border-border/30 hover:bg-secondary/50">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15">
                        <Wrench className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <span className="text-sm font-medium">{item.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-mono text-sm font-bold">{item.active}</TableCell>
                  <TableCell className="text-center font-mono text-sm">{item.finished}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
