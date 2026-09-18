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

export const getComplaints = async (): Promise<Complaint[]> => {
  try {
    const result = await pool.query<Complaint>(`
      SELECT
        complaint_id AS "complaintId",
        registration_source AS "registrationSource",
        citizen_name AS "citizenName",
        phone_number AS "phoneNumber",
        zone,
        block,
        ward,
        address,
        title,
        description,
        attachments,
        assigned_officer_id AS "assignedOfficerId",
        assigned_officer_name AS "assignedOfficerName",
        assigned_officer_mobile AS "assignedOfficerMobile",
        assigned_atp_id AS "assignedAtpId",
        assigned_atp_name AS "assignedAtpName",
        assigned_atp_mobile AS "assignedAtpMobile",
        status,
        created_at AS "createdAt",
        drive_folder_url AS "driveFolderUrl"
      FROM complaints
      ORDER BY created_at DESC
    `);
    return result.rows;
  } catch (error) {
    console.warn("PostgreSQL query failed, serving complaints from local JSON storage:", (error as Error).message);
    return getLocalComplaints();
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
          drive_folder_url
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11::jsonb, $12, $13, $14, $15, $16, $17, $18, $19, $20
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
      ],
    );
  } catch (error) {
    console.warn("PostgreSQL query failed, complaint saved to local JSON storage:", (error as Error).message);
  }
};