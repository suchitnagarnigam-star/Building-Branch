import { Router, Request, Response } from "express";
import { pool } from "../db/database";
import { authenticateToken } from "../middleware/auth";

const router = Router();

router.use(authenticateToken);

/**
 * GET /api/notifications
 * Returns recent in-app notifications for the authenticated officer or superadmin.
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const officerId = req.user?.officerId || null;
    const role = (req.user?.role || "").toLowerCase();
    const isSuperAdmin = role === "superadmin" || role === "admin";

    let queryText: string;
    let params: any[];

    if (isSuperAdmin) {
      queryText = `
        SELECT
          notification_id AS "notificationId",
          recipient_officer_id AS "recipientOfficerId",
          type,
          entity_type AS "entityType",
          entity_id AS "entityId",
          title,
          body,
          url,
          read_at AS "readAt",
          (read_at IS NOT NULL) AS "isRead",
          created_at AS "createdAt"
        FROM notifications
        ORDER BY created_at DESC
        LIMIT 50
      `;
      params = [];
    } else if (officerId) {
      queryText = `
        SELECT
          notification_id AS "notificationId",
          recipient_officer_id AS "recipientOfficerId",
          type,
          entity_type AS "entityType",
          entity_id AS "entityId",
          title,
          body,
          url,
          read_at AS "readAt",
          (read_at IS NOT NULL) AS "isRead",
          created_at AS "createdAt"
        FROM notifications
        WHERE UPPER(recipient_officer_id) = UPPER($1)
        ORDER BY created_at DESC
        LIMIT 50
      `;
      params = [officerId];
    } else {
      // User is not an officer and not superadmin (e.g. operator)
      res.json({ success: true, notifications: [], unreadCount: 0 });
      return;
    }

    const { rows } = await pool.query(queryText, params);
    const unreadCount = rows.filter((r) => !r.isRead).length;

    res.json({
      success: true,
      notifications: rows,
      unreadCount,
    });
  } catch (error) {
    console.error("[Notifications] Failed to retrieve notifications:", error);
    res.status(500).json({
      success: false,
      message: "Unable to retrieve notifications.",
    });
  }
});

/**
 * PATCH /api/notifications/read-all
 * Marks all unread notifications for the active officer as read.
 */
router.patch("/read-all", async (req: Request, res: Response) => {
  try {
    const officerId = req.user?.officerId || null;
    const role = (req.user?.role || "").toLowerCase();
    const isSuperAdmin = role === "superadmin" || role === "admin";

    if (isSuperAdmin) {
      await pool.query(
        "UPDATE notifications SET read_at = NOW() WHERE read_at IS NULL"
      );
    } else if (officerId) {
      await pool.query(
        "UPDATE notifications SET read_at = NOW() WHERE UPPER(recipient_officer_id) = UPPER($1) AND read_at IS NULL",
        [officerId]
      );
    }

    res.json({
      success: true,
      message: "All notifications marked as read.",
    });
  } catch (error) {
    console.error("[Notifications] Failed to mark all as read:", error);
    res.status(500).json({
      success: false,
      message: "Unable to update notifications.",
    });
  }
});

/**
 * PATCH /api/notifications/:id/read
 * Marks a specific notification as read.
 */
router.patch("/:id/read", async (req: Request, res: Response) => {
  try {
    const notificationId = req.params.id;
    const officerId = req.user?.officerId || null;
    const role = (req.user?.role || "").toLowerCase();
    const isSuperAdmin = role === "superadmin" || role === "admin";

    let result;
    if (isSuperAdmin) {
      result = await pool.query(
        "UPDATE notifications SET read_at = NOW() WHERE notification_id = $1 RETURNING notification_id",
        [notificationId]
      );
    } else if (officerId) {
      result = await pool.query(
        "UPDATE notifications SET read_at = NOW() WHERE notification_id = $1 AND UPPER(recipient_officer_id) = UPPER($2) RETURNING notification_id",
        [notificationId, officerId]
      );
    } else {
      res.status(403).json({ success: false, message: "Unauthorized" });
      return;
    }

    if (result.rowCount === 0) {
      res.status(404).json({
        success: false,
        message: "Notification not found or access denied.",
      });
      return;
    }

    res.json({
      success: true,
      message: "Notification marked as read.",
    });
  } catch (error) {
    console.error(`[Notifications] Failed to mark notification ${req.params.id} as read:`, error);
    res.status(500).json({
      success: false,
      message: "Unable to update notification status.",
    });
  }
});

export default router;

