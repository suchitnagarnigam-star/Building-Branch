"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveComplaint = exports.generateComplaintId = exports.getComplaints = void 0;
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
const moduleDirectory = __dirname;
const parentDirectory = node_path_1.default.resolve(moduleDirectory, "..");
const serverRoot = node_path_1.default.basename(parentDirectory) === "dist"
    ? node_path_1.default.resolve(parentDirectory, "..")
    : parentDirectory;
const getComplaintsFilePath = () => node_path_1.default.join(serverRoot, "data", "complaints.json");
const getComplaints = async () => {
    const filePath = getComplaintsFilePath();
    const file = await (0, promises_1.readFile)(filePath, "utf-8");
    return JSON.parse(file);
};
exports.getComplaints = getComplaints;
const generateComplaintId = async () => {
    const complaints = await (0, exports.getComplaints)();
    const nextNumber = complaints.length + 1;
    return `MCL-BB-${String(nextNumber).padStart(4, "0")}`;
};
exports.generateComplaintId = generateComplaintId;
const saveComplaint = async (complaint) => {
    // Ensure uploads/ directory exists
    await (0, promises_1.mkdir)(node_path_1.default.join(serverRoot, "uploads"), { recursive: true });
    const complaints = await (0, exports.getComplaints)();
    complaints.push(complaint);
    await (0, promises_1.writeFile)(getComplaintsFilePath(), JSON.stringify(complaints, null, 2), "utf-8");
};
exports.saveComplaint = saveComplaint;
