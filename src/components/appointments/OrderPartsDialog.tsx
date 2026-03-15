import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Trash2, Plus, Loader2, Search } from "lucide-react";
import { useOrderParts, useAddPart, useDeletePart } from "@/hooks/useOrderParts";
import { usePartsCatalog, type PartsCatalogItem } from "@/hooks/usePartsCatalog";

interface OrderPartsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
}

export function OrderPartsDialog({ open, onOpenChange, appointmentId }: OrderPartsDialogProps) {
  const { data: parts, isLoading } = useOrderParts(appointmentId);
  const { data: catalog } = usePartsCatalog();
  const addPart = useAddPart();
  const deletePart = useDeletePart();
  const [form, setForm] = useState({ name: "", quantity: "1", unit_price: "0" });
  const [searchTerm, setSearchTerm] = useState("");
  const [showCatalog, setShowCatalog] = useState(false);

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
    setForm({ name: item.name, quantity: "1", unit_price: String(item.price) });
    setSearchTerm("");
    setShowCatalog(false);
  };

  const handleAdd = () => {
    if (!form.name.trim()) return;
    addPart.mutate({
      appointment_id: appointmentId,
      name: form.name,
      quantity: parseInt(form.quantity) || 1,
      unit_price: parseFloat(form.unit_price) || 0,
    }, {
      onSuccess: () => {
        setForm({ name: "", quantity: "1", unit_price: "0" });
        setSearchTerm("");
      },
    });
  };

  const total = (parts ?? []).reduce((sum, p) => sum + p.quantity * p.unit_price, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Piezas utilizadas</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Existing parts */}
            {(parts ?? []).length > 0 && (
              <div className="space-y-2">
                {(parts ?? []).map((part) => (
                  <div key={part.id} className="flex items-center gap-2 rounded-lg bg-secondary/50 p-2 text-sm">
                    <span className="flex-1 truncate">{part.name}</span>
                    <span className="text-xs text-muted-foreground">x{part.quantity}</span>
                    <span className="font-mono text-xs">{(part.unit_price * part.quantity).toFixed(2)}€</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => deletePart.mutate({ id: part.id, appointmentId })}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ))}
                <div className="text-right text-sm font-semibold">
                  Total piezas: {total.toFixed(2)}€
                </div>
              </div>
            )}

            {/* Catalog search */}
            <div className="relative">
              <Label className="text-xs">Buscar en catálogo</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Busca por nombre o referencia..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowCatalog(true);
                  }}
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
            <div className="grid gap-3 sm:grid-cols-4 items-end">
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs">Pieza</Label>
                <Input placeholder="Nombre de la pieza" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Cantidad</Label>
                <Input type="number" min="1" value={form.quantity} onChange={(e) => setForm(f => ({ ...f, quantity: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Precio ud.</Label>
                <Input type="number" min="0" step="0.01" value={form.unit_price} onChange={(e) => setForm(f => ({ ...f, unit_price: e.target.value }))} />
              </div>
            </div>
            <Button onClick={handleAdd} disabled={addPart.isPending} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Añadir pieza
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
