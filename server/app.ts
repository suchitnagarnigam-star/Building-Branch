import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";

import authRoutes from "./routes/authRoutes";
import complaintRoutes from "./routes/complaintRoutes";
import userRoutes from "./routes/userRoutes";
import analyticsRoutes from "./routes/analyticsRoutes";
import enforcementRoutes from "./routes/enforcementRoutes";
import pushRoutes from "./routes/pushRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import driveRoutes from "./routes/driveRoutes";
import { testDatabaseConnection } from "./db/database";

const app = express();
const moduleDirectory = __dirname;
const serverRoot = path.basename(moduleDirectory) === "dist"
  ? path.resolve(moduleDirectory, "..")
  : moduleDirectory;

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(serverRoot, "uploads")));

// Health check endpoint
app.get(["/health", "/api/health"], (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Mount routes under both /api/* and /* to seamlessly support all frontend base URL configs
app.use("/api/auth", authRoutes);
app.use("/auth", authRoutes);

app.use("/api/users", userRoutes);
app.use("/users", userRoutes);

app.use("/api/analytics", analyticsRoutes);
app.use("/analytics", analyticsRoutes);

app.use("/api/push", pushRoutes);
app.use("/push", pushRoutes);

app.use("/api/notifications", notificationRoutes);
app.use("/notifications", notificationRoutes);

app.use("/api/drive", driveRoutes);
app.use("/drive", driveRoutes);

app.use("/api", complaintRoutes);
app.use(complaintRoutes);

app.use("/api", enforcementRoutes);
app.use(enforcementRoutes);

const PORT = process.env.PORT ? Number(process.env.PORT) : 5000;

app.listen(PORT, async () => {
  console.log(`🚀 [Server] Running on http://localhost:${PORT}`);
  await testDatabaseConnection();
});

export default app;