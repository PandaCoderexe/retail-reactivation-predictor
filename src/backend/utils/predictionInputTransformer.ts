export type ModelCustomerFeatures = {
  unique_products: number;
  total_quantity: number;
  total_orders: number;
  total_spent: number;
  cancelled_lines_count: number;
  cancellation_ratio: number;
  days_since_last_purchase: number;
  avg_days_between_orders: number;
  customer_lifetime_days: number;
  is_short_history: number;
  orders_per_month: number;
};

export type PredictionInputPayload = {
  invoice?: string | null;
  stockCode?: string | null;
  description?: string | null;
  quantity?: number | string | null;
  invoiceDate?: string | Date | null;
  price?: number | string | null;
  customerId?: string | number | null;
  country?: string | null;
  features?: unknown;
  [key: string]: unknown;
};

export type PreparedPredictionCustomer = {
  modelCustomer: ModelCustomerFeatures;
  originalInput: unknown;
  rawInputs: PredictionInputPayload[];
};

const MODEL_FEATURE_KEYS = [
  "unique_products",
  "total_quantity",
  "total_orders",
  "total_spent",
  "cancelled_lines_count",
  "cancellation_ratio",
  "days_since_last_purchase",
  "avg_days_between_orders",
  "customer_lifetime_days",
  "is_short_history",
  "orders_per_month",
] as const satisfies readonly (keyof ModelCustomerFeatures)[];

const DAY_IN_MS = 24 * 60 * 60 * 1000;

type NormalizedLine = {
  invoice: string;
  stockCode: string;
  description: string;
  quantity: number;
  invoiceDate: Date;
  price: number;
  customerId: string;
  country?: string;
  source: PredictionInputPayload;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const readField = (input: PredictionInputPayload, ...keys: string[]) => {
  for (const key of keys) {
    const value = input[key];
    if (value !== undefined && value !== null) {
      return value;
    }
  }

  return undefined;
};

const toFiniteNumber = (value: unknown, fieldName: string) => {
  if (value === undefined || value === null || (typeof value === "string" && !value.trim())) {
    throw new Error(`${fieldName} must be a finite number.`);
  }

  const numberValue = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(numberValue)) {
    throw new Error(`${fieldName} must be a finite number.`);
  }

  return numberValue;
};

const toNonEmptyString = (value: unknown, fieldName: string) => {
  if (value === undefined || value === null) {
    throw new Error(`${fieldName} is required.`);
  }

  const stringValue = String(value).trim();
  if (!stringValue) {
    throw new Error(`${fieldName} is required.`);
  }

  return stringValue;
};

