import express from "express";
import cors from "cors";
import path from "node:path";

import complaintRoutes from "./routes/complaintRoutes";

const app = express();
const moduleDirectory = __dirname;
const serverRoot = path.basename(moduleDirectory) === "dist"
  ? path.resolve(moduleDirectory, "..")
  : moduleDirectory;

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(serverRoot, "uploads")));
app.use("/api", complaintRoutes);

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});