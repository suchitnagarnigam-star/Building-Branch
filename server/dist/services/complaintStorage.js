"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveComplaint = exports.generateComplaintId = exports.getComplaints = void 0;
const database_1 = require("../db/database");
const getComplaints = async () => {
    const result = await database_1.pool.query(`
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
exports.getComplaints = getComplaints;
const generateComplaintId = async () => {
    const result = await database_1.pool.query("SELECT nextval('complaint_id_seq') AS next_number");
    const nextNumber = Number(result.rows[0]?.next_number);
    if (!Number.isInteger(nextNumber)) {
        throw new Error("Unable to generate complaint ID.");
    }
    return `MCL-BB-${String(nextNumber).padStart(4, "0")}`;
};
exports.generateComplaintId = generateComplaintId;
const saveComplaint = async (complaint) => {
    await database_1.pool.query(`
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
    `, [
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
    ]);
};
exports.saveComplaint = saveComplaint;
