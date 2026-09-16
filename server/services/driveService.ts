import { readFile } from "node:fs/promises";

const DRIVE_SERVICE_URL =
  process.env.GOOGLE_DRIVE_WEB_APP_URL;

if (!DRIVE_SERVICE_URL) {
  console.warn(
    "[Drive] GOOGLE_DRIVE_WEB_APP_URL is not configured.",
  );
}

/*
 * ============================================================
 * FILE TYPES
 * ============================================================
 */

/**
 * Existing complaint file types.
 */
export type DriveFileType =
  | "source"
  | "pre"
  | "res";

/**
 * BI inspection file types.
 */
export type InspectionFileType =
  | "evidence"
  | "notice";


/*
 * ============================================================
 * RESPONSE TYPES
 * ============================================================
 */

type DriveCreateFolderResponse = {
  success: boolean;
  created?: boolean;
  complaintId?: string;
  caseId?: string;
  parentType?: "complaint" | "case";
  parentId?: string;
  visitId?: string;
  folderId?: string;
  folderName?: string;
  folderUrl?: string;
  message?: string;
};


type DriveUploadResponse = {
  success: boolean;

  complaintId?: string;

  parentType?: "complaint" | "case";
  parentId?: string;
  visitId?: string;

  type?: DriveFileType | InspectionFileType;

  index?: number;

  fileId?: string;
  fileName?: string;
  mimeType?: string;
  fileUrl?: string;

  message?: string;
};


/*
 * ============================================================
 * GOOGLE DRIVE WEB APP CALLER
 * ============================================================
 */

