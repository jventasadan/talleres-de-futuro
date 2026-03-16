import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, User, Phone, Car } from "lucide-react";
import { useClients, type Client } from "@/hooks/useClients";
import { useNavigate } from "react-router-dom";

export function RecentClients() {
  const { data: clients, isLoading } = useClients();
  const navigate = useNavigate();

  const recent = (clients ?? [])
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-display text-base font-bold">Últimos clientes</CardTitle>
          <Badge variant="outline" className="text-xs">{(clients ?? []).length} total</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !recent.length ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Sin clientes registrados</p>
        ) : (
          <div className="space-y-2">
            {recent.map((client) => (
              <div
                key={client.id}
                className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-secondary/50 cursor-pointer"
                onClick={() => navigate(`/clients?search=${encodeURIComponent(client.license_plate || client.name)}`)}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15">
                  <User className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{client.name || "Sin nombre"}</p>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    {client.phone && (
                      <span className="flex items-center gap-0.5"><Phone className="h-2.5 w-2.5" />{client.phone}</span>
                    )}
                    {client.license_plate && (
                      <span className="flex items-center gap-0.5 font-mono"><Car className="h-2.5 w-2.5" />{client.license_plate}</span>
                    )}
                  </div>
                </div>
                {client.brand && (
                  <Badge variant="outline" className="text-[10px] shrink-0">{client.brand}</Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
