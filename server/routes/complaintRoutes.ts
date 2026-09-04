import path from "node:path";
import { mkdir } from "node:fs/promises";
import express, { Router } from "express";
import multer from "multer";

import type { ComplaintRequest, AttachmentMeta } from "../types/complaint.js";
import { findResponsibleOfficer } from "../services/officerMapping.js";
import { generateComplaintId, saveComplaint } from "../services/complaintStorage.js";
import { zoneForBlock } from "../services/locationMapping.js";

const router = Router();
const moduleDirectory = __dirname;
const parentDirectory = path.resolve(moduleDirectory, "..");
const serverRoot = path.basename(parentDirectory) === "dist"
  ? path.resolve(parentDirectory, "..")
  : parentDirectory;
const uploadDirectory = path.join(serverRoot, "uploads");

// ── File storage: uploads/ directory, preserve extension ─────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    mkdir(uploadDirectory, { recursive: true })
      .then(() => cb(null, uploadDirectory))
      .catch((error: unknown) => cb(error as Error, uploadDirectory));
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const ext    = path.extname(file.originalname);
    cb(null, `${unique}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "application/pdf"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, PNG, and PDF files are accepted."));
    }
  },
});

const handleUpload = (req: express.Request, res: express.Response, next: express.NextFunction) => {
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

// ── POST /api/complaints ──────────────────────────────────────────────────────
router.post(
  "/complaints",
  handleUpload,
  async (req, res) => {
    try {
      const body = req.body as Record<string, string>;
      const files = req.files as Record<string, Express.Multer.File[]> | undefined;

      // Validate required fields
      const required = ["citizenName", "phoneNumber", "block", "address", "title", "description"] as const;
      for (const field of required) {
        if (!body[field]?.trim()) {
          res.status(400).json({ success: false, message: `${field} is required.` });
          return;
        }
      }

      // Validate mandatory complaint image for manual entry
      const registrationSource = (body.registrationSource ?? "manual") as ComplaintRequest["registrationSource"];
      const imageFiles = files?.["complaintImage"] ?? [];

      if (registrationSource === "manual" && imageFiles.length === 0) {
        res.status(400).json({ success: false, message: "A complaint image is required for manual entry." });
        return;
      }

      // Derive Zone from Block (server always re-derives to prevent tampering)
      const block       = body.block.trim();
      const derivedZone = zoneForBlock(block);

      if (!derivedZone) {
        res.status(400).json({ success: false, message: `Unrecognised block: "${block}".` });
        return;
      }

      // Build attachment metadata
      const attachments: AttachmentMeta[] = [];
      attachments.push(...imageFiles.map((imageFile) => ({
        fileName: imageFile.originalname,
        fileType: imageFile.mimetype,
        filePath: imageFile.path,
      })));

      // Officer mapping
      const officer = await findResponsibleOfficer(derivedZone, block);

      // Generate ID and persist
      const complaintId = await generateComplaintId();

      const complaint = {
        complaintId,
        registrationSource,
        citizenName:          body.citizenName.trim(),
        phoneNumber:          body.phoneNumber.trim(),
        zone:                 derivedZone,
        block,
        ward:                 body.ward?.trim() || undefined,
        address:              body.address.trim(),
        title:                body.title.trim(),
        description:          body.description.trim(),
        attachments,
        assignedOfficerId:    officer?.officerId    ?? null,
        assignedOfficerName:  officer?.name         ?? null,
        assignedOfficerMobile: officer?.mobile      ?? null,
        status:               "Registered" as const,
        createdAt:            new Date().toISOString(),
      };

      await saveComplaint(complaint);

      res.status(201).json({
        success: true,
        complaintId: complaint.complaintId,
        message: "Complaint registered successfully.",
        complaint,
      });
    } catch (error) {
      console.error("Error registering complaint:", error);
      res.status(500).json({ success: false, message: "Unable to register complaint." });
    }
  },
);

export default router;
