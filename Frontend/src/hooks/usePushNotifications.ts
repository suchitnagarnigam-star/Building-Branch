import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../shared/utils/apiConfig";

/**
 * Converts a URL-safe Base64 string to a Uint8Array required by PushManager.subscribe().
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Subscribes the current browser to push notifications and syncs with the server.
 */
export async function subscribeToPushNotifications(): Promise<{
  success: boolean;
  permission: NotificationPermission;
  error?: string;
}> {
  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  ) {
    return { success: false, permission: "denied", error: "Push notifications are not supported on this browser or platform." };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return { success: false, permission, error: permission === "denied" ? "Permission denied in browser settings." : "Permission prompt dismissed." };
    }

    const reg = await navigator.serviceWorker.ready;
    const keyRes = await fetch(`${API_BASE_URL}/push/vapid-public-key`);
    const keyData = await keyRes.json();

    if (!keyData.success || !keyData.publicKey) {
      return { success: false, permission, error: "Failed to fetch VAPID public key from server." };
    }

    const applicationServerKey = urlBase64ToUint8Array(keyData.publicKey);
    let subscription = await reg.pushManager.getSubscription();

    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as unknown as BufferSource,
      });
    }

    const syncRes = await fetch(`${API_BASE_URL}/push/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription.toJSON()),
    });

    if (!syncRes.ok) {
      const errJson = await syncRes.json().catch(() => ({}));
      return { success: false, permission, error: errJson.message || "Failed to persist subscription on server." };
    }

    return { success: true, permission: "granted" };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, permission: Notification.permission, error: message };
  }
}

/**
 * Unsubscribes the current device from push notifications and deletes from server.
 */
export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window)
  ) {
    return false;
  }

  try {
    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.getSubscription();

    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();

      await fetch(`${API_BASE_URL}/push/subscribe`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint }),
      }).catch(() => {});
    }
    return true;
  } catch (err) {
    console.warn("[PushNotifications] Error unsubscribing:", err);
    return false;
  }
}

/**
 * Checks if the current browser already has an active push subscription.
 */
export async function checkPushSubscriptionActive(): Promise<boolean> {
  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  ) {
    return false;
  }

  if (Notification.permission !== "granted") {
    return false;
  }

  try {
    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.getSubscription();
    return Boolean(subscription);
  } catch {
    return false;
  }
}

/**
 * Hook to request push permissions and synchronize Web Push subscriptions with the MCL backend.
 * Automatically activates for authenticated officers with an assigned officerId.
 */
export function usePushNotifications(): void {
  const { user } = useAuth();

  useEffect(() => {
    // Only subscribe officers with an assigned officerId (e.g. BI, ATP)
    if (!user?.officerId) return;

    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    ) {
      return;
    }

    let isCancelled = false;

    async function registerAndSubscribe(): Promise<void> {
      try {
        if (Notification.permission === "denied") {
          return;
        }

        if (Notification.permission === "granted") {
          const reg = await navigator.serviceWorker.ready;
          if (isCancelled) return;

          const keyRes = await fetch(`${API_BASE_URL}/push/vapid-public-key`);
          const keyData = await keyRes.json();

          if (!keyData.success || !keyData.publicKey || isCancelled) {
            return;
          }

          const applicationServerKey = urlBase64ToUint8Array(keyData.publicKey);
          let subscription = await reg.pushManager.getSubscription();

          if (!subscription) {
            subscription = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: applicationServerKey as unknown as BufferSource,
            });
          }

          if (isCancelled) return;

          await fetch(`${API_BASE_URL}/push/subscribe`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(subscription.toJSON()),
          });
        }
      } catch (err) {
        console.warn("[PushNotifications] Auto-sync notice:", err);
      }
    }

    void registerAndSubscribe();

    return () => {
      isCancelled = true;
    };
  }, [user?.officerId]);
}

