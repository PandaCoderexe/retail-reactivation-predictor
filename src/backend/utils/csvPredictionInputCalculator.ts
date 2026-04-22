import { parseCsvPredictionInput } from "./csvPredictionInputParser.js";
import { type PredictionInputPayload } from "./predictionInputTransformer.js";

export const calculatePredictionInputFromCsv = (csvText: string): PredictionInputPayload[] => {
  return parseCsvPredictionInput(csvText);
};
