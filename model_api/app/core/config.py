from pathlib import Path

DEFAULT_THRESHOLD = 0.57

APP_DIR = Path(__file__).resolve().parents[1]
MODEL_API_DIR = APP_DIR.parent
MODELS_DIR = MODEL_API_DIR / "models"

FEATURE_ORDER = [
    "unique_products",
    "total_quantity",
    "total_orders",
    "total_spent",
    "cancelled_lines_count",
    "cancellation_ratio",
    "days_since_last_purchase",
    "avg_days_between_orders",
    "customer_lifetime_days",
    "is_short_history",
    "orders_per_month",
]

SUPPORTED_MODELS = {
    "logreg": MODELS_DIR / "logreg_purchase_predictor.joblib",
    "ranfor": MODELS_DIR / "ranfor_purchase_predictor.joblib",
}

MODEL_ALIASES = {
    "random_forest": "ranfor",
}
