import express from "express";
import authRoutes from "./routers/auth.route.js";
import predictRoutes from "./routers/predict.route.js"

const app = express();

app.use(express.json());

app.use("/auth", authRoutes);
app.use("/predict", predictRoutes);

app.get("/", (req, res) => {
    res.send("Hello, you are on my server");
})

app.listen(3000, () => {
    console.log("Server is running on port: 3000");
})