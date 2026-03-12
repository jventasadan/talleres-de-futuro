import { Card, CardContent } from "@/components/ui/card";
import { Bot, CheckCircle2, Zap } from "lucide-react";

export function AIStatusWidget() {
  return (
    <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary">
            <Bot className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-display text-sm font-bold">Asistente IA</h3>
              <div className="flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5">
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
                <span className="text-[10px] font-semibold text-success">Activo</span>
              </div>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Contestando llamadas automáticamente
            </p>
            <div className="mt-3 flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-xs">
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                <span className="font-medium">3 citas</span>
                <span className="text-muted-foreground">reservadas hoy</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <Zap className="h-3.5 w-3.5 text-primary" />
                <span className="font-medium">~2 min</span>
                <span className="text-muted-foreground">por llamada</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
