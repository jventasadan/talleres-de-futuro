import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { Trash2 } from "lucide-react";

interface WorkOrderItem {
  description?: string;
  descripcion?: string;
  quantity?: number;
  cantidad?: number;
  unit_price?: number;
  precio_unitario?: number;
  discount_percent?: number;
  descuento?: number;
  total?: number;
  item_type?: string;
  tipo?: string;
}

interface LaborDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partsTotal: number;
  autoHours?: number | null;
  items?: WorkOrderItem[];
  onConfirm: (laborCost: number, discount: number, hours: number, comment: string) => void;
  clientName?: string;
  licensePlate?: string;
  brand?: string | null;
  model?: string | null;
  service?: string;
}

export function LaborDialog({ open, onOpenChange, partsTotal, autoHours, items = [], onConfirm }: LaborDialogProps) {
  const [hours, setHours] = useState(autoHours ? String(autoHours) : "1");
  const [discount, setDiscount] = useState("0");
  const [comment, setComment] = useState("");
  const { data: settings } = useCompanySettings();

  const laborRate = settings?.labor_rate ?? 35;
  const vatRate = settings?.default_vat ?? 21;

  // Separate items by type
  const partItems = items.filter(i => (i.item_type ?? i.tipo ?? "pieza") !== "mano_obra");
  const laborItems = items.filter(i => (i.item_type ?? i.tipo ?? "pieza") === "mano_obra");

  // Calculate from items
  const itemsPartsTotal = partItems.reduce((s, i) => s + Number(i.total ?? 0), 0);
  const itemsLaborTotal = laborItems.reduce((s, i) => s + Number(i.total ?? 0), 0);

  // Extra labor from dialog hours (only if greater than what's already in items)
  const dialogLaborCost = Number(hours) * laborRate;
  const extraLabor = Math.max(0, dialogLaborCost - itemsLaborTotal);
  const totalLabor = itemsLaborTotal + extraLabor;

  const subtotal = itemsPartsTotal + totalLabor;
  const discountAmount = subtotal * (Number(discount) / 100);
  const beforeTax = subtotal - discountAmount;
  const tax = beforeTax * (vatRate / 100);
  const total = beforeTax + tax;

  const handleConfirm = () => {
    onConfirm(dialogLaborCost, Number(discount), Number(hours), comment);
    onOpenChange(false);
  };

  const getDesc = (item: WorkOrderItem) => item.description ?? item.descripcion ?? "Concepto";
  const getQty = (item: WorkOrderItem) => Number(item.quantity ?? item.cantidad ?? 1);
  const getPrice = (item: WorkOrderItem) => Number(item.unit_price ?? item.precio_unitario ?? 0);
  const getDisc = (item: WorkOrderItem) => Number(item.discount_percent ?? item.descuento ?? 0);
  const getTotal = (item: WorkOrderItem) => Number(item.total ?? 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Generar Factura</DialogTitle>
          <DialogDescription>Revisa los conceptos de la orden antes de facturar</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Work order items */}
          {partItems.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Piezas</Label>
              <div className="space-y-1">
                {partItems.map((item, idx) => {
                  const disc = getDisc(item);
                  return (
                    <div key={idx} className="flex items-center justify-between rounded-md border bg-secondary/30 px-3 py-2 text-sm">
                      <span className="flex-1 truncate font-medium">{getDesc(item)}</span>
                      <div className="flex items-center gap-2 text-muted-foreground ml-2 shrink-0">
                        <span>x{getQty(item)}</span>
                        {disc > 0 ? (
                          <>
                            <span className="line-through">{getPrice(item).toFixed(2)}€</span>
                            <span className="text-destructive">-{disc}%</span>
                          </>
                        ) : null}
                        <span className="font-semibold text-foreground">{getTotal(item).toFixed(2)}€</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {laborItems.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mano de obra (items)</Label>
              <div className="space-y-1">
                {laborItems.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-md border bg-secondary/30 px-3 py-2 text-sm">
                    <span className="flex-1 truncate font-medium">{getDesc(item)}</span>
                    <div className="flex items-center gap-2 text-muted-foreground ml-2 shrink-0">
                      <span>x{getQty(item)}</span>
                      <span className="font-semibold text-foreground">{getTotal(item).toFixed(2)}€</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {items.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">No hay conceptos en la orden</p>
          )}

          {/* Labor hours & discount */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Horas de mano de obra</Label>
              <Input type="number" min="0" step="0.5" value={hours} onChange={(e) => setHours(e.target.value)} />
              <p className="text-[10px] text-muted-foreground">Tarifa: {laborRate}€/h</p>
              {autoHours != null && autoHours > 0 && (
                <p className="text-[10px] text-primary">Tiempo auto: {autoHours.toFixed(2)}h</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Descuento (%)</Label>
              <Input type="number" min="0" max="100" value={discount} onChange={(e) => setDiscount(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Comentario adicional</Label>
            <Textarea
              placeholder="Recomendaciones, garantía, observaciones..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
            />
          </div>

          {/* Totals summary */}
          <div className="rounded-lg border bg-secondary/50 p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Piezas</span>
              <span>{itemsPartsTotal.toFixed(2)}€</span>
            </div>
            {itemsLaborTotal > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mano de obra (items)</span>
                <span>{itemsLaborTotal.toFixed(2)}€</span>
              </div>
            )}
            {extraLabor > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mano de obra extra ({hours}h × {laborRate}€)</span>
                <span>{extraLabor.toFixed(2)}€</span>
              </div>
            )}
            {Number(discount) > 0 && (
              <div className="flex justify-between text-destructive">
                <span>Descuento ({discount}%)</span>
                <span>-{discountAmount.toFixed(2)}€</span>
              </div>
            )}
            <div className="flex justify-between text-muted-foreground">
              <span>IVA ({vatRate}%)</span>
              <span>{tax.toFixed(2)}€</span>
            </div>
            <div className="flex justify-between font-bold text-base border-t border-border pt-1 mt-1">
              <span>Total</span>
              <span>{total.toFixed(2)}€</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleConfirm}>Generar factura</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
