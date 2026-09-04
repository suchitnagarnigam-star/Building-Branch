import express from "express";
import cors from "cors";

import complaintRoutes from "./routes/complaintRoutes";

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api", complaintRoutes);

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});