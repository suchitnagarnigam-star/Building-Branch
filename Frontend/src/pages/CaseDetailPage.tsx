import { useEffect, useState } from "react";
import Icon from "../shared/components/Icon";

type CaseDetailPageProps = {
  caseId: string;
  navigate?: (route: string) => void;
};

type CaseRecord = {
  case_id: string;
  source_type?: string;
  primary_complaint_id?: string | null;
  building_identity?: string | null;
  location?: string | null;
  zone?: string | null;
  block?: string | null;
  ward?: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  assigned_bi_id?: string | null;
  assigned_bi_name?: string | null;
  assigned_atp_id?: string | null;
  assigned_atp_name?: string | null;
  current_status: string;
  current_severity?: string | null;
  created_at: string;
  updated_at: string;
  construction_status?: string | null;
};

type EvidenceFile = {
  evidence_id: number | string;
  file_name: string;
  mime_type?: string;
  drive_file_id?: string;
  drive_file_url?: string;
};

type FieldVisitRecord = {
  visit_id: string | number;
  complaint_id?: string | null;
  case_id?: string | null;
  bi_id?: string | null;
  bi_name?: string | null;
  visit_type?: string;
  inspection_outcome?: string;
  report?: string | null;
  violator_name?: string | null;
  violator_mobile?: string | null;
  building_type?: string | null;
  submitted_at: string;
  evidence_files?: EvidenceFile[];
};

type NoticeRecord = {
  notice_id: string | number;
  case_id?: string;
  notice_type: string;
  notice_number?: string | null;
  issued_by_id?: string | null;
  issued_by_name?: string | null;
  issued_at?: string | null;
  document_name?: string | null;
  drive_file_url?: string | null;
  created_at: string;
};

type ViolatorReply = {
  reply_id: string | number;
  case_id?: string;
  reply_text?: string | null;
  reply_date: string;
  file_name?: string | null;
  drive_file_url?: string | null;
  created_at?: string;
};

type ConstructionSummary = {
  construction_status_id: string | number;
  case_id: string;
  construction_type: string;
  overall_status: string;
  compoundable_part_status?: string | null;
  assessment_status?: string | null;
  total_charges?: string | number | null;
  assessment_date?: string | null;
  receipt_number?: string | null;
  receipt_date?: string | null;
  receipt_drive_file_url?: string | null;
  non_compoundable_part_status?: string | null;
  notice_269_id?: string | number | null;
  notice_269_number?: string | null;
  notice_269_issued_at?: string | null;
  notice_269_document?: string | null;
  notice_269_file_url?: string | null;
};

type StatusHistory = {
  history_id: string | number;
  previous_status?: string | null;
  new_status: string;
  changed_by_name?: string | null;
  changed_at: string;
  reason?: string | null;
  note?: string | null;
};

