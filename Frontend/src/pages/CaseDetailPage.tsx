import { useCallback, useEffect, useState } from "react";
import Icon from "../shared/components/Icon";
import { useAuth } from "../context/AuthContext";

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
  review_status?: string | null;
  reviewed_by_id?: string | null;
  reviewed_by_name?: string | null;
  reviewed_at?: string | null;
  review_remarks?: string | null;
};

type CaseClosure = {
  closure_id: string | number;
  case_id: string;
  closed_by_id: string;
  closed_by_name: string;
  closed_by_role: string;
  closure_reason: string;
  closing_description: string;
  evidence_file_name?: string | null;
  evidence_drive_file_url?: string | null;
  closed_at: string;
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

type DemolitionEvidenceFile = {
  evidence_id: number | string;
  file_name: string;
  mime_type?: string;
  drive_file_id?: string;
  drive_file_url?: string;
  evidence_type?: string;
  uploaded_at?: string;
};

type DemolitionRecord = {
  demolition_id: string | number;
  case_id: string;
  demolition_order_number?: string | null;
  order_date?: string | null;
  delivery_date?: string | null;
  specified_period_days?: number | null;
  compliance_deadline?: string | null;
  order_reason?: string | null;
  appeal_filed?: string | null;
  appeal_number?: string | null;
  appeal_date?: string | null;
  appeal_authority?: string | null;
  stay_granted?: string | null;
  stay_date?: string | null;
  compliance_status?: string | null;
  enforcement_outcome?: string | null;
  compliance_date?: string | null;
  verification_date?: string | null;
  verification_status?: string | null;
  action_date?: string | null;
  demolition_type?: string | null;
  executed_by?: string | null;
  demolished_portion?: string | null;
  remaining_violation?: string | null;
  next_action?: string | null;
  expected_action_date?: string | null;
  remarks?: string | null;
  cost_recovery_applicable?: string | null;
  demolition_cost?: string | number | null;
  recovery_amount?: string | number | null;
  recovery_status?: string | null;
  recovery_reference?: string | null;
  created_by_name?: string | null;
  created_at?: string | null;
  evidence_files?: DemolitionEvidenceFile[];
};

type StatusHistory = {
  history_id: string | number;
  case_id?: string;
  old_status?: string | null;
  new_status?: string | null;
  note?: string | null;
  changed_by_name?: string | null;
  changed_at?: string | null;
};


export default function CaseDetailPage({ caseId, navigate }: CaseDetailPageProps) {
  const { user } = useAuth();
  const [caseRecord, setCaseRecord] = useState<CaseRecord | null>(null);
  const [visits, setVisits] = useState<FieldVisitRecord[]>([]);
  const [notices, setNotices] = useState<NoticeRecord[]>([]);
  const [violatorReplies, setViolatorReplies] = useState<ViolatorReply[]>([]);
  const [constructionSummary, setConstructionSummary] = useState<ConstructionSummary | null>(null);
  const [demolitionRecord, setDemolitionRecord] = useState<DemolitionRecord | null>(null);
  const [statusHistory, setStatusHistory] = useState<StatusHistory[]>([]);
  const [caseClosure, setCaseClosure] = useState<CaseClosure | null>(null);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [reviewingReply, setReviewingReply] = useState<ViolatorReply | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadCaseData = useCallback(async () => {
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
        setDemolitionRecord(data.demolitionRecord || null);
        setStatusHistory(data.statusHistory || []);
        setCaseClosure(data.caseClosure || null);
        setError("");
      } else {
        setError(data.message || "Failed to load case record.");
      }
    } catch {
      setError("Unable to connect to server. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    void loadCaseData();
  }, [loadCaseData]);

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

  const formatOutcomeName = (outcome?: string | null) => {
    if (!outcome) return "Enforcement Recorded";
    switch (outcome) {
      case "violator_complied":
        return "Violator Complied";
      case "demolition_violator":
        return "Demolition Completed (Violator)";
      case "demolition_mcl":
        return "Demolition Executed (MCL)";
      case "appeal_stay":
        return "Appeal / Court Stay Pending";
      case "further_action":
        return "Further Action Required";
      default:
        return outcome.replace(/_/g, " ");
    }
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
  const isCompleteViolated = latestVisit?.inspection_outcome === "complete_violated";
  const notice270 = isCompleteViolated ? null : (notices.find((n) => n.notice_type === "270" || String(n.notice_type).includes("270")) || notices[0] || null);
  const notice269 = notices.find((n) => n.notice_type === "269" || String(n.notice_type).includes("269")) || null;
  const hasReply = violatorReplies.length > 0;
  const hasConstruction = Boolean(constructionSummary || caseRecord.construction_status);

  const normUserRole = (user?.role || "").toLowerCase();
  const isBi = normUserRole === "bi";
  const isCaseClosed = Boolean(caseRecord.current_status && caseRecord.current_status.toLowerCase().includes("closed"));
  const canReviewReply = ["atp", "mtp", "jc", "superadmin", "admin"].includes(normUserRole);

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "16px 24px 60px", fontFamily: "'Inter', sans-serif", color: "var(--ink)" }}>
      {/* ── 1. HEADER / BREADCRUMB BAR ── */}
      <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
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
                background: isCaseClosed ? "#dcfce7" : "var(--bridal-blue, #e9f3ff)",
                color: isCaseClosed ? "#166534" : "var(--midnight, #0b1957)",
                fontSize: "11px",
                fontWeight: 600,
                padding: "2px 10px",
                borderRadius: "9999px",
                border: isCaseClosed ? "1px solid #86efac" : "1px solid rgba(11, 25, 87, 0.12)",
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

        {/* Action Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            disabled={isBi || isCaseClosed}
            title={
              isBi
                ? "Case closure requires ATP or higher supervisory approval"
                : isCaseClosed
                ? "This case is already closed under statutory authority"
                : "Initiate formal statutory case closure"
            }
            onClick={() => setShowCloseModal(true)}
            style={{
              padding: "8px 16px",
              background: isCaseClosed ? "#16a34a" : "#dc2626",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: isBi || isCaseClosed ? "not-allowed" : "pointer",
              opacity: isBi ? 0.45 : 1,
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              transition: "all 0.2s ease",
            }}
          >
            {isCaseClosed ? "✓ Case Closed" : "Close Case"}
          </button>
        </div>
      </div>

      {/* ── STATUTORY CLOSURE BANNER (if case is closed) ── */}
      {caseClosure && (
        <section
          style={{
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "10px",
            padding: "14px 18px",
            marginBottom: "20px",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "18px" }}>🏛️</span>
              <div>
                <strong style={{ fontSize: "14px", color: "#166534" }}>Case Formally Closed under Punjab Municipal Corporation Act 1976</strong>
                <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#15803d" }}>
                  Reason: <strong>{caseClosure.closure_reason}</strong> • Closed by <strong>{caseClosure.closed_by_name}</strong> ({caseClosure.closed_by_role}) on {formatDate(caseClosure.closed_at)}
                </p>
              </div>
            </div>
          </div>
          {caseClosure.closing_description && (
            <p style={{ margin: "8px 0 0", fontSize: "13px", color: "#14532d", background: "#dcfce7", padding: "8px 12px", borderRadius: "6px" }}>
              <strong>Closing Findings:</strong> {caseClosure.closing_description}
            </p>
          )}
        </section>
      )}

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
            gridTemplateColumns: isCompleteViolated ? "repeat(4, 1fr)" : "repeat(5, 1fr)",
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

          {!isCompleteViolated && (
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
          )}

          {/* 3-Day Reply Period */}
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
              <span style={{ fontSize: "11px", color: "var(--muted)" }}>{isCompleteViolated ? "02" : "03"}</span>
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

          {/* Construction Status */}
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
              <span style={{ fontSize: "11px", color: "var(--muted)" }}>{isCompleteViolated ? "03" : "04"}</span>
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

          {/* Demolition */}
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
              <span style={{ fontSize: "11px", color: "#94a3b8" }}>{isCompleteViolated ? "04" : "05"}</span>
              <span
                style={{
                  background: notice269 ? "#dcfce7" : "#f1f5f9",
                  color: notice269 ? "#166534" : "#94a3b8",
                  fontSize: "10px",
                  fontWeight: 600,
                  padding: "2px 6px",
                  borderRadius: "9999px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px",
                }}
              >
                {notice269 ? "✓ Completed" : "🔒 Locked"}
              </span>
            </div>
            <div style={{ fontSize: "13px", fontWeight: 600, color: notice269 ? "var(--ink)" : "#94a3b8" }}>Demolition / 269</div>
          </div>
          {/* Enforcement Action */}
          {notice269 && (
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
              onClick={() => navigate?.(`/cases/${encodeURIComponent(caseRecord.case_id)}/enforcement`)}
              title="Click to view or record Enforcement Action"
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "11px", color: "var(--muted)" }}>{isCompleteViolated ? "05" : "06"}</span>
                <span
                  style={{
                    background: demolitionRecord ? "#dcfce7" : "#f1f5f9",
                    color: demolitionRecord ? "#166534" : "#64748b",
                    fontSize: "10px",
                    fontWeight: 600,
                    padding: "2px 6px",
                    borderRadius: "9999px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "3px",
                  }}
                >
                  {demolitionRecord ? "✓ Completed" : "Action Required"}
                </span>
              </div>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink)", display: "flex", alignItems: "center", gap: "6px" }}>
                Enforcement <Icon name="arrow-right" size={14} />
              </div>
            </div>
          )}
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
                      background: latestVisit.inspection_outcome === "violation_found" 
                        ? "#fee2e2" 
                        : latestVisit.inspection_outcome === "complete_violated"
                        ? "#ffedd5"
                        : "#dcfce7",
                      color: latestVisit.inspection_outcome === "violation_found" 
                        ? "#dc2626" 
                        : latestVisit.inspection_outcome === "complete_violated"
                        ? "#ea580c"
                        : "#166534",
                      fontSize: "11px",
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: "9999px",
                      display: "inline-block",
                    }}
                  >
                    {latestVisit.inspection_outcome === "violation_found" 
                      ? "Violation Found" 
                      : latestVisit.inspection_outcome === "complete_violated"
                      ? "Complete & Violated"
                      : "No Violation"}
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

        {/* ── CARD 3: Notice Information (Section 270 or 269) ── */}
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
              <span>{isCompleteViolated ? (notice269 ? "Section 269 Notice Information" : "Notice Status (Complete & Violated)") : "Section 270 Notice Information"}</span>
            </div>
            <span
              style={{
                fontSize: "11px",
                background: (isCompleteViolated ? notice269 : notice270) ? "#fef3c7" : "#f1f5f9",
                color: (isCompleteViolated ? notice269 : notice270) ? "#b45309" : "#64748b",
                padding: "2px 8px",
                borderRadius: "9999px",
                fontWeight: 600,
              }}
            >
              {isCompleteViolated ? (notice269 ? "Notice 269 Issued" : "No 270 Required") : (notice270 ? "Notice Issued" : "Not Issued")}
            </span>
          </div>

          {isCompleteViolated ? (
            notice269 ? (
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
                  <div style={{ fontWeight: 600, color: "var(--ink)" }}>{notice269.notice_number || "—"}</div>
                </div>

                <div>
                  <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "2px" }}>Notice Date</div>
                  <div style={{ fontWeight: 600, color: "var(--ink)" }}>{formatDate(notice269.issued_at)}</div>
                </div>

                <div>
                  <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "2px" }}>Issued By</div>
                  <div style={{ fontWeight: 600, color: "var(--ink)" }}>{notice269.issued_by_name || caseRecord.assigned_bi_name || "Assigned BI"}</div>
                </div>

                <div>
                  <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "2px" }}>Section</div>
                  <div style={{ fontWeight: 600, color: "var(--ink)" }}>PMC Section 269 (Demolition / Sealing)</div>
                </div>

                {notice269.drive_file_url && (
                  <div style={{ gridColumn: "1 / -1", marginTop: "4px" }}>
                    <a
                      href={notice269.drive_file_url}
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
                      <span>View Notice Document ({notice269.notice_number || "File"})</span>
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <p style={{ color: "var(--muted)", fontSize: "13px", margin: 0 }}>
                This is a <strong>Complete & Violated</strong> case. Per statutory rules, Section 270 notice is omitted. The case proceeds directly through the 3-day reply period to Construction Status and applicable Section 269 enforcement action.
              </p>
            )
          ) : (
            notice270 ? (
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
            )
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
              {violatorReplies.map((r) => {
                const isReplyValid = r.review_status === "valid";
                const isReplyInvalid = r.review_status === "invalid";
                const isPending = !r.review_status || r.review_status === "pending";

                return (
                  <div key={r.reply_id} style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px 14px", background: "#ffffff" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px", flexWrap: "wrap", gap: "6px" }}>
                      <span style={{ fontSize: "11px", color: "var(--muted)" }}>Reply Date: {formatDate(r.reply_date)}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {isReplyValid && (
                          <span style={{ background: "#dcfce7", color: "#166534", fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "9999px" }}>
                            ✓ Validated (Accepted)
                          </span>
                        )}
                        {isReplyInvalid && (
                          <span style={{ background: "#fee2e2", color: "#991b1b", fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "9999px" }}>
                            ✗ Rejected (Invalid)
                          </span>
                        )}
                        {isPending && (
                          <span style={{ background: "#fef3c7", color: "#92400e", fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "9999px" }}>
                            Pending Evaluation
                          </span>
                        )}
                        {isPending && canReviewReply && (
                          <button
                            type="button"
                            onClick={() => setReviewingReply(r)}
                            style={{
                              background: "var(--midnight, #0b1957)",
                              color: "#ffffff",
                              border: "none",
                              borderRadius: "6px",
                              fontSize: "11px",
                              fontWeight: 600,
                              padding: "4px 10px",
                              cursor: "pointer",
                            }}
                          >
                            Evaluate Reply
                          </button>
                        )}
                      </div>
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
                    {r.reviewed_by_name && (
                      <div
                        style={{
                          marginTop: "8px",
                          padding: "8px 12px",
                          background: isReplyValid ? "#f0fdf4" : "#fef2f2",
                          border: isReplyValid ? "1px solid #bbf7d0" : "1px solid #fecaca",
                          borderRadius: "6px",
                          fontSize: "12px",
                          color: isReplyValid ? "#166534" : "#991b1b",
                        }}
                      >
                        <div>
                          <strong>Evaluated by:</strong> {r.reviewed_by_name} on {formatDate(r.reviewed_at)}
                        </div>
                        {r.review_remarks && (
                          <div style={{ marginTop: "2px" }}>
                            <strong>Remarks:</strong> {r.review_remarks}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
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

        {/* ── CARD: Demolition & Enforcement Information ── */}
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
              <span>🚜</span>
              <span>Demolition &amp; Enforcement Information</span>
            </div>
            <span
              style={{
                fontSize: "11px",
                background: demolitionRecord ? "#dcfce7" : "#f1f5f9",
                color: demolitionRecord ? "#166534" : "#64748b",
                padding: "2px 8px",
                borderRadius: "9999px",
                fontWeight: 600,
              }}
            >
              {demolitionRecord ? formatOutcomeName(demolitionRecord.enforcement_outcome) : "Pending Action"}
            </span>
          </div>

          {demolitionRecord ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "14px 20px",
                fontSize: "13px",
              }}
            >
              <div>
                <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "2px" }}>Enforcement Outcome</div>
                <div style={{ fontWeight: 600, color: "var(--ink)" }}>
                  {formatOutcomeName(demolitionRecord.enforcement_outcome)}
                </div>
              </div>

              {demolitionRecord.action_date && (
                <div>
                  <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "2px" }}>Action / Demolition Date</div>
                  <div style={{ fontWeight: 600, color: "var(--ink)" }}>{formatDate(demolitionRecord.action_date)}</div>
                </div>
              )}

              {demolitionRecord.compliance_date && (
                <div>
                  <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "2px" }}>Compliance Date</div>
                  <div style={{ fontWeight: 600, color: "var(--ink)" }}>{formatDate(demolitionRecord.compliance_date)}</div>
                </div>
              )}

              {demolitionRecord.verification_date && (
                <div>
                  <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "2px" }}>Verification Date</div>
                  <div style={{ fontWeight: 600, color: "var(--ink)" }}>{formatDate(demolitionRecord.verification_date)} ({demolitionRecord.verification_status || "Verified"})</div>
                </div>
              )}

              {demolitionRecord.executed_by && (
                <div>
                  <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "2px" }}>Executed By</div>
                  <div style={{ fontWeight: 600, color: "var(--ink)" }}>{demolitionRecord.executed_by}</div>
                </div>
              )}

              {demolitionRecord.demolition_type && (
                <div>
                  <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "2px" }}>Demolition Type</div>
                  <div style={{ fontWeight: 600, color: "var(--ink)", textTransform: "capitalize" }}>{demolitionRecord.demolition_type} Demolition</div>
                </div>
              )}

              {demolitionRecord.demolished_portion && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "2px" }}>Demolished Portion</div>
                  <div style={{ fontWeight: 500, color: "var(--ink)" }}>{demolitionRecord.demolished_portion}</div>
                </div>
              )}

              {demolitionRecord.remaining_violation && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "2px" }}>Remaining Violation</div>
                  <div style={{ fontWeight: 500, color: "var(--danger, #dc2626)" }}>{demolitionRecord.remaining_violation}</div>
                </div>
              )}

              {demolitionRecord.cost_recovery_applicable === "yes" && (
                <div style={{ gridColumn: "1 / -1", background: "#f8fafc", border: "1px solid #e2e8f0", padding: "10px 12px", borderRadius: "8px" }}>
                  <div style={{ fontSize: "12px", fontWeight: 700, marginBottom: "4px", color: "var(--ink)" }}>Cost Recovery Details</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "12px" }}>
                    <div><strong>Demolition Cost:</strong> ₹{demolitionRecord.demolition_cost || 0}</div>
                    <div><strong>Recovery Amount:</strong> ₹{demolitionRecord.recovery_amount || 0}</div>
                    <div><strong>Status:</strong> {demolitionRecord.recovery_status || "Pending"}</div>
                    <div><strong>Reference No:</strong> {demolitionRecord.recovery_reference || "-"}</div>
                  </div>
                </div>
              )}

              {demolitionRecord.appeal_filed === "yes" && (
                <div style={{ gridColumn: "1 / -1", background: "#fffbeb", border: "1px solid #fef3c7", padding: "10px 12px", borderRadius: "8px" }}>
                  <div style={{ fontSize: "12px", fontWeight: 700, marginBottom: "4px", color: "#b45309" }}>Appeal &amp; Stay Details</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "12px", color: "#78350f" }}>
                    <div><strong>Appeal No:</strong> {demolitionRecord.appeal_number || "-"}</div>
                    <div><strong>Authority:</strong> {demolitionRecord.appeal_authority || "-"}</div>
                    <div><strong>Stay Granted:</strong> {demolitionRecord.stay_granted === "yes" ? "Yes" : "No"}</div>
                    {demolitionRecord.stay_date && <div><strong>Stay Date:</strong> {formatDate(demolitionRecord.stay_date)}</div>}
                    {demolitionRecord.order_reason && <div style={{ gridColumn: "1 / -1" }}><strong>Court Directions:</strong> {demolitionRecord.order_reason}</div>}
                  </div>
                </div>
              )}

              {demolitionRecord.remarks && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "2px" }}>Remarks / Notes</div>
                  <div style={{ fontSize: "13px", color: "var(--ink)", fontStyle: "italic" }}>"{demolitionRecord.remarks}"</div>
                </div>
              )}

              {/* Evidence Photos */}
              <div style={{ gridColumn: "1 / -1", marginTop: "4px" }}>
                <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "8px" }}>
                  Demolition Evidence Photos ({demolitionRecord.evidence_files?.length || 0})
                </div>
                {demolitionRecord.evidence_files && demolitionRecord.evidence_files.length > 0 ? (
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    {demolitionRecord.evidence_files.map((ev) => (
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
                  <span style={{ color: "var(--muted)", fontSize: "12px" }}>No evidence photo attached</span>
                )}
              </div>

              <div style={{ gridColumn: "1 / -1", marginTop: "10px" }}>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => navigate?.(`/cases/${encodeURIComponent(caseRecord.case_id)}/enforcement`)}
                  style={{ fontSize: "12px", padding: "6px 12px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <Icon name="edit" /> Edit Enforcement Action
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p style={{ color: "var(--muted)", fontSize: "13px", margin: "0 0 14px" }}>
                No demolition or enforcement action has been recorded for this case yet.
              </p>
              <button
                type="button"
                className="primary-button"
                onClick={() => navigate?.(`/cases/${encodeURIComponent(caseRecord.case_id)}/enforcement`)}
                style={{ fontSize: "12px", padding: "6px 12px", display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <Icon name="arrow-right" /> Record Enforcement Action
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

      {/* ── STATUTORY MODALS ── */}
      {showCloseModal && (
        <CloseCaseModal
          caseId={caseRecord.case_id}
          onClose={() => setShowCloseModal(false)}
          onSuccess={() => {
            setShowCloseModal(false);
            void loadCaseData();
          }}
        />
      )}

      {reviewingReply && (
        <ReviewReplyModal
          caseId={caseRecord.case_id}
          reply={reviewingReply}
          onClose={() => setReviewingReply(null)}
          onSuccess={() => {
            setReviewingReply(null);
            void loadCaseData();
          }}
        />
      )}
    </div>
  );
}

function CloseCaseModal({
  caseId,
  onClose,
  onSuccess,
}: {
  caseId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [closureReason, setClosureReason] = useState("Violator Complied & Verified");
  const [closingDescription, setClosingDescription] = useState("");
  const [evidenceFileName, setEvidenceFileName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!closingDescription.trim()) {
      setErrorMsg("Please provide closing summary and statutory findings.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg("");
      const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "/api";
      const res = await fetch(`${apiBase.replace(/\/$/, "")}/cases/${encodeURIComponent(caseId)}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          closureReason,
          closingDescription: closingDescription.trim(),
          evidenceFileName: evidenceFileName.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.message || "Failed to close case under statutory rules.");
        return;
      }

      onSuccess();
    } catch {
      setErrorMsg("Network error: Unable to contact server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "12px",
          width: "100%",
          maxWidth: "540px",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
          border: "1px solid #cbd5e1",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "18px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "var(--ink)" }}>Close Statutory Case</h3>
            <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--muted)" }}>Case Reference: {caseId}</p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            style={{ background: "none", border: "none", fontSize: "20px", color: "var(--muted)", cursor: "pointer" }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "20px 24px" }}>
          {/* Statutory Alert Banner */}
          <div
            style={{
              padding: "12px 14px",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "8px",
              marginBottom: "16px",
              fontSize: "12px",
              color: "#991b1b",
              lineHeight: 1.5,
            }}
          >
            ⚠️ <strong>Statutory Notice:</strong> Case closure is a permanent legal action under the Punjab Municipal Corporation Act 1976. This action requires verified compliance, satisfied demolition, accepted reply, or paid compounding receipts.
          </div>

          {errorMsg && (
            <div
              style={{
                padding: "10px 14px",
                background: "#fee2e2",
                border: "1px solid #f87171",
                borderRadius: "6px",
                marginBottom: "14px",
                fontSize: "13px",
                color: "#b91c1c",
              }}
            >
              {errorMsg}
            </div>
          )}

          <div style={{ marginBottom: "14px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--ink)", marginBottom: "6px" }}>
              Statutory Closure Ground *
            </label>
            <select
              value={closureReason}
              onChange={(e) => setClosureReason(e.target.value)}
              disabled={isSubmitting}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
                color: "var(--ink)",
                background: "#ffffff",
              }}
            >
              <option value="Violator Complied & Verified">Violator Complied & Verified by Field Inspection</option>
              <option value="Compounding Fees Deposited & Cleared">Compounding Fees Deposited & Cleared</option>
              <option value="Demolition Order Satisfied">Demolition Order Satisfied (Violator / MCL)</option>
              <option value="Violator Reply Accepted by Authority">Violator Reply Formally Accepted by Authority</option>
              <option value="Stay / Quashed by Appellate Court">Stay / Quashed by Appellate Court Order</option>
            </select>
          </div>

          <div style={{ marginBottom: "14px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--ink)", marginBottom: "6px" }}>
              Closing Summary & Findings *
            </label>
            <textarea
              rows={3}
              value={closingDescription}
              onChange={(e) => setClosingDescription(e.target.value)}
              disabled={isSubmitting}
              placeholder="Record final statutory findings, order references, or verification details..."
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
                color: "var(--ink)",
                resize: "vertical",
              }}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--ink)", marginBottom: "6px" }}>
              Evidence File Reference (Optional)
            </label>
            <input
              type="text"
              value={evidenceFileName}
              onChange={(e) => setEvidenceFileName(e.target.value)}
              disabled={isSubmitting}
              placeholder="e.g. final_verification_memo_2026.pdf"
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
                color: "var(--ink)",
              }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: "8px 16px",
                background: "#f1f5f9",
                color: "var(--ink)",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: "8px 18px",
                background: "#dc2626",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: isSubmitting ? "wait" : "pointer",
                opacity: isSubmitting ? 0.7 : 1,
              }}
            >
              {isSubmitting ? "Closing Case..." : "Confirm & Close Case"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ReviewReplyModal({
  caseId,
  reply,
  onClose,
  onSuccess,
}: {
  caseId: string;
  reply: ViolatorReply;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [verdict, setVerdict] = useState<"valid" | "invalid">("valid");
  const [reviewRemarks, setReviewRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsSubmitting(true);
      setErrorMsg("");
      const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "/api";
      const res = await fetch(`${apiBase.replace(/\/$/, "")}/cases/${encodeURIComponent(caseId)}/review-reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          replyId: reply.reply_id,
          verdict,
          reviewRemarks: reviewRemarks.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.message || "Failed to evaluate reply.");
        return;
      }

      onSuccess();
    } catch {
      setErrorMsg("Network error: Unable to contact server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "12px",
          width: "100%",
          maxWidth: "520px",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
          border: "1px solid #cbd5e1",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "18px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "var(--ink)" }}>Evaluate Violator Reply</h3>
            <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--muted)" }}>Reply ID #{reply.reply_id} • Case {caseId}</p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            style={{ background: "none", border: "none", fontSize: "20px", color: "var(--muted)", cursor: "pointer" }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "20px 24px" }}>
          {/* Submitted Reply Content */}
          <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "16px" }}>
            <span style={{ fontSize: "11px", color: "var(--muted)", display: "block", marginBottom: "4px" }}>Submitted Text:</span>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--ink)", fontWeight: 500 }}>
              {reply.reply_text || "Document reply submitted without inline text"}
            </p>
          </div>

          {errorMsg && (
            <div
              style={{
                padding: "10px 14px",
                background: "#fee2e2",
                border: "1px solid #f87171",
                borderRadius: "6px",
                marginBottom: "14px",
                fontSize: "13px",
                color: "#b91c1c",
              }}
            >
              {errorMsg}
            </div>
          )}

          {/* Verdict Radio Selectors */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--ink)", marginBottom: "8px" }}>
              Supervisory Verdict *
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: verdict === "valid" ? "2px solid #22c55e" : "1px solid #cbd5e1",
                  background: verdict === "valid" ? "#f0fdf4" : "#ffffff",
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="verdict"
                  value="valid"
                  checked={verdict === "valid"}
                  onChange={() => setVerdict("valid")}
                  style={{ marginTop: "3px" }}
                />
                <div>
                  <strong style={{ fontSize: "13px", color: "#166534" }}>Accept as Valid (Legally Justified)</strong>
                  <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#15803d" }}>
                    Violator's justification is accepted. Case becomes eligible for statutory closure.
                  </p>
                </div>
              </label>

              <label
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: verdict === "invalid" ? "2px solid #ef4444" : "1px solid #cbd5e1",
                  background: verdict === "invalid" ? "#fef2f2" : "#ffffff",
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="verdict"
                  value="invalid"
                  checked={verdict === "invalid"}
                  onChange={() => setVerdict("invalid")}
                  style={{ marginTop: "3px" }}
                />
                <div>
                  <strong style={{ fontSize: "13px", color: "#991b1b" }}>Reject as Invalid (Violation Persists)</strong>
                  <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#b91c1c" }}>
                    Reply does not cure the violation. Proceed with statutory demolition / enforcement action.
                  </p>
                </div>
              </label>
            </div>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--ink)", marginBottom: "6px" }}>
              Supervisory Remarks / Rationale
            </label>
            <textarea
              rows={3}
              value={reviewRemarks}
              onChange={(e) => setReviewRemarks(e.target.value)}
              disabled={isSubmitting}
              placeholder="State reasons for acceptance or statutory grounds for rejection..."
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
                color: "var(--ink)",
                resize: "vertical",
              }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: "8px 16px",
                background: "#f1f5f9",
                color: "var(--ink)",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: "8px 18px",
                background: "var(--midnight, #0b1957)",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: isSubmitting ? "wait" : "pointer",
                opacity: isSubmitting ? 0.7 : 1,
              }}
            >
              {isSubmitting ? "Recording..." : "Save Evaluation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

