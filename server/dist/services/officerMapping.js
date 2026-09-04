"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findResponsibleOfficer = void 0;
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
const getOfficers = async () => {
    const moduleDirectory = __dirname;
    const parentDirectory = node_path_1.default.resolve(moduleDirectory, "..");
    const serverRoot = node_path_1.default.basename(parentDirectory) === "dist"
        ? node_path_1.default.resolve(parentDirectory, "..")
        : parentDirectory;
    const filePath = node_path_1.default.join(serverRoot, "data", "officers.json");
    const file = await (0, promises_1.readFile)(filePath, "utf-8");
    return JSON.parse(file);
};
const findResponsibleOfficer = async (zone, block, designation) => {
    const officers = await getOfficers();
    // locationData uses "Zone A" format; officers.json uses bare "A" — normalise both
    const normaliseZone = (z) => z.replace(/^zone\s*/i, "").trim().toUpperCase();
    // locationData uses "Block 2" format; officers.json uses bare "2" — normalise both
    const normaliseBlock = (b) => b.replace(/^block\s*/i, "").trim();
    const normZone = normaliseZone(zone);
    const normBlock = normaliseBlock(block);
    const normaliseDesignation = (value) => value.trim().toUpperCase();
    return (officers.find((officer) => normaliseZone(officer.zone) === normZone &&
        officer.blocks.map(normaliseBlock).includes(normBlock) &&
        (!designation || (designation === "BI"
            ? (normaliseDesignation(officer.designation) === "BI" ||
                normaliseDesignation(officer.designation).endsWith("-BI"))
            : normaliseDesignation(officer.designation) === "ATP"))) ?? null);
};
exports.findResponsibleOfficer = findResponsibleOfficer;
