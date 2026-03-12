import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench, Loader2 } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useAllAppointments } from "@/hooks/useAppointments";

export function RecentClients() {
  const { data: appointments, isLoading } = useAllAppointments();

  // Group by status for a simple overview
  const statusMap = new Map<string, number>();
  (appointments ?? []).forEach((apt) => {
    const s = apt.status || "pending";
    statusMap.set(s, (statusMap.get(s) ?? 0) + 1);
  });

  const statuses = Array.from(statusMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-base font-bold">Resumen de Estados</CardTitle>
        <p className="text-xs text-muted-foreground">Distribución de órdenes por estado.</p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !statuses.length ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Sin datos</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Estado</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground text-center">Cantidad</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {statuses.map((s) => (
                <TableRow key={s.name} className="border-border/30 hover:bg-secondary/50">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15">
                        <Wrench className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <span className="text-sm font-medium capitalize">{s.name.replace("_", " ")}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-mono text-sm font-bold">{s.count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
