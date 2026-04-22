export type Theme = "light" | "dark";
export type PredictionMode = "single" | "batch";
export type DataType = "json" | "csv";
export type MessageRole = "assistant" | "user" | "result" | "error";
export type ModelKey = "default" | "logreg" | "ranfor" | "random_forest";
export type AuthMode = "login" | "signup";

export type User = {
  id: string;
  username: string;
  fullName: string;
  createdAt: string;
};

export type ChatMessage = {
  id: string;
  role: MessageRole;
  title: string;
  body: string;
};

export type ModelOption = {
  key: ModelKey;
  name: string;
  description: string;
};

export type PredictionItem = {
  prediction: number;
  probability: number;
};

export type PredictionSummary = PredictionItem & {
  threshold: number;
  model_key: string;
  model_name: string;
};

export type BatchPredictionSummary = {
  threshold: number;
  model_key: string;
  model_name: string;
  results: PredictionItem[];
};

export type PredictionApiResponse = {
  message?: string;
  prediction?: PredictionSummary | BatchPredictionSummary;
  requestId?: string;
  itemsSaved?: number;
};

export type CustomerContext = {
  customerId?: string;
  invoices: string[];
  products: string[];
  country?: string;
  lineCount: number;
  totalQuantity?: number;
  totalSpent?: number;
};
