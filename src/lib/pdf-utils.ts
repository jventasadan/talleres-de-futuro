import { jsPDF } from "jspdf";

export interface PdfSettings {
  company_name?: string;
  cif?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  province?: string;
  phone?: string;
  email?: string;
  labor_rate?: number;
  default_vat?: number;
  logo_url?: string;
}

export interface PdfLine {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  line_type: "part" | "labor" | "discount";
  discount_percent?: number;
}

export interface PdfDocumentData {
  title: string;          // "FACTURA F-2024-001" o "PRESUPUESTO"
  date: string;           // fecha formateada para mostrar
  filename: string;       // nombre del fichero descargado
  clientName: string;
  licensePlate: string;
  service: string;
  vehicleInfo?: string;   // "Toyota Corolla"
  vehicleKm?: string;
  clientPhone?: string;
  clientEmail?: string;
  comment?: string;
  extraHeaderRight?: string; // texto opcional arriba a la derecha (ej: estado del presupuesto)
  lines: PdfLine[];
  taxRate: number;
}

const safeStr = (value: unknown, fallback = ""): string =>
  String(value ?? fallback)
    .replace(/[\r\n]+/g, " ")
    .trim() || fallback;

export function buildPdfHeader(settings: PdfSettings) {
  return {
    name: safeStr(settings?.company_name, "Mi Taller"),
    cif: safeStr(settings?.cif, ""),
    address: safeStr(
      [settings?.address, settings?.city, settings?.postal_code, settings?.province]
        .filter(Boolean)
        .join(", "),
      ""
    ),
    phone: safeStr(settings?.phone, ""),
    email: safeStr(settings?.email, ""),
  };
}

