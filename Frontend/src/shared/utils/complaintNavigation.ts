export interface ComplaintNavInput {
  complaintId?: string | null;
  id?: string | null;
  caseId?: string | null;
}

export interface ComplaintAction {
  label: "View Case" | "View Complaint";
  route: string;
  isCase: boolean;
  caseId?: string;
  complaintId: string;
}

/**
 * Returns navigation action details for a complaint.
 * If a case has been generated/assigned for this complaint, routes to the enforcement case.
 * Otherwise, routes to the complaint detail page.
 */
export function getComplaintAction(complaint: ComplaintNavInput): ComplaintAction {
  const cid = complaint.complaintId || complaint.id || "";
  const caseId = complaint.caseId?.trim();

  if (caseId) {
    return {
      label: "View Case",
      route: `/cases/${caseId}`,
      isCase: true,
      caseId,
      complaintId: cid,
    };
  }

  return {
    label: "View Complaint",
    route: `/complaints/${cid}`,
    isCase: false,
    complaintId: cid,
  };
}
