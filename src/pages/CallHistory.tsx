import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PhoneIncoming, PhoneOff, Clock, Calendar } from "lucide-react";

const mockCalls = [
  { id: 1, caller: "+34 612 345 678", date: "2026-03-12", time: "08:45", duration: "2:34", result: "Cita reservada", client: "Carlos García", success: true },
  { id: 2, caller: "+34 698 765 432", date: "2026-03-12", time: "09:12", duration: "1:12", result: "Sin disponibilidad", client: "Desconocido", success: false },
  { id: 3, caller: "+34 655 111 222", date: "2026-03-11", time: "14:30", duration: "3:01", result: "Cita reservada", client: "Pedro Martín", success: true },
  { id: 4, caller: "+34 677 333 444", date: "2026-03-11", time: "15:45", duration: "1:45", result: "Cita reservada", client: "Ana Ruiz", success: true },
  { id: 5, caller: "+34 644 555 666", date: "2026-03-10", time: "10:00", duration: "0:45", result: "Llamada cortada", client: "Desconocido", success: false },
  { id: 6, caller: "+34 611 777 888", date: "2026-03-10", time: "11:20", duration: "2:15", result: "Cita reservada", client: "Sara Moreno", success: true },
];

const CallHistory = () => {
  return (
    <DashboardLayout title="Historial de llamadas" subtitle="Llamadas gestionadas por el asistente IA">
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Estado</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Teléfono</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Cliente</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Fecha</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Hora</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Duración</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {mockCalls.map((call) => (
                  <tr key={call.id} className="border-b last:border-0 transition-colors hover:bg-accent/50">
                    <td className="px-4 py-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-md ${
                        call.success ? "bg-success/10" : "bg-destructive/10"
                      }`}>
                        {call.success ? (
                          <PhoneIncoming className="h-4 w-4 text-success" />
                        ) : (
                          <PhoneOff className="h-4 w-4 text-destructive" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{call.caller}</td>
                    <td className="px-4 py-3 font-medium">{call.client}</td>
                    <td className="px-4 py-3">{call.date}</td>
                    <td className="px-4 py-3">{call.time}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {call.duration}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={call.success ? "default" : "secondary"}>
                        {call.result}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default CallHistory;