export function generatePdf(data: PdfDocumentData, settings: PdfSettings): void {
  const { name: wName, cif: wCif, address: wAddress, phone: wPhone, email: wEmail } =
    buildPdfHeader(settings);

  const partLines = data.lines.filter((l) => l.line_type === "part");
  const laborLines = data.lines.filter((l) => l.line_type === "labor");
  const discountLines = data.lines.filter((l) => l.line_type === "discount");
  const tableLines = data.lines.filter((l) => l.line_type !== "discount");

  const partsNet = partLines.reduce((s, l) => s + Number(l.total ?? 0), 0);
  const laborNet = laborLines.reduce((s, l) => s + Number(l.total ?? 0), 0);
  const globalDiscount = Math.abs(discountLines.reduce((s, l) => s + Number(l.total ?? 0), 0));

  const taxableBase = Number((partsNet + laborNet - globalDiscount).toFixed(2));
  const taxAmount = Number(((taxableBase * data.taxRate) / 100).toFixed(2));
  const displayTotal = Number((taxableBase + taxAmount).toFixed(2));

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // ── Cabecera verde ──
  doc.setFillColor(34, 197, 94);
  doc.rect(0, 0, pageWidth, 40, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text(wName, margin, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(220, 255, 220);
  doc.text(
    [wCif ? `CIF: ${wCif}` : "", wPhone ? `Tlf: ${wPhone}` : "", wEmail]
      .filter(Boolean)
      .join(" | "),
    margin,
    27
  );
  if (wAddress) doc.text(wAddress, margin, 33);

  y = 50;

  // ── Título del documento ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(30, 30, 30);
  doc.text(data.title, margin, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Fecha: ${data.date}`, margin, y);
  if (data.extraHeaderRight) {
    doc.text(data.extraHeaderRight, margin + 100, y);
  }
  y += 12;

  // ── Caja de datos del cliente ──
  const hasVehicleInfo = !!data.vehicleInfo;
  const hasKm = !!data.vehicleKm;
  const hasContact = !!(data.clientPhone || data.clientEmail);
  const hasComment = !!data.comment;

  let clientBoxLines = 3;
  if (hasVehicleInfo) clientBoxLines += 1;
  if (hasKm) clientBoxLines += 1;
  if (hasContact) clientBoxLines += 1;
  if (hasComment) clientBoxLines += 2;
  const clientBoxH = 10 + clientBoxLines * 5;

  doc.setFillColor(245, 245, 245);
  doc.roundedRect(margin, y, contentWidth, clientBoxH, 3, 3, "F");
  y += 7;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  doc.text("DATOS DEL CLIENTE", margin + 5, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  doc.text(`Cliente: ${safeStr(data.clientName)}`, margin + 5, y);

  if (hasContact) {
    y += 5;
    const contactParts = [];
    if (data.clientPhone) contactParts.push(`Tlf: ${data.clientPhone}`);
    if (data.clientEmail) contactParts.push(`Email: ${data.clientEmail}`);
    doc.text(contactParts.join("  |  "), margin + 5, y);
  }

  y += 5;
  doc.text(
    `Matrícula: ${safeStr(data.licensePlate)}${data.vehicleInfo ? ` — ${data.vehicleInfo}` : ""}`,
    margin + 5,
    y
  );

  if (hasKm) {
    y += 5;
    doc.text(`Kilómetros: ${data.vehicleKm}`, margin + 5, y);
  }

  y += 5;
  doc.text(`Servicio: ${safeStr(data.service)}`, margin + 5, y);

  if (hasComment) {
    y += 7;
    doc.setFont("helvetica", "bold");
    doc.text("Comentario:", margin + 5, y);
    const commentX = margin + 28;
    const maxCommentW = contentWidth - 33;
    doc.setFont("helvetica", "normal");
    const commentLines = doc.splitTextToSize(safeStr(data.comment), maxCommentW);
    doc.text(commentLines, commentX, y);
  }

  // ── Tabla de líneas ──
  y += 15;

  const colX = {
    name: margin,
    qty: margin + contentWidth * 0.5,
    discount: margin + contentWidth * 0.6,
    price: margin + contentWidth * 0.72,
    total: margin + contentWidth * 0.87,
  };

  doc.setFillColor(34, 197, 94);
  doc.rect(margin, y - 5, contentWidth, 8, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text("DESCRIPCIÓN", colX.name + 3, y);
  doc.text("CANT.", colX.qty, y);
  doc.text("DTO.", colX.discount, y);
  doc.text("P. UNIT.", colX.price, y);
  doc.text("TOTAL", colX.total, y);

  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(50, 50, 50);

  if (!tableLines.length) {
    doc.setFontSize(9);
    doc.text("No hay conceptos añadidos", colX.name + 3, y + 1);
    y += 7;
  } else {
    tableLines.forEach((line, index) => {
      if (index % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(margin, y - 3, contentWidth, 7, "F");
      }

      const rawDesc = safeStr(line.description, "Concepto");
      const cleanDesc = rawDesc.replace(/\s*\(-?\d+(\.\d+)?%\)\s*$/, "");
      const discPct = line.discount_percent ?? 0;

      doc.setFontSize(9);
      doc.text(cleanDesc, colX.name + 3, y + 1);
      doc.text(String(Number(line.quantity ?? 1)), colX.qty + 2, y + 1);
      doc.text(discPct > 0 ? `${discPct}%` : "—", colX.discount + 1, y + 1);
      doc.text(`${Number(line.unit_price ?? 0).toFixed(2)} €`, colX.price, y + 1);
      doc.text(`${Number(line.total ?? 0).toFixed(2)} €`, colX.total, y + 1);

      y += 7;
    });
  }

  // ── Totales ──
  y += 3;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, margin + contentWidth, y);
  y += 8;

  const totalsX = margin + contentWidth * 0.62;
  const valuesX = margin + contentWidth * 0.85;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);

  doc.text("Piezas:", totalsX, y);
  doc.text(`${partsNet.toFixed(2)} €`, valuesX, y);
  y += 6;

  doc.text("Mano de obra:", totalsX, y);
  doc.text(`${laborNet.toFixed(2)} €`, valuesX, y);

  if (globalDiscount > 0) {
    y += 6;
    doc.text("Descuento:", totalsX, y);
    doc.text(`-${globalDiscount.toFixed(2)} €`, valuesX, y);
  }

  y += 6;
  doc.text(`IVA (${data.taxRate}%):`, totalsX, y);
  doc.text(`${taxAmount.toFixed(2)} €`, valuesX, y);

  y += 8;
  doc.setFillColor(34, 197, 94);
  doc.roundedRect(totalsX - 5, y - 5, contentWidth * 0.45, 12, 2, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text("TOTAL:", totalsX, y + 3);
  doc.text(`${displayTotal.toFixed(2)} €`, valuesX, y + 3);

  // ── Footer ──
  const footerY = doc.internal.pageSize.getHeight() - 20;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, footerY - 5, margin + contentWidth, footerY - 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(
    [wName, wCif ? `CIF: ${wCif}` : "", wAddress].filter(Boolean).join(" · "),
    pageWidth / 2,
    footerY,
    { align: "center" }
  );
  doc.text("Gracias por confiar en nosotros", pageWidth / 2, footerY + 5, { align: "center" });

  doc.save(data.filename);
}

// ─────────────────────────────────────────────────────────────
// Variante con logo: idéntica a generatePdf pero pinta el logo
// del taller (settings.logo_url) sobre la cabecera verde.
// Si no hay logo o falla la descarga, sigue sin error.
// ─────────────────────────────────────────────────────────────

async function fetchLogoAsBase64(
  url: string
): Promise<{ data: string; format: "PNG" | "JPEG" } | null> {
  try {
    const response = await fetch(url, { mode: "cors" });
    if (!response.ok) return null;
    const blob = await response.blob();

    const base64: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });

    const mime = (blob.type || "").toLowerCase();
    const format: "PNG" | "JPEG" =
      mime.includes("jpeg") || mime.includes("jpg") ? "JPEG" : "PNG";

    return { data: base64, format };
  } catch {
    return null;
  }
}

export async function generatePdfWithLogo(
  data: PdfDocumentData,
  settings: PdfSettings
): Promise<void> {
  const { name: wName, cif: wCif, address: wAddress, phone: wPhone, email: wEmail } =
    buildPdfHeader(settings);

  const partLines = data.lines.filter((l) => l.line_type === "part");
  const laborLines = data.lines.filter((l) => l.line_type === "labor");
  const discountLines = data.lines.filter((l) => l.line_type === "discount");
  const tableLines = data.lines.filter((l) => l.line_type !== "discount");

  const partsNet = partLines.reduce((s, l) => s + Number(l.total ?? 0), 0);
  const laborNet = laborLines.reduce((s, l) => s + Number(l.total ?? 0), 0);
  const globalDiscount = Math.abs(
    discountLines.reduce((s, l) => s + Number(l.total ?? 0), 0)
  );

  const taxableBase = Number((partsNet + laborNet - globalDiscount).toFixed(2));
  const taxAmount = Number(((taxableBase * data.taxRate) / 100).toFixed(2));
  const displayTotal = Number((taxableBase + taxAmount).toFixed(2));

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // ── Cabecera verde ──
  doc.setFillColor(34, 197, 94);
  doc.rect(0, 0, pageWidth, 40, "F");

  // ── Logo del taller (si está disponible) ──
  if (settings?.logo_url) {
    const logo = await fetchLogoAsBase64(settings.logo_url);
    if (logo) {
      try {
        doc.addImage(logo.data, logo.format, 155, 5, 30, 20);
      } catch {
        // Silenciar errores de imagen y continuar sin logo
      }
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text(wName, margin, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(220, 255, 220);
  doc.text(
    [wCif ? `CIF: ${wCif}` : "", wPhone ? `Tlf: ${wPhone}` : "", wEmail]
      .filter(Boolean)
      .join(" | "),
    margin,
    27
  );
  if (wAddress) doc.text(wAddress, margin, 33);

  y = 50;

  // ── Título del documento ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(30, 30, 30);
  doc.text(data.title, margin, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Fecha: ${data.date}`, margin, y);
  if (data.extraHeaderRight) {
    doc.text(data.extraHeaderRight, margin + 100, y);
  }
  y += 12;

  // ── Caja de datos del cliente ──
  const hasVehicleInfo = !!data.vehicleInfo;
  const hasKm = !!data.vehicleKm;
  const hasContact = !!(data.clientPhone || data.clientEmail);
  const hasComment = !!data.comment;

  let clientBoxLines = 3;
  if (hasVehicleInfo) clientBoxLines += 1;
  if (hasKm) clientBoxLines += 1;
  if (hasContact) clientBoxLines += 1;
  if (hasComment) clientBoxLines += 2;
  const clientBoxH = 10 + clientBoxLines * 5;

  doc.setFillColor(245, 245, 245);
  doc.roundedRect(margin, y, contentWidth, clientBoxH, 3, 3, "F");
  y += 7;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  doc.text("DATOS DEL CLIENTE", margin + 5, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  doc.text(`Cliente: ${safeStr(data.clientName)}`, margin + 5, y);

  if (hasContact) {
    y += 5;
    const contactParts = [];
    if (data.clientPhone) contactParts.push(`Tlf: ${data.clientPhone}`);
    if (data.clientEmail) contactParts.push(`Email: ${data.clientEmail}`);
    doc.text(contactParts.join("  |  "), margin + 5, y);
  }

  y += 5;
  doc.text(
    `Matrícula: ${safeStr(data.licensePlate)}${data.vehicleInfo ? ` — ${data.vehicleInfo}` : ""}`,
    margin + 5,
    y
  );

  if (hasKm) {
    y += 5;
    doc.text(`Kilómetros: ${data.vehicleKm}`, margin + 5, y);
  }

  y += 5;
  doc.text(`Servicio: ${safeStr(data.service)}`, margin + 5, y);

  if (hasComment) {
    y += 7;
    doc.setFont("helvetica", "bold");
    doc.text("Comentario:", margin + 5, y);
    const commentX = margin + 28;
    const maxCommentW = contentWidth - 33;
    doc.setFont("helvetica", "normal");
    const commentLines = doc.splitTextToSize(safeStr(data.comment), maxCommentW);
    doc.text(commentLines, commentX, y);
  }

  // ── Tabla de líneas ──
  y += 15;

  const colX = {
    name: margin,
    qty: margin + contentWidth * 0.5,
    discount: margin + contentWidth * 0.6,
    price: margin + contentWidth * 0.72,
    total: margin + contentWidth * 0.87,
  };

  doc.setFillColor(34, 197, 94);
  doc.rect(margin, y - 5, contentWidth, 8, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text("DESCRIPCIÓN", colX.name + 3, y);
  doc.text("CANT.", colX.qty, y);
  doc.text("DTO.", colX.discount, y);
  doc.text("P. UNIT.", colX.price, y);
  doc.text("TOTAL", colX.total, y);

  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(50, 50, 50);

  if (!tableLines.length) {
    doc.setFontSize(9);
    doc.text("No hay conceptos añadidos", colX.name + 3, y + 1);
    y += 7;
  } else {
    tableLines.forEach((line, index) => {
      if (index % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(margin, y - 3, contentWidth, 7, "F");
      }

      const rawDesc = safeStr(line.description, "Concepto");
      const cleanDesc = rawDesc.replace(/\s*\(-?\d+(\.\d+)?%\)\s*$/, "");
      const discPct = line.discount_percent ?? 0;

      doc.setFontSize(9);
      doc.text(cleanDesc, colX.name + 3, y + 1);
      doc.text(String(Number(line.quantity ?? 1)), colX.qty + 2, y + 1);
      doc.text(discPct > 0 ? `${discPct}%` : "—", colX.discount + 1, y + 1);
      doc.text(`${Number(line.unit_price ?? 0).toFixed(2)} €`, colX.price, y + 1);
      doc.text(`${Number(line.total ?? 0).toFixed(2)} €`, colX.total, y + 1);

      y += 7;
    });
  }

  // ── Totales ──
  y += 3;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, margin + contentWidth, y);
  y += 8;

  const totalsX = margin + contentWidth * 0.62;
  const valuesX = margin + contentWidth * 0.85;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);

  doc.text("Piezas:", totalsX, y);
  doc.text(`${partsNet.toFixed(2)} €`, valuesX, y);
  y += 6;

  doc.text("Mano de obra:", totalsX, y);
  doc.text(`${laborNet.toFixed(2)} €`, valuesX, y);

  if (globalDiscount > 0) {
    y += 6;
    doc.text("Descuento:", totalsX, y);
    doc.text(`-${globalDiscount.toFixed(2)} €`, valuesX, y);
  }

  y += 6;
  doc.text(`IVA (${data.taxRate}%):`, totalsX, y);
  doc.text(`${taxAmount.toFixed(2)} €`, valuesX, y);

  y += 8;
  doc.setFillColor(34, 197, 94);
  doc.roundedRect(totalsX - 5, y - 5, contentWidth * 0.45, 12, 2, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text("TOTAL:", totalsX, y + 3);
  doc.text(`${displayTotal.toFixed(2)} €`, valuesX, y + 3);

  // ── Footer ──
  const footerY = doc.internal.pageSize.getHeight() - 20;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, footerY - 5, margin + contentWidth, footerY - 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(
    [wName, wCif ? `CIF: ${wCif}` : "", wAddress].filter(Boolean).join(" · "),
    pageWidth / 2,
    footerY,
    { align: "center" }
  );
  doc.text("Gracias por confiar en nosotros", pageWidth / 2, footerY + 5, { align: "center" });

  doc.save(data.filename);
}
