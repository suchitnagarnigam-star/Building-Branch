import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";

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

        const permission =
          Notification.permission === "granted"
            ? "granted"
            : await Notification.requestPermission();

        if (permission !== "granted" || isCancelled) {
          return;
        }

        const reg = await navigator.serviceWorker.ready;
        if (isCancelled) return;

        const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "/api";
        const keyRes = await fetch(`${apiBase.replace(/\/$/, "")}/push/vapid-public-key`);
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

        // Sync subscription with server (global fetch interceptor attaches Bearer token)
        await fetch(`${apiBase.replace(/\/$/, "")}/push/subscribe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subscription.toJSON()),
        });
      } catch (err) {
        console.warn("[PushNotifications] Push registration notice:", err);
      }
    }

    void registerAndSubscribe();

    return () => {
      isCancelled = true;
    };
  }, [user?.officerId]);
}