export default function CaseDetailPage({ caseId, navigate }: CaseDetailPageProps) {
  const [caseRecord, setCaseRecord] = useState<CaseRecord | null>(null);
  const [visits, setVisits] = useState<FieldVisitRecord[]>([]);
  const [notices, setNotices] = useState<NoticeRecord[]>([]);
  const [violatorReplies, setViolatorReplies] = useState<ViolatorReply[]>([]);
  const [constructionSummary, setConstructionSummary] = useState<ConstructionSummary | null>(null);
  const [statusHistory, setStatusHistory] = useState<StatusHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadCaseData = async () => {
    setLoading(true);
    setError("");
    try {
      const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "/api";
      const res = await fetch(`${apiBase.replace(/\/$/, "")}/cases/${encodeURIComponent(caseId)}`);
      const data = await res.json();
      if (data.success && data.caseRecord) {
        setCaseRecord(data.caseRecord);
        setVisits(data.visits || []);
        setNotices(data.notices || []);
        setViolatorReplies(data.violatorReplies || []);
        setConstructionSummary(data.constructionSummary || null);
        setStatusHistory(data.statusHistory || []);
      } else {
        setError(data.message || "Failed to load case record.");
      }
    } catch {
      setError("Unable to connect to server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCaseData();
  }, [caseId]);

  const formatDate = (isoStr?: string | null) => {
    if (!isoStr) return "N/A";
    try {
      const d = new Date(isoStr);
      return isNaN(d.getTime())
        ? isoStr
        : d.toLocaleDateString("en-US", {
            month: "numeric",
            day: "numeric",
            year: "numeric",
          });
    } catch {
      return isoStr;
    }
  };

  const formatSourceType = (source?: string) => {
    if (!source) return "Proactive BI";
    if (source.toLowerCase() === "proactive_bi") return "Proactive BI";
    if (source.toLowerCase() === "complaint") return "Complaint Based";
    return source.replace(/_/g, " ");
  };

  if (loading) {
    return (
      <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--muted)", fontFamily: "'Inter', sans-serif" }}>
        <p>Loading case {caseId}...</p>
      </div>
    );
  }

  if (error || !caseRecord) {
    return (
      <div style={{ padding: "32px 24px", maxWidth: "1200px", margin: "0 auto", fontFamily: "'Inter', sans-serif" }}>
        <div style={{ padding: "16px", borderRadius: "8px", background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", marginBottom: "16px" }}>
          {error || "Case not found."}
        </div>
        <button
          type="button"
          className="secondary-button"
          onClick={() => navigate?.("/cases")}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          ← Back to Cases
        </button>
      </div>
    );
  }

  // Active visit and notice derivation
  const latestVisit = visits[0] || null;
  const notice270 = notices.find((n) => n.notice_type === "270" || String(n.notice_type).includes("270")) || notices[0] || null;
  const hasReply = violatorReplies.length > 0;
  const hasConstruction = Boolean(constructionSummary || caseRecord.construction_status);

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "16px 24px 60px", fontFamily: "'Inter', sans-serif", color: "var(--ink)" }}>
      {/* ── 1. HEADER / BREADCRUMB BAR ── */}
      <div style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => navigate?.("/cases")}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "18px",
              fontWeight: 700,
              color: "var(--ink)",
            }}
          >
            ← Case {caseRecord.case_id}
          </button>
          <span
            style={{
              background: "var(--bridal-blue, #e9f3ff)",
              color: "var(--midnight, #0b1957)",
              fontSize: "11px",
              fontWeight: 600,
              padding: "2px 10px",
              borderRadius: "9999px",
              border: "1px solid rgba(11, 25, 87, 0.12)",
              letterSpacing: "0.02em",
            }}
          >
            {caseRecord.current_status || "Open"}
          </span>
        </div>
        <p style={{ margin: "4px 0 0", fontSize: "13px", color: "var(--muted)" }}>
          Location: {caseRecord.location || "Operational Area"} • Block {caseRecord.block || "19"}, Zone {caseRecord.zone || "Zone D"}
        </p>
      </div>

      {/* ── 2. WORKFLOW PIPELINE CARD ── */}
      <section
        style={{
          background: "var(--white, #ffffff)",
          border: "1px solid var(--border, #e2e8f0)",
          borderRadius: "10px",
          padding: "16px 20px",
          boxShadow: "var(--shadow-card)",
          marginBottom: "20px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em", color: "var(--ink)", textTransform: "uppercase" }}>
            Workflow Pipeline
          </span>
          <span style={{ fontSize: "12px", color: "var(--muted)" }}>
            Current Status: <strong style={{ color: "var(--ink)", fontWeight: 600 }}>{caseRecord.current_status || "Open"}</strong>
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "10px",
          }}
        >
          {/* Step 01: Inspection */}
          <div
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              padding: "12px 14px",
              background: "#ffffff",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "11px", color: "var(--muted)" }}>01</span>
              <span
                style={{
                  background: "#dcfce7",
                  color: "#166534",
                  fontSize: "10px",
                  fontWeight: 600,
                  padding: "2px 6px",
                  borderRadius: "9999px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px",
                }}
              >
                ✓ Completed
              </span>
            </div>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink)" }}>Inspection</div>
          </div>

          {/* Step 02: 270 Notice */}
          <div
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              padding: "12px 14px",
              background: "#ffffff",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "11px", color: "var(--muted)" }}>02</span>
              <span
                style={{
                  background: notice270 ? "#dcfce7" : "#f1f5f9",
                  color: notice270 ? "#166534" : "#64748b",
                  fontSize: "10px",
                  fontWeight: 600,
                  padding: "2px 6px",
                  borderRadius: "9999px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px",
                }}
              >
                {notice270 ? "✓ Completed" : "Pending"}
              </span>
            </div>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink)" }}>270 Notice</div>
          </div>

          {/* Step 03: 3-Day Reply Period (Current highlight) */}
          <div
            style={{
              border: hasReply ? "1px solid #e2e8f0" : "1.5px solid #f59e0b",
              borderRadius: "8px",
              padding: "12px 14px",
              background: hasReply ? "#ffffff" : "#fffbeb",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "11px", color: "var(--muted)" }}>03</span>
              <span
                style={{
                  background: hasReply ? "#dcfce7" : "#fef3c7",
                  color: hasReply ? "#166534" : "#b45309",
                  fontSize: "10px",
                  fontWeight: 600,
                  padding: "2px 6px",
                  borderRadius: "9999px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px",
                }}
              >
                {hasReply ? "✓ Completed" : "• Current"}
              </span>
            </div>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink)" }}>3-Day Reply Period</div>
          </div>

          {/* Step 04: Construction Status */}
          <div
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              padding: "12px 14px",
              background: "#ffffff",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: "8px",
              cursor: "pointer",
            }}
            onClick={() => navigate?.(`/cases/${encodeURIComponent(caseRecord.case_id)}/construction-status`)}
            title="Click to view or record construction status"
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "11px", color: "var(--muted)" }}>04</span>
              <span
                style={{
                  background: hasConstruction ? "#dcfce7" : "#f1f5f9",
                  color: hasConstruction ? "#166534" : "#64748b",
                  fontSize: "10px",
                  fontWeight: 600,
                  padding: "2px 6px",
                  borderRadius: "9999px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px",
                }}
              >
                {hasConstruction ? "✓ Completed" : "Pending"}
              </span>
            </div>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink)" }}>Construction Status</div>
          </div>

          {/* Step 05: Demolition */}
          <div
            style={{
              border: "1px dashed #cbd5e1",
              borderRadius: "8px",
              padding: "12px 14px",
              background: "#f8fafc",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: "8px",
              opacity: 0.85,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "11px", color: "#94a3b8" }}>05</span>
              <span
                style={{
                  background: "#f1f5f9",
                  color: "#94a3b8",
                  fontSize: "10px",
                  fontWeight: 600,
                  padding: "2px 6px",
                  borderRadius: "9999px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px",
                }}
              >
                🔒 Locked
              </span>
            </div>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "#94a3b8" }}>Demolition</div>
          </div>
        </div>
      </section>

      {/* ── 3. TWO-COLUMN MAIN GRID OF 6 CARDS ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(460px, 1fr))",
          gap: "16px",
        }}
      >
        {/* ── CARD 1: Case Information ── */}
        <section
          style={{
            background: "var(--white, #ffffff)",
            border: "1px solid var(--border, #e2e8f0)",
            borderRadius: "10px",
            padding: "20px",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "15px", fontWeight: 700, color: "var(--ink)" }}>
              <span>📁</span>
              <span>Case Information</span>
            </div>
            <span
              style={{
                fontSize: "11px",
                fontFamily: "monospace",
                background: "#f1f5f9",
                color: "#475569",
                padding: "2px 8px",
                borderRadius: "4px",
                border: "1px solid #e2e8f0",
              }}
            >
              {caseRecord.case_id}
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px 20px",
              fontSize: "13px",
            }}
          >
            <div>
              <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "2px" }}>Source Type</div>
              <div style={{ fontWeight: 600, color: "var(--ink)" }}>{formatSourceType(caseRecord.source_type)}</div>
            </div>

            <div>
              <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "2px" }}>Primary Complaint</div>
              <div>
                {caseRecord.primary_complaint_id ? (
                  <button
                    type="button"
                    onClick={() => navigate?.(`/complaints/${encodeURIComponent(caseRecord.primary_complaint_id!)}`)}
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      color: "var(--navy, #0b1957)",
                      textDecoration: "underline",
                      cursor: "pointer",
                      fontWeight: 600,
                      fontFamily: "inherit",
                      fontSize: "13px",
                    }}
                  >
                    {caseRecord.primary_complaint_id}
                  </button>
                ) : (
                  <span style={{ fontWeight: 600, color: "var(--ink)" }}>N/A (Proactive)</span>
                )}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "2px" }}>Block &amp; Zone</div>
              <div style={{ fontWeight: 600, color: "var(--ink)" }}>
                {caseRecord.block || "Block 19"} • {caseRecord.zone || "Zone D"}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "2px" }}>Ward</div>
              <div style={{ fontWeight: 600, color: "var(--ink)" }}>{caseRecord.ward || "Unassigned"}</div>
            </div>

            <div>
              <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "2px" }}>Address / Location</div>
              <div style={{ fontWeight: 600, color: "var(--ink)" }}>{caseRecord.location || "Operational Area"}</div>
            </div>

            <div>
              <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "2px" }}>Building Identity</div>
              <div style={{ fontWeight: 600, color: "var(--ink)" }}>{caseRecord.building_identity || "Not specified"}</div>
            </div>

            <div>
              <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "2px" }}>Assigned BI</div>
              <div style={{ fontWeight: 600, color: "var(--ink)" }}>{caseRecord.assigned_bi_name || "Unassigned"}</div>
            </div>

            <div>
              <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "2px" }}>Current Status</div>
              <div>
                <span
                  style={{
                    background: "var(--bridal-blue, #e9f3ff)",
                    color: "var(--midnight, #0b1957)",
                    fontSize: "11px",
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: "9999px",
                  }}
                >
                  {caseRecord.current_status || "Open"}
                </span>
              </div>
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "2px" }}>Assigned ATP</div>
              <div style={{ fontWeight: 600, color: "var(--ink)" }}>{caseRecord.assigned_atp_name || "Unassigned"}</div>
            </div>
          </div>
        </section>

        {/* ── CARD 2: Inspection Information ── */}
        <section
          style={{
            background: "var(--white, #ffffff)",
            border: "1px solid var(--border, #e2e8f0)",
            borderRadius: "10px",
            padding: "20px",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "15px", fontWeight: 700, color: "var(--ink)" }}>
              <span>🔍</span>
              <span>Inspection Information</span>
            </div>
            <span
              style={{
                fontSize: "11px",
                background: "#f1f5f9",
                color: "#475569",
                padding: "2px 8px",
                borderRadius: "9999px",
                fontWeight: 500,
              }}
            >
              {visits.length} Visit(s) Recorded
            </span>
          </div>

          {latestVisit ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "16px 20px",
                fontSize: "13px",
              }}
            >
              <div>
                <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "2px" }}>Inspection Outcome</div>
                <div>
                  <span
                    style={{
                      background: latestVisit.inspection_outcome === "violation_found" ? "#fee2e2" : "#dcfce7",
                      color: latestVisit.inspection_outcome === "violation_found" ? "#dc2626" : "#166534",
                      fontSize: "11px",
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: "9999px",
                      display: "inline-block",
                    }}
                  >
                    {latestVisit.inspection_outcome === "violation_found" ? "Violation Found" : "No Violation"}
                  </span>
                </div>
              </div>

              <div>
                <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "2px" }}>Visit Type</div>
                <div style={{ fontWeight: 600, color: "var(--ink)" }}>
                  {latestVisit.visit_type === "proactive_inspection" ? "Proactive Inspection" : "Complaint Inspection"}
                </div>
              </div>

              <div>
                <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "2px" }}>Violator Name</div>
                <div style={{ fontWeight: 600, color: "var(--ink)" }}>{latestVisit.violator_name || "Not provided"}</div>
              </div>

              <div>
                <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "2px" }}>Contact</div>
                <div style={{ fontWeight: 600, color: "var(--ink)" }}>{latestVisit.violator_mobile || "Not provided"}</div>
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "2px" }}>Report Description</div>
                <div style={{ color: "var(--ink)", fontWeight: 500 }}>{latestVisit.report || "No notes recorded"}</div>
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "8px" }}>
                  Inspection Evidence Photos ({latestVisit.evidence_files?.length || 0})
                </div>
                {latestVisit.evidence_files && latestVisit.evidence_files.length > 0 ? (
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    {latestVisit.evidence_files.map((ev) => (
                      <a
                        key={ev.evidence_id}
                        href={ev.drive_file_url || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "inline-block",
                          border: "1px solid var(--border, #e2e8f0)",
                          borderRadius: "6px",
                          padding: "6px 8px",
                          background: "#ffffff",
                          textDecoration: "none",
                          fontSize: "12px",
                          color: "var(--ink)",
                        }}
                      >
                        <div
                          style={{
                            width: "90px",
                            height: "64px",
                            background: "#f8fafc",
                            borderRadius: "4px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            marginBottom: "4px",
                            overflow: "hidden",
                          }}
                        >
                          {ev.drive_file_id ? (
                            <img
                              src={`https://lh3.googleusercontent.com/d/${ev.drive_file_id}`}
                              alt={ev.file_name}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <span style={{ fontSize: "18px" }}>📷</span>
                          )}
                        </div>
                        <span style={{ fontSize: "11px", color: "var(--muted)", display: "block", maxWidth: "90px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {ev.file_name}
                        </span>
                      </a>
                    ))}
                  </div>
                ) : (
                  <span style={{ color: "var(--muted)", fontSize: "12px" }}>No evidence photos attached</span>
                )}
              </div>
            </div>
          ) : (
            <p style={{ color: "var(--muted)", fontSize: "13px", margin: 0 }}>No inspection visits recorded yet.</p>
          )}
        </section>

        {/* ── CARD 3: Section 270 Notice Information ── */}
        <section
          style={{
            background: "var(--white, #ffffff)",
            border: "1px solid var(--border, #e2e8f0)",
            borderRadius: "10px",
            padding: "20px",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "15px", fontWeight: 700, color: "var(--ink)" }}>
              <span>⚠️</span>
              <span>Section 270 Notice Information</span>
            </div>
            <span
              style={{
                fontSize: "11px",
                background: notice270 ? "#fef3c7" : "#f1f5f9",
                color: notice270 ? "#b45309" : "#64748b",
                padding: "2px 8px",
                borderRadius: "9999px",
                fontWeight: 600,
              }}
            >
              {notice270 ? "Notice Issued" : "Not Issued"}
            </span>
          </div>

          {notice270 ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "16px 20px",
                fontSize: "13px",
              }}
            >
              <div>
                <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "2px" }}>Notice Number</div>
                <div style={{ fontWeight: 600, color: "var(--ink)" }}>{notice270.notice_number || "—"}</div>
              </div>

              <div>
                <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "2px" }}>Notice Date</div>
                <div style={{ fontWeight: 600, color: "var(--ink)" }}>{formatDate(notice270.issued_at)}</div>
              </div>

              <div>
                <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "2px" }}>Issued By</div>
                <div style={{ fontWeight: 600, color: "var(--ink)" }}>{notice270.issued_by_name || caseRecord.assigned_bi_name || "Assigned BI"}</div>
              </div>

              <div>
                <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "2px" }}>Section</div>
                <div style={{ fontWeight: 600, color: "var(--ink)" }}>PMC Section {notice270.notice_type || "270"}</div>
              </div>

              {notice270.drive_file_url && (
                <div style={{ gridColumn: "1 / -1", marginTop: "4px" }}>
                  <a
                    href={notice270.drive_file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      background: "var(--white, #ffffff)",
                      border: "1px solid var(--border, #e2e8f0)",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: 500,
                      color: "var(--ink)",
                      textDecoration: "none",
                    }}
                  >
                    <span>📄</span>
                    <span>View Notice Document ({notice270.notice_number || "File"})</span>
                  </a>
                </div>
              )}
            </div>
          ) : (
            <p style={{ color: "var(--muted)", fontSize: "13px", margin: 0 }}>No Section 270 notice issued yet for this case.</p>
          )}
        </section>

        {/* ── CARD 4: Violator Reply Information ── */}
        <section
          style={{
            background: "var(--white, #ffffff)",
            border: "1px solid var(--border, #e2e8f0)",
            borderRadius: "10px",
            padding: "20px",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "15px", fontWeight: 700, color: "var(--ink)" }}>
              <span>👤</span>
              <span>Violator Reply Information</span>
            </div>
            <span
              style={{
                fontSize: "11px",
                background: hasReply ? "#dcfce7" : "#f1f5f9",
                color: hasReply ? "#166534" : "#64748b",
                padding: "2px 8px",
                borderRadius: "9999px",
                fontWeight: 600,
              }}
            >
              {hasReply ? "Reply Filed" : "Awaiting Reply"}
            </span>
          </div>

          {hasReply ? (
            <div style={{ fontSize: "13px", display: "flex", flexDirection: "column", gap: "12px" }}>
              {violatorReplies.map((r) => (
                <div key={r.reply_id} style={{ border: "1px solid #e2e8f0", borderRadius: "6px", padding: "10px 12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ fontSize: "11px", color: "var(--muted)" }}>Reply Date: {formatDate(r.reply_date)}</span>
                  </div>
                  <div style={{ color: "var(--ink)", fontWeight: 500 }}>{r.reply_text || "Document reply submitted"}</div>
                  {r.drive_file_url && (
                    <a
                      href={r.drive_file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "12px",
                        color: "var(--navy, #0b1957)",
                        marginTop: "6px",
                        textDecoration: "underline",
                      }}
                    >
                      <span>📎</span> {r.file_name || "View Reply Attachment"}
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: "var(--muted)", fontSize: "13px", margin: 0 }}>
              No violator response/reply has been filed for this case yet.
            </p>
          )}
        </section>

        {/* ── CARD 5: Construction Information ── */}
        <section
          style={{
            background: "var(--white, #ffffff)",
            border: "1px solid var(--border, #e2e8f0)",
            borderRadius: "10px",
            padding: "20px",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "15px", fontWeight: 700, color: "var(--ink)" }}>
              <span>✏️</span>
              <span>Construction Information</span>
            </div>
            <span
              style={{
                fontSize: "11px",
                background: constructionSummary ? "#dcfce7" : "#f1f5f9",
                color: constructionSummary ? "#166534" : "#64748b",
                padding: "2px 8px",
                borderRadius: "9999px",
                fontWeight: 600,
                textTransform: "capitalize",
              }}
            >
              {constructionSummary
                ? constructionSummary.construction_type.replace(/_/g, " ")
                : "Pending Evaluation"}
            </span>
          </div>

          {constructionSummary ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "14px 20px",
                fontSize: "13px",
              }}
            >
              <div>
                <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "2px" }}>Construction Type</div>
                <div style={{ fontWeight: 600, color: "var(--ink)", textTransform: "capitalize" }}>
                  {constructionSummary.construction_type.replace(/_/g, " ")}
                </div>
              </div>

              <div>
                <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "2px" }}>Overall Status</div>
                <div style={{ fontWeight: 600, color: "var(--ink)", textTransform: "capitalize" }}>
                  {constructionSummary.overall_status.replace(/_/g, " ")}
                </div>
              </div>

              {constructionSummary.total_charges && (
                <div>
                  <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "2px" }}>Compounding Fee</div>
                  <div style={{ fontWeight: 600, color: "var(--ink)" }}>₹ {Number(constructionSummary.total_charges).toLocaleString("en-IN")}</div>
                </div>
              )}

              {constructionSummary.receipt_number && (
                <div>
                  <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "2px" }}>Receipt No.</div>
                  <div style={{ fontWeight: 600, color: "var(--ink)" }}>{constructionSummary.receipt_number}</div>
                </div>
              )}

              {constructionSummary.notice_269_number && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "2px" }}>Demolition Notice 269</div>
                  <div style={{ fontWeight: 600, color: "var(--danger, #dc2626)" }}>Notice #{constructionSummary.notice_269_number} Issued</div>
                </div>
              )}

              {constructionSummary.construction_type === "partly_compoundable" && (
                <div style={{ gridColumn: "1 / -1", background: "rgba(0,0,0,0.02)", padding: "10px 12px", borderRadius: "8px", marginTop: "4px" }}>
                  <div style={{ display: "flex", gap: "20px", fontSize: "12px", flexWrap: "wrap" }}>
                    <span style={{ color: constructionSummary.receipt_number ? "#166534" : "#b45309" }}>
                      <strong>Compoundable Area:</strong>{" "}
                      {constructionSummary.receipt_number ? `Completed ✓ (Receipt #${constructionSummary.receipt_number})` : "Pending Assessment"}
                    </span>
                    <span style={{ color: constructionSummary.notice_269_number ? "#166534" : "#b45309" }}>
                      <strong>Non-Compoundable Area:</strong>{" "}
                      {constructionSummary.notice_269_number ? `Completed ✓ (Notice #${constructionSummary.notice_269_number})` : "Pending Section 269 Notice"}
                    </span>
                  </div>
                </div>
              )}

              <div style={{ gridColumn: "1 / -1", marginTop: "6px" }}>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => navigate?.(`/cases/${encodeURIComponent(caseRecord.case_id)}/construction-status`)}
                  style={{ fontSize: "12px", padding: "6px 12px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <Icon name="edit" /> Edit Construction Status
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p style={{ color: "var(--muted)", fontSize: "13px", margin: "0 0 14px" }}>
                No construction status details filed for this case yet.
              </p>
              <button
                type="button"
                className="primary-button"
                onClick={() => navigate?.(`/cases/${encodeURIComponent(caseRecord.case_id)}/construction-status`)}
                style={{ fontSize: "12px", padding: "6px 12px", display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <Icon name="edit" /> Record Construction Status
              </button>
            </div>
          )}
        </section>

        {/* ── CARD 6: Status History Log ── */}
        <section
          style={{
            background: "var(--white, #ffffff)",
            border: "1px solid var(--border, #e2e8f0)",
            borderRadius: "10px",
            padding: "20px",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "15px", fontWeight: 700, color: "var(--ink)" }}>
              <span>✓</span>
              <span>Status History Log</span>
            </div>
            <span
              style={{
                fontSize: "11px",
                background: "#f1f5f9",
                color: "#475569",
                padding: "2px 8px",
                borderRadius: "9999px",
                fontWeight: 500,
              }}
            >
              {statusHistory.length} Record(s)
            </span>
          </div>

          {statusHistory.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px" }}>
              {statusHistory.map((h) => (
                <div key={h.history_id} style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2px" }}>
                    <strong style={{ color: "var(--ink)" }}>{h.new_status}</strong>
                    <span style={{ fontSize: "11px", color: "var(--muted)" }}>{formatDate(h.changed_at)}</span>
                  </div>
                  {h.note && <div style={{ fontSize: "12px", color: "var(--muted)" }}>{h.note}</div>}
                  {h.changed_by_name && (
                    <div style={{ fontSize: "11px", color: "var(--muted)" }}>Changed by {h.changed_by_name}</div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: "var(--muted)", fontSize: "13px", margin: 0 }}>
              No status history recorded yet.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