const callDriveService = async (
  payload: Record<string, unknown>,
) => {
  if (!DRIVE_SERVICE_URL) {
    throw new Error(
      "Google Drive service URL is not configured.",
    );
  }

  const response = await fetch(
    DRIVE_SERVICE_URL,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Google Drive service returned HTTP ${response.status}.`,
    );
  }

  const data =
    (await response.json()) as {
      success?: boolean;
      message?: string;
    };

  if (!data.success) {
    throw new Error(
      data.message ||
        "Google Drive operation failed.",
    );
  }

  return data;
};


/*
 * ============================================================
 * EXISTING COMPLAINT DRIVE OPERATIONS
 * ============================================================
 */

/**
 * Create or get the complaint folder.
 *
 * IMPORTANT:
 * complaintId is the existing MCL-BB complaint ID.
 * We do not generate another ID here.
 */
export const createComplaintDriveFolder =
  async (
    complaintId: string,
  ): Promise<DriveCreateFolderResponse> => {

    const result =
      (await callDriveService({
        action: "createComplaintFolder",
        complaintId,
      })) as DriveCreateFolderResponse;

    if (!result.folderUrl) {
      throw new Error(
        "Google Drive did not return a complaint folder URL.",
      );
    }

    return result;
  };

  /**
 * Create or get the Google Drive folder for a case.
 *
 * IMPORTANT:
 * caseId is the existing MCL-BB case ID.
 * We do not generate another ID here.
 */
export const createCaseDriveFolder =
  async (
    caseId: string,
  ): Promise<DriveCreateFolderResponse> => {

    if (!caseId.trim()) {
      throw new Error(
        "Case ID is required to create the Drive folder.",
      );
    }

    const result =
      (await callDriveService({
        action: "createCaseFolder",
        caseId,
      })) as DriveCreateFolderResponse;

    if (!result.folderUrl) {
      throw new Error(
        "Google Drive did not return a case folder URL.",
      );
    }

    return result;
  };

/**
 * Upload one file into the complaint folder.
 *
 * Existing supported types:
 *
 * source
 * pre
 * res
 */
export const uploadComplaintFile =
  async (
    complaintId: string,
    type: DriveFileType,
    index: number,
    filePath: string,
    originalFileName: string,
    mimeType: string,
  ): Promise<DriveUploadResponse> => {

    const fileBuffer =
      await readFile(filePath);

    const base64Data =
      fileBuffer.toString("base64");

    const result =
      (await callDriveService({
        action: "uploadFile",
        complaintId,
        type,
        index,
        fileName: originalFileName,
        mimeType,
        data: base64Data,
      })) as DriveUploadResponse;

    if (!result.success) {
      throw new Error(
        result.message ||
          "Failed to upload file to Google Drive.",
      );
    }

    return result;
  };


/**
 * Upload multiple complaint files.
 *
 * Files are numbered starting from 1.
 */
export const uploadComplaintFiles =
  async (
    complaintId: string,
    type: DriveFileType,
    files: Express.Multer.File[],
  ): Promise<DriveUploadResponse[]> => {

    const uploaded: DriveUploadResponse[] = [];

    for (
      const [index, file]
      of files.entries()
    ) {

      const result =
        await uploadComplaintFile(
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


/*
 * ============================================================
 * BI INSPECTION DRIVE OPERATIONS
 * ============================================================
 *
 * Complaint-based inspection:
 *
 * Root
 *   └── Complaint ID
 *       └── inspections
 *           └── visit_<visitId>
 *
 *
 * Proactive inspection:
 *
 * Root
 *   └── Case ID
 *       └── inspections
 *           └── visit_<visitId>
 *
 */


/**
 * Create or get an inspection-specific folder.
 */
export const createInspectionDriveFolder =
  async (
    parentType: "complaint" | "case",
    parentId: string,
    visitId: string,
  ): Promise<{
    folderId: string;
    folderName: string;
    folderUrl: string;
  }> => {

    if (!parentId.trim()) {
      throw new Error(
        "Inspection Drive parent ID is required.",
      );
    }

    if (!visitId.trim()) {
      throw new Error(
        "Inspection visit ID is required.",
      );
    }

    const result =
      (await callDriveService({
        action: "createInspectionFolder",
        parentType,
        parentId,
        visitId,
      })) as DriveCreateFolderResponse;

    if (!result.folderId) {
      throw new Error(
        "Google Drive did not return an inspection folder ID.",
      );
    }

    if (!result.folderName) {
      throw new Error(
        "Google Drive did not return an inspection folder name.",
      );
    }

    if (!result.folderUrl) {
      throw new Error(
        "Google Drive did not return an inspection folder URL.",
      );
    }

    return {
      folderId: result.folderId,
      folderName: result.folderName,
      folderUrl: result.folderUrl,
    };
  };


/**
 * Upload one BI inspection file.
 *
 * Supported types:
 *
 * evidence
 * notice
 */
export const uploadInspectionFile =
  async (
    parentType: "complaint" | "case",
    parentId: string,
    visitId: string,
    type: InspectionFileType,
    index: number,
    filePath: string,
    originalFileName: string,
    mimeType: string,
  ): Promise<{
    fileId: string;
    fileName: string;
    mimeType: string;
    fileUrl?: string;
  }> => {

    if (!parentId.trim()) {
      throw new Error(
        "Inspection Drive parent ID is required.",
      );
    }

    if (!visitId.trim()) {
      throw new Error(
        "Inspection visit ID is required.",
      );
    }

    if (!Number.isInteger(index) || index < 1) {
      throw new Error(
        "Inspection file index must be a positive integer.",
      );
    }

    const fileBuffer =
      await readFile(filePath);

    const base64Data =
      fileBuffer.toString("base64");

    const result =
      (await callDriveService({
        action: "uploadInspectionFile",

        parentType,
        parentId,
        visitId,

        type,
        index,

        fileName: originalFileName,
        mimeType,

        data: base64Data,
      })) as DriveUploadResponse;

    if (!result.success) {
      throw new Error(
        result.message ||
          `Failed to upload inspection ${type} file.`,
      );
    }

    if (!result.fileId) {
      throw new Error(
        "Google Drive did not return an inspection file ID.",
      );
    }

    return {
      fileId: result.fileId,

      fileName:
        result.fileName ||
        originalFileName,

      mimeType:
        result.mimeType ||
        mimeType,

      fileUrl:
        result.fileUrl,
    };
  };


/**
 * Upload multiple BI inspection evidence files.
 *
 * Files are numbered starting from 1.
 */
export const uploadInspectionEvidenceFiles =
  async (
    parentType: "complaint" | "case",
    parentId: string,
    visitId: string,
    files: Express.Multer.File[],
  ): Promise<
    Array<{
      fileId: string;
      fileName: string;
      mimeType: string;
      fileUrl?: string;
    }>
  > => {

    const uploaded: Array<{
      fileId: string;
      fileName: string;
      mimeType: string;
      fileUrl?: string;
    }> = [];

    for (
      const [index, file]
      of files.entries()
    ) {

      const result =
        await uploadInspectionFile(
          parentType,
          parentId,
          visitId,
          "evidence",
          index + 1,
          file.path,
          file.originalname,
          file.mimetype,
        );

      uploaded.push(result);
    }

    return uploaded;
  };


/**
 * Upload the optional inspection notice file.
 *
 * The notice database record will be handled by the
 * inspection API. This function only uploads the file.
 */
export const uploadInspectionNoticeFile =
  async (
    parentType: "complaint" | "case",
    parentId: string,
    visitId: string,
    file: Express.Multer.File,
  ): Promise<{
    fileId: string;
    fileName: string;
    mimeType: string;
    fileUrl?: string;
  }> => {

    return await uploadInspectionFile(
      parentType,
      parentId,
      visitId,
      "notice",
      1,
      file.path,
      file.originalname,
      file.mimetype,
    );
  };


/*
 * ============================================================
 * EXISTING COMPLAINT DRIVE RETRIEVAL
 * ============================================================
 */

export type DriveFile = {
  fileId: string;
  fileName: string;
  mimeType: string;
  size: number;
};


type DriveListFilesResponse = {
  success: boolean;
  complaintId?: string;
  files?: DriveFile[];
  message?: string;
};


type DriveGetFileResponse = {
  success: boolean;
  fileId?: string;
  fileName?: string;
  mimeType?: string;
  data?: string;
  message?: string;
};


/**
 * List files from an existing complaint folder.
 */
export const listComplaintDriveFiles =
  async (
    complaintId: string,
  ): Promise<DriveFile[]> => {

    const result =
      (await callDriveService({
        action: "listFiles",
        complaintId,
      })) as DriveListFilesResponse;

    if (!result.success) {
      throw new Error(
        result.message ||
          "Failed to list complaint Drive files.",
      );
    }

    return result.files ?? [];
  };


/**
 * Get a specific complaint Drive file.
 */
export const getComplaintDriveFile =
  async (
    fileId: string,
  ): Promise<DriveGetFileResponse> => {

    const result =
      (await callDriveService({
        action: "getFile",
        fileId,
      })) as DriveGetFileResponse;

    if (!result.success) {
      throw new Error(
        result.message ||
          "Failed to retrieve Drive file.",
      );
    }

    return result;
  };