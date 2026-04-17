import { useState, useMemo } from "react";
import { generatePdf, generatePdfWithLogo, type PdfLine, type PdfSettings } from "@/lib/pdf-utils";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Loader2, FileText, Plus, CheckCircle, XCircle, Trash2, Search, ArrowRight } from "lucide-react";
import { useQuotes, useCreateQuote, useUpdateQuoteStatus, useDeleteQuote, type Quote } from "@/hooks/useQuotes";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { usePartsCatalog, type PartsCatalogItem } from "@/hooks/usePartsCatalog";
import { useCreateAppointment } from "@/hooks/useAppointments";
import { SERVICES, getEstimatedMinutes, formatDuration } from "@/lib/serviceEstimates";
import { format } from "date-fns";


const db = supabase as any;

const statusStyles: Record<string, string> = {
  pendiente: "bg-warning/15 text-warning border-warning/30",
  aceptado: "bg-success/15 text-success border-success/30",
  rechazado: "bg-destructive/15 text-destructive border-destructive/30",
};

const statusLabels: Record<string, string> = {
  pendiente: "Pendiente",
  aceptado: "Aceptado",
  rechazado: "Rechazado",
};

interface PartLine {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  line_type: string;
}

const Quotes = () => {
  const { data: quotes, isLoading } = useQuotes();
  const { data: settings } = useCompanySettings();
  const { data: catalog } = usePartsCatalog();
  const createQuote = useCreateQuote();
  const updateStatus = useUpdateQuoteStatus();
  const deleteQuote = useDeleteQuote();
  const createAppointment = useCreateAppointment();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCatalog, setShowCatalog] = useState(false);

  const [form, setForm] = useState({
    client_name: "",
    license_plate: "",
    service: "",
    brand: "",
    model: "",
    phone: "",
    notes: "",
    estimated_hours: "1",
  });
  const [lines, setLines] = useState<PartLine[]>([]);
  const [partForm, setPartForm] = useState({ name: "", quantity: "1", unit_price: "0" });

  const laborRate = settings?.labor_rate ?? 35;
  const taxRate = settings?.default_vat ?? 21;

  const laborCost = Number(form.estimated_hours) * laborRate;
  const partsTotal = lines.reduce((sum, l) => sum + l.total, 0);
  const subtotal = laborCost + partsTotal;
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;

  const filteredCatalog = useMemo(() => {
    if (!searchTerm.trim() || !catalog?.length) return [];
    const term = searchTerm.toLowerCase();
    return catalog.filter(
      (item) => item.name.toLowerCase().includes(term) || item.ref.toLowerCase().includes(term)
    ).slice(0, 6);
  }, [catalog, searchTerm]);

  const handleSelectCatalogItem = (item: PartsCatalogItem) => {
    setPartForm({ name: item.name, quantity: "1", unit_price: String(item.price) });
    setSearchTerm("");
    setShowCatalog(false);
  };

  const addPart = () => {
    if (!partForm.name.trim()) return;
    const qty = parseInt(partForm.quantity) || 1;
    const price = parseFloat(partForm.unit_price) || 0;
    setLines((prev) => [...prev, {
      description: partForm.name,
      quantity: qty,
      unit_price: price,
      total: qty * price,
      line_type: "part",
    }]);
    setPartForm({ name: "", quantity: "1", unit_price: "0" });
  };

  const removePart = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreate = () => {
    if (!form.client_name || !form.service) return;

    const allLines = [...lines];
    if (laborCost > 0) {
      allLines.push({
        description: `Mano de obra (${form.estimated_hours}h × ${laborRate}€/h)`,
        quantity: Number(form.estimated_hours),
        unit_price: laborRate,
        total: laborCost,
        line_type: "labor",
      });
    }

    createQuote.mutate({
      client_name: form.client_name,
      license_plate: form.license_plate.toUpperCase(),
      service: form.service,
      brand: form.brand || null,
      model: form.model || null,
      phone: form.phone || null,
      notes: form.notes || null,
      estimated_hours: Number(form.estimated_hours),
      labor_rate: laborRate,
      tax_rate: taxRate,
      lines: allLines,
    }, {
      onSuccess: () => {
        setDialogOpen(false);
        setForm({ client_name: "", license_plate: "", service: "", brand: "", model: "", phone: "", notes: "", estimated_hours: "1" });
        setLines([]);
      },
    });
  };

  const handleAccept = (quote: Quote) => {
    updateStatus.mutate({ id: quote.id, status: "aceptado" });
    // Create appointment/work order from accepted quote
    createAppointment.mutate({
      client_name: quote.client_name,
      license_plate: quote.license_plate,
      service: quote.service,
      brand: quote.brand,
      model: quote.model,
      phone: quote.phone,
      date: format(new Date(), "yyyy-MM-dd"),
      time_slot: "09:00",
      status: "recepcionado",
      notes: `Desde presupuesto. ${quote.notes || ""}`.trim(),
      created_by: "presupuesto",
    });
  };

  const handleDownloadPdf = async (quote: Quote) => {
    const { data: quoteLines } = await db
      .from("quote_lines")
      .select("*")
      .eq("quote_id", quote.id)
      .order("created_at", { ascending: true });

    const fetchedLines = (quoteLines ?? []) as Array<{
      description: string;
      quantity: number;
      unit_price: number;
      total: number;
      line_type: string;
    }>;

    const pdfLines: PdfLine[] = fetchedLines.map((l) => ({
      description: l.description || "Concepto",
      quantity: Number(l.quantity ?? 1),
      unit_price: Number(l.unit_price ?? 0),
      total: Number(l.total ?? 0),
      line_type: l.line_type === "labor" ? "labor" : "part",
      discount_percent: 0,
    }));

    const vehicleInfo = [quote.brand, quote.model].filter(Boolean).join(" ");

    await generatePdfWithLogo({
      title: "PRESUPUESTO",
      date: format(new Date(quote.created_at), "dd/MM/yyyy"),
      filename: `presupuesto-${quote.client_name.replace(/\s+/g, "_")}.pdf`,
      clientName: quote.client_name,
      licensePlate: quote.license_plate,
      service: quote.service,
      vehicleInfo: vehicleInfo || undefined,
      clientPhone: quote.phone || undefined,
      comment: quote.notes || undefined,
      extraHeaderRight: `Estado: ${statusLabels[quote.status] ?? quote.status}`,
      lines: pdfLines,
      taxRate: Number(quote.tax_rate ?? 21),
    }, { ...(settings ?? {}), logo_url: settings?.logo_url ?? undefined });
  };

  return (
    <DashboardLayout title="Presupuestos" subtitle="Genera y gestiona presupuestos para tus clientes">
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo presupuesto
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !quotes?.length ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/40" />
            <p className="mt-3 text-sm font-medium text-muted-foreground">No hay presupuestos todavía</p>
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Fecha</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Matrícula</TableHead>
                      <TableHead>Servicio</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quotes.map((q) => (
                      <TableRow key={q.id} className="hover:bg-accent/50">
                        <TableCell className="text-xs">{format(new Date(q.created_at), "dd/MM/yyyy")}</TableCell>
                        <TableCell className="font-medium">{q.client_name}</TableCell>
                        <TableCell className="font-mono text-xs">{q.license_plate}</TableCell>
                        <TableCell className="text-xs">{q.service}</TableCell>
                        <TableCell className="text-right font-mono font-semibold">{Number(q.total).toFixed(2)}€</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusStyles[q.status] ?? ""}>
                            {statusLabels[q.status] ?? q.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {q.status === "pendiente" && (
                              <>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-success" onClick={() => handleAccept(q)} title="Aceptar">
                                  <CheckCircle className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => updateStatus.mutate({ id: q.id, status: "rechazado" })} title="Rechazar">
                                  <XCircle className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownloadPdf(q)} title="Descargar PDF">
                              <FileText className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteQuote.mutate(q.id)} title="Eliminar">
                              <Trash2 className="h-3.5 w-3.5" />
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

      {/* Create Quote Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Nuevo Presupuesto</DialogTitle>
            <DialogDescription>Genera un presupuesto detallado para el cliente</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Input placeholder="Nombre del cliente" value={form.client_name} onChange={(e) => setForm(f => ({ ...f, client_name: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input placeholder="612345678" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Matrícula</Label>
                <Input placeholder="1234ABC" value={form.license_plate} onChange={(e) => setForm(f => ({ ...f, license_plate: e.target.value.toUpperCase() }))} required />
              </div>
              <div className="space-y-2">
                <Label>Marca</Label>
                <Input placeholder="Volkswagen" value={form.brand} onChange={(e) => setForm(f => ({ ...f, brand: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Modelo</Label>
                <Input placeholder="Golf" value={form.model} onChange={(e) => setForm(f => ({ ...f, model: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Servicio</Label>
                <Select value={form.service} onValueChange={(v) => setForm(f => ({ ...f, service: v, estimated_hours: String((getEstimatedMinutes(v) / 60).toFixed(1)) }))}>
                  <SelectTrigger><SelectValue placeholder="Selecciona servicio" /></SelectTrigger>
                  <SelectContent>
                    {SERVICES.map(s => <SelectItem key={s} value={s}>{s} ({formatDuration(getEstimatedMinutes(s))})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Horas estimadas</Label>
                <Input type="number" min="0" step="0.5" value={form.estimated_hours} onChange={(e) => setForm(f => ({ ...f, estimated_hours: e.target.value }))} />
                <p className="text-[10px] text-muted-foreground">Tarifa: {laborRate}€/h → {laborCost.toFixed(2)}€</p>
              </div>
            </div>

            {/* Parts section */}
            <div className="space-y-2">
              <Label className="font-semibold">Piezas</Label>
              
              {/* Catalog search */}
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

              <div className="grid gap-2 sm:grid-cols-4 items-end">
                <div className="sm:col-span-2">
                  <Input placeholder="Nombre pieza" value={partForm.name} onChange={(e) => setPartForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <Input type="number" min="1" placeholder="Cant." value={partForm.quantity} onChange={(e) => setPartForm(f => ({ ...f, quantity: e.target.value }))} />
                <div className="flex gap-2">
                  <Input type="number" min="0" step="0.01" placeholder="€/ud" value={partForm.unit_price} onChange={(e) => setPartForm(f => ({ ...f, unit_price: e.target.value }))} />
                  <Button type="button" size="icon" variant="outline" onClick={addPart}><Plus className="h-4 w-4" /></Button>
                </div>
              </div>

              {lines.length > 0 && (
                <div className="space-y-1 mt-2">
                  {lines.map((line, i) => (
                    <div key={i} className="flex items-center gap-2 rounded bg-secondary/50 px-2 py-1 text-sm">
                      <span className="flex-1 truncate">{line.description}</span>
                      <span className="text-xs text-muted-foreground">x{line.quantity}</span>
                      <span className="font-mono text-xs">{line.total.toFixed(2)}€</span>
                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => removePart(i)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Textarea placeholder="Notas adicionales..." value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />

            {/* Totals */}
            <div className="rounded-lg border bg-secondary/50 p-3 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Mano de obra</span><span>{laborCost.toFixed(2)}€</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Piezas</span><span>{partsTotal.toFixed(2)}€</span></div>
              <div className="flex justify-between text-muted-foreground"><span>IVA ({taxRate}%)</span><span>{tax.toFixed(2)}€</span></div>
              <div className="flex justify-between font-bold text-base border-t border-border pt-1 mt-1">
                <span>Total</span><span>{total.toFixed(2)}€</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={createQuote.isPending}>
              {createQuote.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
              Crear presupuesto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Quotes;
