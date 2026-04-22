# Retail Reactivation Predictor

Retail Reactivation Predictor is a full-stack application for predicting whether retail customers are likely to buy again. It accepts transaction data as JSON or CSV, transforms raw purchase lines into model features, sends those features to trained machine-learning models, and shows the result in a chat-style frontend.

The project is split into three main parts:

- `src/frontend` - React + Vite user interface.
- `src/backend` - Express + TypeScript API for authentication, request validation, persistence, and communication with the model API.
- `model_api` - FastAPI service that loads trained scikit-learn models and returns predictions.

The frontend interface was written by AI.

## What The App Does

The application helps estimate customer reactivation probability from transaction history. A user can paste or upload purchase records, choose single-customer or batch prediction, select a model, and submit the request. The app returns a readable message with customer or invoice context, prediction, probability, model name, and threshold.

Supported input formats:

- JSON transaction rows.
- CSV transaction rows.
- Single-customer prediction.
- Batch prediction for multiple customers.

Supported model choices:

- `default` - backend default, currently logistic regression.
- `logreg` - logistic regression model.
- `ranfor` - random forest model.
- `random_forest` - alias for `ranfor`.

## Architecture

```text
Browser
  |
  | React frontend on http://localhost:5173
  v
Node/Express backend on http://localhost:4000
  |
  | Transforms raw rows into ML features and stores requests/results
  v
FastAPI model API on http://127.0.0.1:8000
  |
  | Loads joblib models and returns prediction probabilities
  v
Trained scikit-learn models
```

The frontend never calls the Python model service directly. It talks to the Node backend, which handles authentication, payload normalization, feature creation, persistence, and model API calls.

## Main Features

- User signup, login, logout, and `/auth/me` session checking.
- Cookie-based authenticated prediction requests.
- JSON and CSV input.
- Drag-and-drop file loading for `.json` and `.csv`.
- Single and batch prediction modes.
- Model selection panel.
- Light and dark theme toggle.
- Chat-style request and response history in the browser.
- Human-readable prediction summaries instead of raw JSON.
- PostgreSQL persistence through Prisma.
- Saved prediction requests, inputs, model choices, thresholds, probabilities, and results.

## Machine Learning Flow

The backend accepts raw retail transaction rows with fields like:

- `invoice`
- `stockCode`
- `description`
- `quantity`
- `invoiceDate`
- `price`
- `customerId`
- `country`

It groups rows by customer and calculates the model feature vector:

- `unique_products`
- `total_quantity`
- `total_orders`
- `total_spent`
- `cancelled_lines_count`
- `cancellation_ratio`
- `days_since_last_purchase`
- `avg_days_between_orders`
- `customer_lifetime_days`
- `is_short_history`
- `orders_per_month`

The FastAPI service receives those features, runs the selected model, and returns:

- `prediction` - `1` means the customer is predicted to buy again, `0` means not likely.
- `probability` - purchase probability from the model.
- `threshold` - cutoff used to convert probability into the final prediction.
- `model_key`
- `model_name`

Default model threshold in the model API is `0.57`.

## Repository Structure

```text
.
├── model_api/
│   ├── app/
│   │   ├── core/
│   │   ├── routes/
│   │   ├── schemas/
│   │   └── service/
│   └── README.md
├── notebooks/
│   ├── cleaning_data.ipynb
│   ├── eda.ipynb
│   ├── logreg_model_creation.ipynb
│   └── ranfor_model_creation.ipynb
├── src/
│   ├── backend/
│   │   ├── controllers/
│   │   ├── db/
│   │   ├── middleware/
│   │   ├── prisma/
│   │   ├── routers/
│   │   └── utils/
│   └── frontend/
│       ├── public/
│       └── src/
│           ├── components/
│           ├── constants/
│           ├── utils/
│           ├── App.tsx
│           ├── main.tsx
│           ├── styles.css
│           └── types.ts
├── requirements.txt
└── README.md
```

Frontend source code is intentionally split by responsibility:

- `src/frontend/src/App.tsx` - application state, orchestration, and request handlers.
- `src/frontend/src/components/` - reusable UI sections such as the sidebar, top bar, composer, message list, auth modal, logout confirmation modal, and model panel.
- `src/frontend/src/constants/` - static model options and sample JSON/CSV input data.
- `src/frontend/src/utils/` - API parsing, common helpers, payload building, endpoint selection, and prediction result formatting.
- `src/frontend/src/types.ts` - shared frontend TypeScript types.
- `src/frontend/src/styles.css` - global styles and light/dark theme variables.

## Prerequisites

Install these before running the full stack:

- Node.js and npm.
- Python 3.11+ recommended.
- PostgreSQL database.
- Trained model files in `model_api/models/`:
  - `logreg_purchase_predictor.joblib`
  - `ranfor_purchase_predictor.joblib`

## Environment Variables

Create a backend environment file at `src/backend/.env`. You can start from `src/backend/.env.sample`.

