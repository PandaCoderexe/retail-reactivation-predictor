from fastapi import APIRouter, Request

from ..schemas.prediction import (
    BatchPredictRequest,
    BatchPredictResponse,
    PredictRequest,
    PredictResponse,
)
from ..service.model_service import ModelService

router = APIRouter(prefix="/predict", tags=["predictions"])


def _get_model_service(request: Request) -> ModelService:
    return request.app.state.model_service


@router.post("", response_model=PredictResponse)
def predict_default(request: Request, payload: PredictRequest) -> PredictResponse:
    model_service = _get_model_service(request)
    return model_service.predict_one(
        model_key="logreg",
        customer=payload.customer,
        threshold=payload.threshold,
    )


@router.post("/batch", response_model=BatchPredictResponse)
def predict_batch_default(
    request: Request,
    payload: BatchPredictRequest,
) -> BatchPredictResponse:
    model_service = _get_model_service(request)
    return model_service.predict_batch(
        model_key="logreg",
        customers=payload.customers,
        threshold=payload.threshold,
    )


@router.post("/{model_key}", response_model=PredictResponse)
def predict_by_model(
    model_key: str,
    request: Request,
    payload: PredictRequest,
) -> PredictResponse:
    model_service = _get_model_service(request)
    return model_service.predict_one(
        model_key=model_key,
        customer=payload.customer,
        threshold=payload.threshold,
    )


@router.post("/{model_key}/batch", response_model=BatchPredictResponse)
def predict_batch_by_model(
    model_key: str,
    request: Request,
    payload: BatchPredictRequest,
) -> BatchPredictResponse:
    model_service = _get_model_service(request)
    return model_service.predict_batch(
        model_key=model_key,
        customers=payload.customers,
        threshold=payload.threshold,
    )
