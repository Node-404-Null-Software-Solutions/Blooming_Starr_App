"use client";

import { useState, type FormEvent } from "react";
import type { ProductIntakeUpdate } from "@/lib/actions/data-entries";
import type { LookupRow } from "@/lib/actions/lookups";
import {
  IntakeChevronInput,
  IntakeDatalistInput,
  IntakeDatalistOptions,
  IntakeEditActionBar,
  IntakeFormGrid,
  IntakeFormRow,
  IntakeSelectInput,
  IntakeStepperButtons,
  IntakeStepperShell,
  intakeFieldClass,
  intakeStepperInputClass,
} from "../_components/IntakeEditControls";
import type { ProductRow } from "./ProductIntakeClient";

type SaveResult = { ok: boolean; error?: string };

type Props = {
  row: ProductRow;
  lookups: Record<string, LookupRow[]>;
  isSaving: boolean;
  onCancel: () => void;
  onSave: (data: ProductIntakeUpdate) => Promise<SaveResult>;
};

function isBlankDisplay(value: unknown) {
  if (value == null) return true;
  const text = String(value);
  return (
    text === "" ||
    text === "-" ||
    text === "\u2014" ||
    text.includes("\u00e2") ||
    text.includes("\u00c3")
  );
}

function cleanDisplay(value: unknown) {
  return isBlankDisplay(value) ? "" : String(value);
}

