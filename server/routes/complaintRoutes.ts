import path from "node:path";
import { mkdir, unlink } from "node:fs/promises";
import express, { Router } from "express";
import multer from "multer";
import {Buffer} from "node:buffer";
import {randomBytes} from "node:crypto";

import type { ComplaintRequest, AttachmentMeta } from "../types/complaint";
import { findResponsibleOfficer } from "../services/officerMapping";
import { generateComplaintId, getComplaints, saveComplaint } from "../services/complaintStorage";
import { zoneForBlock } from "../services/locationMapping";
import { getOfficers } from "../services/officerMapping.js";
import { appendComplaintToGoogleSheet } from "../services/googleSheetsService";
import { processFileWithOCR } from "../services/ocrService";
import { extractComplaintFromOCR } from "../services/claudeService";
import {
  createComplaintDriveFolder, 
  uploadComplaintFiles, 
  listComplaintDriveFiles, 
  getComplaintDriveFile, 
  createInspectionDriveFolder, 
  uploadInspectionEvidenceFiles, 
  uploadInspectionFile, 
  uploadInspectionNoticeFile, 
  createCaseDriveFolder} from "../services/driveService";

import {pool} from "../db/database";

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

const handleInspectionUpload = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  upload.fields([
    {
      name: "inspectionPhotos",
      maxCount: 20,
    },
    {
      name: "noticePhoto",
      maxCount: 1,
    },
  ])(req, res, (error) => {
    if (error) {
      res.status(400).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to save inspection files.",
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

const generateCaseId = async (): Promise<string> => {
  while (true) {
    const suffix = randomBytes(6)
      .toString("hex")
      .toUpperCase();

    const caseId = `CASE-${suffix}`;

    const result = await pool.query(
      `
        SELECT 1
        FROM cases
        WHERE case_id = $1
        LIMIT 1
      `,
      [caseId],
    );

    if (result.rowCount === 0) {
      return caseId;
    }
  }
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

router.get("/officers/:officerId", async (req, res) => {
  try {
    const officerId = req.params.officerId.trim();

    const [officers, complaints] = await Promise.all([
      getOfficers(),
      getComplaints(),
    ]);

    const officer = officers.find(
      (item) => item.officerId === officerId,
    );

    if (!officer) {
      res.status(404).json({
        success: false,
        message: "Officer not found.",
      });
      return;
    }

    const assignedComplaints = complaints.filter(
      (complaint) =>
        complaint.assignedOfficerId === officer.officerId,
    );

    res.json({
      success: true,
      officer: {
        ...officer,
        zone: `Zone ${officer.zone}`,
      },
      complaints: assignedComplaints,
    });
  } catch (error) {
    console.error("Error loading officer details:", error);

    res.status(500).json({
      success: false,
      message: "Unable to load officer details.",
    });
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

router.post(
  "/inspections",
  handleInspectionUpload,
  async (req, res) => {
    const temporaryFiles: Express.Multer.File[] = [];

    try {
      const body = req.body as Record<string, string>;

      const files =
        req.files as
          | Record<string, Express.Multer.File[]>
          | undefined;

      const inspectionPhotos =
        files?.["inspectionPhotos"] ?? [];

      const noticePhotos =
        files?.["noticePhoto"] ?? [];

      temporaryFiles.push(
        ...inspectionPhotos,
        ...noticePhotos,
      );

      /*
       * ------------------------------------------------------
       * 1. BASIC VALIDATION
       * ------------------------------------------------------
       */

      const sourceOfReport =
        body.sourceOfReport?.trim();

      const inspectionOutcome =
        body.inspectionOutcome?.trim();
        
      if (
        inspectionOutcome !== "no_violation" &&
        inspectionOutcome !== "violation_found"
      ) {
        res.status(400).json({
          success: false,
          message:
            "inspectionOutcome must be no_violation or violation_found.",
         });
         return;
       }  

      if (
        sourceOfReport !== "complaint" &&
        sourceOfReport !== "field_visit"
      ) {
        res.status(400).json({
          success: false,
          message:
            "sourceOfReport must be complaint or field_visit.",
        });
        return;
      }

      const reportingOfficerId =
        body.reportingOfficer?.trim();

      if (!reportingOfficerId) {
        res.status(400).json({
          success: false,
          message:
            "Reporting officer is required.",
        });
        return;
      }

      const block =
        body.block?.trim();

      if (!block) {
        res.status(400).json({
          success: false,
          message: "Block is required.",
        });
        return;
      }

      const location =
        body.location?.trim();

      if (!location) {
        res.status(400).json({
          success: false,
          message: "Location is required.",
        });
        return;
      }

      const buildingType =
        body.buildingType?.trim();

      if (!buildingType) {
        res.status(400).json({
          success: false,
          message:
            "Building type is required.",
        });
        return;
      }

      const finalBuildingType =
        buildingType === "Other"
          ? body.otherBuildingType?.trim()
          : buildingType;

      if (!finalBuildingType) {
        res.status(400).json({
          success: false,
          message:
            "Building type must be specified.",
        });
        return;
      }

      const violatorName =
        body.violatorName?.trim();

      if (!violatorName) {
        res.status(400).json({
          success: false,
          message:
            "Violator name is required.",
        });
        return;
      }

      const report =
        body.description?.trim();

      if (!report) {
        res.status(400).json({
          success: false,
          message:
            "Inspection report/description is required.",
        });
        return;
      }


      /*
       * ------------------------------------------------------
       * 2. GPS VALIDATION
       * ------------------------------------------------------
       */

      const latitude =
        Number(body.latitude);

      const longitude =
        Number(body.longitude);

      const accuracy =
        Number(body.accuracy);

      if (
        !Number.isFinite(latitude) ||
        latitude < -90 ||
        latitude > 90
      ) {
        res.status(400).json({
          success: false,
          message:
            "Valid GPS latitude is required.",
        });
        return;
      }

      if (
        !Number.isFinite(longitude) ||
        longitude < -180 ||
        longitude > 180
      ) {
        res.status(400).json({
          success: false,
          message:
            "Valid GPS longitude is required.",
        });
        return;
      }

      if (
        !Number.isFinite(accuracy) ||
        accuracy < 0
      ) {
        res.status(400).json({
          success: false,
          message:
            "Valid GPS accuracy is required.",
        });
        return;
      }


      /*
       * ------------------------------------------------------
       * 3. EVIDENCE VALIDATION
       * ------------------------------------------------------
       *
       * At least one inspection photograph is mandatory.
       */

      if (inspectionPhotos.length === 0) {
        res.status(400).json({
          success: false,
          message:
            "At least one inspection evidence photo is required.",
        });
        return;
      }


      /*
       * ------------------------------------------------------
       * 4. BLOCK → ZONE
       * ------------------------------------------------------
       *
       * Never trust the zone sent by the frontend.
       */

      const derivedZone =
        zoneForBlock(block);

      if (!derivedZone) {
        res.status(400).json({
          success: false,
          message:
            `Unrecognised block: "${block}".`,
        });
        return;
      }


      /*
       * ------------------------------------------------------
       * 5. VERIFY REPORTING OFFICER
       * ------------------------------------------------------
       */

      const allOfficers =
        await getOfficers();

      const reportingOfficer =
        allOfficers.find(
          (officer) =>
            officer.officerId ===
            reportingOfficerId,
        );

      if (!reportingOfficer) {
        res.status(400).json({
          success: false,
          message:
            "Selected reporting officer was not found.",
        });
        return;
      }

      const designation =
        reportingOfficer.designation
          .trim()
          .toUpperCase();

      const isBi =
        designation === "BI" ||
        designation.endsWith("-BI");

      if (!isBi) {
        res.status(403).json({
          success: false,
          message:
            "Only BI officers can submit field inspections.",
        });
        return;
      }

      const officerHasBlock =
        reportingOfficer.blocks.some(
          (officerBlock) =>
            officerBlock
              .replace(/^zone\s*/i, "")
              .replace(/^block\s*/i, "")
              .trim()
              .toUpperCase() ===
            block
              .replace(/^zone\s*/i, "")
              .replace(/^block\s*/i, "")
              .trim()
              .toUpperCase(),
        );

      if (!officerHasBlock) {
        res.status(403).json({
          success: false,
          message:
            "The selected BI officer is not assigned to the selected block.",
        });
        return;
      }


      /*
       * ------------------------------------------------------
       * 6. FIND RESPONSIBLE ATP
       * ------------------------------------------------------
       */

      const atp =
        await findResponsibleOfficer(
          derivedZone,
          block,
          "ATP",
        );

        /*
 * ------------------------------------------------------
 * NOTICE VALIDATION
 * ------------------------------------------------------
 *
 * A Section 270 notice is mandatory when a violation
 * is found. All three notice fields are required.
 */
const hasNoticeData = Boolean(
  body.noticeNumber?.trim() ||
  body.noticeDate?.trim() ||
  noticePhotos.length > 0,
);

if (inspectionOutcome === "violation_found") {
  if (
    !body.noticeNumber?.trim() ||
    !body.noticeDate?.trim() ||
    noticePhotos.length === 0
  ) {
    res.status(400).json({
      success: false,
      message:
        "Notice number, notice date and notice photo are required when a violation is found.",
    });
    return;
  }
} else if (hasNoticeData) {
  res.status(400).json({
    success: false,
    message:
      "A Section 270 notice can only be recorded when violation is found.",
  });
  return;
}


      /*
       * ------------------------------------------------------
       * 7. COMPLAINT VALIDATION
       * ------------------------------------------------------
       */

      let complaintId:
        | string
        | null = null;

      if (
        sourceOfReport === "complaint"
      ) {
        complaintId =
          body.complaintId?.trim() ||
          null;

        if (!complaintId) {
          res.status(400).json({
            success: false,
            message:
              "Complaint ID is required for a complaint-based inspection.",
          });
          return;
        }

        const complaintResult =
          await pool.query(
            `
              SELECT complaint_id
              FROM complaints
              WHERE complaint_id = $1
              LIMIT 1
            `,
            [complaintId],
          );

        if (complaintResult.rowCount === 0) {
          res.status(404).json({
            success: false,
            message:
              `Complaint not found: ${complaintId}`,
          });
          return;
        }
      }


      /*
       * ------------------------------------------------------
       * 8. PROACTIVE CASE CREATION
       * ------------------------------------------------------
       *
       * A proactive field inspection starts a case.
       */

      let caseId:
        | string
        | null = null;

      if (
        inspectionOutcome === "violation_found"
      ) {
        caseId = await generateCaseId();

        const caseSourceType = sourceOfReport === "complaint"
          ? "complaint"
          : "proactive_bi";

        const primaryComplaintId = 
          sourceOfReport === "complaint"
            ? complaintId
            : null;

        await pool.query(
          `
            INSERT INTO cases (
              case_id,
              source_type,
              primary_complaint_id,
              building_identity,
              location,
              zone,
              block,
              ward,
              latitude,
              longitude,
              assigned_bi_id,
              assigned_bi_name,
              assigned_atp_id,
              assigned_atp_name,
              current_status,
              created_at,
              updated_at
            )
            VALUES (
              $1,
              $2,
              $3,
              $4,
              $5,
              $6,
              $7,
              $8,
              $9,
              $10,
              $11,
              $12,
              $13,
              $14,
              'Open',
              NOW(),
              NOW()
            )
          `,
          [
            caseId,
            caseSourceType,
            primaryComplaintId,
            finalBuildingType,
            location,
            derivedZone,
            block,
            body.ward?.trim() || null,
            latitude,
            longitude,
            reportingOfficer.officerId,
            reportingOfficer.name,
            atp?.officerId ?? null,
            atp?.name ?? null,
          ],
        );

        /*
         * Link complaint-based violations to the case.
         */
        if(sourceOfReport === "complaint" && complaintId) {
          await pool.query(
            `
              INSERT INTO case_complaints (
                case_id,
                complaint_id,
                relationship_type,
                linked_at
              )
              VALUES ($1, $2, 'primary', NOW())
              ON CONFLICT (case_id, complaint_id) 
              DO NOTHING
            `,
            [caseId, complaintId],
          );
        }

        /**
         * Create the permanent Google Drive folder
         * for newly created proactive case.
         */ 
        await createCaseDriveFolder(caseId);
      }


      /*
       * ------------------------------------------------------
       * 9. CREATE FIELD VISIT
       * ------------------------------------------------------
       */

      const visitType =
        sourceOfReport === "complaint"
          ? "complaint_visit"
          : "proactive_inspection";

      const visitResult =
        await pool.query<{
          visit_id: string;
        }>(
          `
            INSERT INTO field_visits (
              complaint_id,
              case_id,
              bi_id,
              bi_name,
              visit_type,
              inspection_outcome,
              report,
              latitude,
              longitude,
              location_accuracy,
              building_type,
              violator_name,
              violator_mobile,
              visit_status,
              submitted_at
            )
            VALUES (
              $1,
              $2,
              $3,
              $4,
              $5,
              $6,
              $7,
              $8,
              $9,
              $10,
              $11,
              $12,
              $13,
              'Submitted',
              NOW()
            )
            RETURNING visit_id
          `,
          [
            complaintId,
            caseId,
            reportingOfficer.officerId,
            reportingOfficer.name,
            visitType,
            inspectionOutcome,
            report,
            latitude,
            longitude,
            accuracy,
            finalBuildingType,
            violatorName,
            body.mobileNumber?.trim() || null,
          ],
        );

      const visitId =
        String(
          visitResult.rows[0].visit_id,
        );


      /*
       * ------------------------------------------------------
       * 10. DETERMINE DRIVE PARENT
       * ------------------------------------------------------
       */

      const parentType:
        | "complaint"
        | "case" =
        complaintId
          ? "complaint"
          : "case";

      const parentId =
        complaintId || caseId;

      if (!parentId) {
        throw new Error(
          "Unable to determine Drive parent for inspection.",
        );
      }


      /*
       * ------------------------------------------------------
       * 11. CREATE INSPECTION DRIVE FOLDER
       * ------------------------------------------------------
       */

      const driveFolder =
        await createInspectionDriveFolder(
          parentType,
          parentId,
          visitId,
        );


      /*
       * ------------------------------------------------------
       * 12. UPLOAD INSPECTION EVIDENCE
       * ------------------------------------------------------
       */

      const uploadedEvidence =
        await uploadInspectionEvidenceFiles(
          parentType,
          parentId,
          visitId,
          inspectionPhotos,
        );


      /*
       * ------------------------------------------------------
       * 13. SAVE EVIDENCE METADATA
       * ------------------------------------------------------
       */

      for (
        const [index, uploaded]
        of uploadedEvidence.entries()
      ) {

        const originalFile =
          inspectionPhotos[index];

        await pool.query(
          `
            INSERT INTO visit_evidence (
              visit_id,
              file_name,
              mime_type,
              drive_file_id,
              drive_file_url,
              storage_provider,
              latitude,
              longitude,
              captured_at,
              created_at
            )
            VALUES (
              $1,
              $2,
              $3,
              $4,
              $5,
              'google_drive',
              $6,
              $7,
              $8,
              NOW()
            )
          `,
          [
            visitId,
            uploaded.fileName ||
              originalFile.originalname,
            uploaded.mimeType ||
              originalFile.mimetype,
            uploaded.fileId,
            uploaded.fileUrl || null,
            latitude,
            longitude,
            new Date().toISOString(),
          ],
        );
      }

      /*
 * ------------------------------------------------------
 * 14. OPTIONAL NOTICE
 * ------------------------------------------------------
 *
 * At this point notice validation has already happened.
 *
 * We only reach this block when:
 *
 * - notice number exists
 * - notice date exists
 * - notice photo exists
 * - inspection is case-based
 */
if (hasNoticeData) {
  const uploadedNotice =
    await uploadInspectionNoticeFile(
      parentType,
      parentId,
      visitId,
      noticePhotos[0],
    );

  await pool.query(
    `
      INSERT INTO notices (
        case_id,
        notice_type,
        notice_number,
        issued_by_id,
        issued_by_name,
        issued_at,
        document_name,
        drive_file_id,
        drive_file_url,
        metadata,
        created_at
      )
      VALUES (
        $1,
        '270',
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9::jsonb,
        NOW()
      )
    `,
    [
      caseId,
      body.noticeNumber!.trim(),
      reportingOfficer.officerId,
      reportingOfficer.name,
      body.noticeDate,
      uploadedNotice.fileName,
      uploadedNotice.fileId,
      uploadedNotice.fileUrl || null,
      JSON.stringify({
        source: "field_inspection",
        visitId,
      }),
    ],
  );
}

      /*
       * ------------------------------------------------------
       * 15. CLEAN TEMPORARY FILES
       * ------------------------------------------------------
       */

      await deleteTemporaryFiles(
        temporaryFiles,
      );


      /*
       * ------------------------------------------------------
       * 16. RESPONSE
       * ------------------------------------------------------
       */

      res.status(201).json({
        success: true,

        message:
          "Inspection registered successfully.",

        visitId,

        complaintId,

        caseId,

        visitType,

        driveFolderUrl:
          driveFolder.folderUrl,

        evidenceCount:
          uploadedEvidence.length,
      });

    } catch (error) {

      console.error(
        "[Inspection] Registration failed:",
        error,
      );

      /*
       * Best-effort cleanup of temporary uploads.
       */
      if (temporaryFiles.length > 0) {
        await deleteTemporaryFiles(
          temporaryFiles,
        );
      }

      res.status(500).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to register inspection.",
      });
    }
  },
);

export default router;
