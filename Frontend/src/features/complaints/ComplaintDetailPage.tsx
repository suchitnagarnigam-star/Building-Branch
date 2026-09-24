import { useEffect, useState } from "react";
import Icon from "../../shared/components/Icon";
import StatusBadge from "../../shared/components/StatusBadge";
import type { AppComplaint } from "../../shared/types";

type DriveFile = {
  fileId: string;
  fileName: string;
  mimeType: string;
  size: number;
};

type ComplaintDetailPageProps = {
  complaint: AppComplaint;
  complaintId: string;
  navigate: (path: string) => void;
};

type StoredAttachment = {
  fileName: string;
  filePath?: string;
  fileType: string;
  category?: "source" | "pre" | "res";
  index?: number;
};

type StoredComplaint = {
  complaintId: string;
  title: string;
  citizenName: string;
  phoneNumber: string;
  zone: string;
  block: string;
  ward?: string;
  address: string;
  description: string;
  assignedOfficerName: string | null;
  assignedOfficerMobile: string | null;
  assignedAtpName: string | null;
  createdAt: string;
  status: string;
  attachments?: StoredAttachment[];
  driveFolderUrl?: string | null;
  caseId?: string | null;
};

const TIMELINE_STAGES = [
  { label: "Registered", accent: "neutral" },
  { label: "Assigned", accent: "blue" },
  { label: "In progress", accent: "amber" },
  { label: "Resolution submitted", accent: "purple" },
  { label: "Pending approval", accent: "amber" },
] as const;

function getTimelineStage(status: string, hasAssignment: boolean): number {
  const normalizedStatus = status.trim().toLowerCase();
  const statusIndex = TIMELINE_STAGES.findIndex(
    (stage) => stage.label.toLowerCase() === normalizedStatus,
  );
  if (statusIndex >= 0) return Math.max(statusIndex, hasAssignment ? 1 : 0);
  return hasAssignment ? 1 : 0;
}

function readLocalComplaint(complaintId: string): StoredComplaint | null {
  const localRecord = window.localStorage.getItem("mcl-latest-complaint");
  if (!localRecord) return null;
  try {
    const parsed = JSON.parse(localRecord) as StoredComplaint;
    return parsed.complaintId === complaintId ? parsed : null;
  } catch (error) {
    console.error("Saved complaint data is invalid:", error);
    return null;
  }
}

