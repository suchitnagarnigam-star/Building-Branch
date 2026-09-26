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

    const [kpiRes, zoneRes, statusRes, pipelineRes, recentRes] = await Promise.all([
      // 1. KPI Counts
      pool.query(`
        SELECT 
          COUNT(*)::int AS "totalComplaints",
          COUNT(*) FILTER (WHERE LOWER(status) NOT IN ('approved / closed', 'rejected'))::int AS "openComplaints",
          COUNT(*) FILTER (WHERE LOWER(status) = 'approved / closed')::int AS "resolvedComplaints",
          ${isOperator 
            ? `(SELECT COUNT(*)::int FROM field_visits fv JOIN complaints c ON fv.complaint_id = c.complaint_id WHERE c.submitted_by_user_id = $1)` 
            : `(SELECT COUNT(*)::int FROM field_visits)`} AS "totalInspections"
        FROM complaints
        ${opFilter};
      `, opParams),

      // 2. Zone Counts
      pool.query(`
        SELECT 
          COALESCE(NULLIF(TRIM(zone), ''), 'Unassigned') AS "zone",
          COUNT(*)::int AS "count"
        FROM complaints
        ${opFilter}
        GROUP BY zone
        ORDER BY zone ASC;
      `, opParams),

      // 3. Status Breakdown
      pool.query(`
        SELECT 
          status,
          COUNT(*)::int AS "count"
        FROM complaints
        ${opFilter}
        GROUP BY status;
      `, opParams),

      // 4. Case Lifecycle Pipeline Counts
      pool.query(`
        SELECT 
          COUNT(*)::int AS "registered",
          COUNT(*) FILTER (WHERE LOWER(status) != 'registered')::int AS "assigned",
          (SELECT COUNT(*)::int FROM field_visits ${isOperator ? "fv JOIN complaints c ON fv.complaint_id = c.complaint_id WHERE c.submitted_by_user_id = $1" : ""}) AS "fieldVisits",
          (SELECT COUNT(*)::int FROM cases ${isOperator ? "ca JOIN complaints c ON ca.primary_complaint_id = c.complaint_id WHERE c.submitted_by_user_id = $1" : ""}) AS "casesCreated",
          (SELECT COUNT(*)::int FROM notices WHERE notice_type = '270') AS "notices270",
          (SELECT COUNT(*)::int FROM notices WHERE notice_type = '269') AS "notices269",
          COUNT(*) FILTER (WHERE LOWER(status) = 'approved / closed')::int AS "resolved"
        FROM complaints
        ${opFilter};
      `, opParams),

      // 5. Recent 5 Complaints
      pool.query(`
        SELECT 
          complaint_id AS "complaintId",
          citizen_name AS "citizenName",
          title,
          description,
          zone,
          block,
          ward,
          status,
          created_at AS "createdAt",
          assigned_officer_name AS "assignedOfficerName",
          assigned_atp_name AS "assignedAtpName",
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
      openComplaints: 0,
      resolvedComplaints: 0,
      totalInspections: 0,
    };

    const pipeline = pipelineRes.rows[0] || {
      registered: 0,
      assigned: 0,
      fieldVisits: 0,
      casesCreated: 0,
      notices270: 0,
      notices269: 0,
      resolved: 0,
    };

    res.json({
      success: true,
      stats: {
        total: kpi.totalComplaints,
        open: kpi.openComplaints,
        resolved: kpi.resolvedComplaints,
        inspections: kpi.totalInspections,
      },
      zones: zoneRes.rows,
      statuses: statusRes.rows,
      pipeline,
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
        o.phone_number AS "mobile",
        o.designation,
        o.zone,
        o.blocks,
        COUNT(c.complaint_id) FILTER (WHERE LOWER(c.status) NOT IN ('approved / closed', 'rejected'))::int AS "activeComplaints"
      FROM officers o
      LEFT JOIN complaints c ON c.assigned_officer_id = o.officer_id
      GROUP BY o.officer_id, o.name, o.phone_number, o.designation, o.zone, o.blocks
      ORDER BY o.name ASC;
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
