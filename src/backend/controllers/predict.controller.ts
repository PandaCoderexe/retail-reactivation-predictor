import { Prisma } from "@prisma/client";
import { Request, Response } from "express";
import { prisma } from "../db/prisma.js";
import { calculatePredictionInputFromCsv } from "../utils/csvPredictionInputCalculator.js";
import {
  type PredictionInputPayload,
  type PreparedPredictionCustomer,
  prepareBatchPredictionCustomers,
  prepareSinglePredictionCustomer,
} from "../utils/predictionInputTransformer.js";

type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    username: string;
    fullName: string;
    createdAt: Date;
  };
};

type PredictRequestBody = {
  customer?: unknown;
  customerCsv?: unknown;
  csv?: unknown;
  dataType?: string;
  threshold?: unknown;
};

type BatchPredictRequestBody = {
  customers?: unknown;
  customersCsv?: unknown;
  csv?: unknown;
  dataType?: string;
  threshold?: unknown;
};

type PredictResponseBody = {
  prediction: number;
  probability: number;
  threshold: number;
  model_key: string;
  model_name: string;
};

type BatchPredictResponseBody = {
  threshold: number;
  model_key: string;
  model_name: string;
  results: Array<{
    prediction: number;
    probability: number;
  }>;
};

const getAuthenticatedUser = (req: Request) => {
  return (req as AuthenticatedRequest).user;
};

const getModelApiUrl = (path: string) => {
  const baseUrl = process.env.MODEL_API_URL ?? "http://127.0.0.1:8000";
  return new URL(path, baseUrl).toString();
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error";
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const parseModelApiError = async (response: globalThis.Response) => {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = (await response.json()) as { detail?: unknown; message?: unknown };
    const detail = body.detail ?? body.message;

    if (typeof detail === "string") {
      return detail;
    }

    if (detail !== undefined) {
      return JSON.stringify(detail);
    }

    return "Model API request failed";
  }

  return (await response.text()) || "Model API request failed";
};

const getCsvText = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return null;
};

const isCsvRequest = (body: unknown, primaryPayload: unknown) => {
  if (typeof body === "string") {
    return true;
  }

  if (!isRecord(body)) {
    return false;
  }

  return String(body.dataType ?? "").toLowerCase() === "csv" || typeof primaryPayload === "string";
};

const getSinglePredictionInput = (body: unknown) => {
  if (typeof body === "string") {
    return calculatePredictionInputFromCsv(body);
  }

  if (!isRecord(body)) {
    return undefined;
  }

  const requestBody = body as PredictRequestBody;
  if (isCsvRequest(body, requestBody.customer)) {
    const csvText = getCsvText(requestBody.customer, requestBody.customerCsv, requestBody.csv);
    if (!csvText) {
      throw new Error("CSV customer payload is required.");
    }

    return calculatePredictionInputFromCsv(csvText);
  }

  return requestBody.customer;
};

const getBatchPredictionInput = (body: unknown) => {
  if (typeof body === "string") {
    return calculatePredictionInputFromCsv(body);
  }

  if (!isRecord(body)) {
    return undefined;
  }

  const requestBody = body as BatchPredictRequestBody;
  if (isCsvRequest(body, requestBody.customers)) {
    const csvText = getCsvText(requestBody.customers, requestBody.customersCsv, requestBody.csv);
    if (!csvText) {
      throw new Error("CSV customers payload is required.");
    }

    return calculatePredictionInputFromCsv(csvText);
  }

  return requestBody.customers;
};

const getThreshold = (req: Request, body: unknown) => {
  const threshold = isRecord(body) ? body.threshold : req.query.threshold;
  if (threshold === undefined || threshold === null || threshold === "") {
    return undefined;
  }

  const parsedThreshold = Number(threshold);
  if (!Number.isFinite(parsedThreshold)) {
    throw new Error("threshold must be a finite number.");
  }

  return parsedThreshold;
};

const getInputField = (input: PredictionInputPayload | undefined, ...keys: string[]) => {
  if (!input) {
    return undefined;
  }

  for (const key of keys) {
    const value = input[key];
    if (value !== undefined && value !== null) {
      return value;
    }
  }

  return undefined;
};

const getOptionalString = (value: unknown) => {
  if (value === undefined || value === null) {
    return undefined;
  }

  const stringValue = String(value).trim();
  return stringValue || undefined;
};

const getOptionalInt = (value: unknown) => {
  if (value === undefined || value === null) {
    return undefined;
  }

  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) ? Math.trunc(numberValue) : undefined;
};

const getOptionalFloat = (value: unknown) => {
  if (value === undefined || value === null) {
    return undefined;
  }

  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
};

