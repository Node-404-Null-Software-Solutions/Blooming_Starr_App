"use client";

import { useState, type FormEvent } from "react";
import type { PlantIntakeUpdate } from "@/lib/actions/data-entries";
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
import type { PlantIntakeRow } from "./PlantIntakeTable";

type SaveResult = { ok: boolean; error?: string };

type Props = {
  row: PlantIntakeRow;
  lookups: Record<string, LookupRow[]>;
  isSaving: boolean;
  onCancel: () => void;
  onSave: (data: PlantIntakeUpdate) => Promise<SaveResult>;
};

function currencyInputValue(cents: number) {
  return `$ ${(cents / 100).toFixed(2)}`;
}

function parseCurrencyCents(value: string) {
  const amount = Number.parseFloat(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
}

function formatCurrency(value: string) {
  const amount = Number.parseFloat(value.replace(/[^0-9.-]/g, ""));
  return `$ ${Math.max(0, Number.isFinite(amount) ? amount : 0).toFixed(2)}`;
}

export default function PlantIntakeDetailEditForm({
  row,
  lookups,
  isSaving,
  onCancel,
  onSave,
}: Props) {
  const [date, setDate] = useState(row.date ?? "");
  const [source, setSource] = useState(row.source);
  const [genus, setGenus] = useState(row.genus);
  const [cultivar, setCultivar] = useState(row.cultivar);
  const [locationCode, setLocationCode] = useState(row.locationCode ?? "");
  const [qty, setQty] = useState(String(row.qty));
  const [cost, setCost] = useState(currencyInputValue(row.costCents));
  const [msrp, setMsrp] = useState(currencyInputValue(row.msrpCents));
  const [potType, setPotType] = useState(row.potType ?? "");
  const [paymentMethod, setPaymentMethod] = useState(row.paymentMethod ?? "");
  const [cardLast4, setCardLast4] = useState(row.cardLast4 ?? "");
  const [error, setError] = useState("");

  const plantSources = lookups.plantSource ?? [];
  const genera = lookups.genus ?? [];
  const cultivars = lookups.cultivar ?? [];
  const plantIds = lookups.plantId ?? [];
  const paymentMethods = lookups.paymentMethod ?? [];

  function adjustQty(delta: number) {
    const parsed = Number.parseInt(qty, 10);
    const next = Math.max(1, (Number.isFinite(parsed) ? parsed : 1) + delta);
    setQty(String(next));
  }

  function adjustCurrency(
    value: string,
    setValue: (next: string) => void,
    delta: number
  ) {
    const amount = Number.parseFloat(value.replace(/[^0-9.-]/g, ""));
    const next = Math.max(0, (Number.isFinite(amount) ? amount : 0) + delta);
    setValue(`$ ${next.toFixed(2)}`);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const parsedQty = Number.parseInt(qty, 10);
    if (!Number.isFinite(parsedQty) || parsedQty < 1) {
      setError("Qty must be at least 1.");
      return;
    }

    const payload: PlantIntakeUpdate = {
      date: date || null,
      source: source.trim(),
      genus: genus.trim(),
      cultivar: cultivar.trim(),
      locationCode: locationCode.trim() || null,
      qty: parsedQty,
      costCents: parseCurrencyCents(cost),
      msrpCents: parseCurrencyCents(msrp),
      potType: potType.trim() || null,
      paymentMethod: paymentMethod.trim() || null,
      cardLast4: cardLast4.trim() || null,
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
        <IntakeFormRow label="Date">
          <input
            type="date"
            name="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className={intakeFieldClass}
          />
        </IntakeFormRow>

        <IntakeFormRow label="Source" required>
          <IntakeDatalistInput
            name="source"
            listId="plant-detail-source-options"
            value={source}
            onChange={setSource}
            required
          />
        </IntakeFormRow>

        <IntakeFormRow label="Genus" required>
          <IntakeDatalistInput
            name="genus"
            listId="plant-detail-genus-options"
            value={genus}
            onChange={setGenus}
            required
          />
        </IntakeFormRow>

        <IntakeFormRow label="Cultivar" required>
          <IntakeDatalistInput
            name="cultivar"
            listId="plant-detail-cultivar-options"
            value={cultivar}
            onChange={setCultivar}
            required
          />
        </IntakeFormRow>

        <IntakeFormRow label="ID #" required>
          <IntakeDatalistInput
            name="locationCode"
            listId="plant-detail-id-options"
            value={locationCode}
            onChange={setLocationCode}
            required
          />
        </IntakeFormRow>

        <IntakeFormRow label="QTY" required>
          <IntakeStepperShell>
            <input
              name="qty"
              value={qty}
              onChange={(event) => setQty(event.target.value)}
              inputMode="numeric"
              required
              className={intakeStepperInputClass}
            />
            <IntakeStepperButtons
              onDecrement={() => adjustQty(-1)}
              onIncrement={() => adjustQty(1)}
            />
          </IntakeStepperShell>
        </IntakeFormRow>

        <IntakeFormRow label="Unit Cost" required>
          <IntakeStepperShell>
            <input
              name="costCents"
              value={cost}
              onChange={(event) => setCost(event.target.value)}
              onBlur={() => setCost(formatCurrency(cost))}
              inputMode="decimal"
              required
              className={intakeStepperInputClass}
            />
            <IntakeStepperButtons
              onDecrement={() => adjustCurrency(cost, setCost, -1)}
              onIncrement={() => adjustCurrency(cost, setCost, 1)}
            />
          </IntakeStepperShell>
        </IntakeFormRow>

        <IntakeFormRow label="MSRP" required>
          <IntakeStepperShell>
            <input
              name="msrpCents"
              value={msrp}
              onChange={(event) => setMsrp(event.target.value)}
              onBlur={() => setMsrp(formatCurrency(msrp))}
              inputMode="decimal"
              required
              className={intakeStepperInputClass}
            />
            <IntakeStepperButtons
              onDecrement={() => adjustCurrency(msrp, setMsrp, -1)}
              onIncrement={() => adjustCurrency(msrp, setMsrp, 1)}
            />
          </IntakeStepperShell>
        </IntakeFormRow>

        <IntakeFormRow label="Pot Type" required>
          <IntakeChevronInput
            name="potType"
            value={potType}
            onChange={setPotType}
            required
          />
        </IntakeFormRow>

        <IntakeFormRow label="Payment Method">
          <IntakeSelectInput
            name="paymentMethod"
            value={paymentMethod}
            onChange={setPaymentMethod}
            options={paymentMethods}
          />
        </IntakeFormRow>

        <IntakeFormRow label="Card Number">
          <IntakeChevronInput
            name="cardLast4"
            value={cardLast4}
            onChange={setCardLast4}
            maxLength={4}
          />
        </IntakeFormRow>

        <IntakeDatalistOptions id="plant-detail-source-options" options={plantSources} />
        <IntakeDatalistOptions id="plant-detail-genus-options" options={genera} />
        <IntakeDatalistOptions id="plant-detail-cultivar-options" options={cultivars} />
        <IntakeDatalistOptions
          id="plant-detail-id-options"
          options={plantIds}
          valueKey="code"
        />
      </IntakeFormGrid>
    </form>
  );
}
