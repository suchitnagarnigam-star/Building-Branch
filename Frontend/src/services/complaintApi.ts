import type { Complaint, ComplaintFormData } from "../types/complaint.js";

const API_URL     = "http://localhost:5000/api/complaints";
const SOURCE_UPLOAD_URL = "http://localhost:5000/api/complaints/source-upload";
export const EXTERNAL_SOURCE_RESULT_KEY = "mcl-external-source-result";
export const EXTRACTED_COMPLAINT_RESULT_KEY = "mcl-extracted-complaint-result";
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

export const uploadExternalSource = async (files: File[]) => {
  const body = new FormData();
  files.forEach((file) => body.append("complaintImage", file, file.name));

  const response = await fetch(SOURCE_UPLOAD_URL, { method: "POST", body });
  const result = await response.json().catch(() => ({}));

  if (!response.ok || result.filesUploaded !== files.length) {
    throw new Error(result.message || "Unable to save the uploaded source.");
  }

  return result;
};

// ── Submit complaint (manual, with mandatory complaint image) ────────────────

export const submitComplaint = async (
  data: ComplaintFormData,
  complaintImages: File[],
  registrationSource: "manual" | "document" = "manual",
) => {
  try {
    // Send as multipart/form-data so the server receives both JSON fields and the image
    const body = new FormData();
    body.append("registrationSource", registrationSource);
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
    const result = await response.json().catch(() => ({}));

    if (!response.ok) throw new Error(result.message || "Failed to submit complaint");

    const complaint: Complaint = result?.complaint ?? {
      complaintId:          result?.complaintId ?? "",
      registrationSource,
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
      assignedAtpId:         result?.complaint?.assignedAtpId ?? null,
      assignedAtpName:       result?.complaint?.assignedAtpName ?? null,
      assignedAtpMobile:     result?.complaint?.assignedAtpMobile ?? null,
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
    console.error("Complaint API submission failed:", error);
    throw error instanceof Error
      ? error
      : new Error("Unable to reach the complaint server. Please start the backend and try again.");
  }
};
export interface OCRImageResult {
  img_index: number;
  filename: string;
  file_type: string;
  ocr_md: string;
  ocr_pages: number;
}

export interface ProcessSourceResponse {
  success: boolean;
  status: "ocr_completed" | "failed";
  fileCount: number;
  files: string[];
  images: OCRImageResult[];
  pageSections: string[];
  combinedOcr: string;
  message?: string;
}

export interface ExtractedComplaint {
  citizenName: string;
  phoneNumber: string;
  block: string;
  zone: string;
  ward: string;
  address: string;
  title: string;
  description: string;
}

export interface ExtractSourceResponse {
  success: boolean;
  status: "extraction_completed" | "failed";
  complaint: ExtractedComplaint;
  message?: string;
}

export const writeExtractedComplaint = (complaint: ExtractedComplaint): void => {
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(
      EXTRACTED_COMPLAINT_RESULT_KEY,
      JSON.stringify(complaint),
    );
  }
};

export const readExtractedComplaint = (): ExtractedComplaint | null => {
  if (typeof window === "undefined") return null;

  const raw = window.sessionStorage.getItem(EXTRACTED_COMPLAINT_RESULT_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as ExtractedComplaint;
  } catch {
    return null;
  }
};

export async function extractComplaintFromSource(
  combinedOcr: string,
  sourceType: "news" | "email" | "other",
): Promise<ExtractSourceResponse> {
  const response = await fetch(
    "http://localhost:5000/api/complaints/extract-source",
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        combinedOcr,
        sourceType,
      }),
    },
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result?.message ??
        "Unable to extract complaint information.",
    );
  }

  return result;
}

export const readExternalSourceResult = (): ProcessSourceResponse | null => {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(EXTERNAL_SOURCE_RESULT_KEY);
    return raw ? (JSON.parse(raw) as ProcessSourceResponse) : null;
  } catch {
    return null;
  }
};

export async function processExternalSource(
  files: File[],
): Promise<ProcessSourceResponse> {
  const formData = new FormData();

  for (const file of files) {
    formData.append(
      "complaintImage",
      file,
    );
  }

  const response = await fetch(
    "http://localhost:5000/api/complaints/process-source",
    {
      method: "POST",
      body: formData,
    },
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result?.message ??
        "Unable to process the source document.",
    );
  }

  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(
      EXTERNAL_SOURCE_RESULT_KEY,
      JSON.stringify(result),
    );
  }

  return result;
}