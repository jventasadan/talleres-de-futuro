import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Mail, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useClients } from "@/hooks/useClients";
import { Loader2 } from "lucide-react";

const avatarColors = [
  "bg-primary/15 text-primary",
  "bg-success/15 text-success",
  "bg-warning/15 text-warning",
  "bg-destructive/15 text-destructive",
];

function getInitials(name: string | null): string {
  if (!name) return "??";
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

export function RecentClients() {
  const navigate = useNavigate();
  const { data: clients, isLoading } = useClients();
  const recent = (clients ?? []).slice(0, 4);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-display text-base">Clientes recientes</CardTitle>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => navigate("/clients")}>
            Ver todos<ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !recent.length ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No hay clientes</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {recent.map((client, i) => (
              <div key={client.id} className="flex items-center gap-3 rounded-xl border p-3 transition-all hover:bg-accent/50 cursor-pointer">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-display text-xs font-bold ${avatarColors[i % avatarColors.length]}`}>
                  {getInitials(client.full_name)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{client.full_name || "Sin nombre"}</p>
                  {client.phone && <p className="text-[11px] text-muted-foreground">{client.phone}</p>}
                  {client.email && <p className="truncate text-[10px] text-muted-foreground">{client.email}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
