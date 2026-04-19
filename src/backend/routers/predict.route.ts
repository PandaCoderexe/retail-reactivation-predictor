import express from "express";
import { defaultPredict, defaultBatchPredict, 
        modelPredict, modelBatchPredict, 
        predictionsHistory } from "../controllers/predict.controller.js";
import authMiddleware from "../middleware/authMiddleware.js"

const router = express.Router();

router.post("/defaultPredict", authMiddleware ,defaultPredict);

router.post("/defaultBatchPredict", authMiddleware ,defaultBatchPredict);

router.post("/:model", authMiddleware ,modelPredict);

router.post("/batch/:model", authMiddleware ,modelBatchPredict);

router.get("/history", authMiddleware ,predictionsHistory);

export default router;