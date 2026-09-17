import type { Role, Status } from "../types";

export const NAV_ITEMS: { label: string; route: string; icon: string; roles: Role[] }[] = [
  { label: "Dashboard", route: "/dashboard", icon: "dashboard", roles: ["Operator", "Officer", "ATP", "MTP", "JC", "C", "Admin"] },
  { label: "New Complaint", route: "/complaints/new", icon: "plus", roles: ["Operator", "Officer", "ATP", "MTP", "JC", "C", "Admin"] },
  { label: "Complaints", route: "/complaints", icon: "list", roles: ["Operator", "Officer", "ATP", "MTP", "JC", "C", "Admin"] },
  { label: "Cases", route: "/cases", icon: "folder", roles: ["Operator", "Officer", "ATP", "MTP", "JC", "C", "Admin"] },
  { label: "Field Inspections", route: "/field-inspection", icon: "search", roles: ["Operator", "Officer", "ATP", "MTP", "JC", "C", "Admin"] },
  { label: "Notices", route: "/notices", icon: "file", roles: ["Operator", "Officer", "ATP", "MTP", "JC", "C", "Admin"] },
  { label: "Officers", route: "/officers", icon: "users", roles: ["Admin", "ATP", "MTP", "JC", "C"] },
  { label: "GIS / Map", route: "/gis-map", icon: "map", roles: ["Operator", "Officer", "ATP", "MTP", "JC", "C", "Admin"] },
  { label: "Reports", route: "/reports", icon: "chart", roles: ["Operator", "Officer", "ATP", "MTP", "JC", "C", "Admin"] },
];

export const statusConfig: Record<Status, { tone: string; text: string }> = {
  "Registered": { tone: "blue", text: "#2563EB" },
  "Assigned": { tone: "orange", text: "#EA580C" },
  "In progress": { tone: "amber", text: "#D97706" },
  "Resolution submitted": { tone: "purple", text: "#7C3AED" },
  "Pending approval": { tone: "amber", text: "#D97706" },
  "Approved / Closed": { tone: "green", text: "#16A34A" },
  "Rejected": { tone: "red", text: "#DC2626" },
  "Rework required": { tone: "red", text: "#DC2626" },
};

export const formatPageTitle = (route: string): string => {
  switch (route) {
    case "/dashboard":
      return "Dashboard";
    case "/complaints/new":
      return "New complaint";
    case "/complaints/new/manual":
      return "Register complaint";
    case "/complaints/new/upload":
      return "Upload complaint document";
    case "/complaints/new/preview":
      return "Review extracted data";
    case "/complaints/new/extracted":
      return "Extracted complaint information";
    case "/complaints":
    case "/complaints/mine":
    case "/complaints/pending":
      return "Complaints";
    case "/analytics":
      return "Analytics";
    case "/field-inspection":
      return "Field Inspections";
    case "/officers":
      return "Officers";
    case "/settings":
      return "Settings";
    case "/cases":
      return "Cases";
    case "/notices":
      return "Notices";
    case "/gis-map":
      return "GIS / Map";
    case "/reports":
      return "Reports";
    case "/login":
      return "Login";
    default:
      if (route.startsWith("/complaints/confirm/")) return "Complaint registered";
      if (route.startsWith("/complaints/")) return "Complaint detail";
      return "Dashboard";
  }
};
