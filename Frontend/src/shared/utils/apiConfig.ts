const raw = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim().replace(/\/$/, "");

export const API_BASE_URL: string = raw
  ? (raw.endsWith("/api") ? raw : `${raw}/api`)
  : "http://localhost:5000/api";


