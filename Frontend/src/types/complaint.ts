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

  status: "Registered";
  createdAt: string;
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
