import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, Trash2, Wrench, History } from "lucide-react";
import { useUpdateClient, useDeleteClient, type Client } from "@/hooks/useClients";
import { useAllAppointments } from "@/hooks/useAppointments";
import { useNavigate } from "react-router-dom";

interface Props {
  client: Client | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClientDetailDialog({ client, open, onOpenChange }: Props) {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    nif: "",
    license_plate: "",
    brand: "",
    model: "",
    address: "",
    city: "",
    postal_code: "",
    province: "",
  });
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();
  const { data: appointments } = useAllAppointments();
  const navigate = useNavigate();

  useEffect(() => {
    if (client) {
      setForm({
        name: client.name ?? "",
        phone: client.phone ?? "",
        email: client.email ?? "",
        nif: client.nif ?? "",
        license_plate: client.license_plate ?? "",
        brand: client.brand ?? "",
        model: client.model ?? "",
        address: client.address ?? "",
        city: client.city ?? "",
        postal_code: client.postal_code ?? "",
        province: client.province ?? "",
      });
    }
  }, [client]);

  if (!client) return null;

  const history = (appointments ?? []).filter(
    (a) => a.license_plate === client.license_plate || a.client_name === client.name
  );

  const handleSave = () => {
    updateClient.mutate(
      {
        id: client.id,
        name: form.name,
        phone: form.phone || null,
        email: form.email || null,
        nif: form.nif || null,
        license_plate: form.license_plate,
        brand: form.brand || null,
        model: form.model || null,
        address: form.address || null,
        city: form.city || null,
        postal_code: form.postal_code || null,
        province: form.province || null,
      },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  const handleDelete = () => {
    deleteClient.mutate(client.id, { onSuccess: () => onOpenChange(false) });
  };

  const handleViewHistory = () => {
    onOpenChange(false);
    navigate(`/vehicle-history?plate=${encodeURIComponent(client.license_plate || "")}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Detalle del Cliente</DialogTitle>
          <DialogDescription>Edita los datos o consulta el historial</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Matrícula</Label>
              <Input value={form.license_plate} onChange={(e) => setForm(f => ({ ...f, license_plate: e.target.value.toUpperCase() }))} />
            </div>
            <div className="space-y-2">
              <Label>Marca</Label>
              <Input value={form.brand} onChange={(e) => setForm(f => ({ ...f, brand: e.target.value }))} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Modelo</Label>
              <Input value={form.model} onChange={(e) => setForm(f => ({ ...f, model: e.target.value }))} />
            </div>
          </div>

          <Separator />

          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="flex items-center gap-2 text-sm font-semibold">
                <Wrench className="h-4 w-4 text-primary" />
                Historial de reparaciones ({history.length})
              </h4>
              {client.license_plate && (
                <Button variant="outline" size="sm" onClick={handleViewHistory} className="text-xs">
                  <History className="mr-1.5 h-3 w-3" />
                  Ver historial completo
                </Button>
              )}
            </div>
            {history.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sin reparaciones registradas</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {history.map((apt) => (
                  <div key={apt.id} className="flex items-center justify-between rounded-md border bg-secondary/50 p-2 text-xs">
                    <div>
                      <span className="font-medium">{apt.service || "Sin servicio"}</span>
                      <span className="text-muted-foreground ml-2">{apt.date}</span>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{apt.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="mr-auto">
                <Trash2 className="mr-2 h-3 w-3" />
                Eliminar cliente
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar este cliente?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción no se puede deshacer. Se eliminará permanentemente el cliente "{client.name}".
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={updateClient.isPending}>
            {updateClient.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Guardar cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
