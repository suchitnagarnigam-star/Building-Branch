import type { Complaint } from "../types/complaint";
import { pool } from "../db/database";

import { randomInt } from "node:crypto";

export const getComplaints = async (): Promise<Complaint[]> => {
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
      created_at AS "createdAt"
    FROM complaints
    ORDER BY created_at DESC
  `);

  return result.rows;
};

export const generateComplaintId = async (): Promise<string> => {
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
};

export const saveComplaint = async (
  complaint: Complaint,
): Promise<void> => {
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
        created_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11::jsonb, $12, $13, $14, $15, $16, $17, $18, $19
      )
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
    ],
  );
};