from pathlib import Path
from typing import Dict, Iterable, List

import joblib
from fastapi import HTTPException

from ..core.config import FEATURE_ORDER, MODEL_ALIASES
from ..schemas.prediction import (
    BatchItemResponse,
    BatchPredictResponse,
    CustomerFeatures,
    ModelStatusResponse,
    PredictResponse,
)


class ModelService:
    def __init__(self, model_paths: Dict[str, Path]) -> None:
        self.model_paths = model_paths
        self.models: Dict[str, object] = {}

    def load_models(self) -> None:
        missing_paths = [path for path in self.model_paths.values() if not path.exists()]
        if missing_paths:
            missing = ", ".join(str(path) for path in missing_paths)
            raise RuntimeError(
                f"Model files not found: {missing}. "
                "Make sure the .joblib files exist before starting the API."
            )

        for model_key, model_path in self.model_paths.items():
            self.models[model_key] = joblib.load(model_path)

    def list_models(self) -> List[ModelStatusResponse]:
        return [
            ModelStatusResponse(
                model_key=model_key,
                model_name=model_path.name,
                model_path=str(model_path),
                loaded=model_key in self.models,
            )
            for model_key, model_path in self.model_paths.items()
        ]

    def predict_one(
        self,
        model_key: str,
        customer: CustomerFeatures,
        threshold: float,
    ) -> PredictResponse:
        
        resolved_model_key = self._resolve_model_key(model_key)
        model = self._get_model(resolved_model_key)

        try:
            features = self._customers_to_dataframe([customer])
            probability = float(model.predict_proba(features)[0, 1])
            prediction = int(probability >= threshold)
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Prediction failed: {exc}") from exc

        return PredictResponse(
            prediction=prediction,
            probability=probability,
            threshold=threshold,
            model_key=resolved_model_key,
            model_name=self.model_paths[resolved_model_key].name,
        )

    def predict_batch(
        self,
        model_key: str,
        customers: List[CustomerFeatures],
        threshold: float,
    ) -> BatchPredictResponse:
        
        if not customers:
            raise HTTPException(status_code=400, detail="Customers list cannot be empty.")

        resolved_model_key = self._resolve_model_key(model_key)
        model = self._get_model(resolved_model_key)

        try:
            features = self._customers_to_dataframe(customers)
            probabilities = model.predict_proba(features)[:, 1]
            predictions = (probabilities >= threshold).astype(int)

        except Exception as exc:
            raise HTTPException(
                status_code=400,
                detail=f"Batch prediction failed: {exc}",
            ) from exc

        results = [
            BatchItemResponse(
                prediction=int(prediction),
                probability=float(probability),
            )

            for prediction, probability in zip(predictions, probabilities)
        ]

        return BatchPredictResponse(
            threshold=threshold,
            model_key=resolved_model_key,
            model_name=self.model_paths[resolved_model_key].name,
            results=results,
        )

    def _get_model(self, model_key: str) -> object:
        model = self.models.get(model_key)
        if model is None:
            raise HTTPException(
                status_code=500,
                detail=f"Model '{model_key}' is not loaded.",
            )
        
        return model

    def _resolve_model_key(self, model_key: str) -> str:
        raw_model_key = model_key.strip().lower()
        normalized = MODEL_ALIASES.get(raw_model_key, raw_model_key)
        if normalized not in self.model_paths:

            available = ", ".join(sorted(self.model_paths))

            raise HTTPException(
                status_code=404,
                detail=f"Unsupported model '{model_key}'. Available models: {available}.",
            )
        
        return normalized

    @staticmethod
    def _customers_to_dataframe(customers: Iterable[CustomerFeatures]):
        import pandas as pd

        rows = [customer.model_dump() for customer in customers]
        dataframe = pd.DataFrame(rows)
        return dataframe[FEATURE_ORDER]