const toDate = (value: unknown, fieldName: string) => {
  if (value === undefined || value === null) {
    throw new Error(`${fieldName} is required.`);
  }

  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${fieldName} must be a valid date.`);
  }

  return date;
};

const maybeString = (value: unknown) => {
  if (value === undefined || value === null) {
    return undefined;
  }

  const stringValue = String(value).trim();
  return stringValue || undefined;
};

const toModelFeatures = (value: Record<string, unknown>): ModelCustomerFeatures | null => {
  const featureSource = isRecord(value.features) ? value.features : value;

  if (!MODEL_FEATURE_KEYS.every((key) => featureSource[key] !== undefined)) {
    return null;
  }

  return MODEL_FEATURE_KEYS.reduce((features, key) => {
    features[key] = toFiniteNumber(featureSource[key], key);
    return features;
  }, {} as ModelCustomerFeatures);
};

const normalizeLine = (input: unknown): NormalizedLine => {
  if (!isRecord(input)) {
    throw new Error("Prediction input must be an object.");
  }

  const payload = input as PredictionInputPayload;
  const country = maybeString(readField(payload, "country", "Country"));
  const line: NormalizedLine = {
    invoice: toNonEmptyString(readField(payload, "invoice", "Invoice"), "invoice"),
    stockCode: toNonEmptyString(readField(payload, "stockCode", "StockCode"), "stockCode"),
    description: toNonEmptyString(
      readField(payload, "description", "Description"),
      "description",
    ),
    quantity: toFiniteNumber(readField(payload, "quantity", "Quantity"), "quantity"),
    invoiceDate: toDate(readField(payload, "invoiceDate", "InvoiceDate"), "invoiceDate"),
    price: toFiniteNumber(readField(payload, "price", "Price"), "price"),
    customerId: toNonEmptyString(
      readField(payload, "customerId", "customerID", "CustomerID", "Customer ID"),
      "customerId",
    ),
    source: payload,
  };

  if (country !== undefined) {
    line.country = country;
  }

  return line;
};

const uniqueCount = <TValue>(values: TValue[]) => {
  return new Set(values).size;
};

const diffDays = (later: Date, earlier: Date) => {
  return Math.floor((later.getTime() - earlier.getTime()) / DAY_IN_MS);
};

const average = (values: number[]) => {
  if (values.length === 0) {
    return -1;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const calculateFeaturesForCustomer = (
  customerLines: NormalizedLine[],
  referenceDate: Date,
): ModelCustomerFeatures => {
  const purchaseLines = customerLines.filter((line) => !line.invoice.startsWith("C"));

  if (purchaseLines.length === 0) {
    throw new Error(
      `Customer ${customerLines[0]?.customerId ?? "unknown"} has no purchase lines to transform.`,
    );
  }

  const orderDates = new Map<string, Date>();
  for (const line of purchaseLines) {
    const existingDate = orderDates.get(line.invoice);
    if (!existingDate || line.invoiceDate > existingDate) {
      orderDates.set(line.invoice, line.invoiceDate);
    }
  }

  const sortedOrderDates = [...orderDates.values()].sort(
    (left, right) => left.getTime() - right.getTime(),
  );
  const gaps = sortedOrderDates
    .slice(1)
    .map((date, index) => diffDays(date, sortedOrderDates[index] as Date));

  const firstPurchase = sortedOrderDates[0];
  const lastPurchase = sortedOrderDates[sortedOrderDates.length - 1];

  if (!firstPurchase || !lastPurchase) {
    throw new Error(
      `Customer ${customerLines[0]?.customerId ?? "unknown"} has no valid purchase dates.`,
    );
  }

  const customerLifetimeDays = diffDays(lastPurchase, firstPurchase);
  const totalOrders = orderDates.size;
  const cancelledLinesCount = customerLines.filter((line) => line.invoice.startsWith("C")).length;
  const cancellationRatio = cancelledLinesCount / customerLines.length;

  return {
    unique_products: uniqueCount(purchaseLines.map((line) => line.stockCode)),
    total_quantity: purchaseLines.reduce((sum, line) => sum + line.quantity, 0),
    total_orders: totalOrders,
    total_spent: purchaseLines.reduce((sum, line) => sum + line.quantity * line.price, 0),
    cancelled_lines_count: cancelledLinesCount,
    cancellation_ratio: cancellationRatio,
    days_since_last_purchase: diffDays(referenceDate, lastPurchase),
    avg_days_between_orders: average(gaps),
    customer_lifetime_days: customerLifetimeDays,
    is_short_history: customerLifetimeDays < 30 ? 1 : 0,
    orders_per_month:
      customerLifetimeDays < 30 ? 0 : totalOrders / (customerLifetimeDays / 30),
  };
};

const groupLinesByCustomer = (lines: NormalizedLine[]) => {
  const grouped = new Map<string, NormalizedLine[]>();

  for (const line of lines) {
    const existingLines = grouped.get(line.customerId);
    if (existingLines) {
      existingLines.push(line);
    } else {
      grouped.set(line.customerId, [line]);
    }
  }

  return grouped;
};

const getReferenceDate = (lines: NormalizedLine[]) => {
  const purchaseDates = lines
    .filter((line) => !line.invoice.startsWith("C"))
    .map((line) => line.invoiceDate.getTime());

  if (purchaseDates.length === 0) {
    throw new Error("At least one purchase line is required to transform prediction input.");
  }

  return new Date(Math.max(...purchaseDates) + DAY_IN_MS);
};

const prepareRawLines = (input: unknown[]): PreparedPredictionCustomer[] => {
  const lines = input.map(normalizeLine);
  const referenceDate = getReferenceDate(lines);

  return [...groupLinesByCustomer(lines).values()].map((customerLines) => ({
    modelCustomer: calculateFeaturesForCustomer(customerLines, referenceDate),
    originalInput: customerLines.map((line) => line.source),
    rawInputs: customerLines.map((line) => line.source),
  }));
};

export const prepareSinglePredictionCustomer = (input: unknown): PreparedPredictionCustomer => {
  if (isRecord(input)) {
    const modelCustomer = toModelFeatures(input);
    if (modelCustomer) {
      return {
        modelCustomer,
        originalInput: input,
        rawInputs: [input as PredictionInputPayload],
      };
    }
  }

  const prepared = prepareRawLines(Array.isArray(input) ? input : [input]);
  if (prepared.length !== 1) {
    throw new Error("Single prediction input must contain data for exactly one customer.");
  }

  const firstPrepared = prepared[0];
  if (!firstPrepared) {
    throw new Error("Prediction input is empty.");
  }

  return firstPrepared;
};

export const prepareBatchPredictionCustomers = (inputs: unknown[]): PreparedPredictionCustomer[] => {
  if (inputs.length === 0) {
    return [];
  }

  const transformedFeatures = inputs.map((input) => {
    return isRecord(input) ? toModelFeatures(input) : null;
  });

  if (transformedFeatures.every((features) => features !== null)) {
    return transformedFeatures.map((features, index) => {
      const originalInput = inputs[index];
      return {
        modelCustomer: features as ModelCustomerFeatures,
        originalInput,
        rawInputs: isRecord(originalInput) ? [originalInput as PredictionInputPayload] : [],
      };
    });
  }

  if (inputs.every(Array.isArray)) {
    return inputs.map(prepareSinglePredictionCustomer);
  }

  return prepareRawLines(inputs);
};
