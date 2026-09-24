import Icon from "../../shared/components/Icon";

type ConfirmationScreenProps = {
  complaintId: string;
  navigate: (route: string) => void;
};

type SavedComplaint = {
  complaintId?: string;
  title?: string;
  block?: string;
  address?: string;
  assignedOfficerName?: string | null;
  assignedOfficerMobile?: string | null;
  assignedAtpName?: string | null;
  assignedAtpMobile?: string | null;
};

function readSavedComplaint(complaintId: string): SavedComplaint | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("mcl-latest-complaint");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedComplaint;
    return parsed.complaintId === complaintId ? parsed : null;
  } catch {
    return null;
  }
}

function ConfirmationScreen({ complaintId, navigate }: ConfirmationScreenProps) {
  const saved = readSavedComplaint(complaintId);

  const detail = saved ?? {
    complaintId,
    title: "—",
    block: "—",
    address: "—",
    assignedOfficerName: null,
    assignedOfficerMobile: null,
    assignedAtpName: null,
  };

  return (
    <div className="confirmation-wrap">
      <div className="confirmation-card">
        <div className="confirmation-banner">
          <div className="confirmation-banner__icon"><Icon name="check" /></div>
          <h2>Complaint registered</h2>
          <div className="complaint-id">{detail.complaintId}</div>
        </div>

        <div className="confirmation-panel">
          <div className="meta-row">
            <span>Complaint title</span>
            <strong>{detail.title}</strong>
          </div>
          <div className="meta-row">
            <span>Location</span>
            <strong>{detail.block ?? "—"}{detail.address ? ` · ${detail.address}` : ""}</strong>
          </div>
          <div className="meta-row">
            <span>Assigned BI</span>
            {detail.assignedOfficerName ? (
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <strong>{detail.assignedOfficerName}</strong>
                {detail.assignedOfficerMobile && (
                  <small>{detail.assignedOfficerMobile}</small>
                )}
              </span>
            ) : (
              <span style={{ color: "var(--muted)", fontSize: 13 }}>Pending assignment</span>
            )}
          </div>
          <div className="meta-row">
            <span>Assigned ATP</span>
            {detail.assignedAtpName ? (
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <strong>{detail.assignedAtpName}</strong>
                {detail.assignedAtpMobile && <small>{detail.assignedAtpMobile}</small>}
              </span>
            ) : (
              <span style={{ color: "var(--muted)", fontSize: 13 }}>Pending assignment</span>
            )}
          </div>
          <div className="meta-row">
            <span>WhatsApp notification</span>
            <strong className="success-text">Sent ✓</strong>
          </div>
        </div>

        <div className="sticky-actions confirmation-actions">
          <button type="button" className="primary-button" onClick={() => navigate(`/complaints/${complaintId}`)}>
            View complaint
          </button>
          <button type="button" className="secondary-button" onClick={() => navigate("/complaints/new")}>
            Register another
          </button>
          <button type="button" className="secondary-button" onClick={() => navigate("/dashboard")}>
            Back to dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmationScreen;
