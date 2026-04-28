import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Users, Loader2 } from "lucide-react";
import { useMechanics, useCreateMechanic, useDeleteMechanic, useUpdateMechanicActive } from "@/hooks/useMechanics";

export function MechanicsManager() {
  const [name, setName] = useState("");
  const { data: mechanics, isLoading } = useMechanics();
  const createMechanic = useCreateMechanic();
  const deleteMechanic = useDeleteMechanic();
  const updateMechanicActive = useUpdateMechanicActive();

  const handleAdd = () => {
    if (!name.trim()) return;
    createMechanic.mutate(name.trim(), {
      onSuccess: () => setName(""),
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <div>
            <CardTitle className="font-display text-base">Mecánicos del taller</CardTitle>
            <CardDescription>Gestiona el equipo para asignar citas</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Nombre del mecánico"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Button onClick={handleAdd} disabled={createMechanic.isPending || !name.trim()}>
            <Plus className="h-4 w-4 mr-1" />
            Añadir
          </Button>
        </div>

        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (mechanics ?? []).length === 0 ? (
          <p className="text-xs text-muted-foreground">No hay mecánicos registrados</p>
        ) : (
          <div className="space-y-2">
            {(mechanics ?? []).map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-3 rounded-md border bg-secondary/50 px-3 py-2">
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{m.name}</span>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`mechanic-active-${m.id}`} className="text-xs text-muted-foreground">
                      Activo
                    </Label>
                    <Switch
                      id={`mechanic-active-${m.id}`}
                      checked={m.active}
                      disabled={updateMechanicActive.isPending}
                      onCheckedChange={(active) => updateMechanicActive.mutate({ id: m.id, active })}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => deleteMechanic.mutate(m.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
