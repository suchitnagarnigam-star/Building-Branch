export type RegistrationSource = "manual" | "document";

export interface ComplaintRequest {
  registrationSource: RegistrationSource;

  citizenName: string;
  phoneNumber: string;

  /** Block is the primary location field. Zone is derived server-side from Block. */
  block: string;
  zone?: string; // sent by client but re-derived/validated on server

  ward?: string;
  address: string;

  title: string;
  description: string;
}

export interface Complaint {
  complaintId: string;

  registrationSource: RegistrationSource;

  citizenName: string;
  phoneNumber: string;

  zone: string;
  block: string;
  ward?: string;
  address: string;

  title: string;
  description: string;

  attachments: AttachmentMeta[];

  driveFolderUrl?: string | null;

  assignedOfficerId: string | null;
  assignedOfficerName: string | null;
  assignedOfficerMobile: string | null;
  assignedAtpId: string | null;
  assignedAtpName: string | null;
  assignedAtpMobile: string | null;

  status: "Registered";
  createdAt: string;
}

export interface AttachmentMeta {
  fileName: string;
  fileType: string;
  category: "source" | "pre" | "res";
  index: number;
}
