import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { db } from "./db";
import ordersRoutes from "./routes/orders";

const app = express();

app.use(cors());
app.use(express.json());

// UNCOMMENT FOR LIVE SYNAPSE --DISCOVER DEMO
// import fraudRiskRoutes from "./routes/fraudRisk";
// app.use("/api", fraudRiskRoutes);

app.use(ordersRoutes);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "NOT_FOUND", message: "Route not found." });
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = error instanceof Error ? error.message : "Unexpected error.";
  res.status(500).json({ error: "INTERNAL_ERROR", message });
});

const parsedPort = Number(process.env.PORT);
const port = Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : 4001;

const server = app.listen(port, () => {
  console.log(`orders-service listening on port ${port}`);
});

let shuttingDown = false;

function shutdown(): void {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  server.close(() => {
    db.close();
    process.exit(0);
  });

  setTimeout(() => {
    process.exit(1);
  }, 5000).unref();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