const getOptionalDate = (value: unknown) => {
  if (value === undefined || value === null) {
    return undefined;
  }

  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const buildPredictionInputData = (
  predictionRequestId: string,
  preparedCustomer: PreparedPredictionCustomer,
) => {
  const source = preparedCustomer.rawInputs[0];
  const invoice = getOptionalString(getInputField(source, "invoice", "Invoice"));
  const stockCode = getOptionalString(getInputField(source, "stockCode", "StockCode"));
  const description = getOptionalString(getInputField(source, "description", "Description"));
  const quantity = getOptionalInt(getInputField(source, "quantity", "Quantity"));
  const invoiceDate = getOptionalDate(getInputField(source, "invoiceDate", "InvoiceDate"));
  const price = getOptionalFloat(getInputField(source, "price", "Price"));
  const customerId = getOptionalString(
    getInputField(source, "customerId", "customerID", "CustomerID", "Customer ID"),
  );
  const country = getOptionalString(getInputField(source, "country", "Country"));
  const features = {
    originalInput: preparedCustomer.originalInput,
    modelFeatures: preparedCustomer.modelCustomer,
  };
  const data = {
    predictionRequestId,
    features: features as Prisma.InputJsonValue,
  } as Prisma.PredictionInputUncheckedCreateInput & { features?: Prisma.InputJsonValue };

  if (invoice !== undefined) data.invoice = invoice;
  if (stockCode !== undefined) data.stockCode = stockCode;
  if (description !== undefined) data.description = description;
  if (quantity !== undefined) data.quantity = quantity;
  if (invoiceDate !== undefined) data.invoiceDate = invoiceDate;
  if (price !== undefined) data.price = price;
  if (customerId !== undefined) data.customerId = customerId;
  if (country !== undefined) data.country = country;

  return data;
};

const callModelApi = async <TResponse>(path: string, payload: unknown): Promise<TResponse> => {
  const response = await fetch(getModelApiUrl(path), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseModelApiError(response));
  }

  return (await response.json()) as TResponse;
};

const toSingleModelPayload = (preparedCustomer: PreparedPredictionCustomer, threshold?: number) => {
  return {
    customer: preparedCustomer.modelCustomer,
    threshold,
  };
};

const toBatchModelPayload = (
  preparedCustomers: PreparedPredictionCustomer[],
  threshold?: number,
) => {
  return {
    customers: preparedCustomers.map((preparedCustomer) => preparedCustomer.modelCustomer),
    threshold,
  };
};

const saveSinglePrediction = async (
  userId: string,
  customer: PreparedPredictionCustomer,
  response: PredictResponseBody,
) => {
  const predictionRequest = await prisma.$transaction(async (tx) => {
    const createdRequest = await tx.predictionRequest.create({
      data: {
        userId,
        modelChosen: response.model_key,
        isBatch: false,
        threshold: response.threshold,
      },
    });

    const createdInput = await tx.predictionInput.create({
      data: buildPredictionInputData(createdRequest.id, customer),
    });

    const createdResult = await tx.predictionResult.create({
      data: {
        predictionRequestId: createdRequest.id,
        predictionInputId: createdInput.id,
        prediction: response.prediction,
        probability: response.probability,
      },
    });

    return {
      requestId: createdRequest.id,
      inputId: createdInput.id,
      resultId: createdResult.id,
    };
  });

  return predictionRequest;
};

const saveBatchPrediction = async (
  userId: string,
  customers: PreparedPredictionCustomer[],
  response: BatchPredictResponseBody,
) => {
  if (customers.length !== response.results.length) {
    throw new Error("Model API returned a mismatched number of batch results.");
  }

  const predictionRequest = await prisma.$transaction(async (tx) => {
    const createdRequest = await tx.predictionRequest.create({
      data: {
        userId,
        modelChosen: response.model_key,
        isBatch: true,
        threshold: response.threshold,
      },
    });

    for (const [index, customer] of customers.entries()) {
      const result = response.results[index];

      if (!result) {
        throw new Error(`Missing batch result for customer index ${index}.`);
      }

      const createdInput = await tx.predictionInput.create({
        data: buildPredictionInputData(createdRequest.id, customer),
      });

      await tx.predictionResult.create({
        data: {
          predictionRequestId: createdRequest.id,
          predictionInputId: createdInput.id,
          prediction: result.prediction,
          probability: result.probability,
        },
      });
    }

    return {
      requestId: createdRequest.id,
      itemsSaved: customers.length,
    };
  });

  return predictionRequest;
};

export const defaultPredict = async (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  const body = req.body as unknown;

  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  let input: unknown;
  let threshold: number | undefined;
  try {
    threshold = getThreshold(req, body);
    input = getSinglePredictionInput(body);
  } catch (error: unknown) {
    return res.status(400).json({
      message: "Invalid prediction input",
      error: getErrorMessage(error),
    });
  }

  if (input === undefined || input === null) {
    return res.status(400).json({ message: "customer payload is required" });
  }

  let preparedCustomer: PreparedPredictionCustomer;
  try {
    preparedCustomer = prepareSinglePredictionCustomer(input);
  } catch (error: unknown) {
    return res.status(400).json({
      message: "Invalid prediction input",
      error: getErrorMessage(error),
    });
  }

  try {
    const modelPayload = toSingleModelPayload(preparedCustomer, threshold);
    const prediction = await callModelApi<PredictResponseBody>("/predict", modelPayload);

    const savedPrediction = await saveSinglePrediction(user.id, preparedCustomer, prediction);

    return res.status(200).json({
      message: "Prediction created successfully",
      prediction,
      requestId: savedPrediction.requestId,
    });
  } catch (error: unknown) {
    return res.status(502).json({
      message: "Failed to get prediction from model API",
      error: getErrorMessage(error),
    });
  }
};

