import { Router } from "express";
import { pool } from "../db/database";
import { authenticateToken } from "../middleware/auth";

const router = Router();

/**
 * GET /api/push/vapid-public-key
 * Returns VAPID public key required by browser PushManager to subscribe.
 */
router.get("/vapid-public-key", (_req, res) => {
  const publicKey = process.env.VAPID_PUBLIC_KEY || "";
  res.json({ success: true, publicKey });
});

/**
 * POST /api/push/subscribe
 * Registers or updates an officer device's PushSubscription.
 */
router.post("/subscribe", authenticateToken, async (req, res) => {
  const { endpoint, keys } = req.body || {};
  const actor = req.user;

  if (!actor || !actor.officerId) {
    res.status(400).json({
      success: false,
      message: "Push notifications can only be registered for authenticated officers with an assigned officer ID.",
    });
    return;
  }

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    res.status(400).json({
      success: false,
      message: "Invalid PushSubscription payload: endpoint, keys.p256dh, and keys.auth are required.",
    });
    return;
  }

  try {
    const userAgent = (req.headers["user-agent"] as string) || null;

    await pool.query(
      `INSERT INTO push_subscriptions (
         officer_id, user_id, endpoint, p256dh, auth, user_agent, created_at
       ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (officer_id, endpoint) DO UPDATE SET
         p256dh = EXCLUDED.p256dh,
         auth = EXCLUDED.auth,
         user_agent = EXCLUDED.user_agent,
         created_at = NOW()`,
      [actor.officerId, actor.userId, endpoint, keys.p256dh, keys.auth, userAgent]
    );

    res.json({
      success: true,
      message: "Push subscription successfully registered.",
    });
  } catch (error) {
    console.error("[PushRoutes] Error saving push subscription:", error);
    res.status(500).json({
      success: false,
      message: "Failed to persist push subscription.",
    });
  }
});

/**
 * DELETE /api/push/subscribe
 * Unsubscribes a browser endpoint.
 */
router.delete("/subscribe", authenticateToken, async (req, res) => {
  const { endpoint } = req.body || {};

  if (!endpoint) {
    res.status(400).json({ success: false, message: "Endpoint is required to unsubscribe." });
    return;
  }

  try {
    await pool.query("DELETE FROM push_subscriptions WHERE endpoint = $1", [endpoint]);
    res.json({ success: true, message: "Push subscription removed." });
  } catch (error) {
    console.error("[PushRoutes] Error deleting push subscription:", error);
    res.status(500).json({ success: false, message: "Failed to delete push subscription." });
  }
});

/**
 * POST /api/push/test
 * Sends a test push notification to the calling officer's subscribed devices.
 */
router.post("/test", authenticateToken, async (req, res) => {
  const actor = req.user;
  if (!actor || !actor.officerId) {
    res.status(400).json({
      success: false,
      message: "Push notifications test requires an assigned officer ID.",
    });
    return;
  }

  try {
    const { notifyOfficer } = await import("../services/pushService");
    await notifyOfficer(actor.officerId, {
      title: "MCL Building Branch Alert",
      body: `Test notification sent successfully to ${actor.name || "Officer"} at ${new Date().toLocaleTimeString("en-IN")}.`,
      url: "/profile",
    });
    res.json({ success: true, message: "Test notification dispatched." });
  } catch (error) {
    console.error("[PushRoutes] Error sending test notification:", error);
    res.status(500).json({ success: false, message: "Failed to send test push notification." });
  }
});

export default router;
