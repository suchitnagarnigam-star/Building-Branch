import { useEffect, useState } from "react";
import Icon from "../../shared/components/Icon";
import StatusBadge from "../../shared/components/StatusBadge";
import type { AppComplaint } from "../../shared/types";
import { API_BASE_URL } from "../../shared/utils/apiConfig";
import { getDriveFileProxyUrl } from "../../shared/utils/driveUrl";
import ImageViewerModal from "../../shared/components/ImageViewerModal";
import { useAuth } from "../../context/AuthContext";

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
  assignedOfficerId?: string | null;
  assignedOfficerName: string | null;
  assignedOfficerMobile: string | null;
  assignedAtpName: string | null;
  createdAt: string;
  status: string;
  attachments?: StoredAttachment[];
  driveFolderUrl?: string | null;
  caseId?: string | null;
  created_by?: { name: string; role: string } | null;
  createdBy?: { name: string; role: string } | null;
  assignmentAcknowledgedAt?: string | null;
  acknowledgedByOfficerId?: string | null;
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
  const { user } = useAuth();
  const isBI = (user?.role || "").toLowerCase() === "bi";
  const [mobileTab, setMobileTab] = useState<"overview" | "timeline" | "evidence" | "case">("overview");
  const [storedComplaint, setStoredComplaint] = useState<StoredComplaint | null>(
    () => readLocalComplaint(complaintId),
  );
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [driveFilesLoading, setDriveFilesLoading] = useState(false);
  const [loading, setLoading] = useState(!storedComplaint);
  const [error, setError] = useState("");
  const [viewerImage, setViewerImage] = useState<{ url: string; title?: string } | null>(null);

  const isAssignedToMe = Boolean(
    storedComplaint?.assignedOfficerId &&
    user?.officerId &&
    storedComplaint.assignedOfficerId.trim().toUpperCase() === user.officerId.trim().toUpperCase()
  );
  const isAcknowledged = Boolean(storedComplaint?.assignmentAcknowledgedAt);
  const canStartInspection = isBI && isAssignedToMe;

  const [showSuccessBanner, setShowSuccessBanner] = useState(() => {
    if (typeof window !== "undefined") {
      return window.location.href.includes("inspectionSuccess=true");
    }
    return false;
  });

  const handleStartInspection = () => {
    navigate(`/field-inspection?complaintId=${encodeURIComponent(complaintId)}`);
  };

  const apiUrl = API_BASE_URL;

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
        if (active) {
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

  // Auto-acknowledge assignment if viewed by the assigned BI
  useEffect(() => {
    if (!storedComplaint || !user?.officerId || !isBI) return;
    const isMyAssignment = Boolean(
      storedComplaint.assignedOfficerId &&
      storedComplaint.assignedOfficerId.trim().toUpperCase() === user.officerId.trim().toUpperCase()
    );

    if (isMyAssignment && !storedComplaint.assignmentAcknowledgedAt) {
      const token = typeof window !== "undefined" ? localStorage.getItem("mcl_token") : null;
      fetch(`${apiUrl}/complaints/${encodeURIComponent(complaintId)}/acknowledge`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.assignmentAcknowledgedAt) {
            setStoredComplaint((prev) =>
              prev
                ? {
                    ...prev,
                    assignmentAcknowledgedAt: data.assignmentAcknowledgedAt,
                    acknowledgedByOfficerId: user.officerId || null,
                  }
                : null
            );
          }
        })
        .catch((err) => {
          console.warn("[ComplaintDetail] Auto-acknowledgement notice:", err);
        });
    }
  }, [complaintId, storedComplaint?.assignedOfficerId, storedComplaint?.assignmentAcknowledgedAt, user?.officerId, isBI, apiUrl]);

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
    <div>
      {/* ─── MOBILE VIEW (Screenshot 7) ─── */}
      <div className="mobile-only" style={{ paddingBottom: "24px" }}>
        {/* Header Bar */}
        <div className="mobile-sub-header">
          <button
            type="button"
            className="mobile-back-btn"
            onClick={() => navigate("/complaints")}
          >
            <Icon name="arrow-left" />
            <span>Complaint Details</span>
          </button>
          <div className="mobile-sub-actions">
            <button
              type="button"
              className="mobile-circle-btn"
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: `Complaint ${complaint.id}`,
                    text: `MCL Complaint ${complaint.id}: ${complaint.title}`,
                    url: window.location.href,
                  }).catch(() => {});
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  alert("Link copied to clipboard!");
                }
              }}
              aria-label="Share Complaint"
            >
              <Icon name="share" />
            </button>
          </div>
        </div>

        {/* Success Banner */}
        {showSuccessBanner && (
          <div
            style={{
              background: "#ecfdf5",
              border: "1px solid #a7f3d0",
              color: "#065f46",
              padding: "12px 16px",
              borderRadius: "8px",
              marginBottom: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Icon name="check-circle" />
              <div>
                <strong style={{ fontSize: "13.5px", display: "block" }}>Field Inspection Submitted!</strong>
                <span style={{ fontSize: "12px" }}>The inspection and evidence have been recorded against this complaint.</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowSuccessBanner(false)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#065f46", padding: "4px" }}
              aria-label="Dismiss"
            >
              <Icon name="close" />
            </button>
          </div>
        )}

        {/* Hero Header Card */}
        <div className="mobile-hero-header">
          <div className="mobile-hero-header__top">
            <span className="mobile-hero-header__id">{complaint.id}</span>
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              {isAssignedToMe && !isAcknowledged && (
                <span className="badge-new-assignment">NEW</span>
              )}
              <StatusBadge status={complaint.status} />
            </div>
          </div>
          <div className="mobile-hero-header__sub">
            Registered on {complaint.registered || "Recent"}
            {isAssignedToMe && isAcknowledged && (
              <span style={{ display: "inline-block", marginLeft: "8px", color: "#166534", fontSize: "11px", fontWeight: 600 }}>
                • ✓ Acknowledged
              </span>
            )}
          </div>
          {canStartInspection && (
            <div style={{ marginTop: "14px" }}>
              <button
                type="button"
                className="primary-button button-full"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "11px 16px",
                  fontSize: "13.5px",
                  fontWeight: 600,
                  boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                }}
                onClick={handleStartInspection}
              >
                <Icon name="search" />
                <span>Start Inspection</span>
                <Icon name="arrow" />
              </button>
            </div>
          )}
        </div>

        {/* Tab Pills */}
        <div className="mobile-pill-tabs">
          <button
            type="button"
            className={`mobile-pill-tab ${mobileTab === "overview" ? "mobile-pill-tab--active" : ""}`}
            onClick={() => setMobileTab("overview")}
          >
            Overview
          </button>
          <button
            type="button"
            className={`mobile-pill-tab ${mobileTab === "timeline" ? "mobile-pill-tab--active" : ""}`}
            onClick={() => setMobileTab("timeline")}
          >
            Timeline
          </button>
          <button
            type="button"
            className={`mobile-pill-tab ${mobileTab === "evidence" ? "mobile-pill-tab--active" : ""}`}
            onClick={() => setMobileTab("evidence")}
          >
            Evidence
          </button>
          <button
            type="button"
            className={`mobile-pill-tab ${mobileTab === "case" ? "mobile-pill-tab--active" : ""}`}
            onClick={() => setMobileTab("case")}
          >
            Case
          </button>
        </div>

        {/* Tab 1: Overview */}
        {mobileTab === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {/* Citizen Information Card */}
            <div className="panel detail-panel" style={{ margin: 0, padding: "16px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 700, margin: "0 0 12px", color: "#0f172a" }}>
                Citizen Information
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Icon name="user" />
                  <div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>Name</div>
                    <div style={{ fontSize: "13.5px", fontWeight: 600 }}>{complaint.citizen}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Icon name="phone" />
                  <div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>Phone</div>
                    <div style={{ fontSize: "13.5px", fontWeight: 600 }}>{complaint.phone || "—"}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Icon name="pin" />
                  <div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>Address</div>
                    <div style={{ fontSize: "13.5px", fontWeight: 600 }}>{complaint.address || `${complaint.block}, ${complaint.zone}`}</div>
                  </div>
                </div>
                {complaint.ward && (
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <Icon name="map-pin" />
                    <div>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>Ward</div>
                      <div style={{ fontSize: "13.5px", fontWeight: 600 }}>{complaint.ward}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Complaint Details Card */}
            <div className="panel detail-panel" style={{ margin: 0, padding: "16px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 700, margin: "0 0 8px", color: "#0f172a" }}>
                Complaint Details
              </h3>
              <div style={{ marginBottom: "8px" }}>
                <span style={{ fontSize: "11px", color: "#64748b" }}>Title</span>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a" }}>{complaint.title}</div>
              </div>
              <div>
                <span style={{ fontSize: "11px", color: "#64748b" }}>Description</span>
                <p style={{ fontSize: "13px", color: "#334155", margin: "4px 0 0", lineHeight: "1.5" }}>
                  {complaint.description}
                </p>
              </div>
            </div>

            {/* Officer Assignment Card */}
            <div className="panel detail-panel" style={{ margin: 0, padding: "16px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 700, margin: "0 0 10px", color: "#0f172a" }}>
                Officer Assignment
              </h3>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: "#0b1957", color: "#fff", display: "grid", placeItems: "center", fontWeight: 700, fontSize: "12px" }}>
                  BI
                </div>
                <div>
                  <div style={{ fontSize: "13.5px", fontWeight: 600 }}>{complaint.assignedOfficer || "Pending Assignment"}</div>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>Building Inspector</div>
                </div>
              </div>
              <div style={{ fontSize: "12px", color: "#64748b", borderTop: "1px dashed #e2e8f0", paddingTop: "8px", marginTop: "8px" }}>
                <span>Supervising ATP: </span><strong>{complaint.atp || "Zonal ATP"}</strong>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Timeline */}
        {mobileTab === "timeline" && (
          <div className="panel detail-panel" style={{ margin: 0, padding: "16px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 700, margin: "0 0 12px", color: "#0f172a" }}>
              Complaint Progression
            </h3>
            <div className="timeline-list">
              {TIMELINE_STAGES.map((stage, index) => {
                const isComplete = index < currentTimelineStage;
                const isCurrent = index === currentTimelineStage;
                return (
                  <div
                    key={stage.label}
                    className={`timeline-item${isComplete ? " timeline-item--complete" : ""}${isCurrent ? " timeline-item--current" : ""}`}
                  >
                    <div className={`timeline-marker timeline-marker--${stage.accent}`}>
                      {isComplete ? <Icon name="check" /> : <span />}
                    </div>
                    <div>
                      <div className="timeline-item__label">{stage.label}</div>
                      <div className="timeline-item__meta">
                        {index <= currentTimelineStage ? `${registeredAt} • ${index === 0 ? "Operator Desk" : complaint.assignedOfficer}` : "Pending"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: Evidence */}
        {mobileTab === "evidence" && (
          <div className="panel detail-panel" style={{ margin: 0, padding: "16px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 700, margin: "0 0 12px", color: "#0f172a" }}>
              Uploaded Evidence & Documents
            </h3>
            {(storedComplaint?.attachments ?? []).length === 0 && driveFiles.length === 0 ? (
              <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>No evidence attachments found.</p>
            ) : (
              <div className="attachment-grid">
                {(storedComplaint?.attachments ?? []).map((_attachment, index) => (
                  <div key={index} style={{ fontSize: "12px", color: "#334155" }}>
                    Attachment {index + 1}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Case */}
        {mobileTab === "case" && (
          <div className="panel detail-panel" style={{ margin: 0, padding: "16px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 700, margin: "0 0 12px", color: "#0f172a" }}>
              Linked Enforcement Case
            </h3>
            {storedComplaint?.caseId ? (
              <div>
                <p style={{ fontSize: "13px", color: "#166534", fontWeight: 600 }}>
                  Case ID: {storedComplaint.caseId}
                </p>
                <button
                  type="button"
                  className="primary-button button-full"
                  style={{ marginTop: "12px" }}
                  onClick={() => navigate(`/cases/${encodeURIComponent(storedComplaint.caseId!)}`)}
                >
                  View Case Details →
                </button>
              </div>
            ) : (
              <p style={{ fontSize: "13px", color: "#64748b" }}>
                This complaint has not been converted to a statutory case yet.
              </p>
            )}
          </div>
        )}
      </div>

      {/* ─── DESKTOP VIEW (Preserved Existing UI) ─── */}
      <div className="desktop-only detail-page">
      <div className="detail-main">
        <button className="back-link" type="button" onClick={() => navigate("/complaints")}>
          <Icon name="arrow" /> All complaints
        </button>

        {/* Success Banner */}
        {showSuccessBanner && (
          <div
            style={{
              background: "#ecfdf5",
              border: "1px solid #a7f3d0",
              color: "#065f46",
              padding: "14px 20px",
              borderRadius: "8px",
              marginBottom: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Icon name="check-circle" />
              <div>
                <strong style={{ fontSize: "14.5px", display: "block" }}>Field Inspection Submitted Successfully!</strong>
                <span style={{ fontSize: "13px" }}>The field visit report and evidence photographs have been saved against this complaint.</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowSuccessBanner(false)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#065f46", padding: "4px" }}
              aria-label="Dismiss"
            >
              <Icon name="close" />
            </button>
          </div>
        )}

        <div className="detail-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
          <div style={{ flex: 1, minWidth: "280px" }}>
            <div className="detail-header__meta" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span>{complaint.id}</span>
              {isAssignedToMe && !isAcknowledged && (
                <span className="badge-new-assignment">NEW ASSIGNMENT</span>
              )}
              {isAssignedToMe && isAcknowledged && (
                <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "12px", background: "#dcfce7", color: "#166534", fontWeight: 600 }}>
                  ✓ Acknowledged
                </span>
              )}
            </div>
            <h2>{complaint.title}</h2>
            <div className="detail-header__info">
              <StatusBadge status={complaint.status} />
              <span>Registered {complaint.registered}</span>
              {(storedComplaint?.created_by || storedComplaint?.createdBy) && (
                <span style={{ color: "var(--muted, #64748b)" }}>
                  • Registered by: <strong>{(storedComplaint.created_by || storedComplaint.createdBy)?.name}</strong> ({(storedComplaint.created_by || storedComplaint.createdBy)?.role})
                </span>
              )}
            </div>
          </div>
          {canStartInspection && (
            <div style={{ alignSelf: "center" }}>
              <button
                type="button"
                className="primary-button"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 20px",
                  fontSize: "14px",
                  fontWeight: 600,
                  boxShadow: "0 2px 6px rgba(11,25,87,0.25)",
                }}
                onClick={handleStartInspection}
              >
                <Icon name="search" />
                <span>Start Inspection</span>
                <Icon name="arrow" />
              </button>
            </div>
          )}
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
            {(storedComplaint?.created_by || storedComplaint?.createdBy) && (
              <div>
                <span>Registered by</span>
                <strong>
                  {(storedComplaint.created_by || storedComplaint.createdBy)?.name}{" "}
                  <span style={{ fontSize: "11px", fontWeight: 500, color: "var(--muted, #64748b)" }}>
                    ({(storedComplaint.created_by || storedComplaint.createdBy)?.role.toUpperCase()})
                  </span>
                </strong>
              </div>
            )}
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
                const localUrl = `${API_BASE_URL.replace(/\/api$/, "")}/uploads/${relativePath
                  .map(encodeURIComponent)
                  .join("/")}`;

                return (
                  <img
                    key={attachment.filePath}
                    className="attachment-preview"
                    src={localUrl}
                    alt={attachment.fileName}
                    style={{ cursor: "pointer" }}
                    onClick={() => setViewerImage({ url: localUrl, title: attachment.fileName })}
                    title={`Click to preview ${attachment.fileName}`}
                  />
                );
              }

              //NEW GOOGLE DRIVE FILE
               const prefix = `${complaintId}_${attachment.category}_${attachment.index}`;

               const driveFile = driveFiles.find((file) =>
                file.fileName.startsWith(prefix)
               );
              
              if (driveFile) {
                const proxyUrl = getDriveFileProxyUrl(driveFile.fileId);
                return (
                  <img
                    key={driveFile.fileId}
                    className="attachment-preview"
                    src={proxyUrl}
                    alt={attachment.fileName}
                    style={{ cursor: "pointer" }}
                    onClick={() => setViewerImage({ url: proxyUrl, title: attachment.fileName })}
                    title={`Click to preview ${attachment.fileName}`}
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
        {canStartInspection && (
          <div className="panel side-card" style={{ borderLeft: "4px solid var(--accent, #0b1957)", background: "#f8fafc" }}>
            <h3 style={{ margin: "0 0 6px 0", fontSize: "14px", fontWeight: 700 }}>Next Action</h3>
            <p style={{ fontSize: "12px", color: "var(--muted, #64748b)", margin: "0 0 12px 0", lineHeight: "1.4" }}>
              Conduct the mandatory field inspection for this assigned complaint.
            </p>
            <button
              type="button"
              className="primary-button button-full"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
              onClick={handleStartInspection}
            >
              <Icon name="search" />
              <span>Start Inspection</span>
            </button>
          </div>
        )}

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
          {(storedComplaint?.created_by || storedComplaint?.createdBy) && (
            <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid var(--border, #e2e8f0)", fontSize: "12px", color: "var(--text-secondary, #475569)" }}>
              <span style={{ color: "var(--muted, #64748b)" }}>Registered by: </span>
              <strong>{(storedComplaint.created_by || storedComplaint.createdBy)?.name}</strong>{" "}
              <span style={{ textTransform: "uppercase", fontSize: "11px", color: "var(--muted, #64748b)" }}>
                ({(storedComplaint.created_by || storedComplaint.createdBy)?.role})
              </span>
            </div>
          )}
        </div>
      </aside>
      </div>

      {viewerImage && (
        <ImageViewerModal
          isOpen={!!viewerImage}
          imageUrl={viewerImage.url}
          title={viewerImage.title}
          onClose={() => setViewerImage(null)}
        />
      )}
    </div>
  );
}

export default ComplaintDetailPage;
