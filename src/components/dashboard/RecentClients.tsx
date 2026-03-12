import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAllAppointments } from "@/hooks/useAppointments";
import { Loader2 } from "lucide-react";

export function RecentClients() {
  const { data: appointments, isLoading } = useAllAppointments();

  // Group by mechanic to build a performance table
  const mechanicMap = new Map<string, { orders: number; }>();
  (appointments ?? []).forEach((apt) => {
    const m = apt.mechanic || "Sin asignar";
    const entry = mechanicMap.get(m) ?? { orders: 0 };
    entry.orders++;
    mechanicMap.set(m, entry);
  });

  const mechanics = Array.from(mechanicMap.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.orders - a.orders);

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-base font-bold">
          Rendimiento Mecánicos
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Desempeño basado en órdenes asignadas.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !mechanics.length ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Sin datos</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Mecánico</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground text-center">Órdenes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mechanics.map((m) => (
                <TableRow key={m.name} className="border-border/30 hover:bg-secondary/50">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15">
                        <Wrench className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <span className="text-sm font-medium">{m.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-mono text-sm font-bold">{m.orders}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
