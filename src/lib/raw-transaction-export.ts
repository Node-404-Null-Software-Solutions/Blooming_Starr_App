type CsvValue = string | number | null | undefined;

export type RawSalesTransaction = {
  id: string;
  date: Date | null;
  sku: string;
  customerName: string | null;
  itemName: string | null;
  status: string;
  qty: number;
  salePriceCents: number;
  totalSaleCents: number;
  paymentMethod: string | null;
  cardLast4: string | null;
  channel: string | null;
  costCents: number;
  profitCents: number;
  marginPct: number | null;
  notes: string | null;
  externalUid: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type RawOverheadTransaction = {
  id: string;
  date: Date | null;
  vendor: string | null;
  brand: string | null;
  category: string | null;
  description: string | null;
  qty: number;
  subTotalCents: number;
  shippingCents: number;
  discountCents: number;
  unitCostCents: number;
  totalCents: number;
  paymentMethod: string | null;
  cardLast4: string | null;
  invoiceNumber: string | null;
  notes: string | null;
  externalUid: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const HEADERS = [
  "Business",
  "Year",
  "Transaction Type",
  "Record ID",
  "Date",
  "Created At",
  "Updated At",
  "SKU",
  "Customer Name",
  "Item Name",
  "Status",
  "Quantity",
  "Sale Price ($)",
  "Sales Total ($)",
  "Cost ($)",
  "Profit ($)",
  "Margin (%)",
  "Channel",
  "Payment Method",
  "Card Last 4",
  "Vendor",
  "Brand",
  "Category",
  "Description",
  "Subtotal ($)",
  "Shipping ($)",
  "Discount ($)",
  "Unit Cost ($)",
  "Expense Total ($)",
  "Invoice Number",
  "Notes",
  "External UID",
] as const;

function csvCell(value: CsvValue): string {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function dateOnly(value: Date | null): string {
  return value ? value.toISOString().slice(0, 10) : "";
}

function dollars(cents: number): number {
  return cents / 100;
}

export function buildRawTransactionsCsv({
  businessName,
  year,
  sales,
  overheadExpenses,
}: {
  businessName: string;
  year: number;
  sales: RawSalesTransaction[];
  overheadExpenses: RawOverheadTransaction[];
}): string {
  const rows: Array<{ sortAt: number; values: CsvValue[] }> = [];

  for (const sale of sales) {
    rows.push({
      sortAt: (sale.date ?? sale.createdAt).getTime(),
      values: [
        businessName,
        year,
        "Sale",
        sale.id,
        dateOnly(sale.date),
        sale.createdAt.toISOString(),
        sale.updatedAt.toISOString(),
        sale.sku,
        sale.customerName,
        sale.itemName,
        sale.status,
        sale.qty,
        dollars(sale.salePriceCents),
        dollars(sale.totalSaleCents),
        dollars(sale.costCents),
        dollars(sale.profitCents),
        sale.marginPct,
        sale.channel,
        sale.paymentMethod,
        sale.cardLast4,
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        sale.notes,
        sale.externalUid,
      ],
    });
  }

  for (const expense of overheadExpenses) {
    rows.push({
      sortAt: (expense.date ?? expense.createdAt).getTime(),
      values: [
        businessName,
        year,
        "Overhead Expense",
        expense.id,
        dateOnly(expense.date),
        expense.createdAt.toISOString(),
        expense.updatedAt.toISOString(),
        "",
        "",
        "",
        "",
        expense.qty,
        "",
        "",
        "",
        "",
        "",
        "",
        expense.paymentMethod,
        expense.cardLast4,
        expense.vendor,
        expense.brand,
        expense.category,
        expense.description,
        dollars(expense.subTotalCents),
        dollars(expense.shippingCents),
        dollars(expense.discountCents),
        dollars(expense.unitCostCents),
        dollars(expense.totalCents),
        expense.invoiceNumber,
        expense.notes,
        expense.externalUid,
      ],
    });
  }

  rows.sort(
    (a, b) =>
      a.sortAt - b.sortAt ||
      String(a.values[2]).localeCompare(String(b.values[2])) ||
      String(a.values[3]).localeCompare(String(b.values[3]))
  );

  return [
    HEADERS.map(csvCell).join(","),
    ...rows.map((row) => row.values.map(csvCell).join(",")),
  ].join("\r\n");
}
