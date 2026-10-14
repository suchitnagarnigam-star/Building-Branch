import { useEffect, useState } from "react";

const getCurrentRoute = (): string => {
  if (typeof window === "undefined") return "/dashboard";
  const rawHash = window.location.hash.replace(/^#\/?/, "").trim();
  if (rawHash) {
    return rawHash.startsWith("/") ? rawHash : `/${rawHash}`;
  }

  // Fallback to pathname if the user arrived via direct link (e.g. /complaints/123 or /cases/123)
  const pathname = window.location.pathname.trim();
  if (pathname && pathname !== "/" && pathname !== "/index.html") {
    // Synchronize to hash route for seamless client-side SPA navigation
    const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
    window.location.hash = normalized;
    return normalized;
  }

  return "/login";
};

export function useRouter() {
  const [route, setRoute] = useState<string>(() => getCurrentRoute());

  useEffect(() => {
    const onHashChange = () => setRoute(getCurrentRoute());
    window.addEventListener("hashchange", onHashChange);

    // Listen for cross-context navigation events from Service Worker
    const onServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "NAVIGATE_TO" && typeof event.data.url === "string") {
        const nextTarget = event.data.url.replace(/^#\/?/, "");
        const formatted = nextTarget.startsWith("/") ? nextTarget : `/${nextTarget}`;
        window.location.hash = formatted;
        setRoute(formatted);
      }
    };
    if (typeof navigator !== "undefined" && navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener("message", onServiceWorkerMessage);
    }

    return () => {
      window.removeEventListener("hashchange", onHashChange);
      if (typeof navigator !== "undefined" && navigator.serviceWorker) {
        navigator.serviceWorker.removeEventListener("message", onServiceWorkerMessage);
      }
    };
  }, []);

  const navigate = (nextRoute: string) => {
    window.location.hash = nextRoute;
    setRoute(nextRoute);
  };

  return { route, navigate };
}
