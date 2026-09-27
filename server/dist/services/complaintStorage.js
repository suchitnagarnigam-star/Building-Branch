"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveComplaint = exports.generateComplaintId = exports.getComplaints = void 0;
const database_1 = require("../db/database");
const node_crypto_1 = require("node:crypto");
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const LOCAL_STORAGE_FILE = node_path_1.default.join(__dirname, "../data/complaints.json");
async function getLocalComplaints() {
    try {
        const data = await promises_1.default.readFile(LOCAL_STORAGE_FILE, "utf-8");
        return JSON.parse(data);
    }
    catch {
        return [];
    }
}
async function saveLocalComplaint(complaint) {
    const complaints = await getLocalComplaints();
    const index = complaints.findIndex((c) => c.complaintId === complaint.complaintId);
    if (index >= 0) {
        complaints[index] = complaint;
    }
    else {
        complaints.unshift(complaint);
    }
    await promises_1.default.writeFile(LOCAL_STORAGE_FILE, JSON.stringify(complaints, null, 2), "utf-8");
}
const getComplaints = async (filterByUserId) => {
    try {
        const whereClause = filterByUserId ? "WHERE submitted_by_user_id = $1" : "";
        const params = filterByUserId ? [filterByUserId] : [];
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
        drive_folder_url AS "driveFolderUrl",
        submitted_by_user_id AS "submittedByUserId",
        (
          SELECT case_id FROM cases WHERE primary_complaint_id = complaints.complaint_id
          UNION
          SELECT case_id FROM case_complaints WHERE complaint_id = complaints.complaint_id
          LIMIT 1
        ) AS "caseId"
      FROM complaints
      ${whereClause}
      ORDER BY created_at DESC
    `, params);
        return result.rows;
    }
    catch (error) {
        console.warn("PostgreSQL query failed, serving complaints from local JSON storage:", error.message);
        const local = await getLocalComplaints();
        if (filterByUserId) {
            return local.filter((c) => c.submittedByUserId === filterByUserId);
        }
        return local;
    }
};
exports.getComplaints = getComplaints;
const generateComplaintId = async () => {
    try {
        while (true) {
            const complaintId = String((0, node_crypto_1.randomInt)(10000000000000, 100000000000000));
            const result = await database_1.pool.query("SELECT 1 FROM complaints WHERE complaint_id = $1 LIMIT 1", [complaintId]);
            if (result.rowCount === 0) {
                return complaintId;
            }
        }
    }
    catch {
        const local = await getLocalComplaints();
        let complaintId = String((0, node_crypto_1.randomInt)(10000000000000, 100000000000000));
        while (local.some((c) => c.complaintId === complaintId)) {
            complaintId = String((0, node_crypto_1.randomInt)(10000000000000, 100000000000000));
        }
        return complaintId;
    }
};
exports.generateComplaintId = generateComplaintId;
const saveComplaint = async (complaint) => {
    // Always update local JSON storage as secondary persistence
    await saveLocalComplaint(complaint);
    try {
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
            complaint.submittedByUserId ?? null,
        ]);
    }
    catch (error) {
        console.warn("PostgreSQL query failed, complaint saved to local JSON storage:", error.message);
    }
};
exports.saveComplaint = saveComplaint;
