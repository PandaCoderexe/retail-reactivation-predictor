export const createId = () => crypto.randomUUID();

export const prettyJson = (value: unknown) => JSON.stringify(value, null, 2);

export const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error";
};

export const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};
