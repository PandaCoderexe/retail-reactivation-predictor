from contextlib import asynccontextmanager

from fastapi import FastAPI

from .core.config import SUPPORTED_MODELS
from .routes.predictions import router as predictions_router
from .routes.system import router as system_router
from .service.model_service import ModelService


@asynccontextmanager
async def lifespan(app: FastAPI):
    model_service = ModelService(SUPPORTED_MODELS)
    model_service.load_models()
    app.state.model_service = model_service
    yield


app = FastAPI(
    title="Purchase Prediction ML Service",
    version="1.0.0",
    description=(
        "FastAPI service for predicting whether a customer will "
        "purchase in the next 30 days."
    ),
    lifespan=lifespan,
)

app.include_router(system_router)
app.include_router(predictions_router)

# Run locally with:
# uvicorn model_api.app.main:app --reload