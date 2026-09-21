export type RegistrationSource = "manual" | "document";

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

  assignedOfficerId: string | null;
  assignedOfficerName: string | null;
  assignedOfficerMobile: string | null;
  assignedAtpId?: string | null;
  assignedAtpName?: string | null;
  assignedAtpMobile?: string | null;

  status: "Registered" | "Assigned" | "In progress" | "Resolution submitted" | "Pending approval" | "Approved / Closed" | "Rejected" | string;
  createdAt: string;
  caseId?: string | null;
}

export interface ComplaintFormData {
  citizenName: string;
  phoneNumber: string;

  /** Block is selected first; Zone is derived from Block. */
  block: string;
  zone: string;

  ward?: string;
  address: string;

  title: string;
  description: string;
}
