import type {
  AppLogicMode,
  AppLogicModule,
  AppLogicTrigger,
} from "@/lib/app-logic-contract";

export {
  APP_LOGIC_MODES,
  APP_LOGIC_MODULES,
  APP_LOGIC_TRIGGERS,
  getAppLogicModuleContract,
  getAppLogicSelectionMessage,
  isExecutableAppLogicSelection,
} from "@/lib/app-logic-contract";

export type AppLogicRuleRow = {
  id: string;
  name: string;
  module: AppLogicModule;
  trigger: AppLogicTrigger;
  mode: AppLogicMode;
  expression: string;
  notes: string | null;
  enabled: boolean;
  sortOrder: number;
};

export type AppLogicExecutionLogRow = {
  id: string;
  ruleId: string;
  ruleName: string;
  module: string;
  trigger: string;
  mode: string;
  source: string;
  sourceRowId: string | null;
  status: string;
  durationMs: number;
  statementCount: number;
  actionCount: number;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: Date;
};

export type ManualAppLogicRowOption = {
  id: string;
  label: string;
};
