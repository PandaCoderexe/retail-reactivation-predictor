# Model API

FastAPI do obsługi predykcji dla modeli:

- `logreg`
- `ranfor`

## Uruchomienie

Z katalogu głównego repo:

```bash
uvicorn model_api.app.main:app --reload
```

## Endpointy

- `GET /`
- `GET /health`
- `GET /models`
- `POST /predict` - domyślnie `logreg`
- `POST /predict/batch` - domyślnie `logreg`
- `POST /predict/{model_key}`
- `POST /predict/{model_key}/batch`

Obsługiwane `model_key`:

- `logreg`
- `ranfor`
- `random_forest` - alias do `ranfor`
