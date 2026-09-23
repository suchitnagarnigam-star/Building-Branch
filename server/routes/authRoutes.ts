import { Router, Request, Response } from "express";
import { pool } from "../db/database";
import { verifyPassword, generateToken, JWTPayload } from "../services/authService";
import { authenticateToken } from "../middleware/auth";

const router = Router();

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { identifier, password } = req.body as {
      identifier?: string;
      password?: string;
    };

    if (!identifier || !password) {
      res.status(400).json({
        success: false,
        message: "Identifier and password are required.",
      });
      return;
    }

    const trimmedIdentifier = identifier.trim();

    // a. Query user by identifier (username or phone_number normalizing hyphens)
    const result = await pool.query<{
      user_id: number;
      username: string | null;
      phone_number: string | null;
      password_hash: string;
      role: string;
      name: string;
      is_active: boolean;
      failed_attempts: number;
      locked_until: string | null;
      officer_id: string | null;
      zone: string | null;
    }>(
      `
        SELECT 
          u.user_id,
          u.username,
          u.phone_number,
          u.password_hash,
          u.role,
          u.name,
          u.is_active,
          u.failed_attempts,
          u.locked_until,
          o.officer_id,
          o.zone
        FROM users u
        LEFT JOIN officers o ON o.user_id = u.user_id
        WHERE (u.username = $1 OR REPLACE(u.phone_number, '-', '') = REPLACE($1, '-', ''))
          AND u.is_active = true
        LIMIT 1
      `,
      [trimmedIdentifier]
    );

    // b. If not found → 401
    if (result.rowCount === 0) {
      res.status(401).json({
        success: false,
        message: "Invalid credentials.",
      });
      return;
    }

    const user = result.rows[0];

    // c. If locked_until > NOW() → 423 (do NOT reset here)
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const remainingMs = new Date(user.locked_until).getTime() - Date.now();
      const remainingMinutes = Math.max(1, Math.ceil(remainingMs / 60000));
      res.status(423).json({
        success: false,
        message: `Account is locked due to too many failed attempts. Try again in ${remainingMinutes} minute(s).`,
        remainingMinutes,
      });
      return;
    }

    // d. If locked_until is past → reset failed_attempts=0, locked_until=NULL, continue
    if (user.locked_until && new Date(user.locked_until) <= new Date()) {
      await pool.query(
        "UPDATE users SET failed_attempts = 0, locked_until = NULL, updated_at = NOW() WHERE user_id = $1",
        [user.user_id]
      );
      user.failed_attempts = 0;
      user.locked_until = null;
    }

    // e. Verify password → on fail: increment, check if ≥5, set lockout → 401
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      const newFailedAttempts = (user.failed_attempts || 0) + 1;
      if (newFailedAttempts >= 5) {
        const lockUntil = new Date(Date.now() + 15 * 60 * 1000);
        await pool.query(
          "UPDATE users SET failed_attempts = $1, locked_until = $2, updated_at = NOW() WHERE user_id = $3",
          [newFailedAttempts, lockUntil, user.user_id]
        );
        res.status(401).json({
          success: false,
          message: "Invalid credentials. Account has been locked for 15 minutes.",
        });
        return;
      }

      await pool.query(
        "UPDATE users SET failed_attempts = $1, updated_at = NOW() WHERE user_id = $2",
        [newFailedAttempts, user.user_id]
      );
      res.status(401).json({
        success: false,
        message: "Invalid credentials.",
      });
      return;
    }

    // f. On success → reset, build token → 200
    await pool.query(
      "UPDATE users SET failed_attempts = 0, locked_until = NULL, updated_at = NOW() WHERE user_id = $1",
      [user.user_id]
    );

    const officerId = user.officer_id || null;
    const zone = user.zone || null;

    const payload: JWTPayload = {
      userId: user.user_id,
      officerId,
      role: user.role,
      name: user.name,
      zone,
    };

    const token = generateToken(payload);

    res.status(200).json({
      token,
      user: {
        userId: user.user_id,
        officerId,
        role: user.role,
        name: user.name,
        zone,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during authentication.",
    });
  }
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
router.post("/logout", authenticateToken, (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "Logged out successfully.",
  });
});

export default router;

