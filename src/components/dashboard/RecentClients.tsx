import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Car, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const clients = [
  { id: 1, name: "Carlos García", plate: "1234 ABC", lastVisit: "Hoy", avatar: "CG" },
  { id: 2, name: "María López", plate: "5678 DEF", lastVisit: "Hoy", avatar: "ML" },
  { id: 3, name: "Pedro Martín", plate: "9012 GHI", lastVisit: "Ayer", avatar: "PM" },
  { id: 4, name: "Ana Ruiz", plate: "3456 JKL", lastVisit: "Hace 2 días", avatar: "AR" },
];

const avatarColors = [
  "bg-primary/15 text-primary",
  "bg-success/15 text-success",
  "bg-warning/15 text-warning",
  "bg-destructive/15 text-destructive",
];

export function RecentClients() {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-display text-base">Clientes recientes</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={() => navigate("/clients")}
          >
            Ver todos
            <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {clients.map((client, i) => (
            <div
              key={client.id}
              className="flex items-center gap-3 rounded-xl border p-3 transition-all hover:bg-accent/50 hover:shadow-sm cursor-pointer"
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-display text-xs font-bold ${
                  avatarColors[i % avatarColors.length]
                }`}
              >
                {client.avatar}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{client.name}</p>
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Car className="h-3 w-3" />
                  <span className="font-mono">{client.plate}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">{client.lastVisit}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
