import { Router, Request, Response } from "express";
import { pool } from "../db/database";
import { hashPassword } from "../services/authService";
import { authenticateToken, requireRole } from "../middleware/auth";

const router = Router();

// Superadmin only for all endpoints in this router
router.use(authenticateToken);
router.use(requireRole("superadmin"));

const ALLOWED_ROLES = ["superadmin", "jc", "mtp", "atp", "bi", "operator"] as const;
type RoleType = typeof ALLOWED_ROLES[number];

// ── GET /api/users ─────────────────────────────────────────────────────────────
router.get("/", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        user_id AS "userId",
        username,
        phone_number AS "phoneNumber",
        role,
        name,
        is_active AS "isActive",
        failed_attempts AS "failedAttempts",
        locked_until AS "lockedUntil",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM users
      ORDER BY user_id ASC
    `);

    res.json({
      success: true,
      users: result.rows,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users.",
    });
  }
});

// ── GET /api/users/:userId ─────────────────────────────────────────────────────
router.get("/:userId", async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.userId);
    if (Number.isNaN(userId)) {
      res.status(400).json({ success: false, message: "Invalid user ID." });
      return;
    }

    const result = await pool.query(
      `
        SELECT 
          user_id AS "userId",
          username,
          phone_number AS "phoneNumber",
          role,
          name,
          is_active AS "isActive",
          failed_attempts AS "failedAttempts",
          locked_until AS "lockedUntil",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM users
        WHERE user_id = $1
      `,
      [userId]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ success: false, message: "User not found." });
      return;
    }

    res.json({
      success: true,
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user.",
    });
  }
});

// ── POST /api/users ────────────────────────────────────────────────────────────
router.post("/", async (req: Request, res: Response) => {
  try {
    const { name, username, phoneNumber, phone_number, password, role } = req.body as {
      name?: string;
      username?: string;
      phoneNumber?: string;
      phone_number?: string;
      password?: string;
      role?: string;
    };

    const finalPhone = (phoneNumber || phone_number || "").trim();
    const finalName = (name || "").trim();
    const finalUsername = (username || "").trim();
    const finalPassword = (password || "").trim();
    const finalRole = (role || "").toLowerCase().trim() as RoleType;

    if (!finalName || !finalUsername || !finalPhone || !finalPassword || !finalRole) {
      res.status(400).json({
        success: false,
        message: "name, username, phone_number, password, and role are all required.",
      });
      return;
    }

    if (!ALLOWED_ROLES.includes(finalRole)) {
      res.status(400).json({
        success: false,
        message: `Invalid role. Allowed roles: ${ALLOWED_ROLES.join(", ")}`,
      });
      return;
    }

    const passwordHash = await hashPassword(finalPassword);

    const result = await pool.query(
      `
        INSERT INTO users (username, phone_number, password_hash, role, name, is_active)
        VALUES ($1, $2, $3, $4, $5, true)
        RETURNING 
          user_id AS "userId",
          username,
          phone_number AS "phoneNumber",
          role,
          name,
          is_active AS "isActive",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `,
      [finalUsername, finalPhone, passwordHash, finalRole, finalName]
    );

    res.status(201).json({
      success: true,
      message: "User created successfully.",
      user: result.rows[0],
    });
  } catch (error: unknown) {
    console.error("Error creating user:", error);
    const pgError = error as { code?: string; detail?: string };
    if (pgError.code === "23505") {
      res.status(409).json({
        success: false,
        message: "A user with this username or phone number already exists.",
      });
      return;
    }
    res.status(500).json({
      success: false,
      message: "Failed to create user.",
    });
  }
});

// ── PUT /api/users/:userId ─────────────────────────────────────────────────────
router.put("/:userId", async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.userId);
    if (Number.isNaN(userId)) {
      res.status(400).json({ success: false, message: "Invalid user ID." });
      return;
    }

    const { name, username, phoneNumber, phone_number, password, role, isActive } = req.body as {
      name?: string;
      username?: string;
      phoneNumber?: string;
      phone_number?: string;
      password?: string;
      role?: string;
      isActive?: boolean;
    };

    // Check user existence
    const existing = await pool.query("SELECT * FROM users WHERE user_id = $1", [userId]);
    if (existing.rowCount === 0) {
      res.status(404).json({ success: false, message: "User not found." });
      return;
    }

    const currentUser = existing.rows[0];

    const finalName = name !== undefined ? name.trim() : currentUser.name;
    const finalUsername = username !== undefined ? username.trim() : currentUser.username;
    const finalPhone = (phoneNumber || phone_number) !== undefined 
      ? (phoneNumber || phone_number || "").trim() 
      : currentUser.phone_number;
    
    let finalRole = currentUser.role;
    if (role !== undefined) {
      const normalizedRole = role.toLowerCase().trim() as RoleType;
      if (!ALLOWED_ROLES.includes(normalizedRole)) {
        res.status(400).json({
          success: false,
          message: `Invalid role. Allowed roles: ${ALLOWED_ROLES.join(", ")}`,
        });
        return;
      }
      finalRole = normalizedRole;
    }

    const finalIsActive = isActive !== undefined ? Boolean(isActive) : currentUser.is_active;

    let passwordHash = currentUser.password_hash;
    if (password && password.trim().length > 0) {
      passwordHash = await hashPassword(password.trim());
    }

    // If activating account, also unlock if locked
    const resetLockout = finalIsActive && (!currentUser.is_active || currentUser.locked_until);

    const result = await pool.query(
      `
        UPDATE users
        SET 
          name = $1,
          username = $2,
          phone_number = $3,
          role = $4,
          password_hash = $5,
          is_active = $6,
          failed_attempts = CASE WHEN $7 = true THEN 0 ELSE failed_attempts END,
          locked_until = CASE WHEN $7 = true THEN NULL ELSE locked_until END,
          updated_at = NOW()
        WHERE user_id = $8
        RETURNING 
          user_id AS "userId",
          username,
          phone_number AS "phoneNumber",
          role,
          name,
          is_active AS "isActive",
          failed_attempts AS "failedAttempts",
          locked_until AS "lockedUntil",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `,
      [
        finalName,
        finalUsername,
        finalPhone,
        finalRole,
        passwordHash,
        finalIsActive,
        resetLockout,
        userId,
      ]
    );

    res.json({
      success: true,
      message: "User updated successfully.",
      user: result.rows[0],
    });
  } catch (error: unknown) {
    console.error("Error updating user:", error);
    const pgError = error as { code?: string };
    if (pgError.code === "23505") {
      res.status(409).json({
        success: false,
        message: "Username or phone number is already in use by another account.",
      });
      return;
    }
    res.status(500).json({
      success: false,
      message: "Failed to update user.",
    });
  }
});

// ── DELETE /api/users/:userId (Soft Delete) ────────────────────────────────────
router.delete("/:userId", async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.userId);
    if (Number.isNaN(userId)) {
      res.status(400).json({ success: false, message: "Invalid user ID." });
      return;
    }

    if (req.user?.userId === userId) {
      res.status(400).json({
        success: false,
        message: "You cannot deactivate your own account.",
      });
      return;
    }

    const result = await pool.query(
      `
        UPDATE users
        SET is_active = false, updated_at = NOW()
        WHERE user_id = $1
        RETURNING user_id AS "userId"
      `,
      [userId]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ success: false, message: "User not found." });
      return;
    }

    res.json({
      success: true,
      message: "User deactivated successfully.",
    });
  } catch (error) {
    console.error("Error deactivating user:", error);
    res.status(500).json({
      success: false,
      message: "Failed to deactivate user.",
    });
  }
});

export default router;

