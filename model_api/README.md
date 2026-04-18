# Model API

FastAPI service for running predictions with the following models:

- `logreg`
- `ranfor`

## Run

From the repository root:

```bash
uvicorn model_api.app.main:app --reload
```

## Endpoints

- `GET /`
- `GET /health`
- `GET /models`
- `POST /predict` - defaults to `logreg`
- `POST /predict/batch` - defaults to `logreg`
- `POST /predict/{model_key}`
- `POST /predict/{model_key}/batch`

Supported `model_key` values:

- `logreg`
- `ranfor`
- `random_forest` - alias for `ranfor`
