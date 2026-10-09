import { Pool, PoolClient } from "pg";
import { JWTPayload } from "./authService.js";

export type CaseStatus =
  | "open"
  | "notice_issued_270"
  | "notice_issued_269"
  | "reply_received"
  | "reply_reviewed_valid"
  | "reply_reviewed_invalid"
  | "enforcement_recorded"
  | "stay_granted"
  | "closed";

export const STATUS_DISPLAY_NAMES: Record<CaseStatus, string> = {
  open: "Open",
  notice_issued_270: "Notice 270 Issued",
  notice_issued_269: "Notice 269 Issued",
  reply_received: "Reply Received",
  reply_reviewed_valid: "Reply Reviewed (Valid)",
  reply_reviewed_invalid: "Reply Reviewed (Invalid)",
  enforcement_recorded: "Enforcement Recorded",
  stay_granted: "Stay / Appeal Pending",
  closed: "Closed",
};

/**
 * Statutory State Transitions Graph under Punjab Municipal Corporation Act 1976.
 */
export const CASE_TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
  open: ["notice_issued_270", "stay_granted"],
  notice_issued_270: ["notice_issued_269", "closed", "stay_granted"],
  notice_issued_269: ["reply_received", "enforcement_recorded", "stay_granted"],
  reply_received: ["reply_reviewed_valid", "reply_reviewed_invalid", "stay_granted"],
  reply_reviewed_valid: ["closed", "stay_granted"],
  reply_reviewed_invalid: ["enforcement_recorded", "stay_granted"],
  enforcement_recorded: ["closed", "stay_granted"],
  stay_granted: [
    "notice_issued_270",
    "notice_issued_269",
    "reply_received",
    "reply_reviewed_valid",
    "reply_reviewed_invalid",
    "enforcement_recorded",
    "closed",
  ],
  closed: [], // Terminal state
};

/**
 * Normalizes any freeform or legacy status string into canonical CaseStatus.
 */
export function normalizeCaseStatus(status: string | null | undefined): CaseStatus {
  if (!status) return "open";
  const s = status.trim().toLowerCase().replace(/[\s\-_]+/g, "_");

  if (s === "closed" || s === "resolved") return "closed";
  if (s.includes("stay") || s.includes("appeal") || s === "stay_granted") return "stay_granted";
  if (
    s.includes("demolition") ||
    s.includes("enforcement") ||
    s.includes("complied") ||
    s === "enforcement_recorded"
  ) {
    return "enforcement_recorded";
  }
  if (s === "reply_reviewed_valid" || s.includes("valid_reply") || s === "reply_accepted") {
    return "reply_reviewed_valid";
  }
  if (s === "reply_reviewed_invalid" || s.includes("invalid_reply") || s === "reply_rejected") {
    return "reply_reviewed_invalid";
  }
  if (s === "reply_received" || s === "reply_filed") return "reply_received";
  if (s.includes("269") || s === "notice_269_issued") return "notice_issued_269";
  if (
    s.includes("270") ||
    s === "notice_issued" ||
    s === "notice_270_issued" ||
    s.includes("compoundable_assessment") ||
    s.includes("construction_status")
  ) {
    return "notice_issued_270";
  }

  return "open";
}

export interface ValidationResult {
  allowed: boolean;
  reason?: string;
  statusCode?: number;
}

/**
 * Validates whether a state transition is legally permissible under statutory rules & RBAC governance.
 */
