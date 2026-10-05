import express, { Router } from "express";
import multer from "multer";
import { pool } from "../db/database";
import { authenticateToken } from "../middleware/auth";
import { createCaseDriveFolder, uploadInspectionFile } from "../services/driveService";
import path from "node:path";
import { mkdir, unlink } from "node:fs/promises";

const router = Router();
router.use(authenticateToken);

const moduleDirectory = __dirname;
const parentDirectory = path.resolve(moduleDirectory, "..");
const serverRoot = path.basename(parentDirectory) === "dist" ? path.resolve(parentDirectory, "..") : parentDirectory;
const uploadDirectory = path.join(serverRoot, "uploads");

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    mkdir(uploadDirectory, { recursive: true })
      .then(() => cb(null, uploadDirectory))
      .catch((error: unknown) => cb(error as Error, uploadDirectory));
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${unique}${ext}`);
  },
});

const upload = multer({ storage });

router.get("/cases/:caseId/enforcement", async (req, res) => {
  const caseId = req.params.caseId as string;
  try {
    const result = await pool.query(`
      SELECT d.*,
        COALESCE(
          json_agg(
            json_build_object(
              'evidence_id', de.evidence_id,
              'file_name', de.file_name,
              'mime_type', de.mime_type,
              'drive_file_id', de.drive_file_id,
              'drive_file_url', de.drive_file_url,
              'evidence_type', de.evidence_type,
              'uploaded_at', de.uploaded_at
            )
          ) FILTER (WHERE de.evidence_id IS NOT NULL),
          '[]'
        ) AS evidence_files
      FROM demolition_records d
      LEFT JOIN demolition_evidence de ON de.demolition_id = d.demolition_id
      WHERE LOWER(d.case_id) = LOWER($1)
      GROUP BY d.demolition_id
      ORDER BY d.created_at DESC
      LIMIT 1
    `, [caseId]);

    if (result.rows.length > 0) {
      return res.json({ success: true, demolitionRecord: result.rows[0] });
    }
    return res.json({ success: true, demolitionRecord: null });
  } catch (error) {
    console.error("Error fetching enforcement action:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch enforcement record." });
  }
});

router.post("/cases/:caseId/enforcement", upload.single("evidencePhoto"), async (req, res) => {
  const caseId = req.params.caseId as string;
  const file = req.file;

  try {
    const payload = req.body;
    const outcome = payload.outcome;
    let compliance_date = null, verification_date = null, verification_status = null, action_date = null;
    let demolition_type = null, executed_by = null, demolished_portion = null, remaining_violation = null;
    let next_action = null, expected_action_date = null, cost_recovery_applicable = 'no';
    let demolition_cost = null, recovery_amount = null, recovery_status = null, recovery_reference = null;
    let appeal_filed = 'no', appeal_number = null, appeal_date = null, appeal_authority = null;
    let stay_granted = 'no', stay_date = null, order_reason = null;

    if (outcome === 'violator_complied') {
      const complied = JSON.parse(payload.complied || '{}');
      compliance_date = complied.complianceDate || null;
      verification_date = complied.verificationDate || null;
      verification_status = complied.verificationStatus || null;
    } else if (outcome === 'demolition_violator') {
      const demoV = JSON.parse(payload.demoViolator || '{}');
      action_date = demoV.demolitionDate || null;
      demolition_type = demoV.demolitionType || null;
      verification_date = demoV.verificationDate || null;
      verification_status = demoV.verificationStatus || null;
      demolished_portion = demoV.demolishedPortion || null;
      remaining_violation = demoV.remainingViolation || null;
      next_action = demoV.furtherAction || null;
    } else if (outcome === 'demolition_mcl') {
      const demoM = JSON.parse(payload.demoMcl || '{}');
      action_date = demoM.demolitionDate || null;
      executed_by = demoM.executedBy || null;
      demolition_type = demoM.demolitionType || null;
      demolished_portion = demoM.demolishedPortion || null;
      remaining_violation = demoM.remainingViolation || null;
      next_action = demoM.furtherAction || null;
      cost_recovery_applicable = demoM.costRecovery || 'no';
      if (cost_recovery_applicable === 'yes') {
        demolition_cost = demoM.demolitionCost || null;
        recovery_amount = demoM.recoveryAmount || null;
        recovery_status = demoM.recoveryStatus || null;
        recovery_reference = demoM.recoveryReference || null;
      }
    } else if (outcome === 'appeal_stay') {
      const appeal = JSON.parse(payload.appealStay || '{}');
      appeal_filed = appeal.appealFiled || 'no';
      if (appeal_filed === 'yes') {
        appeal_number = appeal.appealNumber || null;
        appeal_date = appeal.appealDate || null;
        appeal_authority = appeal.authority || null;
      }
      stay_granted = appeal.stayGranted || 'no';
      if (stay_granted === 'yes') {
        stay_date = appeal.stayDate || null;
        order_reason = appeal.courtDirections || null;
      }
    } else if (outcome === 'further_action') {
      const further = JSON.parse(payload.furtherAction || '{}');
      order_reason = further.reason || null;
      next_action = further.nextAction || null;
      expected_action_date = further.expectedActionDate || null;
    }

    const remarks = payload.remarks || null;

    // Check if demolition_records row already exists for this case
    const checkExist = await pool.query(
      `SELECT demolition_id FROM demolition_records WHERE LOWER(case_id) = LOWER($1) ORDER BY created_at DESC LIMIT 1`,
      [caseId]
    );

    let demolitionId: number;

    if (checkExist.rows.length > 0) {
      demolitionId = checkExist.rows[0].demolition_id;
      await pool.query(`
        UPDATE demolition_records SET
          enforcement_outcome = $1, compliance_date = $2, verification_date = $3, verification_status = $4,
          action_date = $5, demolition_type = $6, executed_by = $7, demolished_portion = $8,
          remaining_violation = $9, next_action = $10, expected_action_date = $11, remarks = $12,
          cost_recovery_applicable = $13, demolition_cost = $14, recovery_amount = $15,
          recovery_status = $16, recovery_reference = $17, appeal_filed = $18, appeal_number = $19,
          appeal_date = $20, appeal_authority = $21, stay_granted = $22, stay_date = $23,
          order_reason = $24, updated_at = NOW()
        WHERE demolition_id = $25
      `, [
        outcome, compliance_date, verification_date, verification_status, action_date,
        demolition_type, executed_by, demolished_portion, remaining_violation, next_action,
        expected_action_date, remarks, cost_recovery_applicable, demolition_cost, recovery_amount,
        recovery_status, recovery_reference, appeal_filed, appeal_number, appeal_date, appeal_authority,
        stay_granted, stay_date, order_reason, demolitionId
      ]);
    } else {
      const result = await pool.query(`
        INSERT INTO demolition_records (
          case_id, enforcement_outcome, compliance_date, verification_date, verification_status,
          action_date, demolition_type, executed_by, demolished_portion, remaining_violation,
          next_action, expected_action_date, remarks, cost_recovery_applicable, demolition_cost,
          recovery_amount, recovery_status, recovery_reference, appeal_filed, appeal_number,
          appeal_date, appeal_authority, stay_granted, stay_date, order_reason, created_by_id, created_by_name
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27
        ) RETURNING demolition_id;
      `, [
        caseId, outcome, compliance_date, verification_date, verification_status, action_date,
        demolition_type, executed_by, demolished_portion, remaining_violation, next_action,
        expected_action_date, remarks, cost_recovery_applicable, demolition_cost, recovery_amount,
        recovery_status, recovery_reference, appeal_filed, appeal_number, appeal_date, appeal_authority,
        stay_granted, stay_date, order_reason, (req as any).user?.officerId, (req as any).user?.name
      ]);

      demolitionId = result.rows[0].demolition_id;
    }

    // Handle evidence upload
    if (file) {
      try {
        await createCaseDriveFolder(caseId);
        
        const uploadRes = await uploadInspectionFile(
          "case",
          caseId,
          "enforcement_" + demolitionId,
          "evidence",
          1,
          file.path,
          file.originalname,
          file.mimetype
        );

        await pool.query(`
          INSERT INTO demolition_evidence (
            demolition_id, evidence_type, file_name, mime_type, drive_file_id, drive_file_url, uploaded_by_id, uploaded_by_name
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          demolitionId, 'evidence_photo', uploadRes.fileName, uploadRes.mimeType, uploadRes.fileId, uploadRes.fileUrl,
          (req as any).user?.officerId, (req as any).user?.name
        ]);

        await unlink(file.path);
      } catch (err) {
        console.error("Error uploading evidence:", err);
      }
    }

    // Update cases table current status and log status history
    const statusMap: Record<string, string> = {
      violator_complied: "Violator Complied",
      demolition_violator: "Demolition Completed (Violator)",
      demolition_mcl: "Demolition Executed (MCL)",
      appeal_stay: "Appeal / Stay Pending",
      further_action: "Further Action Required",
    };
    const newStatus = statusMap[outcome] || "Enforcement Action Taken";

    await pool.query(
      `UPDATE cases SET current_status = $1, updated_at = NOW() WHERE LOWER(case_id) = LOWER($2)`,
      [newStatus, caseId]
    );

    await pool.query(
      `INSERT INTO case_status_history (case_id, previous_status, new_status, changed_by_name, note)
       VALUES ($1, (SELECT current_status FROM cases WHERE LOWER(case_id) = LOWER($1) LIMIT 1), $2, $3, $4)`,
      [caseId, newStatus, (req as any).user?.name || "System Officer", `Enforcement outcome updated: ${newStatus}`]
    );

    res.json({ success: true, demolitionId });
  } catch (error) {
    console.error("Error saving enforcement action:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

export default router;
