import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { useCompanySettings } from "@/hooks/useCompanySettings";

interface LaborDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partsTotal: number;
  autoHours?: number | null;
  onConfirm: (laborCost: number, discount: number, hours: number) => void;
}

export function LaborDialog({ open, onOpenChange, partsTotal, autoHours, onConfirm }: LaborDialogProps) {
  const [hours, setHours] = useState(autoHours ? String(autoHours) : "1");
  const [discount, setDiscount] = useState("0");
  const { data: settings } = useCompanySettings();

  const laborRate = settings?.labor_rate ?? 35;
  const vatRate = settings?.default_vat ?? 21;
  const laborCost = Number(hours) * laborRate;
  const subtotal = partsTotal + laborCost;
  const discountAmount = subtotal * (Number(discount) / 100);
  const beforeTax = subtotal - discountAmount;
  const tax = beforeTax * (vatRate / 100);
  const total = beforeTax + tax;

  const handleConfirm = () => {
    onConfirm(laborCost, Number(discount), Number(hours));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Generar Factura</DialogTitle>
          <DialogDescription>Introduce las horas de mano de obra y descuento</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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

          <div className="rounded-lg border bg-secondary/50 p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Piezas</span>
              <span>{partsTotal.toFixed(2)}€</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mano de obra ({hours}h × {laborRate}€)</span>
              <span>{laborCost.toFixed(2)}€</span>
            </div>
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
