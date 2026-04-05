import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Car, Plus, Pencil, Trash2 } from "lucide-react";
import {
  type CourtesyVehicle,
  useCourtesyVehicles,
  useCreateCourtesyVehicle,
  useDeleteCourtesyVehicle,
  useUpdateCourtesyVehicle,
} from "@/hooks/useCourtesyVehicles";

const defaultForm = {
  plate: "",
  model: "",
  km: "",
  assigned_client: "",
  client_phone: "",
  return_date: "",
  status: "disponible",
  brand: "",
  delivery_date: "",
};

const statusLabel: Record<string, string> = {
  disponible: "Disponible",
  prestado: "Prestado",
  mantenimiento: "Mantenimiento",
};

const statusClass: Record<string, string> = {
  disponible: "bg-success/15 text-success border-success/30",
  prestado: "bg-warning/15 text-warning border-warning/30",
  mantenimiento: "bg-destructive/15 text-destructive border-destructive/30",
};

const CourtesyVehicles = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CourtesyVehicle | null>(null);
  const [form, setForm] = useState(defaultForm);

  const { data, isLoading } = useCourtesyVehicles();
  const createVehicle = useCreateCourtesyVehicle();
  const updateVehicle = useUpdateCourtesyVehicle();
  const deleteVehicle = useDeleteCourtesyVehicle();

  const stats = useMemo(() => {
    const rows = data ?? [];
    return {
      total: rows.length,
      available: rows.filter((row) => row.status === "disponible").length,
      loaned: rows.filter((row) => row.status === "prestado").length,
    };
  }, [data]);

  const openCreate = () => {
    setEditing(null);
    setForm(defaultForm);
    setDialogOpen(true);
  };

  const openEdit = (vehicle: CourtesyVehicle) => {
    setEditing(vehicle);
    setForm({
      plate: vehicle.plate,
      model: vehicle.model,
      km: vehicle.km,
      assigned_client: vehicle.assigned_client,
      return_date: vehicle.return_date,
      status: vehicle.status,
      brand: (vehicle as any).brand ?? "",
      delivery_date: (vehicle as any).delivery_date ?? "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      plate: form.plate.trim().toUpperCase(),
      model: form.model.trim(),
      km: form.km.trim(),
      assigned_client: form.assigned_client.trim(),
      return_date: form.return_date,
      status: form.status,
      brand: form.brand.trim(),
      delivery_date: form.delivery_date,
    };

    if (editing) {
      updateVehicle.mutate(
        { id: editing.id, ...payload },
        {
          onSuccess: () => {
            setDialogOpen(false);
            setEditing(null);
          },
        },
      );
      return;
    }

    createVehicle.mutate(payload, {
      onSuccess: () => {
        setDialogOpen(false);
        setForm(defaultForm);
      },
    });
  };

  return (
    <DashboardLayout title="Coches de cortesía" subtitle="Control de préstamos y devoluciones">
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total vehículos</p>
              <p className="font-display text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Disponibles</p>
              <p className="font-display text-2xl font-bold text-success">{stats.available}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Prestados</p>
              <p className="font-display text-2xl font-bold text-warning">{stats.loaned}</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end">
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo préstamo
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Matrícula</TableHead>
                      <TableHead>Marca</TableHead>
                      <TableHead>Modelo</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Teléfono</TableHead>
                      <TableHead>F. Entrega</TableHead>
                      <TableHead>F. Devolución</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data ?? []).map((vehicle) => (
                      <TableRow key={vehicle.id}>
                        <TableCell className="font-mono text-xs font-semibold">{vehicle.plate || "-"}</TableCell>
                        <TableCell>{(vehicle as any).brand || "-"}</TableCell>
                        <TableCell>{vehicle.model || "-"}</TableCell>
                        <TableCell>{vehicle.assigned_client || "Sin asignar"}</TableCell>
                        <TableCell className="text-xs">{(vehicle as any).client_phone || "-"}</TableCell>
                        <TableCell>{(vehicle as any).delivery_date || "-"}</TableCell>
                        <TableCell>{vehicle.return_date || "-"}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={statusClass[vehicle.status] ?? "bg-secondary text-secondary-foreground border-border"}
                          >
                            {statusLabel[vehicle.status] ?? vehicle.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(vehicle)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => deleteVehicle.mutate(vehicle.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">{editing ? "Editar coche de cortesía" : "Nuevo coche de cortesía"}</DialogTitle>
            <DialogDescription>Registra vehículo, cliente y fecha prevista de devolución.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Matrícula</Label>
                <Input
                  value={form.plate}
                  onChange={(e) => setForm((prev) => ({ ...prev, plate: e.target.value.toUpperCase() }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Marca</Label>
                <Input value={form.brand} onChange={(e) => setForm((prev) => ({ ...prev, brand: e.target.value }))} placeholder="Ej: Toyota" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Modelo</Label>
                <Input value={form.model} onChange={(e) => setForm((prev) => ({ ...prev, model: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={form.status} onValueChange={(value) => setForm((prev) => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="disponible">Disponible</SelectItem>
                    <SelectItem value="prestado">Prestado</SelectItem>
                    <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Cliente asignado</Label>
              <Input
                value={form.assigned_client}
                onChange={(e) => setForm((prev) => ({ ...prev, assigned_client: e.target.value }))}
                placeholder="Nombre del cliente"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Fecha de entrega</Label>
                <Input
                  type="date"
                  value={form.delivery_date}
                  onChange={(e) => setForm((prev) => ({ ...prev, delivery_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha de devolución</Label>
                <Input
                  type="date"
                  value={form.return_date}
                  onChange={(e) => setForm((prev) => ({ ...prev, return_date: e.target.value }))}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createVehicle.isPending || updateVehicle.isPending}>
                {(createVehicle.isPending || updateVehicle.isPending) ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Car className="mr-2 h-4 w-4" />
                )}
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default CourtesyVehicles;