function ComplaintDetailPage({ complaint: fallbackComplaint, complaintId, navigate }: ComplaintDetailPageProps) {
  const [storedComplaint, setStoredComplaint] = useState<StoredComplaint | null>(
    () => readLocalComplaint(complaintId),
  );
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [driveFilesLoading, setDriveFilesLoading] = useState(false);
  const [loading, setLoading] = useState(!storedComplaint);
  const [error, setError] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignSuccess, setAssignSuccess] = useState<string | null>(null);

  const apiUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:5000/api";

  const handleAssignOfficer = async () => {
    setAssigning(true);
    try {
      const response = await fetch(`${apiUrl}/complaints/${encodeURIComponent(complaintId)}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to assign officer and promote to case.");
      }

      setStoredComplaint((prev) =>
        prev
          ? {
              ...prev,
              caseId: data.caseId,
              status: "Assigned",
              assignedOfficerName: data.assignedOfficer?.name || prev.assignedOfficerName,
              assignedOfficerMobile: data.assignedOfficer?.mobile || prev.assignedOfficerMobile,
              assignedAtpName: data.assignedOfficer?.atpName || prev.assignedAtpName,
            }
          : null
      );
      setAssignSuccess(`Promoted to Case: ${data.caseId}`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Unable to assign officer.");
    } finally {
      setAssigning(false);
    }
  };

  useEffect(() => {
    let active = true;

    const loadComplaint = async () => {
      try {
        const response = await fetch(`${apiUrl}/complaints/${encodeURIComponent(complaintId)}`);
        const result = (await response.json()) as { complaint?: StoredComplaint; message?: string };

        if (!response.ok) {
          throw new Error(result.message || "Unable to load complaint.");
        }

        if (active) {
          setStoredComplaint(result.complaint as StoredComplaint);
          setError("");
        }
      } catch (err: unknown) {
        if (active && !storedComplaint) {
          setError(err instanceof Error ? err.message : "Unable to load complaint details.");
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadComplaint();

    return () => {
      active = false;
    };
  }, [complaintId, apiUrl]);

  useEffect(() => {
    let active = true;

    const loadDriveFiles = async () => {
      setDriveFilesLoading(true);

      try {
        const response = await fetch(`${apiUrl}/complaints/${encodeURIComponent(complaintId)}/files`);
        const result = (await response.json()) as { files?: DriveFile[]; message?: string };

        if (!response.ok) {
          throw new Error(result.message || "Unable to load complaint files.");
        }

        if (active) {
          setDriveFiles(result.files ?? []);
        }
      } catch (err: unknown) {
        console.error("Error loading Drive files:", err);
      } finally {
        if (active) {
          setDriveFilesLoading(false);
        }
      }
    };

    loadDriveFiles();

    return () => {
      active = false;
    };
  }, [complaintId, apiUrl]);

  if (!loading && error && !storedComplaint) {
    return (
      <div className="detail-page">
        <div className="detail-main">
          <button className="back-link" type="button" onClick={() => navigate("/complaints")}>
            <Icon name="arrow" /> All complaints
          </button>
          <div className="panel detail-panel" style={{ textAlign: "center", padding: "48px 24px" }}>
            <div style={{ fontSize: "18px", fontWeight: 600, color: "var(--danger)", marginBottom: "8px" }}>
              Unable to load complaint ({complaintId})
            </div>
            <p style={{ color: "var(--muted)", marginBottom: "24px" }}>{error}</p>
            <button className="primary-button" type="button" onClick={() => navigate("/complaints")}>
              Return to Complaints List
            </button>
          </div>
        </div>
      </div>
    );
  }

  const complaint = storedComplaint
    ? {
        ...fallbackComplaint,
        id: storedComplaint.complaintId,
        title: storedComplaint.title,
        citizen: storedComplaint.citizenName,
        phone: storedComplaint.phoneNumber,
        zone: storedComplaint.zone,
        block: storedComplaint.block,
        ward: storedComplaint.ward ?? "—",
        address: storedComplaint.address,
        description: storedComplaint.description,
        assignedOfficer: storedComplaint.assignedOfficerName ?? "Pending assignment",
        atp: storedComplaint.assignedAtpName ?? "Pending assignment",
        registered: new Date(storedComplaint.createdAt).toLocaleDateString(),
        status: storedComplaint.status as AppComplaint["status"],
      }
    : {
        ...fallbackComplaint,
        id: complaintId,
        title: loading ? "Loading complaint..." : "Complaint details unavailable",
        citizen: "—",
        phone: "—",
        zone: "—",
        block: "—",
        ward: "—",
        address: "—",
        description: loading ? "Loading complaint details from server..." : "No complaint data returned.",
        assignedOfficer: "—",
        atp: "—",
        timeline: [],
      };
  const timelineSource = storedComplaint ?? {
      status: complaint.status,
      assignedOfficerName: complaint.assignedOfficer,
      createdAt: new Date().toISOString(),
  };
  const currentTimelineStage = getTimelineStage(
      timelineSource.status,
      Boolean(timelineSource.assignedOfficerName && timelineSource.assignedOfficerName !== "—"),
  );
  const registeredAt = new Date(timelineSource.createdAt).toLocaleString();

  return (
    <div className="detail-page">
      <div className="detail-main">
        <button className="back-link" type="button" onClick={() => navigate("/complaints")}>
          <Icon name="arrow" /> All complaints
        </button>

        <div className="detail-header">
          <div className="detail-header__meta">{complaint.id}</div>
          <h2>{complaint.title}</h2>
          <div className="detail-header__info">
            <StatusBadge status={complaint.status} />
            <span>Registered {complaint.registered}</span>
          </div>
        </div>

        {storedComplaint?.caseId && (
          <div
            className="panel detail-panel"
            style={{
              borderLeft: "4px solid var(--accent, #0284c7)",
              background: "#f0f9ff",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
              padding: "16px 20px",
              marginBottom: "16px",
            }}
          >
            <div>
              <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--accent, #0284c7)" }}>
                Promoted Enforcement Case File
              </div>
              <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary, #0f172a)", marginTop: "2px" }}>
                {storedComplaint.caseId}
              </div>
              <div style={{ fontSize: "13px", color: "var(--muted, #64748b)" }}>
                This complaint is actively linked to an official building branch case.
              </div>
            </div>
            <button
              type="button"
              className="primary-button"
              style={{ padding: "8px 16px", display: "inline-flex", alignItems: "center", gap: "6px" }}
              onClick={() => navigate(`/cases/${encodeURIComponent(storedComplaint.caseId!)}`)}
            >
              <span>View Case File</span>
              <Icon name="arrow-right" />
            </button>
          </div>
        )}

        <div className="panel detail-panel">
          <h3>Citizen and location</h3>
          <div className="detail-grid">
            <div><span>Citizen</span><strong>{complaint.citizen}</strong></div>
            <div><span>Phone</span><strong>{complaint.phone}</strong></div>
            <div><span>Zone</span><strong>{complaint.zone}</strong></div>
            <div><span>Block</span><strong>{complaint.block}</strong></div>
            <div><span>Ward</span><strong>{complaint.ward}</strong></div>
            <div><span>Address</span><strong>{complaint.address}</strong></div>
          </div>
        </div>

        <div className="panel detail-panel">
          <h3>Complaint details</h3>
          <p>{complaint.description}</p>
          
          <div className="attachment-grid">
            {(storedComplaint?.attachments ?? []).map(
              (attachment, index) => {

              // OLD LOCAL FILE
              if (attachment.filePath){
                const pathParts = attachment.filePath.split(/[\\/]/);
                const uploadsIndex = pathParts.lastIndexOf("uploads");
                const relativePath = pathParts.slice(
                  uploadsIndex >= 0 ? uploadsIndex + 1 : -1,
                );  

                return (
                  <img
                    key={attachment.filePath}
                    className="attachment-preview"
                    src={`http://localhost:5000/uploads/${relativePath
                      .map(encodeURIComponent)
                      .join("/")}`}
                    alt={attachment.fileName}
                  />
                );
              }

              //NEW GOOGLE DRIVE FILE
               const prefix = `${complaintId}_${attachment.category}_${attachment.index}`;

               console.log("[Drive Match]",{
                  complaintId,
                  attachment,
                  expectedPrefix: prefix,
                  driveFiles,
               });

               const driveFile = driveFiles.find((file) =>
                file.fileName.startsWith(prefix)
               );
              
              if (driveFile) {
                return (
                  <img
                    key={driveFile.fileId}
                    className="attachment-preview"
                    src={`http://localhost:5000/api/complaints/${encodeURIComponent(
                      complaintId
                    )}/files/${encodeURIComponent(
                      driveFile.fileId
                    )}`}
                    alt={attachment.fileName}
                  />
                );
              }

              //FILE NOT FOUND
              return (
                <div
                  key={`${attachment.fileName}-${index}`}
                  className="attachment-preview"
                >
                  <strong>{attachment.fileName}</strong>

                  <div>
                    {driveFilesLoading 
                    ? "Loading image..." 
                    : "File Unavailable"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="panel detail-panel">
          <h3>Activity timeline</h3>
          <div className="timeline">
            {TIMELINE_STAGES.map((stage, index) => {
              const isComplete = index < currentTimelineStage;
              const isCurrent = index === currentTimelineStage;
              return (
              <div
                className={`timeline-item${isComplete ? " timeline-item--complete" : ""}${isCurrent ? " timeline-item--current" : ""}`}
                key={stage.label}
              >
                <div className={`timeline-marker timeline-marker--${stage.accent}`}>
                  {isComplete ? <Icon name="check" /> : <span />}
                </div>
                <div>
                  <div className="timeline-item__label">{stage.label}</div>
                  <div className="timeline-item__meta">
                    {index <= currentTimelineStage ? `${registeredAt} • ${index === 0 ? "Operator Desk" : complaint.assignedOfficer}` : "Not reached"}
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        </div>
      </div>

      <aside className="detail-side">
        <div className="panel side-card">
          <h3>Assignment</h3>
          <div className="actor-row">
            <div className="actor-avatar">SM</div>
            <div>
              <strong>{complaint.assignedOfficer}</strong>
              <small>{complaint.phone}</small>
            </div>
          </div>
          <div className="side-divider" />
          <div className="meta-row"><span>ATP</span><strong>{complaint.atp}</strong></div>
        </div>

        <div className="panel side-card">
          <h3>Status</h3>
          <div className="status-highlight"><StatusBadge status={complaint.status} /></div>
          <div className="days-open">{complaint.daysOpen} days open</div>
        </div>

        <div className="panel side-card">
          <h3>Actions</h3>
          {storedComplaint?.caseId ? (
            <button
              type="button"
              className="primary-button button-full"
              style={{ display: "inline-flex", justifyContent: "center", alignItems: "center", gap: "6px", marginBottom: "8px" }}
              onClick={() => navigate(`/cases/${encodeURIComponent(storedComplaint.caseId!)}`)}
            >
              <span>View Case ({storedComplaint.caseId})</span>
              <Icon name="arrow-right" />
            </button>
          ) : (
            <button
              type="button"
              className="primary-button button-full"
              style={{ marginBottom: "8px" }}
              disabled={assigning}
              onClick={handleAssignOfficer}
            >
              {assigning ? "Creating Case..." : "Assign BI & Create Case"}
            </button>
          )}
          {assignSuccess && (
            <div style={{ fontSize: "12px", color: "#166534", marginBottom: "8px", fontWeight: 600 }}>
              ✓ {assignSuccess}
            </div>
          )}
          <button type="button" className="secondary-button button-full">Edit complaint</button>
          <button type="button" className="secondary-button button-full">Submit resolution</button>
        </div>
      </aside>
    </div>
  );
}

export default ComplaintDetailPage;
