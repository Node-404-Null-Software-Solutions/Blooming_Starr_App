export type AppLogicRuleRow = {
  id: string;
  name: string;
  module: string;
  trigger: string;
  mode: string;
  expression: string;
  notes: string | null;
  enabled: boolean;
  sortOrder: number;
};

export const APP_LOGIC_MODULES = [
  { value: "plantIntake", label: "Plant Intake" },
  { value: "productIntake", label: "Product Intake" },
  { value: "sales", label: "Sales" },
  { value: "overheadExpenses", label: "Overhead Expenses" },
  { value: "transplantLog", label: "Transplant Log" },
  { value: "treatmentTracking", label: "Treatment Tracking" },
  { value: "fertilizerLog", label: "Fertilizer Log" },
  { value: "schedule", label: "Schedule" },
] as const;

export const APP_LOGIC_TRIGGERS = [
  { value: "beforeSave", label: "Before Save" },
  { value: "afterSave", label: "After Save" },
  { value: "afterImport", label: "After Import" },
  { value: "manual", label: "Manual" },
] as const;

export const APP_LOGIC_MODES = [
  { value: "FORMULA", label: "Formula" },
  { value: "SCRIPT", label: "Script" },
] as const;
