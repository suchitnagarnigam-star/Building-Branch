import { JWTPayload } from "./authService";
import { pool } from "../db/database";
import { getOfficers, Officer } from "./officerMapping";

/**
 * Standardises block string into a clean lowercase identifier.
 * e.g., "Block 2" -> "2", "block 25" -> "25", "Block 31(1)" -> "31(1)"
 */
export const normalizeBlock = (blockStr: string | null | undefined): string => {
  if (!blockStr) return "";
  return blockStr
    .toString()
    .replace(/^zone\s*/i, "")
    .replace(/^block\s*/i, "")
    .trim()
    .toLowerCase();
};

/**
 * Checks whether a given block is allowed for a user.
 * Returns true if assignedBlocks is null (unrestricted role: superadmin, jc, mtp, operator, etc.)
 * Returns true if blockStr matches any of the assigned blocks.
 */
export const isBlockAssigned = (
  blockStr: string | null | undefined,
  assignedBlocks: string[] | null
): boolean => {
  if (assignedBlocks === null) return true;
  if (!blockStr || assignedBlocks.length === 0) return false;

  const targetNorm = normalizeBlock(blockStr);
  return assignedBlocks.some((ab) => normalizeBlock(ab) === targetNorm);
};

/**
 * Returns the list of assigned blocks for a user based on their role:
 * - Superadmin / Admin / JC / MTP / Operator / other non-BI/non-ATP roles -> returns null (unrestricted)
 * - BI / ATP -> returns array of assigned block strings (e.g. ["2", "25", "32", "33"])
 */
export const getUserAssignedBlocks = async (
  user?: JWTPayload | null
): Promise<string[] | null> => {
  if (!user || !user.role) {
    return null;
  }

  const role = user.role.toLowerCase();

  // Roles other than 'bi' and 'atp' have unrestricted access across ALL zones and ALL blocks.
  if (role !== "bi" && role !== "atp") {
    return null;
  }

  // 1. Check if token already contains blocks
  if (Array.isArray(user.blocks) && user.blocks.length > 0) {
    return user.blocks;
  }

  // 2. Try querying Database for linked officer record
  try {
    const result = await pool.query<{ blocks: string[] | null }>(
      `SELECT o.blocks
       FROM officers o
       WHERE o.user_id = $1 OR o.officer_id = $2
       LIMIT 1`,
      [user.userId, user.officerId]
    );

    if (result.rowCount && result.rowCount > 0 && Array.isArray(result.rows[0].blocks) && result.rows[0].blocks.length > 0) {
      return result.rows[0].blocks;
    }
  } catch {
    // Database query failed or unconfigured, proceed to JSON fallback
  }

  // 3. Fallback to officers.json file lookup
  try {
    const officers: Officer[] = await getOfficers();
    const officer = officers.find((o) => {
      if (user.officerId && o.officerId.toLowerCase() === user.officerId.toLowerCase()) return true;
      if (user.name && o.name.toLowerCase() === user.name.toLowerCase()) return true;
      return false;
    });

    if (officer && Array.isArray(officer.blocks) && officer.blocks.length > 0) {
      return officer.blocks;
    }
  } catch {
    // Fallback failed
  }

  return [];
};