export async function validateCaseTransition(
  caseId: string,
  toStatus: CaseStatus,
  actor: JWTPayload,
  db: Pool | PoolClient
): Promise<ValidationResult> {
  // Check 1: Case Exists
  const caseCheck = await db.query(
    `SELECT case_id, current_status, assigned_bi_id, assigned_bi_name, construction_status
     FROM cases
     WHERE LOWER(case_id) = LOWER($1)
     LIMIT 1`,
    [caseId]
  );

  if (caseCheck.rows.length === 0) {
    return { allowed: false, reason: `Case "${caseId}" not found`, statusCode: 404 };
  }

  const caseRow = caseCheck.rows[0];
  const currentNormalized = normalizeCaseStatus(caseRow.current_status);

  // Idempotent re-affirmation is allowed
  if (currentNormalized === toStatus) {
    return { allowed: true };
  }

  // Check 2: Role Authorization (security boundary checks take precedence)
  const normRole = (actor.role || "").toLowerCase();
  const supervisoryRoles = ["atp", "mtp", "jc", "superadmin", "admin"];

  if (toStatus === "closed") {
    if (!supervisoryRoles.includes(normRole)) {
      return {
        allowed: false,
        reason: "Forbidden: Case closure requires ATP or higher supervisory authority",
        statusCode: 403,
      };
    }
  }

  if (toStatus === "reply_reviewed_valid" || toStatus === "reply_reviewed_invalid") {
    if (!supervisoryRoles.includes(normRole)) {
      return {
        allowed: false,
        reason: "Forbidden: Evaluating violator replies requires ATP or higher supervisory authority",
        statusCode: 403,
      };
    }
  }

  // Check 3: Governance Gate (Assigned BI cannot self-close statutory cases)
  if (toStatus === "closed") {
    const actorOfficerId = (actor.officerId || "").trim().toUpperCase();
    const assignedBiId = (caseRow.assigned_bi_id || "").trim().toUpperCase();

    if (actorOfficerId && assignedBiId && actorOfficerId === assignedBiId) {
      return {
        allowed: false,
        reason: "Governance restriction: Assigned Building Inspector cannot self-close their own case",
        statusCode: 403,
      };
    }
  }

  // Check 4: Graph Admissibility
  const allowedEdges = CASE_TRANSITIONS[currentNormalized] || [];
  if (!allowedEdges.includes(toStatus)) {
    return {
      allowed: false,
      reason: `Illegal state transition: Case cannot move from "${STATUS_DISPLAY_NAMES[currentNormalized]}" to "${STATUS_DISPLAY_NAMES[toStatus]}"`,
      statusCode: 400,
    };
  }

  // Check 5: Statutory Prerequisites
  if (toStatus === "enforcement_recorded") {
    // 5A: Court Stay check
    const stayCheck = await db.query(
      `SELECT stay_granted FROM demolition_records
       WHERE LOWER(case_id) = LOWER($1) AND LOWER(stay_granted) = 'yes'
       ORDER BY created_at DESC LIMIT 1`,
      [caseId]
    );

    if (stayCheck.rows.length > 0) {
      return {
        allowed: false,
        reason: "Court stay is active on this case; enforcement and demolition actions are legally suspended",
        statusCode: 400,
      };
    }

    // 5B: Section 269 Notice check for non-compoundable / partly-compoundable cases
    const partsCheck = await db.query(
      `SELECT cp.part_type FROM construction_parts cp
       JOIN construction_status cs ON cs.construction_status_id = cp.construction_status_id
       WHERE LOWER(cs.case_id) = LOWER($1)`,
      [caseId]
    );

    const hasNonCompoundable = partsCheck.rows.some(
      (p: { part_type: string }) =>
        p.part_type === "non_compoundable" || p.part_type === "partly_compoundable"
    );

    if (hasNonCompoundable || caseRow.construction_status === "non_compoundable") {
      const notice269Check = await db.query(
        `SELECT notice_id FROM notices
         WHERE LOWER(case_id) = LOWER($1) AND (LOWER(notice_type) = '269' OR LOWER(notice_type) LIKE '%269%')
         LIMIT 1`,
        [caseId]
      );

      if (notice269Check.rows.length === 0) {
        return {
          allowed: false,
          reason: "Statutory requirement: Section 269 Show Cause Notice must be issued before recording demolition or enforcement",
          statusCode: 400,
        };
      }
    }
  }

  if (toStatus === "closed") {
    // 5C: Closure prerequisite check (Enforcement complete OR Valid reply review OR Fully paid compounding receipt)
    const replyRes = await db.query(
      `SELECT reply_id FROM violator_replies WHERE LOWER(case_id) = LOWER($1) AND review_status = 'valid' LIMIT 1`,
      [caseId]
    );
    const demoRes = await db.query(
      `SELECT demolition_id, enforcement_outcome FROM demolition_records WHERE LOWER(case_id) = LOWER($1) LIMIT 1`,
      [caseId]
    );
    const receiptRes = await db.query(
      `SELECT cp.construction_part_id FROM construction_parts cp
       JOIN construction_status cs ON cs.construction_status_id = cp.construction_status_id
       WHERE LOWER(cs.case_id) = LOWER($1) AND cp.part_type = 'compoundable'
         AND cp.receipt_number IS NOT NULL AND cp.receipt_number != ''
       LIMIT 1`,
      [caseId]
    );

    const hasValidReply = replyRes.rows.length > 0;
    const hasDemolitionRecord = demoRes.rows.length > 0;
    const hasPaidCompoundingReceipt = receiptRes.rows.length > 0;

    if (!hasValidReply && !hasDemolitionRecord && !hasPaidCompoundingReceipt) {
      return {
        allowed: false,
        reason: "Statutory prerequisite not met: Case cannot be closed without confirmed enforcement outcome, accepted reply review, or paid compounding receipt",
        statusCode: 400,
      };
    }
  }

  return { allowed: true };
}

/**
 * Executes a validated statutory state transition within a PostgreSQL transaction.
 */
export async function applyTransition(
  caseId: string,
  toStatus: CaseStatus,
  actor: JWTPayload,
  pool: Pool,
  note?: string
): Promise<{ success: boolean; newStatus: CaseStatus; message?: string }> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const validation = await validateCaseTransition(caseId, toStatus, actor, client);
    if (!validation.allowed) {
      await client.query("ROLLBACK");
      const err = new Error(validation.reason || "Transition not allowed") as Error & { statusCode?: number };
      err.statusCode = validation.statusCode || 400;
      throw err;
    }

    const prevResult = await client.query(
      `SELECT current_status FROM cases WHERE LOWER(case_id) = LOWER($1) LIMIT 1`,
      [caseId]
    );
    const previousStatus = prevResult.rows[0]?.current_status || "Open";
    const canonicalName = STATUS_DISPLAY_NAMES[toStatus] || toStatus;

    // Update current status
    await client.query(
      `UPDATE cases SET current_status = $1, updated_at = NOW() WHERE LOWER(case_id) = LOWER($2)`,
      [canonicalName, caseId]
    );

    // Audit trail in case_status_history
    await client.query(
      `INSERT INTO case_status_history (case_id, previous_status, new_status, changed_by_name, note)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        caseId,
        previousStatus,
        canonicalName,
        actor.name || "System Officer",
        note || `Statutory state transitioned to ${canonicalName}`,
      ]
    );

    await client.query("COMMIT");
    return { success: true, newStatus: toStatus };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
