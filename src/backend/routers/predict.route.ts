import express from "express";
import { defaultPredict, defaultBatchPredict, 
        modelPredict, modelBatchPredict, 
        predictionsHistory } from "../controllers/predict.controller.js";

const router = express.Router();

router.post("/defaultPredict", defaultPredict);

router.post("/defaultBatchPredict", defaultBatchPredict);

router.post("/:model", modelPredict);

router.post("/batch/:model", modelBatchPredict);

router.get("/history", predictionsHistory);

export default router;