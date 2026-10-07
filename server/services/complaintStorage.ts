import type { Complaint } from "../types/complaint";
import { pool } from "../db/database";
import { randomInt } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const LOCAL_STORAGE_FILE = path.join(__dirname, "../data/complaints.json");

async function getLocalComplaints(): Promise<Complaint[]> {
  try {
    const data = await fs.readFile(LOCAL_STORAGE_FILE, "utf-8");
    return JSON.parse(data) as Complaint[];
  } catch {
    return [];
  }
}

async function saveLocalComplaint(complaint: Complaint): Promise<void> {
  const complaints = await getLocalComplaints();
  const index = complaints.findIndex((c) => c.complaintId === complaint.complaintId);
  if (index >= 0) {
    complaints[index] = complaint;
  } else {
    complaints.unshift(complaint);
  }
  await fs.writeFile(LOCAL_STORAGE_FILE, JSON.stringify(complaints, null, 2), "utf-8");
}

import { normalizeBlock, isBlockAssigned } from "./accessControl";

export const getComplaints = async (
  filterByUserId?: number,
  assignedBlocks?: string[] | null
): Promise<Complaint[]> => {
  if (assignedBlocks !== null && assignedBlocks !== undefined && assignedBlocks.length === 0) {
    return [];
  }

  try {
    const whereConditions: string[] = [];
    const params: any[] = [];

    if (filterByUserId) {
      params.push(filterByUserId);
      whereConditions.push(`complaints.submitted_by_user_id = $${params.length}`);
    }

    if (assignedBlocks !== null && assignedBlocks !== undefined) {
      params.push(assignedBlocks.map(normalizeBlock));
      whereConditions.push(`REPLACE(LOWER(TRIM(complaints.block)), 'block ', '') = ANY($${params.length}::text[])`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

    const result = await pool.query<Complaint>(`
      SELECT
        complaints.complaint_id AS "complaintId",
        complaints.registration_source AS "registrationSource",
        complaints.citizen_name AS "citizenName",
        complaints.phone_number AS "phoneNumber",
        complaints.zone,
        complaints.block,
        complaints.ward,
        complaints.address,
        complaints.title,
        complaints.description,
        complaints.attachments,
        complaints.assigned_officer_id AS "assignedOfficerId",
        complaints.assigned_officer_name AS "assignedOfficerName",
        complaints.assigned_officer_mobile AS "assignedOfficerMobile",
        complaints.assigned_atp_id AS "assignedAtpId",
        complaints.assigned_atp_name AS "assignedAtpName",
        complaints.assigned_atp_mobile AS "assignedAtpMobile",
        complaints.status,
        complaints.created_at AS "createdAt",
        complaints.drive_folder_url AS "driveFolderUrl",
        complaints.submitted_by_user_id AS "submittedByUserId",
        CASE 
          WHEN u_sub.user_id IS NOT NULL THEN json_build_object('name', u_sub.name, 'role', u_sub.role)
          ELSE NULL 
        END AS "createdBy",
        CASE 
          WHEN u_sub.user_id IS NOT NULL THEN json_build_object('name', u_sub.name, 'role', u_sub.role)
          ELSE NULL 
        END AS "created_by",
        (
          SELECT case_id FROM cases WHERE primary_complaint_id = complaints.complaint_id
          UNION
          SELECT case_id FROM case_complaints WHERE complaint_id = complaints.complaint_id
          LIMIT 1
        ) AS "caseId"
      FROM complaints
      LEFT JOIN users u_sub ON u_sub.user_id = complaints.submitted_by_user_id
      ${whereClause}
      ORDER BY complaints.created_at DESC
    `, params);
    return result.rows;
  } catch (error) {
    console.warn("PostgreSQL query failed, serving complaints from local JSON storage:", (error as Error).message);
    let local = await getLocalComplaints();
    if (filterByUserId) {
      local = local.filter((c) => c.submittedByUserId === filterByUserId);
    }
    if (assignedBlocks !== null && assignedBlocks !== undefined) {
      local = local.filter((c) => isBlockAssigned(c.block, assignedBlocks));
    }
    return local;
  }
};

export const generateComplaintId = async (): Promise<string> => {
  try {
    while (true) {
      const complaintId = String(randomInt(10_000_000_000_000, 100_000_000_000_000));

      const result = await pool.query(
        "SELECT 1 FROM complaints WHERE complaint_id = $1 LIMIT 1",
        [complaintId],
      );

      if (result.rowCount === 0) {
        return complaintId;
      }
    }
  } catch {
    const local = await getLocalComplaints();
    let complaintId = String(randomInt(10_000_000_000_000, 100_000_000_000_000));
    while (local.some((c) => c.complaintId === complaintId)) {
      complaintId = String(randomInt(10_000_000_000_000, 100_000_000_000_000));
    }
    return complaintId;
  }
};

export const saveComplaint = async (
  complaint: Complaint,
): Promise<void> => {
  // Always update local JSON storage as secondary persistence
  await saveLocalComplaint(complaint);

  try {
    await pool.query(
      `
        INSERT INTO complaints (
          complaint_id,
          registration_source,
          citizen_name,
          phone_number,
          zone,
          block,
          ward,
          address,
          title,
          description,
          attachments,
          assigned_officer_id,
          assigned_officer_name,
          assigned_officer_mobile,
          assigned_atp_id,
          assigned_atp_name,
          assigned_atp_mobile,
          status,
          created_at,
          drive_folder_url,
          submitted_by_user_id
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11::jsonb, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
        )
        ON CONFLICT (complaint_id) DO UPDATE SET
          status = EXCLUDED.status,
          assigned_officer_id = EXCLUDED.assigned_officer_id,
          assigned_officer_name = EXCLUDED.assigned_officer_name
      `,
      [
        complaint.complaintId,
        complaint.registrationSource,
        complaint.citizenName,
        complaint.phoneNumber,
        complaint.zone,
        complaint.block,
        complaint.ward ?? null,
        complaint.address,
        complaint.title,
        complaint.description,
        JSON.stringify(complaint.attachments ?? []),
        complaint.assignedOfficerId,
        complaint.assignedOfficerName,
        complaint.assignedOfficerMobile,
        complaint.assignedAtpId,
        complaint.assignedAtpName,
        complaint.assignedAtpMobile,
        complaint.status,
        complaint.createdAt,
        complaint.driveFolderUrl ?? null,
        complaint.submittedByUserId ?? null,
      ],
    );
  } catch (error) {
    console.warn("PostgreSQL query failed, complaint saved to local JSON storage:", (error as Error).message);
  }
};