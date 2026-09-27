import { Router, Request, Response } from "express";
import { pool } from "../db/database";
import { authenticateToken } from "../middleware/auth";

const router = Router();

router.use(authenticateToken);

// ── GET /api/analytics/overview ───────────────────────────────────────────────
router.get("/overview", async (req: Request, res: Response) => {
  try {
    const role = (req.user?.role || "").toLowerCase();
    const userId = req.user?.userId;
    const isOperator = role === "operator" && userId;

    const opFilter = isOperator ? "WHERE submitted_by_user_id = $1" : "";
    const opParams = isOperator ? [userId] : [];

    const [
      kpiRes,
      statusRes,
      zoneRes,
      enforcementRes,
      attentionRes,
      recentRes,
    ] = await Promise.all([
      // 1. KPI Row
      pool.query(`
        SELECT 
          (SELECT COUNT(*)::int FROM complaints ${opFilter}) AS "totalComplaints",
          ${isOperator 
            ? `(SELECT COUNT(*)::int FROM field_visits fv JOIN complaints c ON fv.complaint_id = c.complaint_id WHERE c.submitted_by_user_id = $1)` 
            : `(SELECT COUNT(*)::int FROM field_visits)`} AS "totalFieldVisits",
          ${isOperator 
            ? `(SELECT COUNT(*)::int FROM field_visits fv JOIN complaints c ON fv.complaint_id = c.complaint_id WHERE fv.complaint_id IS NOT NULL AND c.submitted_by_user_id = $1)` 
            : `(SELECT COUNT(*)::int FROM field_visits WHERE complaint_id IS NOT NULL)`} AS "linkedFieldVisits",
          ${isOperator 
            ? `0` 
            : `(SELECT COUNT(*)::int FROM field_visits WHERE complaint_id IS NULL)`} AS "standaloneFieldVisits",
          ${isOperator 
            ? `(SELECT COUNT(*)::int FROM cases ca JOIN complaints c ON ca.primary_complaint_id = c.complaint_id WHERE c.submitted_by_user_id = $1)` 
            : `(SELECT COUNT(*)::int FROM cases)`} AS "totalCases",
          ${isOperator 
            ? `(SELECT COUNT(*)::int FROM cases ca JOIN complaints c ON ca.primary_complaint_id = c.complaint_id WHERE ca.current_status = 'Resolved' AND c.submitted_by_user_id = $1)` 
            : `(SELECT COUNT(*)::int FROM cases WHERE current_status = 'Resolved')`} AS "resolvedCases";
      `, opParams),

      // 2. Complaint Status Breakdown
      pool.query(`
        SELECT 
          status,
          COUNT(*)::int AS "count"
        FROM complaints
        ${opFilter}
        GROUP BY status
        ORDER BY "count" DESC;
      `, opParams),

      // 3. Zone Distribution
      pool.query(`
        SELECT 
          COALESCE(NULLIF(TRIM(zone), ''), 'Unassigned') AS "zone",
          COUNT(*)::int AS "count"
        FROM complaints
        ${opFilter}
        GROUP BY zone
        ORDER BY zone ASC;
      `, opParams),

      // 4. Enforcement Activity
      pool.query(`
        SELECT 
          (SELECT COUNT(*)::int FROM notices WHERE notice_type = '270') AS "notices270",
          (SELECT COUNT(*)::int FROM notices WHERE notice_type = '269') AS "notices269",
          (SELECT COUNT(*)::int FROM field_visits WHERE complaint_id IS NULL) AS "standaloneFieldVisits";
      `),

      // 5. Needs Attention (4 metrics)
      pool.query(`
        SELECT 
          (
            SELECT COUNT(*)::int FROM complaints c
            WHERE NOT EXISTS (
              SELECT 1 FROM field_visits fv WHERE fv.complaint_id = c.complaint_id
            ) ${isOperator ? "AND c.submitted_by_user_id = $1" : ""}
          ) AS "complaintsNoFieldVisit",
          (
            SELECT COUNT(*)::int FROM notices 
            WHERE notice_type = '270' 
            AND reply_due_at IS NOT NULL AND reply_due_at < NOW()
          ) AS "notices270Expired",
          (
            SELECT COUNT(*)::int FROM violator_replies
          ) AS "violatorRepliesPending",
          (
            SELECT COUNT(*)::int FROM cases cs
            WHERE NOT EXISTS (
              SELECT 1 FROM notices n WHERE n.case_id = cs.case_id
            )
          ) AS "casesNoNotice";
      `, opParams),

      // 6. Recent Complaints
      pool.query(`
        SELECT 
          complaint_id AS "complaintId",
          zone,
          status,
          created_at AS "createdAt",
          EXTRACT(DAY FROM NOW() - created_at)::int AS "ageDays",
          (
            SELECT case_id FROM cases WHERE primary_complaint_id = complaints.complaint_id
            UNION
            SELECT case_id FROM case_complaints WHERE complaint_id = complaints.complaint_id
            LIMIT 1
          ) AS "caseId"
        FROM complaints
        ${opFilter}
        ORDER BY created_at DESC
        LIMIT 5;
      `, opParams),
    ]);

    const kpi = kpiRes.rows[0] || {
      totalComplaints: 0,
      totalFieldVisits: 0,
      linkedFieldVisits: 0,
      standaloneFieldVisits: 0,
      totalCases: 0,
      resolvedCases: 0,
    };

    const enforcement = enforcementRes.rows[0] || {
      notices270: 0,
      notices269: 0,
      standaloneFieldVisits: 0,
    };

    const needsAttention = attentionRes.rows[0] || {
      complaintsNoFieldVisit: 0,
      notices270Expired: 0,
      violatorRepliesPending: 0,
      casesNoNotice: 0,
    };

    res.json({
      success: true,
      kpi,
      complaintStatus: statusRes.rows,
      zoneDistribution: zoneRes.rows,
      enforcement,
      needsAttention,
      recentComplaints: recentRes.rows,
    });
  } catch (error) {
    console.error("Error generating analytics overview:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate analytics overview.",
    });
  }
});

// ── GET /api/analytics/officers ───────────────────────────────────────────────
router.get("/officers", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        o.officer_id AS "officerId",
        o.name,
        o.designation,
        o.zone,
        o.phone_number AS "mobile",
        o.blocks,
        COUNT(DISTINCT fv.visit_id)::int AS "fieldVisits",
        COUNT(DISTINCT n.notice_id)::int AS "noticesIssued",
        COUNT(DISTINCT cs.case_id)::int AS "casesAssigned"
      FROM officers o
      LEFT JOIN field_visits fv ON fv.bi_id = o.officer_id
      LEFT JOIN notices n ON n.issued_by_id = o.officer_id
      LEFT JOIN cases cs ON cs.assigned_bi_id = o.officer_id
      GROUP BY o.officer_id, o.name, o.designation, o.zone, o.phone_number, o.blocks
      ORDER BY "casesAssigned" DESC, "fieldVisits" DESC;
    `);

    res.json({
      success: true,
      officers: result.rows,
    });
  } catch (error) {
    console.error("Error fetching officer analytics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch officer analytics.",
    });
  }
});

export default router;
