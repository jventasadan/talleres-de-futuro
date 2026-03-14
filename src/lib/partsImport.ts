import * as XLSX from "xlsx";
import mammoth from "mammoth/mammoth.browser";

export interface ParsedPartRow {
  name: string;
  ref: string;
  price: number;
}

const cleanText = (value: unknown) => String(value ?? "").trim();

const parsePrice = (value: unknown): number => {
  const raw = cleanText(value);
  if (!raw) return 0;

  const normalized = raw
    .replace(/€/g, "")
    .replace(/\s/g, "")
    .replace(/\.(?=.*\.)/g, "")
    .replace(",", ".");

  const num = Number.parseFloat(normalized);
  return Number.isFinite(num) ? Number(num.toFixed(2)) : 0;
};

const normalizeKey = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

const toRecordRows = (rawRows: unknown[]): Record<string, unknown>[] =>
  rawRows.filter((row): row is Record<string, unknown> => !!row && typeof row === "object");

const pickByAliases = (row: Record<string, unknown>, aliases: string[]) => {
  const normalizedEntries = Object.entries(row).map(([k, v]) => [normalizeKey(k), v] as const);
  const aliasSet = new Set(aliases.map(normalizeKey));

  for (const [key, value] of normalizedEntries) {
    if (aliasSet.has(key)) return value;
  }

  return undefined;
};

const mapRowsToParts = (rows: Record<string, unknown>[]): ParsedPartRow[] => {
  const mapped = rows
    .map((row) => {
      const name = cleanText(
        pickByAliases(row, ["name", "nombre", "pieza", "descripcion", "description", "desc"]),
      );
      const ref = cleanText(pickByAliases(row, ["ref", "referencia", "reference", "codigo", "code"]));
      const price = parsePrice(pickByAliases(row, ["price", "precio", "pvp", "saleprice", "coste", "cost"]));

      if (!name || price <= 0) return null;
      return {
        name,
        ref: ref || name.toUpperCase().replace(/\s+/g, "-").slice(0, 24),
        price,
      } satisfies ParsedPartRow;
    })
    .filter((part): part is ParsedPartRow => !!part);

  const seen = new Set<string>();
  return mapped.filter((part) => {
    const key = `${part.ref.toLowerCase()}-${part.name.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const parseSpreadsheet = async (file: File): Promise<ParsedPartRow[]> => {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: "array", cellDates: false, raw: false });
  const firstSheetName = workbook.SheetNames[0];
  const firstSheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: "" });
  return mapRowsToParts(toRecordRows(rows));
};

const parseDocx = async (file: File): Promise<ParsedPartRow[]> => {
  const arrayBuffer = await file.arrayBuffer();
  const { value } = await mammoth.extractRawText({ arrayBuffer });

  const records = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/[;|\t,]/).map((part) => part.trim()).filter(Boolean);
      if (parts.length < 2) return null;
      return {
        nombre: parts[0],
        referencia: parts[1] ?? "",
        precio: parts[2] ?? "0",
      } satisfies Record<string, unknown>;
    })
    .filter((row): row is Record<string, unknown> => !!row);

  return mapRowsToParts(records);
};

export async function parsePartsFile(file: File): Promise<ParsedPartRow[]> {
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (["xlsx", "xls", "csv"].includes(ext ?? "")) {
    const rows = await parseSpreadsheet(file);
    if (!rows.length) throw new Error("No se encontraron filas válidas en el archivo.");
    return rows;
  }

  if (ext === "docx") {
    const rows = await parseDocx(file);
    if (!rows.length) throw new Error("El documento no contiene una tabla de piezas válida.");
    return rows;
  }

  throw new Error("Formato no soportado. Usa CSV, Excel (.xlsx/.xls) o Word (.docx).");
}

export function getDemoPartsList(): ParsedPartRow[] {
  return [
    { name: "Filtro de aceite Bosch", ref: "FO-BOS-001", price: 12.5 },
    { name: "Pastillas de freno delanteras", ref: "PF-DEL-014", price: 48.9 },
    { name: "Batería 12V 70Ah", ref: "BAT-70-12", price: 129.0 },
    { name: "Aceite 5W30 (5L)", ref: "ACE-5W30-5L", price: 36.75 },
    { name: "Filtro de habitáculo", ref: "FH-CAB-003", price: 19.95 },
  ];
}
