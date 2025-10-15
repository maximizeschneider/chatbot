import "dotenv/config";
import express from "express";
import cors from "cors";
import { apiRouter } from "@/api";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api", apiRouter);

const port = Number(process.env.PORT) || 8787;
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});

