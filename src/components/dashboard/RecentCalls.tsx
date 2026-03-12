import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PhoneIncoming, PhoneOff, Bot, Clock } from "lucide-react";

const recentCalls = [
  { id: 1, caller: "+34 612 345 678", client: "Carlos García", duration: "2:34", result: "Cita reservada", success: true, time: "08:45" },
  { id: 2, caller: "+34 698 765 432", client: "Desconocido", duration: "1:12", result: "Sin disponibilidad", success: false, time: "09:12" },
  { id: 3, caller: "+34 655 111 222", client: "Pedro Martín", duration: "3:01", result: "Cita reservada", success: true, time: "10:05" },
  { id: 4, caller: "+34 677 333 444", client: "Ana Ruiz", duration: "1:45", result: "Cita reservada", success: true, time: "11:30" },
  { id: 5, caller: "+34 644 555 666", client: "Desconocido", duration: "0:45", result: "Llamada cortada", success: false, time: "12:15" },
];

export function RecentCalls() {
  const successRate = Math.round(
    (recentCalls.filter((c) => c.success).length / recentCalls.length) * 100
  );

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" />
            <CardTitle className="font-display text-base">Llamadas IA</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">
            {successRate}% éxito
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-2">
        {recentCalls.map((call) => (
          <div
            key={call.id}
            className="flex items-center gap-3 rounded-xl border p-3 transition-all hover:bg-accent/50 hover:shadow-sm"
          >
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                call.success
                  ? "bg-success/10"
                  : "bg-destructive/10"
              }`}
            >
              {call.success ? (
                <PhoneIncoming className="h-4 w-4 text-success" />
              ) : (
                <PhoneOff className="h-4 w-4 text-destructive" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <p className="truncate text-sm font-medium">{call.client}</p>
                <div className="ml-2 flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {call.time}
                </div>
              </div>
              <div className="mt-0.5 flex items-center justify-between">
                <span className="font-mono text-xs text-muted-foreground">{call.caller}</span>
                <Badge
                  variant={call.success ? "default" : "secondary"}
                  className="text-[10px]"
                >
                  {call.result}
                </Badge>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
