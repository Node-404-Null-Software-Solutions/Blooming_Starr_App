import readExcelFile from "read-excel-file/node";

type CellPrimitive = string | number | boolean | Date | null;

export type Cell = {
  value: CellPrimitive;
};

export type Row = {
  number: number;
  getCell(colNumber: number): Cell;
  eachCell(
    options: { includeEmpty?: boolean },
    callback: (cell: Cell, colNumber: number) => void
  ): void;
};

export type Worksheet = {
  name: string;
  rowCount: number;
  getRow(rowNumber: number): Row;
  eachRow(
    options: { includeEmpty?: boolean },
    callback: (row: Row, rowNumber: number) => void
  ): void;
};

export type Workbook = {
  worksheets: Worksheet[];
};

class WorkbookRow implements Row {
  constructor(
    public readonly number: number,
    private readonly cells: CellPrimitive[]
  ) {}

  getCell(colNumber: number): Cell {
    return { value: this.cells[colNumber - 1] ?? null };
  }

  eachCell(
    options: { includeEmpty?: boolean },
    callback: (cell: Cell, colNumber: number) => void
  ): void {
    this.cells.forEach((value, index) => {
      if (!options.includeEmpty && isEmptyCellValue(value)) return;
      callback({ value }, index + 1);
    });
  }
}

class WorkbookWorksheet implements Worksheet {
  public readonly rowCount: number;

  constructor(
    public readonly name: string,
    private readonly rows: CellPrimitive[][]
  ) {
    this.rowCount = rows.length;
  }

  getRow(rowNumber: number): Row {
    return new WorkbookRow(rowNumber, this.rows[rowNumber - 1] ?? []);
  }

  eachRow(
    options: { includeEmpty?: boolean },
    callback: (row: Row, rowNumber: number) => void
  ): void {
    this.rows.forEach((cells, index) => {
      if (!options.includeEmpty && cells.every(isEmptyCellValue)) return;
      callback(new WorkbookRow(index + 1, cells), index + 1);
    });
  }
}

class WorkbookAdapter implements Workbook {
  constructor(public readonly worksheets: Worksheet[]) {}
}

function isEmptyCellValue(value: CellPrimitive): boolean {
  return value === null || value === undefined || value === "";
}

export function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function toStringCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") return String(v);
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object") {
    const obj = v as Record<string, unknown>;
    if (typeof obj.text === "string") return obj.text.trim();
    if (typeof obj.result === "string") return obj.result.trim();
    if (typeof obj.result === "number") return String(obj.result);
    if (Array.isArray(obj.richText)) {
      return obj.richText
        .map((rt) => {
          if (!rt || typeof rt !== "object") return "";
          const rich = rt as Record<string, unknown>;
          return typeof rich.text === "string" ? rich.text : "";
        })
        .join("")
        .trim();
    }
  }
  return String(v).trim();
}

export async function loadWorkbookFromFile(file: File): Promise<Workbook> {
  const arrayBuffer = await file.arrayBuffer();
  const nodeBuffer = Buffer.from(arrayBuffer);
  const sheets = await readExcelFile<number>(nodeBuffer);

  return new WorkbookAdapter(
    sheets.map(
      ({ sheet, data }) =>
        new WorkbookWorksheet(sheet, data as unknown as CellPrimitive[][])
    )
  );
}

export function findWorksheetByName(
  workbook: Workbook,
  candidates: string[]
): Worksheet | null {
  const normalized = new Set(
    candidates.map((name) => name.trim().toLowerCase())
  );

  const match =
    workbook.worksheets.find((ws) =>
      normalized.has(ws.name.trim().toLowerCase())
    ) ?? null;

  return match ?? workbook.worksheets[0] ?? null;
}

export function findHeaderRow(
  ws: Worksheet,
  requiredHeaders: string[]
): Row | null {
  const required = requiredHeaders.map((h) => normalizeHeader(h));
  const scanMax = Math.min(ws.rowCount, 10);

  for (let i = 1; i <= scanMax; i += 1) {
    const row = ws.getRow(i);
    const labels = new Set<string>();

    row.eachCell({ includeEmpty: false }, (cell) => {
      const label = normalizeHeader(toStringCell(cell.value));
      if (label) labels.add(label);
    });

    if (required.every((label) => labels.has(label))) {
      return row;
    }
  }

  return null;
}

export function buildHeaderMap(headerRow: Row): Map<string, number> {
  const headerMap = new Map<string, number>();
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const label = normalizeHeader(toStringCell(cell.value));
    if (label) headerMap.set(label, colNumber);
  });
  return headerMap;
}

export function parseDate(raw: unknown): Date | null {
  if (raw instanceof Date) return raw;
  const s = toStringCell(raw);
  if (!s) return null;

  const iso = Date.parse(s);
  if (!Number.isNaN(iso) && /\d{4}-\d{2}-\d{2}/.test(s)) return new Date(iso);

  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const mm = Number(m[1]);
    const dd = Number(m[2]);
    const yyyy = Number(m[3]);
    if (mm && dd && yyyy) return new Date(yyyy, mm - 1, dd);
  }

  return !Number.isNaN(iso) ? new Date(iso) : null;
}

export function parseIntSafe(raw: unknown, fallback = 0): number {
  if (raw === null || raw === undefined) return fallback;
  if (typeof raw === "number" && Number.isFinite(raw)) return Math.trunc(raw);
  const s = toStringCell(raw);
  if (!s) return fallback;
  const n = Number(s);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

export function parseCurrencyToCents(raw: unknown): number {
  if (raw === null || raw === undefined) return 0;

  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.round(raw * 100);
  }

  const s = toStringCell(raw);
  if (!s) return 0;

  const negative = /^\(.*\)$/.test(s);
  const cleaned = s.replace(/[$,\s()]/g, "");
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return 0;
  const cents = Math.round(n * 100);
  return negative ? -cents : cents;
}

export function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
