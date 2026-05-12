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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Loader2,
  Car,
  Plus,
  Pencil,
  Trash2,
  UserCheck,
  UserX,
  Phone,
  Calendar,
  ArrowRight,
} from "lucide-react";
import {
  type CourtesyVehicle,
  useCourtesyVehicles,
  useCreateCourtesyVehicle,
  useDeleteCourtesyVehicle,
  useUpdateCourtesyVehicle,
} from "@/hooks/useCourtesyVehicles";
import { useClients } from "@/hooks/useClients";

const defaultVehicleForm = {
  plate: "",
  brand: "",
  model: "",
  km: "",
};

const defaultAssignForm = {
  assigned_client: "",
  client_phone: "",
  delivery_date: "",
  return_date: "",
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
  const [fleetDialogOpen, setFleetDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<CourtesyVehicle | null>(null);
  const [vehicleForm, setVehicleForm] = useState(defaultVehicleForm);

  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<CourtesyVehicle | null>(null);
  const [assignForm, setAssignForm] = useState(defaultAssignForm);
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const { data: vehicles, isLoading } = useCourtesyVehicles();
  const { data: clients } = useClients();
  const createVehicle = useCreateCourtesyVehicle();
  const updateVehicle = useUpdateCourtesyVehicle();
  const deleteVehicle = useDeleteCourtesyVehicle();

  const stats = useMemo(() => {
    const rows = vehicles ?? [];
    return {
      total: rows.length,
      available: rows.filter((v) => v.status === "disponible").length,
      loaned: rows.filter((v) => v.status === "prestado").length,
      maintenance: rows.filter((v) => v.status === "mantenimiento").length,
    };
  }, [vehicles]);

  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return clients ?? [];
    const q = clientSearch.toLowerCase();
    return (clients ?? []).filter(
      (c) =>
        (c.name ?? "").toLowerCase().includes(q) ||
        (c.phone ?? "").includes(q) ||
        (c.license_plate ?? "").toLowerCase().includes(q)
    );
  }, [clients, clientSearch]);

  const selectedClient = useMemo(
    () => (clients ?? []).find((c) => c.id === selectedClientId) ?? null,
    [clients, selectedClientId]
  );

  const openAddVehicle = () => {
    setEditingVehicle(null);
    setVehicleForm(defaultVehicleForm);
    setFleetDialogOpen(true);
  };

  const openEditVehicle = (vehicle: CourtesyVehicle) => {
    setEditingVehicle(vehicle);
    setVehicleForm({
      plate: vehicle.plate,
      brand: vehicle.brand,
      model: vehicle.model,
      km: vehicle.km,
    });
    setFleetDialogOpen(true);
  };

  const handleSaveVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      plate: vehicleForm.plate.trim().toUpperCase(),
      brand: vehicleForm.brand.trim(),
      model: vehicleForm.model.trim(),
      km: vehicleForm.km.trim(),
      assigned_client: editingVehicle?.assigned_client ?? "",
      client_phone: editingVehicle?.client_phone ?? "",
      delivery_date: editingVehicle?.delivery_date ?? "",
      return_date: editingVehicle?.return_date ?? "",
      status: editingVehicle?.status ?? "disponible",
    };
    if (editingVehicle) {
      updateVehicle.mutate(
        { id: editingVehicle.id, ...payload },
        { onSuccess: () => setFleetDialogOpen(false) }
      );
    } else {
      createVehicle.mutate(payload, { onSuccess: () => setFleetDialogOpen(false) });
    }
  };

  const openAssign = (vehicle: CourtesyVehicle) => {
    setAssignTarget(vehicle);
    setSelectedClientId(null);
    setClientSearch("");
    setAssignForm({
      assigned_client: vehicle.assigned_client,
      client_phone: vehicle.client_phone,
      delivery_date: vehicle.delivery_date,
      return_date: vehicle.return_date,
    });
    setAssignDialogOpen(true);
  };

  const handleSelectClient = (clientId: string) => {
    const c = (clients ?? []).find((cl) => cl.id === clientId);
    if (!c) return;
    setSelectedClientId(clientId);
    setAssignForm((f) => ({
      ...f,
      assigned_client: c.name ?? "",
      client_phone: c.phone ?? "",
    }));
    setClientSearch(c.name ?? "");
  };

  const handleConfirmAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignTarget) return;
    updateVehicle.mutate(
      {
        id: assignTarget.id,
        plate: assignTarget.plate,
        brand: assignTarget.brand,
        model: assignTarget.model,
        km: assignTarget.km,
        assigned_client: assignForm.assigned_client.trim(),
        client_phone: assignForm.client_phone.trim(),
        delivery_date: assignForm.delivery_date,
        return_date: assignForm.return_date,
        status: "prestado",
      },
      { onSuccess: () => setAssignDialogOpen(false) }
    );
  };

  const handleReturnVehicle = (vehicle: CourtesyVehicle) => {
    updateVehicle.mutate({
      id: vehicle.id,
      plate: vehicle.plate,
      brand: vehicle.brand,
      model: vehicle.model,
      km: vehicle.km,
      assigned_client: "",
      client_phone: "",
      delivery_date: "",
      return_date: "",
      status: "disponible",
    });
  };

  const handleSetMaintenance = (vehicle: CourtesyVehicle) => {
    updateVehicle.mutate({
      id: vehicle.id,
      plate: vehicle.plate,
      brand: vehicle.brand,
      model: vehicle.model,
      km: vehicle.km,
      assigned_client: "",
      client_phone: "",
      delivery_date: "",
      return_date: "",
      status: vehicle.status === "mantenimiento" ? "disponible" : "mantenimiento",
    });
  };

  return (
    <DashboardLayout title="Vehículos de Cortesía">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Vehículos de Cortesía</h1>
            <p className="text-sm text-muted-foreground">
              Flota del taller — asigna vehículos a clientes
            </p>
          </div>
          <Button onClick={openAddVehicle}>
            <Plus className="mr-2 h-4 w-4" />
            Añadir vehículo
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total flota", value: stats.total, color: "text-foreground" },
            { label: "Disponibles", value: stats.available, color: "text-success" },
            { label: "Prestados", value: stats.loaned, color: "text-warning" },
            { label: "Mantenimiento", value: stats.maintenance, color: "text-destructive" },
          ].map(({ label, value, color }) => (
            <Card key={label}>
              <CardContent className="flex flex-col items-center justify-center p-4">
                <span className={`text-3xl font-bold ${color}`}>{value}</span>
                <span className="mt-1 text-xs text-muted-foreground">{label}</span>
              </CardContent>
            </Card>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (vehicles ?? []).length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
              <Car className="h-12 w-12 text-muted-foreground/40" />
              <p className="font-medium">Sin vehículos en la flota</p>
              <p className="text-sm text-muted-foreground">
                Añade los vehículos de cortesía del taller para empezar a gestionarlos.
              </p>
              <Button onClick={openAddVehicle} variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Añadir primer vehículo
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(vehicles ?? []).map((vehicle) => (
              <Card
                key={vehicle.id}
                className={`relative overflow-hidden border-2 transition-colors ${
                  vehicle.status === "disponible"
                    ? "border-success/30"
                    : vehicle.status === "prestado"
                    ? "border-warning/30"
                    : "border-destructive/30"
                }`}
              >
                <div
                  className={`absolute right-0 top-0 px-3 py-1 text-xs font-semibold ${statusClass[vehicle.status] ?? ""}`}
                >
                  {statusLabel[vehicle.status] ?? vehicle.status}
                </div>

                <CardHeader className="pb-2 pr-24">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Car className="h-4 w-4 text-muted-foreground" />
                    {vehicle.brand} {vehicle.model}
                  </CardTitle>
                  <p className="text-sm font-mono text-muted-foreground">{vehicle.plate}</p>
                </CardHeader>

                <CardContent className="space-y-3">
                  {vehicle.km && (
                    <p className="text-xs text-muted-foreground">{vehicle.km} km</p>
                  )}
                  {vehicle.status === "prestado" && (
                    <div className="rounded-lg border bg-warning/5 p-3 space-y-1.5 text-sm">
                      <div className="flex items-center gap-2 font-medium">
                        <UserCheck className="h-4 w-4 text-warning" />
                        {vehicle.assigned_client || "—"}
                      </div>
                      {vehicle.client_phone && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-3.5 w-3.5" />
                          {vehicle.client_phone}
                        </div>
                      )}
                      {vehicle.delivery_date && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          Entrega: {new Date(vehicle.delivery_date).toLocaleDateString("es-ES")}
                        </div>
                      )}
                      {vehicle.return_date && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <ArrowRight className="h-3.5 w-3.5" />
                          Devolución: {new Date(vehicle.return_date).toLocaleDateString("es-ES")}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {vehicle.status === "disponible" && (
                      <Button size="sm" className="flex-1" onClick={() => openAssign(vehicle)}>
                        <UserCheck className="mr-1.5 h-3.5 w-3.5" />
                        Asignar cliente
                      </Button>
                    )}
                    {vehicle.status === "prestado" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleReturnVehicle(vehicle)}
                      >
                        <UserX className="mr-1.5 h-3.5 w-3.5" />
                        Devolver
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        vehicle.status === "prestado"
                          ? openAssign(vehicle)
                          : handleSetMaintenance(vehicle)
                      }
                    >
                      {vehicle.status === "mantenimiento"
                        ? "✓ Disponible"
                        : vehicle.status === "prestado"
                        ? "Editar asignación"
                        : "Mantenimiento"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openEditVehicle(vehicle)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteVehicle.mutate(vehicle.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={fleetDialogOpen} onOpenChange={setFleetDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingVehicle ? "Editar vehículo" : "Añadir vehículo a la flota"}
            </DialogTitle>
            <DialogDescription>
              {editingVehicle
                ? "Actualiza los datos del vehículo de cortesía."
                : "Añade un vehículo del taller para poder prestarlo a clientes."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveVehicle} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="brand">Marca *</Label>
                <Input
                  id="brand"
                  placeholder="Toyota"
                  value={vehicleForm.brand}
                  onChange={(e) => setVehicleForm((f) => ({ ...f, brand: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Modelo *</Label>
                <Input
                  id="model"
                  placeholder="Corolla"
                  value={vehicleForm.model}
                  onChange={(e) => setVehicleForm((f) => ({ ...f, model: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plate">Matrícula *</Label>
                <Input
                  id="plate"
                  placeholder="1234 ABC"
                  value={vehicleForm.plate}
                  onChange={(e) =>
                    setVehicleForm((f) => ({ ...f, plate: e.target.value.toUpperCase() }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="km">Kilómetros</Label>
                <Input
                  id="km"
                  placeholder="45.000"
                  value={vehicleForm.km}
                  onChange={(e) => setVehicleForm((f) => ({ ...f, km: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFleetDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createVehicle.isPending || updateVehicle.isPending}>
                {(createVehicle.isPending || updateVehicle.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editingVehicle ? "Guardar cambios" : "Añadir a la flota"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Asignar vehículo —{" "}
              <span className="text-primary">
                {assignTarget?.brand} {assignTarget?.model}
              </span>
            </DialogTitle>
            <DialogDescription>
              Selecciona un cliente de la lista o escribe sus datos manualmente.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleConfirmAssign} className="space-y-4">
            <div className="space-y-2">
              <Label>Buscar cliente</Label>
              <Input
                placeholder="Nombre, teléfono o matrícula…"
                value={clientSearch}
                onChange={(e) => {
                  setClientSearch(e.target.value);
                  setSelectedClientId(null);
                  setAssignForm((f) => ({ ...f, assigned_client: e.target.value }));
                }}
              />
              {clientSearch.trim() && filteredClients.length > 0 && !selectedClientId && (
                <div className="max-h-40 overflow-y-auto rounded-md border bg-popover shadow-md">
                  {filteredClients.slice(0, 8).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-accent"
                      onClick={() => handleSelectClient(c.id)}
                    >
                      <span className="font-medium">{c.name}</span>
                      {c.phone && <span className="text-muted-foreground">{c.phone}</span>}
                      {c.license_plate && (
                        <span className="ml-auto font-mono text-xs text-muted-foreground">
                          {c.license_plate}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {selectedClient && (
                <div className="flex items-center gap-2 rounded-md border bg-success/10 px-3 py-2 text-sm text-success">
                  <UserCheck className="h-4 w-4" />
                  {selectedClient.name}
                  {selectedClient.phone && (
                    <span className="text-muted-foreground">· {selectedClient.phone}</span>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="client_phone">Teléfono cliente</Label>
              <Input
                id="client_phone"
                placeholder="600 000 000"
                value={assignForm.client_phone}
                onChange={(e) => setAssignForm((f) => ({ ...f, client_phone: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="delivery_date">Día de entrega *</Label>
                <Input
                  id="delivery_date"
                  type="date"
                  value={assignForm.delivery_date}
                  onChange={(e) =>
                    setAssignForm((f) => ({ ...f, delivery_date: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="return_date">Devolución prevista</Label>
                <Input
                  id="return_date"
                  type="date"
                  value={assignForm.return_date}
                  onChange={(e) =>
                    setAssignForm((f) => ({ ...f, return_date: e.target.value }))
                  }
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAssignDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={
                  !assignForm.assigned_client.trim() ||
                  !assignForm.delivery_date ||
                  updateVehicle.isPending
                }
              >
                {updateVehicle.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar préstamo
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default CourtesyVehicles;
