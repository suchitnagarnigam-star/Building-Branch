export type Role = "Operator" | "Officer" | "ATP" | "MTP" | "JC" | "C" | "Admin";

export type Status =
  | "Registered"
  | "Assigned"
  | "In progress"
  | "Resolution submitted"
  | "Pending approval"
  | "Approved / Closed"
  | "Rejected"
  | "Rework required";

export type AppComplaint = {
  id: string;
  title: string;
  citizen: string;
  phone: string;
  ward: string;
  officer: string;
  status: Status;
  registered: string;
  zone: string;
  block: string;
  address: string;
  description: string;
  assignedOfficer: string;
  atp: string;
  daysOpen: number;
  timeline: Array<{ label: Status; timestamp: string; actor: string; accent: string }>;
};

export type Officer = {
  name: string;
  designation: Role;
  zone: string;
  blocks: string[];
  wards: number;
  activeComplaints: number;
};

export type Notification = {
  title: string;
  body: string;
  time: string;
  unread: boolean;
  tone: string;
};