export const defaultBatchPredict = async (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  const body = req.body as unknown;

  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  let input: unknown;
  let threshold: number | undefined;
  try {
    threshold = getThreshold(req, body);
    input = getBatchPredictionInput(body);
  } catch (error: unknown) {
    return res.status(400).json({
      message: "Invalid prediction input",
      error: getErrorMessage(error),
    });
  }

  if (!Array.isArray(input) || input.length === 0) {
    return res.status(400).json({ message: "customers array is required" });
  }

  let preparedCustomers: PreparedPredictionCustomer[];
  try {
    preparedCustomers = prepareBatchPredictionCustomers(input);
  } catch (error: unknown) {
    return res.status(400).json({
      message: "Invalid prediction input",
      error: getErrorMessage(error),
    });
  }

  try {
    const modelPayload = toBatchModelPayload(preparedCustomers, threshold);
    const prediction = await callModelApi<BatchPredictResponseBody>("/predict/batch", modelPayload);

    const savedPrediction = await saveBatchPrediction(user.id, preparedCustomers, prediction);

    return res.status(200).json({
      message: "Batch prediction created successfully",
      prediction,
      requestId: savedPrediction.requestId,
      itemsSaved: savedPrediction.itemsSaved,
    });
  } catch (error: unknown) {
    return res.status(502).json({
      message: "Failed to get batch prediction from model API",
      error: getErrorMessage(error),
    });
  }
};

export const modelPredict = async (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  const body = req.body as unknown;
  const model = req.params.model;

  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  let input: unknown;
  let threshold: number | undefined;
  try {
    threshold = getThreshold(req, body);
    input = getSinglePredictionInput(body);
  } catch (error: unknown) {
    return res.status(400).json({
      message: "Invalid prediction input",
      error: getErrorMessage(error),
    });
  }

  if (input === undefined || input === null) {
    return res.status(400).json({ message: "customer payload is required" });
  }

  if (typeof model !== "string" || model.length === 0) {
    return res.status(400).json({ message: "model parameter is required" });
  }

  let preparedCustomer: PreparedPredictionCustomer;
  try {
    preparedCustomer = prepareSinglePredictionCustomer(input);
  } catch (error: unknown) {
    return res.status(400).json({
      message: "Invalid prediction input",
      error: getErrorMessage(error),
    });
  }

  try {
    const modelPayload = toSingleModelPayload(preparedCustomer, threshold);
    const prediction = await callModelApi<PredictResponseBody>(
      `/predict/${encodeURIComponent(model)}`,
      modelPayload,
    );

    const savedPrediction = await saveSinglePrediction(user.id, preparedCustomer, prediction);

    return res.status(200).json({
      message: "Prediction created successfully",
      prediction,
      requestId: savedPrediction.requestId,
    });
  } catch (error: unknown) {
    return res.status(502).json({
      message: "Failed to get prediction from model API",
      error: getErrorMessage(error),
    });
  }
};

export const modelBatchPredict = async (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  const body = req.body as unknown;
  const model = req.params.model;

  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  let input: unknown;
  let threshold: number | undefined;
  try {
    threshold = getThreshold(req, body);
    input = getBatchPredictionInput(body);
  } catch (error: unknown) {
    return res.status(400).json({
      message: "Invalid prediction input",
      error: getErrorMessage(error),
    });
  }

  if (!Array.isArray(input) || input.length === 0) {
    return res.status(400).json({ message: "customers array is required" });
  }

  if (typeof model !== "string" || model.length === 0) {
    return res.status(400).json({ message: "model parameter is required" });
  }

  let preparedCustomers: PreparedPredictionCustomer[];
  try {
    preparedCustomers = prepareBatchPredictionCustomers(input);
  } catch (error: unknown) {
    return res.status(400).json({
      message: "Invalid prediction input",
      error: getErrorMessage(error),
    });
  }

  try {
    const modelPayload = toBatchModelPayload(preparedCustomers, threshold);
    const prediction = await callModelApi<BatchPredictResponseBody>(
      `/predict/${encodeURIComponent(model)}/batch`,
      modelPayload,
    );

    const savedPrediction = await saveBatchPrediction(user.id, preparedCustomers, prediction);

    return res.status(200).json({
      message: "Batch prediction created successfully",
      prediction,
      requestId: savedPrediction.requestId,
      itemsSaved: savedPrediction.itemsSaved,
    });
  } catch (error: unknown) {
    return res.status(502).json({
      message: "Failed to get batch prediction from model API",
      error: getErrorMessage(error),
    });
  }
};

export const predictionsHistory = async (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);

  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const history = await prisma.predictionRequest.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        inputs: {
          include: {
            result: true,
          },
        },
      },
    });

    return res.status(200).json({ history });
  } catch (error: unknown) {
    return res.status(500).json({
      message: "Failed to load prediction history",
      error: getErrorMessage(error),
    });
  }
};
