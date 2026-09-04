"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_path_1 = __importDefault(require("node:path"));
const promises_1 = require("node:fs/promises");
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const officerMapping_js_1 = require("../services/officerMapping.js");
const complaintStorage_js_1 = require("../services/complaintStorage.js");
const locationMapping_js_1 = require("../services/locationMapping.js");
const officerMapping_js_2 = require("../services/officerMapping.js");
const router = (0, express_1.Router)();
const moduleDirectory = __dirname;
const parentDirectory = node_path_1.default.resolve(moduleDirectory, "..");
const serverRoot = node_path_1.default.basename(parentDirectory) === "dist"
    ? node_path_1.default.resolve(parentDirectory, "..")
    : parentDirectory;
const uploadDirectory = node_path_1.default.join(serverRoot, "uploads");
// ── File storage: uploads/ directory, preserve extension ─────────────────────
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        (0, promises_1.mkdir)(uploadDirectory, { recursive: true })
            .then(() => cb(null, uploadDirectory))
            .catch((error) => cb(error, uploadDirectory));
    },
    filename: (_req, file, cb) => {
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
        const ext = node_path_1.default.extname(file.originalname);
        cb(null, `${unique}${ext}`);
    },
});
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter: (_req, file, cb) => {
        const allowed = ["image/jpeg", "image/png", "application/pdf"];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error("Only JPG, PNG, and PDF files are accepted."));
        }
    },
});
const handleUpload = (req, res, next) => {
    upload.fields([{ name: "complaintImage", maxCount: 20 }])(req, res, (error) => {
        if (error) {
            res.status(400).json({
                success: false,
                message: error instanceof Error ? error.message : "Unable to save uploaded images.",
            });
            return;
        }
        next();
    });
};
router.get("/officers", async (_req, res) => {
    try {
        const [allOfficers, complaints] = await Promise.all([(0, officerMapping_js_2.getOfficers)(), (0, complaintStorage_js_1.getComplaints)()]);
        const bis = allOfficers.filter((officer) => {
            const designation = officer.designation.trim().toUpperCase();
            return designation === "BI" || designation.endsWith("-BI");
        });
        res.json({
            success: true,
            officers: bis.map((officer) => ({
                ...officer,
                zone: `Zone ${officer.zone}`,
                activeComplaints: complaints.filter((complaint) => complaint.assignedOfficerId === officer.officerId).length,
            })),
        });
    }
    catch (error) {
        console.error("Error loading officers:", error);
        res.status(500).json({ success: false, message: "Unable to load officers." });
    }
});
router.get("/complaints", async (_req, res) => {
    try {
        res.json({ success: true, complaints: await (0, complaintStorage_js_1.getComplaints)() });
    }
    catch (error) {
        console.error("Error loading complaints:", error);
        res.status(500).json({ success: false, message: "Unable to load complaints." });
    }
});
router.get("/complaints/:complaintId", async (req, res) => {
    try {
        const complaint = (await (0, complaintStorage_js_1.getComplaints)()).find((item) => item.complaintId === req.params.complaintId);
        if (!complaint) {
            res.status(404).json({ success: false, message: "Complaint not found." });
            return;
        }
        res.json({ success: true, complaint });
    }
    catch (error) {
        console.error("Error loading complaint:", error);
        res.status(500).json({ success: false, message: "Unable to load complaint." });
    }
});
// ── POST /api/complaints ──────────────────────────────────────────────────────
router.post("/complaints", handleUpload, async (req, res) => {
    try {
        const body = req.body;
        const files = req.files;
        // Validate required fields
        const required = ["citizenName", "phoneNumber", "block", "address", "title", "description"];
        for (const field of required) {
            if (!body[field]?.trim()) {
                res.status(400).json({ success: false, message: `${field} is required.` });
                return;
            }
        }
        // Validate mandatory complaint image for manual entry
        const registrationSource = (body.registrationSource ?? "manual");
        const imageFiles = files?.["complaintImage"] ?? [];
        if (registrationSource === "manual" && imageFiles.length === 0) {
            res.status(400).json({ success: false, message: "A complaint image is required for manual entry." });
            return;
        }
        // Derive Zone from Block (server always re-derives to prevent tampering)
        const block = body.block.trim();
        const derivedZone = (0, locationMapping_js_1.zoneForBlock)(block);
        if (!derivedZone) {
            res.status(400).json({ success: false, message: `Unrecognised block: "${block}".` });
            return;
        }
        // Build attachment metadata
        const attachments = [];
        attachments.push(...imageFiles.map((imageFile) => ({
            fileName: imageFile.originalname,
            fileType: imageFile.mimetype,
            filePath: imageFile.path,
        })));
        // Officer mapping
        const bi = await (0, officerMapping_js_1.findResponsibleOfficer)(derivedZone, block, "BI");
        const atp = await (0, officerMapping_js_1.findResponsibleOfficer)(derivedZone, block, "ATP");
        // Generate ID and persist
        const complaintId = await (0, complaintStorage_js_1.generateComplaintId)();
        const complaint = {
            complaintId,
            registrationSource,
            citizenName: body.citizenName.trim(),
            phoneNumber: body.phoneNumber.trim(),
            zone: derivedZone,
            block,
            ward: body.ward?.trim() || undefined,
            address: body.address.trim(),
            title: body.title.trim(),
            description: body.description.trim(),
            attachments,
            assignedOfficerId: bi?.officerId ?? null,
            assignedOfficerName: bi?.name ?? null,
            assignedOfficerMobile: bi?.mobile ?? null,
            assignedAtpId: atp?.officerId ?? null,
            assignedAtpName: atp?.name ?? null,
            assignedAtpMobile: atp?.mobile ?? null,
            status: "Registered",
            createdAt: new Date().toISOString(),
        };
        await (0, complaintStorage_js_1.saveComplaint)(complaint);
        res.status(201).json({
            success: true,
            complaintId: complaint.complaintId,
            message: "Complaint registered successfully.",
            complaint,
        });
    }
    catch (error) {
        console.error("Error registering complaint:", error);
        res.status(500).json({ success: false, message: "Unable to register complaint." });
    }
});
exports.default = router;
