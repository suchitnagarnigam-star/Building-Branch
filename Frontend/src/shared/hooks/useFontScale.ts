import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "mcl-font-scale";
const EVENT_NAME = "mcl-font-scale-changed";

export function applyFontScaleToDOM(scale: number) {
  if (typeof document === "undefined") return;
  const clampedScale = Math.min(115, Math.max(85, scale));
  document.documentElement.style.fontSize = `${(clampedScale / 100) * 16}px`;
  (document.documentElement.style as unknown as Record<string, string>).zoom = `${clampedScale / 100}`;
}

export function useFontScale() {
  const [fontScale, setFontScaleState] = useState<number>(() => {
    if (typeof window === "undefined") return 100;
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? Number(saved) : 100;
    return !Number.isNaN(parsed) && parsed >= 85 && parsed <= 115 ? parsed : 100;
  });

  const setFontScale = useCallback((scale: number) => {
    const clampedScale = Math.min(115, Math.max(85, scale));
    setFontScaleState(clampedScale);
    applyFontScaleToDOM(clampedScale);
    localStorage.setItem(STORAGE_KEY, String(clampedScale));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: clampedScale }));
  }, []);

  useEffect(() => {
    // Apply current scale to DOM on initial mount & updates
    applyFontScaleToDOM(fontScale);

    // Intra-tab sync across components (e.g. Topbar <-> SettingsPage)
    const handleScaleChange = (e: Event) => {
      const customEvent = e as CustomEvent<number>;
      if (typeof customEvent.detail === "number") {
        setFontScaleState(customEvent.detail);
        applyFontScaleToDOM(customEvent.detail);
      }
    };

    // Cross-tab sync if opened in multiple browser tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        const val = Number(e.newValue);
        if (!Number.isNaN(val) && val >= 85 && val <= 115) {
          setFontScaleState(val);
          applyFontScaleToDOM(val);
        }
      }
    };

    window.addEventListener(EVENT_NAME, handleScaleChange);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener(EVENT_NAME, handleScaleChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [fontScale]);

  return { fontScale, setFontScale };
}
