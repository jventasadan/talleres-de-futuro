import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Trash2, Plus, Loader2, Search } from "lucide-react";
import { useWorkOrderItems, useAddWorkOrderItem, useDeleteWorkOrderItem } from "@/hooks/useWorkOrderItems";
import { usePartsCatalog, type PartsCatalogItem } from "@/hooks/usePartsCatalog";
import { useCompanySettings } from "@/hooks/useCompanySettings";

interface OrderPartsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
  workOrderId?: string | null;
}

export function OrderPartsDialog({ open, onOpenChange, appointmentId, workOrderId }: OrderPartsDialogProps) {
  const { data: items, isLoading } = useWorkOrderItems(workOrderId ?? null);
  const { data: catalog } = usePartsCatalog();
  const { data: settings } = useCompanySettings();
  const addItem = useAddWorkOrderItem();
  const deleteItem = useDeleteWorkOrderItem();

  const [form, setForm] = useState({ name: "", quantity: "1", unit_price: "0", discount: "0" });
  const [laborForm, setLaborForm] = useState({ hours: "1" });
  const [searchTerm, setSearchTerm] = useState("");
  const [showCatalog, setShowCatalog] = useState(false);

  const laborRate = settings?.labor_rate ?? 35;

  const filteredCatalog = useMemo(() => {
    if (!searchTerm.trim() || !catalog?.length) return [];
    const term = searchTerm.toLowerCase();
    return catalog.filter(
      (item) =>
        item.name.toLowerCase().includes(term) ||
        item.ref.toLowerCase().includes(term)
    ).slice(0, 8);
  }, [catalog, searchTerm]);

  const handleSelectCatalogItem = (item: PartsCatalogItem) => {
    setForm({ name: item.name, quantity: "1", unit_price: String(item.price), discount: "0" });
    setSearchTerm("");
    setShowCatalog(false);
  };

  const handleAddPart = () => {
    if (!workOrderId) return;

    const piezaNombre = form.name.trim();

    if (!piezaNombre) {
      toast.error("Introduce o selecciona una pieza");
      return;
    }

    addItem.mutate({
      work_order_id: workOrderId,
      description: piezaNombre,
      quantity: parseInt(form.quantity) || 1,
      unit_price: parseFloat(form.unit_price) || 0,
      discount_percent: parseFloat(form.discount) || 0,
      item_type: "pieza",
    }, {
      onSuccess: () => {
        setForm({ name: "", quantity: "1", unit_price: "0", discount: "0" });
        setSearchTerm("");
      },
    });
  };

  const handleAddLabor = () => {
    if (!workOrderId) return;
    const hours = parseFloat(laborForm.hours) || 1;
    addItem.mutate({
      work_order_id: workOrderId,
      description: "Mano de obra",
      quantity: hours,
      unit_price: laborRate,
      discount_percent: 0,
      item_type: "mano_obra",
    }, {
      onSuccess: () => setLaborForm({ hours: "1" }),
    });
  };

  const partItems = (items ?? []).filter(i => i.item_type === "pieza");
  const laborItems = (items ?? []).filter(i => i.item_type === "mano_obra");

  const subtotal = (items ?? []).reduce((sum, i) => sum + Number(i.total), 0);

  if (!workOrderId) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Items de la orden</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-4">
            Este vehículo debe estar en reparación para poder gestionar items. Mueve la orden a "En reparación" primero.
          </p>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Items de la orden</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Parts list */}
            {partItems.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Piezas</Label>
                {partItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 rounded-lg bg-secondary/50 p-2 text-sm">
                    <span className="flex-1 truncate">{item.description}</span>
                    <span className="text-xs text-muted-foreground">x{item.quantity}</span>
                    <span className="font-mono text-xs">{Number(item.unit_price).toFixed(2)}€</span>
                    {Number(item.discount_percent) > 0 && (
                      <span className="text-xs text-destructive">-{item.discount_percent}%</span>
                    )}
                    <span className="font-mono text-xs font-semibold">{Number(item.total).toFixed(2)}€</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteItem.mutate(item.id)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Labor list */}
            {laborItems.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Mano de obra</Label>
                {laborItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 rounded-lg bg-blue-500/10 p-2 text-sm">
                    <span className="flex-1 truncate">{item.description}</span>
                    <span className="text-xs text-muted-foreground">{item.quantity}h × {Number(item.unit_price).toFixed(2)}€</span>
                    <span className="font-mono text-xs font-semibold">{Number(item.total).toFixed(2)}€</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteItem.mutate(item.id)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {(items ?? []).length > 0 && (
              <div className="text-right text-sm font-semibold">
                Subtotal: {subtotal.toFixed(2)}€
              </div>
            )}

            {/* Catalog search */}
            <div className="relative">
              <Label className="text-xs">Buscar pieza en catálogo</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Busca por nombre o referencia..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setShowCatalog(true); }}
                  onFocus={() => setShowCatalog(true)}
                />
              </div>
              {showCatalog && filteredCatalog.length > 0 && (
                <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-48 overflow-y-auto">
                  {filteredCatalog.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
                      onClick={() => handleSelectCatalogItem(item)}
                    >
                      <div>
                        <span className="font-medium">{item.name}</span>
                        {item.ref && <span className="ml-2 text-xs text-muted-foreground">Ref: {item.ref}</span>}
                      </div>
                      <span className="font-mono text-xs font-semibold">{item.price.toFixed(2)}€</span>
                    </button>
                  ))}
                </div>
              )}
              {showCatalog && searchTerm.trim() && filteredCatalog.length === 0 && (
                <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg p-3 text-xs text-muted-foreground text-center">
                  No se encontraron piezas en el catálogo
                </div>
              )}
            </div>

            {/* Add part form */}
            <div className="grid gap-3 sm:grid-cols-5 items-end">
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs">Pieza</Label>
                <Input placeholder="Nombre" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Cant.</Label>
                <Input type="number" min="1" value={form.quantity} onChange={(e) => setForm(f => ({ ...f, quantity: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">€/ud</Label>
                <Input type="number" min="0" step="0.01" value={form.unit_price} onChange={(e) => setForm(f => ({ ...f, unit_price: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Dto.%</Label>
                <Input type="number" min="0" max="100" value={form.discount} onChange={(e) => setForm(f => ({ ...f, discount: e.target.value }))} />
              </div>
            </div>
            <Button onClick={handleAddPart} disabled={addItem.isPending} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Añadir pieza
            </Button>

            {/* Add labor */}
            <div className="border-t pt-3 space-y-2">
              <Label className="text-xs font-semibold">Añadir mano de obra</Label>
              <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Horas</Label>
                  <Input type="number" min="0.5" step="0.5" value={laborForm.hours} onChange={(e) => setLaborForm({ hours: e.target.value })} />
                </div>
                <div className="text-xs text-muted-foreground pb-2">× {laborRate}€/h</div>
                <Button onClick={handleAddLabor} disabled={addItem.isPending} variant="outline">
                  <Plus className="mr-1 h-4 w-4" />
                  Añadir
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
