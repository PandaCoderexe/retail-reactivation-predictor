import type { ModelOption } from "../types";

export const modelOptions: ModelOption[] = [
  {
    key: "default",
    name: "Default",
    description: "Backend default model, currently logistic regression.",
  },
  {
    key: "logreg",
    name: "Logistic Regression",
    description: "Linear model for fast purchase probability scoring.",
  },
  {
    key: "ranfor",
    name: "Random Forest",
    description: "Tree ensemble model trained on customer purchase features.",
  },
  {
    key: "random_forest",
    name: "Random Forest Alias",
    description: "Alias supported by the model API for the random forest model.",
  },
];
