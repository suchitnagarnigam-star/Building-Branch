import { readFile } from "node:fs/promises";

const DRIVE_SERVICE_URL = process.env.GOOGLE_DRIVE_WEB_APP_URL;

if (!DRIVE_SERVICE_URL) {
  console.warn(
    "[Drive] GOOGLE_DRIVE_WEB_APP_URL is not configured.",
  );
}

export type DriveFileType = "source" | "pre" | "res";

type DriveCreateFolderResponse = {
  success: boolean;
  created?: boolean;
  complaintId?: string;
  folderId?: string;
  folderName?: string;
  folderUrl?: string;
  message?: string;
};

type DriveUploadResponse = {
  success: boolean;
  complaintId?: string;
  type?: DriveFileType;
  index?: number;
  fileId?: string;
  fileName?: string;
  mimeType?: string;
  message?: string;
};

const callDriveService = async (
  payload: Record<string, unknown>,
) => {
  if (!DRIVE_SERVICE_URL) {
    throw new Error(
      "Google Drive service URL is not configured.",
    );
  }

  const response = await fetch(DRIVE_SERVICE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(
      `Google Drive service returned HTTP ${response.status}.`,
    );
  }

  const data = await response.json() as {
    success?: boolean;
    message?: string;
  };

  if (!data.success) {
    throw new Error(
      data.message || "Google Drive operation failed.",
    );
  }

  return data;
};


/**
 * Create or get the complaint folder.
 *
 * IMPORTANT:
 * complaintId is the existing MCL-BB complaint ID.
 * We do not generate another ID here.
 */
export const createComplaintDriveFolder = async (
  complaintId: string,
): Promise<DriveCreateFolderResponse> => {

  const result = await callDriveService({
    action: "createComplaintFolder",
    complaintId,
  }) as DriveCreateFolderResponse;

  if (!result.folderUrl) {
    throw new Error(
      "Google Drive did not return a complaint folder URL.",
    );
  }

  return result;
};


/**
 * Upload one file into the complaint folder.
 */
export const uploadComplaintFile = async (
  complaintId: string,
  type: DriveFileType,
  index: number,
  filePath: string,
  originalFileName: string,
  mimeType: string,
): Promise<DriveUploadResponse> => {

  const fileBuffer = await readFile(filePath);

  const base64Data = fileBuffer.toString("base64");

  const result = await callDriveService({
    action: "uploadFile",
    complaintId,
    type,
    index,
    fileName: originalFileName,
    mimeType,
    data: base64Data,
  }) as DriveUploadResponse;

  if (!result.success) {
    throw new Error(
      result.message || "Failed to upload file to Google Drive.",
    );
  }

  return result;
};


/**
 * Upload multiple complaint files.
 *
 * Files are numbered starting from 1.
 */
export const uploadComplaintFiles = async (
  complaintId: string,
  type: DriveFileType,
  files: Express.Multer.File[],
) => {

  const uploaded = [];

  for (const [index, file] of files.entries()) {

    const result = await uploadComplaintFile(
      complaintId,
      type,
      index + 1,
      file.path,
      file.originalname,
      file.mimetype,
    );

    uploaded.push(result);
  }

  return uploaded;
};