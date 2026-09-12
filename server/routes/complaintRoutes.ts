import path from "node:path";
import { mkdir, unlink } from "node:fs/promises";
import express, { Router } from "express";
import multer from "multer";
import {Buffer} from "node:buffer";

import type { ComplaintRequest, AttachmentMeta } from "../types/complaint";
import { findResponsibleOfficer } from "../services/officerMapping";
import { generateComplaintId, getComplaints, saveComplaint } from "../services/complaintStorage";
import { zoneForBlock } from "../services/locationMapping";
import { getOfficers } from "../services/officerMapping.js";
import { appendComplaintToGoogleSheet } from "../services/googleSheetsService";
import { processFileWithOCR } from "../services/ocrService";
import { extractComplaintFromOCR } from "../services/claudeService";
import {createComplaintDriveFolder, uploadComplaintFiles, listComplaintDriveFiles, getComplaintDriveFile} from "../services/driveService";

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
  upload.fields([
    {name: "sourceImage", maxCount: 20},
    { name: "complaintImage", maxCount: 20 }
  ])(req, res, (error) => {
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

const deleteTemporaryFiles = async (
  files: Express.Multer.File[],
): Promise<void> => {
  await Promise.all(
    files.map(async (file) => {
      try {
        await unlink(file.path);

        console.log(
          `[Upload] Deleted temporary file: ${file.filename}`,
        );
      } catch (error) {
        console.warn(
          `[Upload] Could not delete temporary file: ${file.path}`,
          error,
        );
      }
    }),
  );
};

router.get("/officers", async (_req, res) => {
  try {
    const [allOfficers, complaints] = await Promise.all([getOfficers(), getComplaints()]);
    const officers = _req.query.includeAtp === "true"
      ? allOfficers
      : allOfficers.filter((officer) => {
      const designation = officer.designation.trim().toUpperCase();
      return designation === "BI" || designation.endsWith("-BI");
    });

      res.json({
      success: true,
      officers: officers.map((officer) => ({
        ...officer,
        zone: `Zone ${officer.zone}`,
        activeComplaints: complaints.filter(
          (complaint) => complaint.assignedOfficerId === officer.officerId,
        ).length,
      })),
    });

  } catch (error) {
    console.error("Error loading officers:", error);
    res.status(500).json({ success: false, message: "Unable to load officers." });
  }
});

router.get("/officers/roster", async (_req, res) => {
  try {
    const [officers, complaints] = await Promise.all([getOfficers(), getComplaints()]);
    res.json({
      success: true,
      officers: officers.map((officer) => ({
        ...officer,
        zone: `Zone ${officer.zone}`,
        activeComplaints: complaints.filter(
          (complaint) => complaint.assignedOfficerId === officer.officerId,
        ).length,
      })),
    });
  } catch (error) {
    console.error("Error loading officer roster:", error);
    res.status(500).json({ success: false, message: "Unable to load officer roster." });
  }
});

router.get("/complaints", async (_req, res) => {
  try {
    res.json({ success: true, complaints: await getComplaints() });
  } catch (error) {
    console.error("Error loading complaints:", error);
    res.status(500).json({ success: false, message: "Unable to load complaints." });
  }
});

router.get("/complaints/:complaintId", async (req, res) => {
  try {
    const complaint = (await getComplaints()).find(
      (item) => item.complaintId === req.params.complaintId,
    );
    if (!complaint) {
      res.status(404).json({ success: false, message: "Complaint not found." });
      return;
    }
    res.json({ success: true, complaint });
  } catch (error) {
    console.error("Error loading complaint:", error);
    res.status(500).json({ success: false, message: "Unable to load complaint." });
  }
});

router.get("/complaints/:complaintId/files", async (req, res) => {
  try {
    const complaintId = req.params.complaintId;

    const files = await listComplaintDriveFiles(complaintId);

    res.json({
      success: true,
      files,
    });
  } catch (error) {
    console.error(
      "[Drive] Failed to list complaint files:",
      error,
    );

    res.status(500).json({
      success: false,
      message: "Unable to load complaint files.",
    });
  }
});

router.get(
  "/complaints/:complaintId/files/:fileId",
  async (req, res) => {
    try {
      const result = await getComplaintDriveFile(
        req.params.fileId,
      );

      if (!result.success || !result.data) {
        res.status(404).json({
          success: false,
          message: result.message || "File not found.",
        });
        return;
      }

      const fileBuffer = Buffer.from(
        result.data,
        "base64",
      );

      res.setHeader(
        "Content-Type",
        result.mimeType || "application/octet-stream",
      );

      res.setHeader(
        "Content-Disposition",
        `inline; filename="${result.fileName || "attachment"}"`,
      );

      res.send(fileBuffer);
    } catch (error) {
      console.error(
        "[Drive] Failed to retrieve complaint file:",
        error,
      );

      res.status(500).json({
        success: false,
        message: "Unable to load complaint file.",
      });
    }
  },
);

// ── POST /api/complaints ──────────────────────────────────────────────────────
router.post(
  "/complaints/source-upload",
  handleUpload,
  (req, res) => {
    const files = req.files as Record<string, Express.Multer.File[]> | undefined;
    const uploadedFiles = files?.["sourceImage"] ?? [];

    if (uploadedFiles.length === 0) {
      res.status(400).json({ success: false, message: "Please upload at least one image or PDF." });
      return;
    }

    res.status(201).json({
      success: true,
      filesUploaded: uploadedFiles.length,
      message: "Source files uploaded successfully.",
    });
  },
);

// ── POST /api/complaints/process-source ──────────────────────────────────────
// Stage 2:
// Save uploaded source files → OCR each file → combine OCR.
//
// IMPORTANT:
// This route does NOT create a complaint.
// It only prepares the OCR result for the next LLM/review stage.

router.post(
  "/complaints/process-source",
  handleUpload,
  async (req, res) => {
    const files = req.files as
      | Record<string, Express.Multer.File[]>
      | undefined;

    const uploadedFiles = files?.["sourceImage"] ?? [];

    if (uploadedFiles.length === 0) {
      res.status(400).json({
        success: false,
        status: "failed",
        message: "Please upload at least one image or PDF.",
      });
      return;
    }

    try {
      
      // 1. PROCESS EACH UPLOADED FILE
      const imageItems = [];

      for (const [index, file] of uploadedFiles.entries()) {
        const pageIndex = index + 1;

        console.log(
          `[OCR] Processing file ${pageIndex}/${uploadedFiles.length}: ${file.originalname}`,
        );

        const ocrResult = await processFileWithOCR(
          file.path,
        );

        const ocrText = ocrResult.text.trim();

        if (!ocrText) {
          console.warn(
            `[OCR] Empty OCR result for file ${pageIndex}: ${file.originalname}`,
          );
        }

        imageItems.push({
          img_index: pageIndex,
          filename: file.originalname,
          file_type: file.mimetype,
          ocr_md: ocrText,
          ocr_pages: ocrResult.pages,
        });

        console.log(
          `[OCR] File ${pageIndex} completed successfully.`,
        );
      }

      // 2. CREATE PAGE SECTIONS
      const pageSections = imageItems.map((image) =>
        [
          `===== BEGIN PAGE ${image.img_index} =====`,
          "",
          image.ocr_md,
          "",
          `===== END PAGE ${image.img_index} =====`,
        ].join("\n"),
      );

      // 3. COMBINE ALL OCR

      const combinedOcr = pageSections
        .join("\n\n")
        .trim();

      if (!combinedOcr) {
        res.status(422).json({
          success: false,
          status: "failed",
          message:
            "All uploaded files returned empty OCR text.",
        });
        return;
      }

      console.log(
        `[OCR] Combined OCR created from ${imageItems.length} file(s).`,
      );

      // 4. RETURN OCR RESULT

      res.status(200).json({
        success: true,
        status: "ocr_completed",

        fileCount: imageItems.length,

        files: imageItems.map(
          (image) => image.filename,
        ),

        images: imageItems,

        pageSections,

        combinedOcr,
      });
    } catch (error) {
      console.error(
        "[OCR] Source processing failed:",
        error,
      );

      res.status(500).json({
        success: false,
        status: "failed",
        message:
          "Failed to process the uploaded source document.",
      });
    }
  },
);

// ── POST /api/complaints/extract-source ──────────────────────────────────────
// Stage 3:
// OCR text → Claude → structured English complaint fields.
//
// This route does NOT register the complaint.
// The operator must review/edit the extracted fields first.

router.post(
  "/complaints/extract-source",
  async (req, res) => {
    try {
      const body = req.body as {
        combinedOcr?: string;
        sourceType?: "news" | "email" | "other";
      };

      const combinedOcr = body.combinedOcr?.trim();

      if (!combinedOcr) {
        res.status(400).json({
          success: false,
          message: "OCR text is required.",
        });
        return;
      }

      const sourceType = body.sourceType ?? "other";

      if (
        !["news", "email", "other"].includes(sourceType)
      ) {
        res.status(400).json({
          success: false,
          message: "Invalid source type.",
        });
        return;
      }

      console.log(
        `[LLM] Extracting complaint fields from ${sourceType} source...`,
      );

      const extractedComplaint =
        await extractComplaintFromOCR(
          combinedOcr,
          sourceType,
        );

      console.log(
        "[LLM] Complaint fields extracted successfully.",
      );

      res.status(200).json({
        success: true,
        status: "extraction_completed",
        complaint: extractedComplaint,
      });
    } catch (error) {
      console.error(
        "[LLM] Source extraction failed:",
        error,
      );

      res.status(500).json({
        success: false,
        status: "failed",
        message:
          "Failed to extract complaint information from the source document.",
      });
    }
  },
);

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

      // Manual entry requires complaint evidence; external source evidence is optional.
      const registrationSource = (body.registrationSource ?? "manual") as ComplaintRequest["registrationSource"];
      const complaintImages = files?.["complaintImage"] ?? [];
      const sourceImages = files?.["sourceImage"] ?? [];

      if (registrationSource === "manual" && complaintImages.length === 0) {
        res.status(400).json({ success: false, message: "A complaint evidence image is required for manual entry." });
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
      // Officer mapping
      const bi = await findResponsibleOfficer(derivedZone, block, "BI");
      const atp = await findResponsibleOfficer(derivedZone, block, "ATP");

      // Generate ID and persist
      const complaintId = await generateComplaintId();

      console.log(
        `[Drive] Creating folder for complaint ${complaintId}...`,
      );

      const driveFolder = await createComplaintDriveFolder(
        complaintId,
      );

      console.log(
        `[Drive] Folder ready: ${driveFolder.folderUrl}`,
      );


      /*
       * Upload external source files.
       *
       * sourceImage → source_1, source_2, ...
       */
      if (sourceImages.length > 0) {
        console.log(
          `[Drive] Uploading ${sourceImages.length} source file(s)...`,
        );

        await uploadComplaintFiles(
          complaintId,
          "source",
          sourceImages,
        );
      }


      /*
       * Upload complaint/preliminary evidence.
       *
       * complaintImage → pre_1, pre_2, ...
       */
      if (complaintImages.length > 0) {
        console.log(
          `[Drive] Uploading ${complaintImages.length} pre file(s)...`,
        );
      
        await uploadComplaintFiles(
          complaintId,
          "pre",
          complaintImages,
        );
      }


      /*
       * We no longer use local server storage as permanent
       * complaint storage.
       *
       * Keep only lightweight metadata in PostgreSQL.
       */
      const attachments : AttachmentMeta[] = [
        ...sourceImages.map((file, index) => ({
          fileName: file.originalname,
          fileType: file.mimetype,
          category: "source" as const,
          index: index + 1,
        })),
        ...complaintImages.map((file, index) => ({
          fileName: file.originalname,
          fileType: file.mimetype,
          category: "pre" as const,
          index: index + 1,
        })),
      ];

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
        driveFolderUrl:       driveFolder.folderUrl,
        assignedOfficerId:    bi?.officerId    ?? null,
        assignedOfficerName:  bi?.name         ?? null,
        assignedOfficerMobile: bi?.mobile      ?? null,
        assignedAtpId:        atp?.officerId   ?? null,
        assignedAtpName:      atp?.name        ?? null,
        assignedAtpMobile:    atp?.mobile     ?? null,
        status:               "Registered" as const,
        createdAt:            new Date().toISOString(),
      };

      await saveComplaint(complaint);

      await deleteTemporaryFiles([
        ...sourceImages,
        ...complaintImages,
      ])

      try{
        await appendComplaintToGoogleSheet(complaint);
      } catch (error) {
        console.error(
          "Google Sheets sync failed:", error
        );
      }
      
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
