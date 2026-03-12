import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, PhoneIncoming, PhoneOff } from "lucide-react";

const recentCalls = [
  { id: 1, caller: "+34 612 345 678", duration: "2:34", result: "Cita reservada", success: true },
  { id: 2, caller: "+34 698 765 432", duration: "1:12", result: "Sin disponibilidad", success: false },
  { id: 3, caller: "+34 655 111 222", duration: "3:01", result: "Cita reservada", success: true },
];

export function RecentCalls() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-base">Llamadas recientes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {recentCalls.map((call) => (
          <div
            key={call.id}
            className="flex items-center justify-between rounded-lg border p-3"
          >
            <div className="flex items-center gap-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-md ${
                call.success ? "bg-success/10" : "bg-destructive/10"
              }`}>
                {call.success ? (
                  <PhoneIncoming className="h-4 w-4 text-success" />
                ) : (
                  <PhoneOff className="h-4 w-4 text-destructive" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium">{call.caller}</p>
                <p className="text-xs text-muted-foreground">{call.result}</p>
              </div>
            </div>
            <span className="text-xs text-muted-foreground">{call.duration}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