```env
PORT=4000
FRONTEND_ORIGIN="http://localhost:5173"
MODEL_API_URL="http://127.0.0.1:8000"
DATABASE_URL="postgresql://user:password@your-pooled-host/dbname?sslmode=require&channel_binding=require"
DIRECT_DATABASE_URL="postgresql://user:password@your-direct-host/dbname?sslmode=require&channel_binding=require"
```

The backend loads `.env` from `src/backend/.env` first, then from `src/.env` if present.

The frontend optionally supports:

```env
VITE_API_BASE_URL=http://localhost:4000
```

If this is not set, the frontend defaults to `http://localhost:4000`.

## Setup

Install Python dependencies from the repository root:

```bash
pip install -r requirements.txt
```

Install backend dependencies:

```bash
cd src/backend
npm install
```

Install frontend dependencies:

```bash
cd src/frontend
npm install
```

Generate Prisma client and apply database migrations from `src/backend`:

```bash
npx prisma generate
npx prisma migrate deploy
```

For local development, if you need to create or apply new migrations, use Prisma's normal migration workflow:

```bash
npx prisma migrate dev
```

## Running The App

Start the model API from the repository root:

```bash
uvicorn model_api.app.main:app --reload
```

Start the backend:

```bash
cd src/backend
npm run dev
```

Start the frontend:

```bash
cd src/frontend
npm run dev
```

Default local URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`
- Model API: `http://127.0.0.1:8000`

## Frontend Usage

1. Open `http://localhost:5173`.
2. Create an account or log in.
3. Choose `Single` or `Batch`.
4. Choose `JSON` or `CSV`.
5. Paste transaction data or use the `+` button to load a `.json` or `.csv` file.
6. Choose a model from the model panel if needed.
7. Click `Send`.
8. Read the chat response with customer/invoice context, prediction, probability, model, and threshold.

The `Me` button opens a logout confirmation dialog before signing the user out.

## Example JSON Input

```json
[
  {
    "invoice": "10001",
    "stockCode": "A001",
    "description": "Product A",
    "quantity": 2,
    "invoiceDate": "2024-01-01T10:00:00.000Z",
    "price": 10.5,
    "customerId": "CUST-1",
    "country": "United Kingdom"
  },
  {
    "invoice": "10002",
    "stockCode": "B002",
    "description": "Product B",
    "quantity": 1,
    "invoiceDate": "2024-02-15T10:00:00.000Z",
    "price": 20,
    "customerId": "CUST-1",
    "country": "United Kingdom"
  }
]
```

## Example CSV Input

```csv
invoice,stockCode,description,quantity,invoiceDate,price,customerId,country
10001,A001,Product A,2,2024-01-01T10:00:00.000Z,10.5,CUST-1,United Kingdom
10002,B002,Product B,1,2024-02-15T10:00:00.000Z,20,CUST-1,United Kingdom
```

## Backend API

Authentication endpoints:

- `POST /auth/signup`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`

Prediction endpoints:

- `POST /predict/defaultPredict`
- `POST /predict/defaultBatchPredict`
- `POST /predict/:model`
- `POST /predict/batch/:model`
- `GET /predict/history`

All prediction endpoints require authentication.

For JSON requests, send:

```json
{
  "dataType": "json",
  "customer": [
    {
      "invoice": "10001",
      "stockCode": "A001",
      "description": "Product A",
      "quantity": 2,
      "invoiceDate": "2024-01-01T10:00:00.000Z",
      "price": 10.5,
      "customerId": "CUST-1",
      "country": "United Kingdom"
    }
  ]
}
```

For batch JSON requests, use `customers` instead of `customer`.

For CSV requests, send `Content-Type: text/csv` with the CSV body, or send JSON with `dataType: "csv"` and `customer` or `customers` containing CSV text.

Optional threshold can be sent in the JSON body:

```json
{
  "threshold": 0.57
}
```

## Model API

Model API endpoints:

- `GET /`
- `GET /health`
- `GET /models`
- `POST /predict`
- `POST /predict/batch`
- `POST /predict/{model_key}`
- `POST /predict/{model_key}/batch`

The model API expects already calculated model features, not raw invoice rows. In normal app usage, the Node backend performs this transformation.

## Database

The backend uses Prisma with PostgreSQL.

Stored tables:

- `users` - account records.
- `prediction_requests` - one row per submitted prediction request.
- `prediction_inputs` - original input metadata and calculated feature JSON.
- `prediction_results` - model prediction and probability for each input.

Prediction inputs store both user-facing transaction fields and a `features` JSON object containing the original input and calculated model features.

## Development Commands

Backend:

```bash
cd src/backend
npm run dev
npm run build
npm run typecheck
```

Frontend:

```bash
cd src/frontend
npm run dev
npm run build
npm run preview
```

Model API:

```bash
uvicorn model_api.app.main:app --reload
```

## Notes And Limitations

- Predictions are probabilistic and can be wrong.
- The app should support business judgment, not replace it.
- Only upload data you are allowed to process.
- The backend currently expects a reachable PostgreSQL database.
- The model API requires trained `.joblib` model files at the configured paths.
- The frontend was written by AI and should be reviewed like any generated code before production use.

## License

See `LICENSE`.
