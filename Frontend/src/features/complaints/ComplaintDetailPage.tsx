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

  useEffect(() => {
  let active = true;

  const loadComplaint = async () => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/complaints/${encodeURIComponent(
          complaintId,
        )}`,
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Unable to load complaint.",
        );
      }

      if (active) {
        setStoredComplaint(result.complaint as StoredComplaint);
      }
    } catch (error) {
      console.error("Complaint detail loading failed:", error);
    }
  };

  loadComplaint();

  return () => {
    active = false;
  };
}, [complaintId]);

useEffect(() => {
  let active = true;

  const loadDriveFiles = async () => {
    setDriveFilesLoading(true);

    try {
      const response = await fetch(
        `http://localhost:5000/api/complaints/${encodeURIComponent(
          complaintId,
        )}/files`,
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Unable to load complaint files.",
        );
      }

      if (active) {
        setDriveFiles(result.files ?? []);
      }
    } catch (error) {
      console.error("Error loading Drive files:", error);
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
}, [complaintId]);

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
        title: "Loading complaint...",
        citizen: "—",
        phone: "—",
        zone: "—",
        block: "—",
        ward: "—",
        address: "—",
        description: "Loading complaint details...",
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
          <button type="button" className="secondary-button button-full">Edit complaint</button>
          <button type="button" className="primary-button button-full">Submit resolution</button>
        </div>
      </aside>
    </div>
  );
}

export default ComplaintDetailPage;
