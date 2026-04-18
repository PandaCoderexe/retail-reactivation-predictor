-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prediction_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "modelChosen" TEXT NOT NULL,
    "isBatch" BOOLEAN NOT NULL DEFAULT false,
    "threshold" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prediction_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prediction_inputs" (
    "id" TEXT NOT NULL,
    "predictionRequestId" TEXT NOT NULL,
    "invoice" TEXT,
    "stockCode" TEXT,
    "description" TEXT,
    "quantity" INTEGER,
    "invoiceDate" TIMESTAMP(3),
    "price" DOUBLE PRECISION,
    "customerId" TEXT,
    "country" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prediction_inputs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prediction_results" (
    "id" TEXT NOT NULL,
    "predictionRequestId" TEXT NOT NULL,
    "predictionInputId" TEXT NOT NULL,
    "prediction" INTEGER NOT NULL,
    "probability" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prediction_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "prediction_requests_userId_idx" ON "prediction_requests"("userId");

-- CreateIndex
CREATE INDEX "prediction_inputs_predictionRequestId_idx" ON "prediction_inputs"("predictionRequestId");

-- CreateIndex
CREATE INDEX "prediction_inputs_customerId_idx" ON "prediction_inputs"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "prediction_results_predictionInputId_key" ON "prediction_results"("predictionInputId");

-- CreateIndex
CREATE INDEX "prediction_results_predictionRequestId_idx" ON "prediction_results"("predictionRequestId");

-- AddForeignKey
ALTER TABLE "prediction_requests" ADD CONSTRAINT "prediction_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prediction_inputs" ADD CONSTRAINT "prediction_inputs_predictionRequestId_fkey" FOREIGN KEY ("predictionRequestId") REFERENCES "prediction_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prediction_results" ADD CONSTRAINT "prediction_results_predictionRequestId_fkey" FOREIGN KEY ("predictionRequestId") REFERENCES "prediction_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prediction_results" ADD CONSTRAINT "prediction_results_predictionInputId_fkey" FOREIGN KEY ("predictionInputId") REFERENCES "prediction_inputs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