function numericValue(value: string) {
  const parsed = Number.parseFloat(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumber(value: number) {
  return Math.max(0, value).toFixed(2);
}

function formatCurrency(value: number) {
  return `$ ${formatNumber(value)}`;
}

function parseCurrencyCents(value: string) {
  return Math.round(numericValue(value) * 100);
}

export default function ProductIntakeDetailEditForm({
  row,
  lookups,
  isSaving,
  onCancel,
  onSave,
}: Props) {
  const [date, setDate] = useState(cleanDisplay(row.date));
  const [vendor, setVendor] = useState(cleanDisplay(row.vendor));
  const [source, setSource] = useState(cleanDisplay(row.source));
  const [category, setCategory] = useState(cleanDisplay(row.category));
  const [size, setSize] = useState(cleanDisplay(row.size));
  const [style, setStyle] = useState(cleanDisplay(row.style));
  const [purchaseNumber, setPurchaseNumber] = useState(
    cleanDisplay(row.purchaseNumber)
  );
  const [qty, setQty] = useState(formatNumber(row.qty));
  const [totalCost, setTotalCost] = useState(
    formatCurrency(row.totalCostCents / 100)
  );
  const [paymentMethod, setPaymentMethod] = useState(
    cleanDisplay(row.paymentMethod)
  );
  const [cardLast4, setCardLast4] = useState(row.cardLast4 ?? "");
  const [invoiceNumber, setInvoiceNumber] = useState(
    cleanDisplay(row.invoiceNumber)
  );
  const [notes, setNotes] = useState(cleanDisplay(row.notes));
  const [error, setError] = useState("");

  const sources = lookups.productSource ?? [];
  const categories = lookups.productCategory ?? [];
  const sizes = lookups.productSize ?? [];
  const styles = lookups.productStyle ?? [];
  const paymentMethods = lookups.paymentMethod ?? [];

  function adjustNumber(value: string, setValue: (next: string) => void, delta: number) {
    setValue(formatNumber(numericValue(value) + delta));
  }

  function adjustCurrency(
    value: string,
    setValue: (next: string) => void,
    delta: number
  ) {
    setValue(formatCurrency(numericValue(value) + delta));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const parsedQty = Math.floor(numericValue(qty));
    if (!Number.isFinite(parsedQty) || parsedQty < 1) {
      setError("Qty must be at least 1.");
      return;
    }

    const payload: ProductIntakeUpdate = {
      date: date || null,
      vendor: vendor.trim() || null,
      source: source.trim() || null,
      category: category.trim() || null,
      size: size.trim() || null,
      style: style.trim() || null,
      purchaseNumber: purchaseNumber.trim() || null,
      qty: parsedQty,
      totalCostCents: parseCurrencyCents(totalCost),
      paymentMethod: paymentMethod.trim() || null,
      cardLast4: cardLast4.trim() || null,
      invoiceNumber: invoiceNumber.trim() || null,
      notes: notes.trim() || null,
    };

    const result = await onSave(payload);
    if (!result.ok) {
      setError(result.error ?? "Unable to save changes.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="min-h-full bg-white">
      <IntakeEditActionBar onCancel={onCancel} isSaving={isSaving} error={error} />
      <IntakeFormGrid>
        <IntakeFormRow label="Date" required>
          <input
            type="date"
            name="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            required
            className={intakeFieldClass}
          />
        </IntakeFormRow>

        <IntakeFormRow label="Vendor" required>
          <IntakeChevronInput
            name="vendor"
            value={vendor}
            onChange={setVendor}
            required
          />
        </IntakeFormRow>

        <IntakeFormRow label="Source" required>
          <IntakeDatalistInput
            name="source"
            listId="product-detail-source-options"
            value={source}
            onChange={setSource}
            required
          />
        </IntakeFormRow>

        <IntakeFormRow label="Category" required>
          <IntakeDatalistInput
            name="category"
            listId="product-detail-category-options"
            value={category}
            onChange={setCategory}
            required
          />
        </IntakeFormRow>

        <IntakeFormRow label="Size">
          <IntakeDatalistInput
            name="size"
            listId="product-detail-size-options"
            value={size}
            onChange={setSize}
          />
        </IntakeFormRow>

        <IntakeFormRow label="Style" required>
          <IntakeDatalistInput
            name="style"
            listId="product-detail-style-options"
            value={style}
            onChange={setStyle}
            required
          />
        </IntakeFormRow>

        <IntakeFormRow label="Purchase #">
          <IntakeChevronInput
            name="purchaseNumber"
            value={purchaseNumber}
            onChange={setPurchaseNumber}
          />
        </IntakeFormRow>

        <IntakeFormRow label="Qty" required>
          <IntakeStepperShell>
            <input
              name="qty"
              value={qty}
              onChange={(event) => setQty(event.target.value)}
              onBlur={() => setQty(formatNumber(numericValue(qty)))}
              inputMode="decimal"
              required
              className={intakeStepperInputClass}
            />
            <IntakeStepperButtons
              onDecrement={() => adjustNumber(qty, setQty, -1)}
              onIncrement={() => adjustNumber(qty, setQty, 1)}
            />
          </IntakeStepperShell>
        </IntakeFormRow>

        <IntakeFormRow label="Total Cost" required>
          <IntakeStepperShell>
            <input
              name="totalCostCents"
              value={totalCost}
              onChange={(event) => setTotalCost(event.target.value)}
              onBlur={() => setTotalCost(formatCurrency(numericValue(totalCost)))}
              inputMode="decimal"
              required
              className={intakeStepperInputClass}
            />
            <IntakeStepperButtons
              onDecrement={() => adjustCurrency(totalCost, setTotalCost, -1)}
              onIncrement={() => adjustCurrency(totalCost, setTotalCost, 1)}
            />
          </IntakeStepperShell>
        </IntakeFormRow>

        <IntakeFormRow label="Payment Method" required>
          <IntakeSelectInput
            name="paymentMethod"
            value={paymentMethod}
            onChange={setPaymentMethod}
            options={paymentMethods}
            required
          />
        </IntakeFormRow>

        <IntakeFormRow label="Card #" required>
          <IntakeChevronInput
            name="cardLast4"
            value={cardLast4}
            onChange={setCardLast4}
            maxLength={4}
            required
          />
        </IntakeFormRow>

        <IntakeFormRow label="Invoice #">
          <input
            type="text"
            name="invoiceNumber"
            value={invoiceNumber}
            onChange={(event) => setInvoiceNumber(event.target.value)}
            className={intakeFieldClass}
          />
        </IntakeFormRow>

        <IntakeFormRow label="Notes">
          <input
            type="text"
            name="notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className={intakeFieldClass}
          />
        </IntakeFormRow>

        <IntakeDatalistOptions id="product-detail-source-options" options={sources} />
        <IntakeDatalistOptions
          id="product-detail-category-options"
          options={categories}
        />
        <IntakeDatalistOptions
          id="product-detail-size-options"
          options={sizes}
          valueKey="code"
        />
        <IntakeDatalistOptions id="product-detail-style-options" options={styles} />
      </IntakeFormGrid>
    </form>
  );
}
