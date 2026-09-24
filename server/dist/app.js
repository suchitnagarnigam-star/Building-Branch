"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const node_path_1 = __importDefault(require("node:path"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const complaintRoutes_1 = __importDefault(require("./routes/complaintRoutes"));
const database_1 = require("./db/database");
const app = (0, express_1.default)();
const moduleDirectory = __dirname;
const serverRoot = node_path_1.default.basename(moduleDirectory) === "dist"
    ? node_path_1.default.resolve(moduleDirectory, "..")
    : moduleDirectory;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use("/uploads", express_1.default.static(node_path_1.default.join(serverRoot, "uploads")));
app.use("/api/auth", authRoutes_1.default);
app.use("/api", complaintRoutes_1.default);
const PORT = 5000;
app.listen(PORT, async () => {
    console.log(`🚀 [Server] Running on http://localhost:${PORT}`);
    await (0, database_1.testDatabaseConnection)();
});
exports.default = app;
