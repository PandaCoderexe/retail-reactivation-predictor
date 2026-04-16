from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from ..core.config import DEFAULT_THRESHOLD


class ApiBaseModel(BaseModel):
    model_config = ConfigDict(protected_namespaces=())


class CustomerFeatures(ApiBaseModel):
    unique_products: int = Field(..., ge=0)
    total_quantity: float = Field(..., ge=0)
    total_orders: int = Field(..., ge=0)
    total_spent: float = Field(..., ge=0)
    cancelled_lines_count: int = Field(..., ge=0)
    cancellation_ratio: float = Field(..., ge=0)
    days_since_last_purchase: float = Field(..., ge=0)
    avg_days_between_orders: float
    customer_lifetime_days: float = Field(..., ge=0)
    is_short_history: int = Field(..., ge=0, le=1)
    orders_per_month: float = Field(..., ge=0)


class PredictRequest(ApiBaseModel):
    customer: CustomerFeatures
    threshold: Optional[float] = Field(default=DEFAULT_THRESHOLD, ge=0.0, le=1.0)


class BatchPredictRequest(ApiBaseModel):
    customers: List[CustomerFeatures]
    threshold: Optional[float] = Field(default=DEFAULT_THRESHOLD, ge=0.0, le=1.0)


class PredictResponse(ApiBaseModel):
    prediction: int
    probability: float
    threshold: float
    model_key: str
    model_name: str


class BatchItemResponse(ApiBaseModel):
    prediction: int
    probability: float


class BatchPredictResponse(ApiBaseModel):
    threshold: float
    model_key: str
    model_name: str
    results: List[BatchItemResponse]


class ModelStatusResponse(ApiBaseModel):
    model_key: str
    model_name: str
    model_path: str
    loaded: bool


class HealthResponse(ApiBaseModel):
    status: str
    default_threshold: float
    models: List[ModelStatusResponse]


class RootResponse(ApiBaseModel):
    message: str
    docs: str
    health: str
    models: str
    predict_default: str
    batch_predict_default: str
    predict_by_model: str
    batch_predict_by_model: str
