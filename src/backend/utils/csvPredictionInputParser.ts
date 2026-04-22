import { type PredictionInputPayload } from "./predictionInputTransformer.js";

const parseCsvRows = (csvText: string, delimiter: string) => {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  const normalizedText = csvText.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let index = 0; index < normalizedText.length; index += 1) {
    const char = normalizedText[index];
    const nextChar = normalizedText[index + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      currentCell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === delimiter && !inQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = "";
      continue;
    }

    if (char === "\n" && !inQuotes) {
      currentRow.push(currentCell.trim());
      if (currentRow.some((cell) => cell.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = "";
      continue;
    }

    currentCell += char;
  }

  if (inQuotes) {
    throw new Error("CSV contains an unclosed quoted field.");
  }

  currentRow.push(currentCell.trim());
  if (currentRow.some((cell) => cell.length > 0)) {
    rows.push(currentRow);
  }

  return rows;
};

const countDelimiter = (line: string, delimiter: string) => {
  let count = 0;
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === delimiter && !inQuotes) {
      count += 1;
    }
  }

  return count;
};

const detectDelimiter = (csvText: string) => {
  const firstLine = csvText.replace(/^\uFEFF/, "").split(/\r?\n/).find((line) => line.trim());
  if (!firstLine) {
    return ",";
  }

  const candidates = [",", ";", "\t"];
  return candidates.reduce((bestDelimiter, delimiter) => {
    return countDelimiter(firstLine, delimiter) > countDelimiter(firstLine, bestDelimiter)
      ? delimiter
      : bestDelimiter;
  }, ",");
};

const normalizeHeader = (header: string) => {
  const normalizedHeader = header.trim().toLowerCase().replace(/[\s_-]+/g, "");
  const aliases: Record<string, string> = {
    invoice: "invoice",
    stockcode: "stockCode",
    description: "description",
    quantity: "quantity",
    invoicedate: "invoiceDate",
    price: "price",
    customerid: "customerId",
    customer: "customerId",
    country: "country",
  };

  return aliases[normalizedHeader] ?? header.trim();
};

export const parseCsvPredictionInput = (csvText: string): PredictionInputPayload[] => {
  if (!csvText.trim()) {
    throw new Error("CSV input is empty.");
  }

  const rows = parseCsvRows(csvText, detectDelimiter(csvText));
  const headers = rows[0]?.map(normalizeHeader);

  if (!headers || headers.length === 0) {
    throw new Error("CSV header row is required.");
  }

  const emptyHeaderIndex = headers.findIndex((header) => header.length === 0);
  if (emptyHeaderIndex >= 0) {
    throw new Error(`CSV header at column ${emptyHeaderIndex + 1} is empty.`);
  }

  const duplicateHeader = headers.find((header, index) => headers.indexOf(header) !== index);
  if (duplicateHeader) {
    throw new Error(`CSV header '${duplicateHeader}' is duplicated.`);
  }

  const dataRows = rows.slice(1);
  if (dataRows.length === 0) {
    throw new Error("CSV must contain at least one data row.");
  }

  return dataRows.map((row, rowIndex) => {
    if (row.length !== headers.length) {
      throw new Error(
        `CSV row ${rowIndex + 2} has ${row.length} columns, expected ${headers.length}.`,
      );
    }

    return headers.reduce((record, header, columnIndex) => {
      record[header] = row[columnIndex] ?? "";
      return record;
    }, {} as PredictionInputPayload);
  });
};
