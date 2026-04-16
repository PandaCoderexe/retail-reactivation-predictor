from fastapi import APIRouter, Request

from ..core.config import DEFAULT_THRESHOLD
from ..schemas.prediction import HealthResponse, ModelStatusResponse, RootResponse
from ..service.model_service import ModelService

router = APIRouter(tags=["system"])


def _get_model_service(request: Request) -> ModelService:
    return request.app.state.model_service


@router.get("/", response_model=RootResponse)
def root() -> RootResponse:
    return RootResponse(
        message="Purchase Prediction ML Service is running.",
        docs="/docs",
        health="/health",
        models="/models",
        predict_default="/predict",
        batch_predict_default="/predict/batch",
        predict_by_model="/predict/{model_key}",
        batch_predict_by_model="/predict/{model_key}/batch",
    )


@router.get("/health", response_model=HealthResponse)
def health(request: Request) -> HealthResponse:
    model_service = _get_model_service(request)
    models: list[ModelStatusResponse] = model_service.list_models()

    return HealthResponse(
        status="ok",
        default_threshold=DEFAULT_THRESHOLD,
        models=models,
    )


@router.get("/models", response_model=list[ModelStatusResponse])
def list_models(request: Request) -> list[ModelStatusResponse]:
    model_service = _get_model_service(request)
    return model_service.list_models()
