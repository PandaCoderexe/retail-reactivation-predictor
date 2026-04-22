import type { DataType, PredictionMode } from "../types";

const sampleSingleInput = `[
  {
    "invoice": "10001",
    "stockCode": "A001",
    "description": "Product A",
    "quantity": 2,
    "invoiceDate": "2024-01-01T10:00:00.000Z",
    "price": 10.5,
    "customerId": "CUST-1",
    "country": "United Kingdom"
  },
  {
    "invoice": "10002",
    "stockCode": "B002",
    "description": "Product B",
    "quantity": 1,
    "invoiceDate": "2024-02-15T10:00:00.000Z",
    "price": 20,
    "customerId": "CUST-1",
    "country": "United Kingdom"
  }
]`;

const sampleBatchInput = `[
  {
    "invoice": "20001",
    "stockCode": "A001",
    "description": "Product A",
    "quantity": 2,
    "invoiceDate": "2024-01-01T10:00:00.000Z",
    "price": 10,
    "customerId": "CUST-10",
    "country": "United Kingdom"
  },
  {
    "invoice": "30001",
    "stockCode": "C003",
    "description": "Product C",
    "quantity": 5,
    "invoiceDate": "2024-03-01T10:00:00.000Z",
    "price": 4,
    "customerId": "CUST-20",
    "country": "Germany"
  }
]`;

const sampleSingleCsvInput = `invoice,stockCode,description,quantity,invoiceDate,price,customerId,country
10001,A001,Product A,2,2024-01-01T10:00:00.000Z,10.5,CUST-1,United Kingdom
10002,B002,Product B,1,2024-02-15T10:00:00.000Z,20,CUST-1,United Kingdom`;

const sampleBatchCsvInput = `invoice,stockCode,description,quantity,invoiceDate,price,customerId,country
20001,A001,Product A,2,2024-01-01T10:00:00.000Z,10,CUST-10,United Kingdom
30001,C003,Product C,5,2024-03-01T10:00:00.000Z,4,CUST-20,Germany`;

export const getSampleInput = (mode: PredictionMode, dataType: DataType) => {
  if (dataType === "csv") {
    return mode === "single" ? sampleSingleCsvInput : sampleBatchCsvInput;
  }

  return mode === "single" ? sampleSingleInput : sampleBatchInput;
};
