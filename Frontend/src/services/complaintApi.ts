import type { Complaint, ComplaintFormData } from "../types/complaint.js";

const API_URL     = "http://localhost:5000/api/complaints";
const STORAGE_KEY = "mcl-complaints";
const LATEST_KEY  = "mcl-latest-complaint";

// ── Local storage helpers ────────────────────────────────────────────────────

const readStored = (): Complaint[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Complaint[]) : [];
  } catch { return []; }
};

const writeStored = (complaints: Complaint[]) => {
  if (typeof window !== "undefined")
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(complaints));
};

const writeLatest = (complaint: Complaint) => {
  if (typeof window !== "undefined")
    window.localStorage.setItem(LATEST_KEY, JSON.stringify(complaint));
};

export const getStoredComplaints = (): Complaint[] => readStored();

// ── Fallback local record (server unavailable) ───────────────────────────────

const createLocalRecord = (data: ComplaintFormData): Complaint => {
  const complaints = readStored();
  const complaintId = `MCL-BB-${String(complaints.length + 1).padStart(4, "0")}`;

  return {
    complaintId,
    registrationSource: "manual",
    citizenName: data.citizenName,
    phoneNumber: data.phoneNumber,
    zone: data.zone,
    block: data.block,
    ward: data.ward,
    address: data.address,
    title: data.title,
    description: data.description,
    assignedOfficerId: null,
    assignedOfficerName: null,
    assignedOfficerMobile: null,
    status: "Registered",
    createdAt: new Date().toISOString(),
  };
};

// ── Submit complaint (manual, with mandatory complaint image) ────────────────

export const submitComplaint = async (data: ComplaintFormData, complaintImages: File[]) => {
  try {
    // Send as multipart/form-data so the server receives both JSON fields and the image
    const body = new FormData();
    body.append("registrationSource", "manual");
    body.append("citizenName",   data.citizenName);
    body.append("phoneNumber",   data.phoneNumber);
    body.append("block",         data.block);
    body.append("zone",          data.zone);
    body.append("ward",          data.ward ?? "");
    body.append("address",       data.address);
    body.append("title",         data.title);
    body.append("description",   data.description);
    complaintImages.forEach((image) => body.append("complaintImage", image, image.name));

    const response = await fetch(API_URL, { method: "POST", body });
    const result   = await response.json();

    if (!response.ok) throw new Error(result.message || "Failed to submit complaint");

    const complaint: Complaint = result?.complaint ?? {
      complaintId:          result?.complaintId ?? "",
      registrationSource:   "manual",
      citizenName:          data.citizenName,
      phoneNumber:          data.phoneNumber,
      zone:                 data.zone,
      block:                data.block,
      ward:                 data.ward,
      address:              data.address,
      title:                data.title,
      description:          data.description,
      assignedOfficerId:    null,
      assignedOfficerName:  result?.complaint?.assignedOfficerName ?? null,
      assignedOfficerMobile: result?.complaint?.assignedOfficerMobile ?? null,
      status:               "Registered",
      createdAt:            new Date().toISOString(),
    };

    const stored = readStored();
    if (!stored.find((c) => c.complaintId === complaint.complaintId)) {
      writeStored([...stored, complaint]);
    }
    writeLatest(complaint);

    return { ...result, complaintId: complaint.complaintId, complaint };
  } catch (error) {
    // Server unreachable — fall back to local storage
    const saved = createLocalRecord(data);
    writeStored([...readStored(), saved]);
    writeLatest(saved);

    return {
      success:     true,
      complaintId: saved.complaintId,
      complaint:   { ...saved, assignedOfficerName: null },
      message:     "Complaint saved locally while the server is unavailable.",
    };
  }
};
