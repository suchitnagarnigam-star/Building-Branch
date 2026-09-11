"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveComplaint = exports.generateComplaintId = exports.getComplaints = void 0;
const database_1 = require("../db/database");
const node_crypto_1 = require("node:crypto");
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
      created_at AS "createdAt",
      drive_folder_url AS "driveFolderUrl"
    FROM complaints
    ORDER BY created_at DESC
  `);
    return result.rows;
};
exports.getComplaints = getComplaints;
const generateComplaintId = async () => {
    while (true) {
        const complaintId = String((0, node_crypto_1.randomInt)(10000000000000, 100000000000000));
        const result = await database_1.pool.query("SELECT 1 FROM complaints WHERE complaint_id = $1 LIMIT 1", [complaintId]);
        if (result.rowCount === 0) {
            return complaintId;
        }
    }
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
        created_at,
        drive_folder_url
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11::jsonb, $12, $13, $14, $15, $16, $17, $18, $19, $20
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
        complaint.driveFolderUrl ?? null,
    ]);
};
exports.saveComplaint = saveComplaint;
