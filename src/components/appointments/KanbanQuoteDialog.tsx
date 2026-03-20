import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Loader2, Plus, Search, Trash2, FileText } from "lucide-react";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { usePartsCatalog, type PartsCatalogItem } from "@/hooks/usePartsCatalog";
import { useCreateQuote } from "@/hooks/useQuotes";
import { SERVICES, getEstimatedMinutes, formatDuration } from "@/lib/serviceEstimates";
import { supabase } from "@/integrations/supabase/client";
import type { Appointment } from "@/hooks/useAppointments";

interface PartLine {
  description: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  total: number;
  line_type: string;
}

interface KanbanQuoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Appointment | null;
  workOrderId?: string | null;
}

export function KanbanQuoteDialog({ open, onOpenChange, appointment, workOrderId }: KanbanQuoteDialogProps) {
  const { data: settings } = useCompanySettings();
  const { data: catalog } = usePartsCatalog();
  const createQuote = useCreateQuote();

  const [estimatedHours, setEstimatedHours] = useState("1");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<PartLine[]>([]);
  const [partForm, setPartForm] = useState({ name: "", quantity: "1", unit_price: "0", discount: "0" });
  const [searchTerm, setSearchTerm] = useState("");
  const [showCatalog, setShowCatalog] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const laborRate = settings?.labor_rate ?? 35;
  const taxRate = settings?.default_vat ?? 21;

  // Separate parts and labor lines
  const partLines = lines.filter(l => l.line_type !== "labor" && l.line_type !== "mano_obra");
  const laborLines = lines.filter(l => l.line_type === "labor" || l.line_type === "mano_obra");

  const laborCost = laborLines.reduce((sum, l) => sum + l.total, 0) || Number(estimatedHours) * laborRate;
  const partsTotal = partLines.reduce((sum, l) => sum + l.total, 0);
  const subtotal = (laborLines.length > 0 ? laborLines.reduce((s, l) => s + l.total, 0) : Number(estimatedHours) * laborRate) + partsTotal;
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;

  // Fetch work_order_items when dialog opens
  useEffect(() => {
    if (!open || !workOrderId || loaded) return;

    const fetchItems = async () => {
      const { data, error } = await (supabase as any)
        .from("work_order_items")
        .select("*")
        .eq("work_order_id", workOrderId);

      if (error || !data?.length) {
        setLoaded(true);
        return;
      }

      const fetchedLines: PartLine[] = [];
      let totalLaborHours = 0;

      data.forEach((item: any) => {
        const desc = item.description ?? item.descripcion ?? "Concepto";
        const qty = Number(item.quantity ?? item.cantidad ?? 1);
        const price = Number(item.unit_price ?? item.precio_unitario ?? 0);
        const discPct = Number(item.discount_percent ?? item.descuento ?? 0);
        const lineTotal = Number(item.total ?? 0);
        const itemType = item.item_type ?? item.tipo ?? "pieza";

        if (itemType === "mano_obra") {
          totalLaborHours += qty;
        }

        fetchedLines.push({
          description: desc,
          quantity: qty,
          unit_price: price,
          discount_percent: discPct,
          total: lineTotal,
          line_type: itemType === "mano_obra" ? "labor" : "part",
        });
      });

      setLines(fetchedLines);
      if (totalLaborHours > 0) {
        setEstimatedHours(String(totalLaborHours));
      }
      setLoaded(true);
    };

    fetchItems();
  }, [open, workOrderId, loaded]);

  const filteredCatalog = useMemo(() => {
    if (!searchTerm.trim() || !catalog?.length) return [];
    const term = searchTerm.toLowerCase();
    return catalog.filter(
      (item) => item.name.toLowerCase().includes(term) || item.ref.toLowerCase().includes(term)
    ).slice(0, 6);
  }, [catalog, searchTerm]);

  const handleSelectCatalogItem = (item: PartsCatalogItem) => {
    setPartForm({ name: item.name, quantity: "1", unit_price: String(item.price), discount: "0" });
    setSearchTerm("");
    setShowCatalog(false);
  };

  const addPart = () => {
    if (!partForm.name.trim()) return;
    const qty = parseInt(partForm.quantity) || 1;
    const price = parseFloat(partForm.unit_price) || 0;
    const discPct = parseFloat(partForm.discount) || 0;
    const gross = qty * price;
    const lineTotal = Number((gross * (1 - discPct / 100)).toFixed(2));
    setLines((prev) => [...prev, {
      description: partForm.name,
      quantity: qty,
      unit_price: price,
      discount_percent: discPct,
      total: lineTotal,
      line_type: "part",
    }]);
    setPartForm({ name: "", quantity: "1", unit_price: "0", discount: "0" });
  };

  const removePart = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreate = () => {
    if (!appointment) return;

    // Build final lines: use parts from state, recalculate labor
    const finalLines = partLines.map(l => ({
      description: l.description,
      quantity: l.quantity,
      unit_price: l.unit_price,
      total: l.total,
      line_type: "part",
    }));

    // Add labor as single line
    const hrs = Number(estimatedHours) || 0;
    if (hrs > 0) {
      finalLines.push({
        description: `Mano de obra (${hrs}h × ${laborRate}€/h)`,
        quantity: hrs,
        unit_price: laborRate,
        total: hrs * laborRate,
        line_type: "labor",
      });
    }

    createQuote.mutate({
      appointment_id: appointment.id,
      client_name: appointment.client_name,
      license_plate: appointment.license_plate,
      service: appointment.service,
      brand: appointment.brand || null,
      model: appointment.model || null,
      phone: appointment.phone || null,
      notes: notes || null,
      estimated_hours: hrs,
      labor_rate: laborRate,
      tax_rate: taxRate,
      status: "esperando_cliente",
      lines: finalLines,
    }, {
      onSuccess: () => {
        onOpenChange(false);
        resetState();
      },
    });
  };

  const resetState = () => {
    setLines([]);
    setEstimatedHours("1");
    setNotes("");
    setPartForm({ name: "", quantity: "1", unit_price: "0", discount: "0" });
    setSearchTerm("");
    setShowCatalog(false);
    setLoaded(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && appointment) {
      const mins = getEstimatedMinutes(appointment.service);
      setEstimatedHours(String((mins / 60).toFixed(1)));
      setNotes(appointment.notes || "");
      setLines([]);
      setPartForm({ name: "", quantity: "1", unit_price: "0", discount: "0" });
      setSearchTerm("");
      setShowCatalog(false);
      setLoaded(false);
    }
    onOpenChange(isOpen);
  };

  if (!appointment) return null;

  // Recalc display totals from current state
  const displayLaborCost = Number(estimatedHours) * laborRate;
  const displayPartsTotal = partLines.reduce((sum, l) => sum + l.total, 0);
  const displaySubtotal = displayLaborCost + displayPartsTotal;
  const displayTax = displaySubtotal * (taxRate / 100);
  const displayTotal = displaySubtotal + displayTax;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Generar Presupuesto</DialogTitle>
          <DialogDescription>
            {appointment.client_name} — {appointment.license_plate} — {appointment.service}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Horas estimadas</Label>
              <Input type="number" min="0" step="0.5" value={estimatedHours} onChange={(e) => setEstimatedHours(e.target.value)} />
              <p className="text-[10px] text-muted-foreground">Tarifa: {laborRate}€/h → {displayLaborCost.toFixed(2)}€</p>
            </div>
            <div className="space-y-2">
              <Label>IVA</Label>
              <Input type="number" value={String(taxRate)} disabled className="bg-muted" />
            </div>
          </div>

          {/* Existing items from work order */}
          {partLines.length > 0 && (
            <div className="space-y-2">
              <Label className="font-semibold">Piezas de la orden</Label>
              <div className="space-y-1">
                {partLines.map((line, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm">
                    <span className="flex-1 truncate">{line.description}</span>
                    <span className="text-xs text-muted-foreground">x{line.quantity}</span>
                    {line.discount_percent > 0 && (
                      <span className="text-xs text-destructive line-through">{(line.quantity * line.unit_price).toFixed(2)}€</span>
                    )}
                    {line.discount_percent > 0 && (
                      <span className="text-xs text-orange-400">-{line.discount_percent}%</span>
                    )}
                    <span className="font-mono text-xs font-semibold">{line.total.toFixed(2)}€</span>
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => removePart(i)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add more parts */}
          <div className="space-y-2">
            <Label className="font-semibold">Añadir pieza</Label>
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar en catálogo..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setShowCatalog(true); }}
                  onFocus={() => setShowCatalog(true)}
                />
              </div>
              {showCatalog && filteredCatalog.length > 0 && (
                <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-40 overflow-y-auto">
                  {filteredCatalog.map((item) => (
                    <button key={item.id} type="button" className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-accent text-left" onClick={() => handleSelectCatalogItem(item)}>
                      <span>{item.name} <span className="text-xs text-muted-foreground">Ref: {item.ref}</span></span>
                      <span className="font-mono text-xs font-semibold">{item.price.toFixed(2)}€</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-2 grid-cols-5 items-end">
              <div className="col-span-2">
                <Input placeholder="Nombre pieza" value={partForm.name} onChange={(e) => setPartForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <Input type="number" min="1" placeholder="Cant." value={partForm.quantity} onChange={(e) => setPartForm(f => ({ ...f, quantity: e.target.value }))} />
              <Input type="number" min="0" step="0.01" placeholder="€/ud" value={partForm.unit_price} onChange={(e) => setPartForm(f => ({ ...f, unit_price: e.target.value }))} />
              <div className="flex gap-1">
                <Input type="number" min="0" max="100" placeholder="Dto.%" value={partForm.discount} onChange={(e) => setPartForm(f => ({ ...f, discount: e.target.value }))} className="w-16" />
                <Button type="button" size="icon" variant="outline" onClick={addPart}><Plus className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>

          <Textarea placeholder="Notas adicionales..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />

          {/* Totals */}
          <div className="rounded-xl border bg-muted/30 p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mano de obra ({estimatedHours}h × {laborRate}€)</span>
              <span className="font-mono">{displayLaborCost.toFixed(2)}€</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Piezas</span>
              <span className="font-mono">{displayPartsTotal.toFixed(2)}€</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>IVA ({taxRate}%)</span>
              <span className="font-mono">{displayTax.toFixed(2)}€</span>
            </div>
            <div className="flex justify-between font-bold text-lg border-t border-border pt-2 mt-2">
              <span>Total</span>
              <span className="font-mono text-primary">{displayTotal.toFixed(2)}€</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleCreate} disabled={createQuote.isPending}>
            {createQuote.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
            Crear presupuesto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
