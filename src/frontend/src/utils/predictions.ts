import type {
  BatchPredictionSummary,
  CustomerContext,
  DataType,
  ModelKey,
  PredictionApiResponse,
  PredictionMode,
  PredictionSummary,
} from "../types";
import { isRecord, prettyJson } from "./common";

export const buildPredictionPayload = (
  inputText: string,
  mode: PredictionMode,
  dataType: DataType,
) => {
  if (dataType === "csv") {
    return mode === "single"
      ? { dataType, customer: inputText }
      : { dataType, customers: inputText };
  }

  const parsedJson = JSON.parse(inputText) as unknown;
  if (isRecord(parsedJson)) {
    if (mode === "single" && "customer" in parsedJson) {
      return { dataType, ...parsedJson };
    }

    if (mode === "batch" && "customers" in parsedJson) {
      return { dataType, ...parsedJson };
    }
  }

  return mode === "single"
    ? { dataType, customer: parsedJson }
    : { dataType, customers: parsedJson };
};

export const getPredictionEndpoint = (mode: PredictionMode, model: ModelKey) => {
  if (model === "default") {
    return mode === "single" ? "/predict/defaultPredict" : "/predict/defaultBatchPredict";
  }

  return mode === "single" ? `/predict/${model}` : `/predict/batch/${model}`;
};

const readField = (input: Record<string, unknown>, ...keys: string[]) => {
  for (const key of keys) {
    const value = input[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }

  return undefined;
};

const toOptionalString = (value: unknown) => {
  if (value === undefined || value === null) {
    return undefined;
  }

  const stringValue = String(value).trim();
  return stringValue || undefined;
};

const toOptionalNumber = (value: unknown) => {
  if (value === undefined || value === null || String(value).trim() === "") {
    return undefined;
  }

  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
};

const addUnique = (items: string[], value: unknown) => {
  const stringValue = toOptionalString(value);
  if (stringValue && !items.includes(stringValue)) {
    items.push(stringValue);
  }
};

const parseCsvRows = (csvText: string) => {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const nextChar = csvText[index + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      field += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(field.trim());
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }
      row.push(field.trim());
      if (row.some((cell) => cell !== "")) {
        rows.push(row);
      }
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  row.push(field.trim());
  if (row.some((cell) => cell !== "")) {
    rows.push(row);
  }

  if (rows.length < 2) {
    return [];
  }

  const headers = rows[0]?.map((header) => header.trim()) ?? [];
  return rows.slice(1).map((cells) =>
    headers.reduce<Record<string, unknown>>((record, header, index) => {
      record[header] = cells[index] ?? "";
      return record;
    }, {}),
  );
};

const getSubmittedRows = (payload: unknown, dataType: DataType, mode: PredictionMode) => {
  if (dataType === "csv") {
    const csvText = isRecord(payload)
      ? toOptionalString(readField(payload, mode === "single" ? "customer" : "customers"))
      : undefined;
    return csvText ? parseCsvRows(csvText) : [];
  }

  if (!isRecord(payload)) {
    return [];
  }

  const submittedInput = mode === "single" ? payload.customer : payload.customers;
  if (Array.isArray(submittedInput)) {
    return submittedInput.filter(isRecord);
  }

  return isRecord(submittedInput) ? [submittedInput] : [];
};

const getCustomerContexts = (payload: unknown, dataType: DataType, mode: PredictionMode) => {
  const rows = getSubmittedRows(payload, dataType, mode);
  const contexts = new Map<string, CustomerContext>();

  for (const [index, row] of rows.entries()) {
    const customerId = toOptionalString(
      readField(row, "customerId", "customerID", "CustomerID", "Customer ID", "customer"),
    );
    const invoice = readField(row, "invoice", "Invoice");
    const product = readField(row, "description", "Description", "stockCode", "StockCode");
    const country = toOptionalString(readField(row, "country", "Country"));
    const quantity = toOptionalNumber(readField(row, "quantity", "Quantity"));
    const price = toOptionalNumber(readField(row, "price", "Price"));
    const contextKey = customerId ?? `input-${index + 1}`;
    const existingContext = contexts.get(contextKey);
    const context =
      existingContext ??
      {
        customerId,
        invoices: [],
        products: [],
        country,
        lineCount: 0,
      };

    context.lineCount += 1;
    addUnique(context.invoices, invoice);
    addUnique(context.products, product);
    if (!context.country && country) {
      context.country = country;
    }
    if (quantity !== undefined) {
      context.totalQuantity = (context.totalQuantity ?? 0) + quantity;
    }
    if (quantity !== undefined && price !== undefined) {
      context.totalSpent = (context.totalSpent ?? 0) + quantity * price;
    }

    contexts.set(contextKey, context);
  }

  return [...contexts.values()];
};

const formatNumber = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value);
};

const formatProbability = (value: number) => {
  return `${(value * 100).toFixed(1)}%`;
};

const formatPrediction = (value: number) => {
  return value === 1 ? "will likely buy again" : "will likely not buy again";
};

const formatCustomerContext = (context: CustomerContext | undefined, index: number) => {
  const label = context?.customerId ? `Client ${context.customerId}` : `Client ${index + 1}`;
  const details: string[] = [];

  if (context?.invoices.length) {
    details.push(`invoice ${context.invoices.join(", ")}`);
  }
  if (context?.products.length) {
    details.push(`bought ${context.products.join(", ")}`);
  }
  if (context?.country) {
    details.push(`country ${context.country}`);
  }
  if (context?.lineCount) {
    details.push(`${context.lineCount} row${context.lineCount === 1 ? "" : "s"}`);
  }
  if (context?.totalQuantity !== undefined) {
    details.push(`quantity ${formatNumber(context.totalQuantity)}`);
  }
  if (context?.totalSpent !== undefined) {
    details.push(`spent ${formatNumber(context.totalSpent)}`);
  }

  return details.length ? `${label} (${details.join("; ")})` : label;
};

const getPredictionSummary = (result: unknown) => {
  if (!isRecord(result) || !isRecord(result.prediction)) {
    return null;
  }

  return result as PredictionApiResponse;
};

const isBatchPrediction = (
  prediction: PredictionSummary | BatchPredictionSummary,
): prediction is BatchPredictionSummary => {
  return Array.isArray((prediction as BatchPredictionSummary).results);
};

export const formatPredictionResult = (
  result: unknown,
  payload: unknown,
  dataType: DataType,
  mode: PredictionMode,
) => {
  const summary = getPredictionSummary(result);
  if (!summary?.prediction) {
    return prettyJson(result);
  }

  const prediction = summary.prediction;
  const contexts = getCustomerContexts(payload, dataType, mode);
  const items = isBatchPrediction(prediction)
    ? prediction.results
    : [{ prediction: prediction.prediction, probability: prediction.probability }];
  const lines = items.flatMap((item, index) => [
    `${index + 1}. ${formatCustomerContext(contexts[index], index)}`,
    `Prediction: ${formatPrediction(item.prediction)} (${item.prediction})`,
    `Probability: ${formatProbability(item.probability)}`,
    "",
  ]);

  lines.push(`Model: ${prediction.model_name} (${prediction.model_key})`);
  lines.push(`Threshold: ${formatProbability(prediction.threshold)}`);

  return lines.join("\n").trim();
};
