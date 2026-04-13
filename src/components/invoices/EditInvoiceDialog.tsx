import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Invoice } from "@/hooks/useInvoices";

const db = supabase as any;

interface EditableLine {
  description: string;
  quantity: number;
  unit_price: number;
  line_type: string;
}

interface EditInvoiceDialogProps {
  invoice: Invoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditInvoiceDialog({ invoice, open, onOpenChange }: EditInvoiceDialogProps) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [loadingLines, setLoadingLines] = useState(false);

  const [clientName, setClientName] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [service, setService] = useState("");
  const [lines, setLines] = useState<EditableLine[]>([]);

  useEffect(() => {
    if (!invoice || !open) return;
    setClientName(invoice.client_name);
    setLicensePlate(invoice.license_plate);
    setService(invoice.service);
    loadLines(invoice.id);
  }, [invoice, open]);

  const loadLines = async (invoiceId: string) => {
    setLoadingLines(true);

    try {
      const { data, error } = await db
        .from("invoice_lines")
        .select("id, description, quantity, unit_price, line_type")
        .eq("invoice_id", invoiceId);

      if (error) throw error;

      if (data?.length) {
        setLines(data.map((l: any) => ({
          description: l.description ?? "",
          quantity: Number(l.quantity ?? 1),
          unit_price: Number(l.unit_price ?? 0),
          line_type: l.line_type ?? "part",
        })));
      } else {
        setLines([{ description: "", quantity: 1, unit_price: 0, line_type: "part" }]);
      }
    } catch {
      setLines([{ description: "", quantity: 1, unit_price: 0, line_type: "part" }]);
    } finally {
      setLoadingLines(false);
    }
  };

  const updateLine = (idx: number, field: keyof EditableLine, value: string | number) => {
    setLines((prev) => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  };

  const removeLine = (idx: number) => {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const addLine = () => {
    setLines((prev) => [...prev, { description: "", quantity: 1, unit_price: 0, line_type: "part" }]);
  };

  const computeTotals = () => {
    let partsTotal = 0;
    let laborCost = 0;
    for (const l of lines) {
      const lineTotal = l.quantity * l.unit_price;
      if (l.line_type === "labor") {
        laborCost += lineTotal;
      } else {
        partsTotal += lineTotal;
      }
    }
    const subtotal = partsTotal + laborCost;
    const taxRate = Number(invoice?.tax_rate ?? 21);
    const total = subtotal * (1 + taxRate / 100);
    return { partsTotal, laborCost, total };
  };

  const handleSave = async () => {
    if (!invoice) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id ?? "";
      const { partsTotal, laborCost, total } = computeTotals();

      // Update invoice header
      const { error: invErr } = await db
        .from("invoices")
        .update({
          client_name: clientName,
          license_plate: licensePlate,
          service,
          parts_total: partsTotal,
          labor_cost: laborCost,
          total,
        })
        .eq("id", invoice.id);
      if (invErr) throw invErr;

      // Delete old lines
      const { error: delErr } = await db
        .from("invoice_lines")
        .delete()
        .eq("invoice_id", invoice.id);
      if (delErr) throw delErr;

      // Insert new lines
      if (lines.length > 0) {
        const rows = lines.map((l) => ({
          invoice_id: invoice.id,
          user_id: userId,
          description: l.description,
          quantity: l.quantity,
          unit_price: l.unit_price,
          total: l.quantity * l.unit_price,
          line_type: l.line_type,
          workshop_id: invoice.workshop_id,
        }));
        const { error: insErr } = await db.from("invoice_lines").insert(rows);
        if (insErr) throw insErr;
      }

      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoice_lines"] });
      toast.success("Factura actualizada correctamente");
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Error al guardar: " + (err?.message ?? "Error desconocido"));
    } finally {
      setSaving(false);
    }
  };

  const { partsTotal, laborCost, total } = computeTotals();
  const subtotal = partsTotal + laborCost;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Factura {invoice?.invoice_number}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label>Cliente</Label>
              <Input value={clientName} onChange={(e) => setClientName(e.target.value)} />
            </div>
            <div>
              <Label>Matrícula</Label>
              <Input value={licensePlate} onChange={(e) => setLicensePlate(e.target.value)} />
            </div>
            <div>
              <Label>Servicio</Label>
              <Input value={service} onChange={(e) => setService(e.target.value)} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-semibold">Líneas de factura</Label>
              <Button variant="outline" size="sm" onClick={addLine}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Añadir línea
              </Button>
            </div>

            {loadingLines ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_70px_90px_70px_36px] gap-2 text-xs font-medium text-muted-foreground px-1">
                  <span>Descripción</span>
                  <span>Cant.</span>
                  <span>P. Unit.</span>
                  <span>Total</span>
                  <span />
                </div>
                {lines.map((line, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_70px_90px_70px_36px] gap-2 items-center">
                    <Input
                      value={line.description}
                      onChange={(e) => updateLine(idx, "description", e.target.value)}
                      placeholder="Concepto"
                      className="text-sm"
                    />
                    <Input
                      type="number"
                      min={0}
                      value={line.quantity}
                      onChange={(e) => updateLine(idx, "quantity", Number(e.target.value))}
                      className="text-sm"
                    />
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={line.unit_price}
                      onChange={(e) => updateLine(idx, "unit_price", Number(e.target.value))}
                      className="text-sm"
                    />
                    <span className="text-sm font-mono text-right pr-1">
                      {(line.quantity * line.unit_price).toFixed(2)}
                    </span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeLine(idx)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t pt-3 space-y-1 text-sm text-right">
            <p>Piezas: <span className="font-mono font-semibold">{partsTotal.toFixed(2)} €</span></p>
            <p>Mano de obra: <span className="font-mono font-semibold">{laborCost.toFixed(2)} €</span></p>
            <p>Subtotal: <span className="font-mono font-semibold">{subtotal.toFixed(2)} €</span></p>
            <p>IVA ({invoice?.tax_rate ?? 21}%): <span className="font-mono font-semibold">{(subtotal * (Number(invoice?.tax_rate ?? 21) / 100)).toFixed(2)} €</span></p>
            <p className="text-base font-bold">Total: <span className="font-mono">{total.toFixed(2)} €</span></p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Guardar cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
