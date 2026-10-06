import webpush from "web-push";
import { pool } from "../db/database";

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:mcl-bb@ludhiana.gov.in";

if (vapidPublicKey && vapidPrivateKey) {
  try {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  } catch (err) {
    console.warn("⚠️ [PushService] Failed to initialize VAPID details:", err);
  }
}

export interface PushPayload {
  title: string;
  body: string;
  tag?: string; // Deduplication key — same tag replaces older notification
  url?: string; // Route/URL to navigate when clicked
  data?: Record<string, unknown>;
}

/**
 * Dispatches web push notification to all active device subscriptions registered for an officer.
 * Silently prunes expired subscriptions (HTTP 410 / 404).
 */
export async function notifyOfficer(officerId: string, payload: PushPayload): Promise<void> {
  if (!officerId) return;

  try {
    const { rows } = await pool.query(
      "SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE UPPER(officer_id) = UPPER($1)",
      [officerId]
    );

    if (rows.length === 0) return;

    const sends = rows.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload),
          { TTL: 86400 } // 24-hour delivery TTL
        );
      } catch (err: any) {
        // HTTP 410 Gone or 404 Not Found indicates revoked/expired subscription
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          await pool.query("DELETE FROM push_subscriptions WHERE endpoint = $1", [sub.endpoint]);
        }
      }
    });

    await Promise.allSettled(sends);
  } catch (error) {
    console.error(`[PushService] Failed to dispatch notifications to officer ${officerId}:`, error);
  }
}

/**
 * Broadcasts notification to multiple officers concurrently.
 */
export async function notifyOfficers(
  officerIds: (string | null | undefined)[],
  payload: PushPayload
): Promise<void> {
  const uniqueIds = Array.from(new Set(officerIds.filter((id): id is string => Boolean(id))));
  await Promise.allSettled(uniqueIds.map((id) => notifyOfficer(id, payload)));
}
