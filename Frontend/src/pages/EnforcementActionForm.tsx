import { useState, useRef, useEffect, type ChangeEvent, type FormEvent } from "react";
import Icon from "../shared/components/Icon";

// ===== UPDATED: Minimum compliance period is a business rule, not mock data =====
const MIN_COMPLIANCE_DAYS = 3;

type EnforcementActionFormProps = {
  navigate?: (route: string) => void;
  caseId?: string;
};

type EnforcementOutcome =
  | ""
  | "violator_complied"
  | "demolition_violator"
  | "demolition_mcl"
  | "appeal_stay"
  | "further_action";

type DemolitionType = "full" | "partial";
type VerificationStatus = "verified" | "not_verified";
type YesNo = "yes" | "no";

type CaseData = {
  caseId: string;
  complaintId: string | null;
  address: string;
  block: string;
  zone: string;
  ward: string | null;
  violator: string;
  assignedBI?: string;
  supervisingATP?: string;
  constructionStatus: string;
  notice269Number: string;
  notice269Date: string;
  compliancePeriod: string;
  complianceDeadline: string;
  complianceStatus: "Pending" | "Deadline Reached";

  has270Notice: boolean;
  has269Notice: boolean;
};

type NoticeRecord = {
  notice_type?: string;
  issued_at?: string;
  created_at?: string;
  notice_number?: string;
};

type VisitRecord = {
  submitted_at?: string;
  violator_name?: string;
};

type WorkflowStatus = "completed" | "current" | "pending";

type WorkflowStep = {
  step: string;
  label: string;
  status: WorkflowStatus;
};

const getWorkflowSteps = (
  caseData: CaseData | null
): WorkflowStep[] => {
  if (!caseData) {
    return [
      { step: "01", label: "270 Notice", status: "pending" },
      { step: "02", label: "269 Notice", status: "pending" },
      { step: "03", label: "Min. 3-Day Compliance", status: "pending" },
      { step: "04", label: "Enforcement Action", status: "pending" },
      { step: "05", label: "Closure / Verification", status: "pending" },
    ];
  }

  const deadlineReached = caseData.complianceStatus === "Deadline Reached";

  return [
    {
      step: "01",
      label: "270 Notice",
      status: caseData.has270Notice ? "completed" : "pending",
    },
    {
      step: "02",
      label: "269 Notice",
      status: caseData.has269Notice ? "completed" : "pending",
    },
    {
      step: "03",
      label: "Min. 3-Day Compliance",
      status: caseData.has269Notice
        ? deadlineReached
          ? "completed"
          : "current"
        : "pending",
    },
    {
      step: "04",
      label: "Enforcement Action",
      status: caseData.has269Notice && deadlineReached ? "current" : "pending",
    },
    {
      step: "05",
      label: "Closure / Verification",
      status: "pending",
    },
  ];
};

export default function EnforcementActionForm({ navigate, caseId: propCaseId }: EnforcementActionFormProps) {
  // ── Form State ──────────────────────────────────────────────────────────────
  const [outcome, setOutcome] = useState<EnforcementOutcome>("");

  // Violator Complied State
  const [complied, setComplied] = useState({
    complianceDate: "",
    verificationDate: "",
    verificationStatus: "" as VerificationStatus | "",
  });

  // Demolition by Violator State
  const [demoViolator, setDemoViolator] = useState({
    demolitionDate: "",
    demolitionType: "full" as DemolitionType,
    verificationDate: "",
    verificationStatus: "" as VerificationStatus | "",
    demolishedPortion: "",
    remainingViolation: "",
    furtherAction: "",
  });

  // Demolition by MCL State
  const [demoMcl, setDemoMcl] = useState({
    demolitionDate: "",
    executedBy: "",
    demolitionType: "full" as DemolitionType,
    demolishedPortion: "",
    remainingViolation: "",
    furtherAction: "",
    costRecovery: "no" as YesNo,
    demolitionCost: "",
    recoveryAmount: "",
    recoveryStatus: "",
    recoveryReference: "",
  });

  // Appeal / Stay State
  const [appealStay, setAppealStay] = useState({
    appealFiled: "no" as YesNo,
    appealNumber: "",
    appealDate: "",
    authority: "",
    stayGranted: "no" as YesNo,
    stayDate: "",
    courtDirections: "",
  });

  // Further Action Required State
  const [furtherAction, setFurtherAction] = useState({
    reason: "",
    nextAction: "",
    expectedActionDate: "",
  });

  // Common Section State
  const [remarks, setRemarks] = useState("");
  const [evidencePhoto, setEvidencePhoto] = useState<File | null>(null);

  // Form Validation & Submit State
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // File Input Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [isLoadingCase, setIsLoadingCase] = useState(() => Boolean(propCaseId));
  const [caseFetchError, setCaseFetchError] = useState(() => (!propCaseId ? "Case ID is missing." : ""));

  const workflowSteps = getWorkflowSteps(caseData);

  // ===== UPDATED: Enforcement can be started only after the minimum 3-day period =====
  const canTakeEnforcementAction =
    caseData?.complianceStatus === "Deadline Reached";

  useEffect(() => {
    if (!propCaseId) return;

    const fetchCase = async () => {
    try {
      setIsLoadingCase(true);
      setCaseFetchError("");

      const response = await fetch(
        `/api/cases/${encodeURIComponent(propCaseId)}`
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to fetch case.");
      }

      // ===== UPDATED: Normalize the real API response into the UI CaseData shape =====
      const caseRecord = result.caseRecord;
      const visits = result.visits ?? [];
      const notices = result.notices ?? [];
      const constructionSummary = result.constructionSummary;

      // Use the latest inspection visit so the violator name is not hardcoded.
      const latestVisit = (visits as VisitRecord[]).reduce<VisitRecord | null>((latest, current) => {
        if (!latest) return current;
        return new Date(current.submitted_at ?? 0).getTime() >
          new Date(latest.submitted_at ?? 0).getTime()
          ? current
          : latest;
      }, null);

      // Use the latest 269 notice returned by the API.
      const notice269 = (notices as NoticeRecord[])
        .filter((notice) => notice.notice_type === "269")
        .sort(
          (a, b) =>
            new Date(b.issued_at ?? b.created_at ?? 0).getTime() -
            new Date(a.issued_at ?? a.created_at ?? 0).getTime()
        )[0] ?? null;

      const noticeDate = notice269?.issued_at
        ? new Date(notice269.issued_at)
        : constructionSummary?.notice_269_issued_at
          ? new Date(constructionSummary.notice_269_issued_at)
          : null;

      // Minimum compliance period = 3 days from the 269 notice date.
      const complianceDeadline = noticeDate
        ? new Date(
            noticeDate.getTime() +
              MIN_COMPLIANCE_DAYS * 24 * 60 * 60 * 1000
          )
        : null;

      // ===== UPDATED: Deadline is reached only at/after the full 3-day period =====
      const complianceStatus: CaseData["complianceStatus"] =
        complianceDeadline && new Date() >= complianceDeadline
          ? "Deadline Reached"
          : "Pending";

      const formatDate = (date: Date | null) => {
        if (!date) return "-";

        return date.toLocaleDateString("en-IN", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
      };

      // ===== UPDATED: Map API snake_case fields once, then use camelCase in JSX =====
      const mappedCase: CaseData = {
        caseId: caseRecord.case_id,
        complaintId: caseRecord.primary_complaint_id ?? null,
        address: caseRecord.location ?? "-",
        block: caseRecord.block ?? "-",
        zone: caseRecord.zone ?? "-",
        ward: caseRecord.ward ?? null,
        violator: latestVisit?.violator_name ?? "-",
        assignedBI: caseRecord.assigned_bi_name,
        supervisingATP: caseRecord.assigned_atp_name,
        constructionStatus: caseRecord.construction_status ?? "-",
        notice269Number:
          notice269?.notice_number ??
          constructionSummary?.notice_269_number ??
          "-",
        notice269Date: formatDate(noticeDate),
        compliancePeriod: `${MIN_COMPLIANCE_DAYS} days`,
        complianceDeadline: formatDate(complianceDeadline),
        complianceStatus,
        has270Notice: (notices as NoticeRecord[]).some(
          (notice) => notice.notice_type === "270"
        ),
        has269Notice: (notices as NoticeRecord[]).some(
          (notice) => notice.notice_type === "269"
        ),
      };

      setCaseData(mappedCase);
    } catch (error: unknown) {
      setCaseFetchError(
        error instanceof Error ? error.message : "Failed to load case information."
      );
    } finally {
      setIsLoadingCase(false);
    }
  };

  fetchCase();
}, [propCaseId]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleOutcomeChange = (newOutcome: EnforcementOutcome) => {
    // ===== UPDATED: Prevent enforcement actions before the compliance deadline =====
    if (!canTakeEnforcementAction) {
      setSubmitError(
        `Enforcement action cannot be started until the minimum ${MIN_COMPLIANCE_DAYS}-day compliance period is completed.`
      );
      return;
    }

    setOutcome(newOutcome);
    setFieldErrors({});
    setSubmitError("");
    setSubmitSuccess(false);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setEvidencePhoto(e.target.files[0]);
      setFieldErrors((prev) => ({ ...prev, evidencePhoto: "" }));
      setSubmitError("");
    }
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    setSubmitError("");

    if (!caseData) {
      setSubmitError("Case information is not available.");
      return false;
    }

    // ===== UPDATED: Server/API data must confirm the compliance period is complete =====
    if (!canTakeEnforcementAction) {
      setSubmitError(
        `Enforcement action is available only after the minimum ${MIN_COMPLIANCE_DAYS}-day compliance period.`
      );
      return false;
    }

    if (!outcome) {
      setSubmitError("Please select an Enforcement Outcome.");
      return false;
    }

    if (outcome === "violator_complied") {
      if (!complied.complianceDate) errors.complianceDate = "Compliance Date is required.";
      if (!complied.verificationDate) errors.verificationDate = "Verification Date is required.";
      if (!complied.verificationStatus) errors.verificationStatus = "Verification Status is required.";
    }

    if (outcome === "demolition_violator") {
      if (!demoViolator.demolitionDate) errors.demolitionDate = "Demolition Date is required.";
      if (!demoViolator.demolitionType) errors.demolitionType = "Demolition Type is required.";
      if (!demoViolator.verificationDate) errors.verificationDate = "Verification Date is required.";
      if (!demoViolator.verificationStatus) errors.verificationStatus = "Verification Status is required.";
      if (demoViolator.demolitionType === "partial") {
        if (!demoViolator.demolishedPortion) errors.demolishedPortion = "Demolished / Removed Portion is required.";
        if (!demoViolator.remainingViolation) errors.remainingViolation = "Remaining Violation is required.";
        if (!demoViolator.furtherAction) errors.furtherAction = "Further Action / Next Step is required.";
      }
    }

    if (outcome === "demolition_mcl") {
      if (!demoMcl.demolitionDate) errors.demolitionDate = "Demolition Date is required.";
      if (!demoMcl.executedBy) errors.executedBy = "Executed By is required.";
      if (!demoMcl.demolitionType) errors.demolitionType = "Demolition Type is required.";
      if (demoMcl.demolitionType === "partial") {
        if (!demoMcl.demolishedPortion) errors.demolishedPortion = "Demolished Portion is required.";
        if (!demoMcl.remainingViolation) errors.remainingViolation = "Remaining Violation is required.";
        if (!demoMcl.furtherAction) errors.furtherAction = "Further Action / Next Step is required.";
      }
    }

    if (outcome === "further_action") {
      if (!furtherAction.reason.trim()) errors.reason = "Reason is required.";
      if (!furtherAction.nextAction.trim()) errors.nextAction = "Next Action is required.";
    }

    // Common requirements (except for appeal/stay which might not need immediate evidence depending on business logic, but let's assume it's required if an outcome is action-based)
    if (outcome !== "appeal_stay") {
      if (!evidencePhoto) errors.evidencePhoto = "Evidence is required.";
      if (!remarks.trim()) errors.remarks = "Remarks are required.";
    }

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      setSubmitError("Please fill in all required fields marked with *.");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const confirmed = window.confirm("Are you sure you want to submit this enforcement action?");
    if (!confirmed) return;

    setIsSubmitting(true);
    setSubmitError("");

    try {
      const formData = new FormData();
      formData.append("outcome", outcome);

      if (outcome === "violator_complied") formData.append("complied", JSON.stringify(complied));
      if (outcome === "demolition_violator") formData.append("demoViolator", JSON.stringify(demoViolator));
      if (outcome === "demolition_mcl") formData.append("demoMcl", JSON.stringify(demoMcl));
      if (outcome === "appeal_stay") formData.append("appealStay", JSON.stringify(appealStay));
      if (outcome === "further_action") formData.append("furtherAction", JSON.stringify(furtherAction));

      formData.append("remarks", remarks);
      if (evidencePhoto) {
        formData.append("evidencePhoto", evidencePhoto);
      }

      const response = await fetch(`/api/cases/${encodeURIComponent(propCaseId!)}/enforcement`, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to submit enforcement action.");
      }

      setSubmitSuccess(true);
      setTimeout(() => {
        navigate?.(`/cases/${encodeURIComponent(propCaseId!)}`);
      }, 5000);
    } catch (error: unknown) {
      setSubmitError(error instanceof Error ? error.message : "An error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Render Helpers ──────────────────────────────────────────────────────────

  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "6px",
    border: "1px solid var(--border)",
    fontSize: "14px",
    color: "var(--ink)",
    background: "#fff",
  };

  const labelStyle = {
    display: "block",
    fontSize: "13px",
    fontWeight: 600,
    color: "var(--ink)",
    marginBottom: "6px",
  };

  const renderError = (field: string) => {
    if (!fieldErrors[field]) return null;
    return <div style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px" }}>{fieldErrors[field]}</div>;
  };

  const renderRadioCard = (value: EnforcementOutcome, label: string, icon: string, description: string) => {
    const isSelected = outcome === value;
    const isDisabled = !canTakeEnforcementAction;

    return (
      <label
        style={{
          display: "flex",
          gap: "12px",
          padding: "16px",
          borderRadius: "8px",
          border: `2px solid ${isSelected ? "#3b82f6" : "var(--border)"}`,
          background: isSelected ? "#eff6ff" : "#fff",
          cursor: isDisabled ? "not-allowed" : "pointer",
          opacity: isDisabled ? 0.65 : 1,
          transition: "all 0.2s",
        }}
        onClick={() => handleOutcomeChange(value)}
      >
        <div style={{ paddingTop: "2px" }}>
          <input
            type="radio"
            name="outcome"
            value={value}
            checked={isSelected}
            disabled={!canTakeEnforcementAction}
            onChange={() => handleOutcomeChange(value)}
            style={{ accentColor: "#3b82f6", width: "16px", height: "16px" }}
          />
        </div>
        <div>
          <div style={{ fontWeight: 600, color: isSelected ? "#1e40af" : "var(--ink)", fontSize: "15px", marginBottom: "4px", display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "20px", height: "20px" }}>
              <Icon name={icon} size={18} />
            </div>
            {label}
          </div>
          <div style={{ fontSize: "13px", color: "var(--muted)", lineHeight: 1.4, paddingLeft: "28px" }}>
            {description}
          </div>
        </div>
      </label>
    );
  };

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "28px 32px 80px", fontFamily: "'Inter', sans-serif" }}>
      {/* ── Header ── */}
      <div style={{ marginBottom: "24px", display: "flex", alignItems: "center", gap: "12px" }}>
        <button
          type="button"
          onClick={() => navigate?.("/cases")}
          style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", color: "var(--muted)", padding: 0 }}
        >
          <Icon name="arrow-left" size={20} />
        </button>
        <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 700, color: "var(--ink)" }}>Demolition / Enforcement Action</h1>
      </div>

      {submitSuccess && (
        <div style={{ padding: "16px", borderRadius: "8px", background: "#dcfce7", border: "1px solid #bbf7d0", color: "#166534", marginBottom: "24px", display: "flex", gap: "12px" }}>
          <Icon name="check-circle" size={20} />
          <div>
            <div style={{ fontWeight: 600 }}>Action Submitted Successfully</div>
            <div style={{ fontSize: "13px", marginTop: "4px" }}>The enforcement action has been recorded for Case {caseData?.caseId}.</div>
          </div>
        </div>
      )}

      {/* ── WORKFLOW PIPELINE ── */}
      <section style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: "10px", padding: "20px 24px", boxShadow: "var(--shadow-card)", marginBottom: "24px" }}>
        <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em", color: "var(--ink)", textTransform: "uppercase", marginBottom: "16px" }}>
          Case Workflow
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", paddingBottom: "4px" }}>
          {workflowSteps.map((item, idx) => (
            <div key={idx} style={{ flex: "1 1 180px", minWidth: "160px", border: `1px solid ${item.status === 'current' ? '#3b82f6' : 'var(--border)'}`, borderRadius: "8px", padding: "14px 16px", background: item.status === 'completed' ? '#f8fafc' : item.status === 'current' ? '#eff6ff' : '#fff' }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 600 }}>{item.step}</span>
                {item.status === "completed" && <span style={{ color: "#10b981", display: "flex" }}><Icon name="check" size={14} /></span>}
                {item.status === "current" && <span style={{ color: "#3b82f6", fontSize: "10px", fontWeight: 700, letterSpacing: "0.04em" }}>IN PROGRESS</span>}
              </div>
              <div style={{ fontSize: "13.5px", fontWeight: item.status === 'current' ? 700 : 500, color: item.status === 'pending' ? 'var(--muted)' : 'var(--ink)' }}>{item.label}</div>
            </div>
          ))}
        </div>
      </section>

      {isLoadingCase && (
  <div
    style={{
      padding: "16px",
      marginBottom: "24px",
      background: "#eff6ff",
      border: "1px solid #bfdbfe",
      borderRadius: "8px",
      color: "#1e40af",
      fontSize: "14px",
    }}
  >
    Loading case information...
  </div>
)}

{caseFetchError && (
  <div
    style={{
      padding: "16px",
      marginBottom: "24px",
      background: "#fef2f2",
      border: "1px solid #fecaca",
      borderRadius: "8px",
      color: "#991b1b",
      fontSize: "14px",
    }}
  >
    {caseFetchError}
  </div>
)}

      {/* ── 1. CASE & 269 INFO (READ ONLY) ── */}
      <section style={{ background: "#f8fafc", border: "1px solid var(--border)", borderRadius: "10px", padding: "20px 24px", marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px" }}>
          <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}>
            <Icon name="file-text" size={18} /> Case &amp; 269 Notice Summary
          </h2>
          <span style={{ padding: "4px 12px", background: caseData?.complianceStatus === "Deadline Reached" ? "#fee2e2" : "#fef3c7", color: caseData?.complianceStatus === "Deadline Reached" ? "#991b1b" : "#b45309", fontSize: "12px", fontWeight: 700, borderRadius: "99px" }}>
            {caseData?.complianceStatus === "Deadline Reached"
              ? "Deadline Reached"
              : "Compliance Period Active"}
          </span>
        </div>
        {isLoadingCase ? (
          <div style={{ padding: "20px 0", color: "var(--muted)" }}>
            Loading case information...
          </div>
        ) : caseFetchError ? (
          <div
            style={{
              padding: "12px",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#991b1b",
              borderRadius: "6px",
            }}
          >
            {caseFetchError}
          </div>
        ) : caseData ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px 24px", fontSize: "13.5px" }}>
            <div>
              <span style={{ color: "var(--muted)" }}>Case ID:</span>{" "}
              <strong style={{ color: "var(--ink)", marginLeft: "4px" }}>{caseData.caseId}</strong>
            </div>

            <div>
              <span style={{ color: "var(--muted)" }}>Complaint ID:</span>{" "}
              <strong style={{ color: "var(--ink)", marginLeft: "4px" }}>{caseData.complaintId || "N/A"}</strong>
            </div>

            <div>
              <span style={{ color: "var(--muted)" }}>Block / Zone:</span>{" "}
              <strong style={{ color: "var(--ink)", marginLeft: "4px" }}>{caseData.block || "-"} / {caseData.zone || "-"}</strong>
            </div>

            <div>
              <span style={{ color: "var(--muted)" }}>Ward:</span>{" "}
              <strong style={{ color: "var(--ink)", marginLeft: "4px" }}>{caseData.ward || "-"}</strong>
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <span style={{ color: "var(--muted)" }}>Property Address:</span>{" "}
              <strong style={{ color: "var(--ink)", marginLeft: "4px" }}>{caseData.address || "-"}</strong>
            </div>

            <div>
              <span style={{ color: "var(--muted)" }}>Violator:</span>{" "}
              <strong style={{ color: "var(--ink)", marginLeft: "4px" }}>{caseData.violator || "-"}</strong>
            </div>

            <div>
              <span style={{ color: "var(--muted)" }}>Construction Status:</span>{" "}
              <strong style={{ color: "var(--ink)", marginLeft: "4px" }}>{caseData.constructionStatus || "-"}</strong>
            </div>

            <div style={{ gridColumn: "1 / -1", height: "1px", background: "var(--border)", margin: "4px 0" }}></div>
            <div>
              <span style={{ color: "var(--muted)" }}>269 Notice Number:</span>{" "}
              <strong style={{ color: "var(--ink)", marginLeft: "4px" }}>{caseData.notice269Number || "-"}</strong>
            </div>
            <div>
              <span style={{ color: "var(--muted)" }}>Notice Date:</span>{" "}
              <strong style={{ color: "var(--ink)", marginLeft: "4px" }}>{caseData.notice269Date || "-"}</strong>
            </div>
            <div>
              <span style={{ color: "var(--muted)" }}>Compliance Period:</span>{" "}
              <strong style={{ color: "var(--ink)", marginLeft: "4px" }}>{caseData.compliancePeriod || "-"}</strong>
            </div>
            <div>
              <span style={{ color: "var(--muted)" }}>Deadline:</span>{" "}
              <strong style={{ color: "var(--ink)", marginLeft: "4px" }}>{caseData.complianceDeadline || "-"}</strong>
            </div>
          </div>
        ) : null}
      </section>

      <form onSubmit={handleSubmit}>
        {/* ── 2. ENFORCEMENT OUTCOME ── */}
        <section style={{ marginBottom: "32px" }}>
          <h2 style={{ margin: "0 0 16px", fontSize: "16px", fontWeight: 600 }}>Enforcement Outcome <span style={{ color: "#ef4444" }}>*</span></h2>
          {/* ===== UPDATED: Explain why enforcement options are disabled before deadline ===== */}
          {caseData && !canTakeEnforcementAction && caseData.has269Notice && (
            <div
              style={{
                padding: "12px 16px",
                marginBottom: "16px",
                background: "#fffbeb",
                border: "1px solid #fde68a",
                borderRadius: "8px",
                color: "#92400e",
                fontSize: "13px",
              }}
            >
              The minimum {MIN_COMPLIANCE_DAYS}-day compliance period has not yet
              been completed. Enforcement actions will be available after the
              deadline of <strong>{caseData.complianceDeadline}</strong>.
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "16px" }}>
            {renderRadioCard("violator_complied", "Violator Complied", "check-circle", "Violator has voluntarily removed the unauthorized construction.")}
            {renderRadioCard("demolition_violator", "Demolition by Violator", "tool", "Demolition carried out by the violator themselves.")}
            {renderRadioCard("demolition_mcl", "Demolition by MCL", "alert-triangle", "Demolition executed by MCL authorities.")}
            {renderRadioCard("appeal_stay", "Appeal / Stay", "shield", "Legal stay or appeal filed against the notice.")}
            {renderRadioCard("further_action", "Further Action Required", "clock", "Pending other actions before demolition.")}
          </div>
        </section>

        {/* ── DYNAMIC SECTIONS ── */}

        {outcome === "violator_complied" && (
          <section style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: "10px", padding: "24px 28px", marginBottom: "24px" }}>
            <h3 style={{ margin: "0 0 16px", fontSize: "15px", fontWeight: 600 }}>Compliance Details</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
              <div>
                <label style={labelStyle}>Compliance Date *</label>
                <input type="date" style={inputStyle} value={complied.complianceDate} onChange={e => setComplied({ ...complied, complianceDate: e.target.value })} />
                {renderError("complianceDate")}
              </div>
              <div>
                <label style={labelStyle}>Verification Date *</label>
                <input type="date" style={inputStyle} value={complied.verificationDate} onChange={e => setComplied({ ...complied, verificationDate: e.target.value })} />
                {renderError("verificationDate")}
              </div>
              <div>
                <label style={labelStyle}>Verification Status *</label>
                <select style={inputStyle} value={complied.verificationStatus} onChange={e => setComplied({ ...complied, verificationStatus: e.target.value as VerificationStatus })}>
                  <option value="">Select Status</option>
                  <option value="verified">Verified</option>
                  <option value="not_verified">Not Verified</option>
                </select>
                {renderError("verificationStatus")}
              </div>
            </div>
          </section>
        )}

        {outcome === "demolition_violator" && (
          <section style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: "10px", padding: "24px 28px", marginBottom: "24px" }}>
            <h3 style={{ margin: "0 0 16px", fontSize: "15px", fontWeight: 600 }}>Demolition Details</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
              <div>
                <label style={labelStyle}>Demolition Date *</label>
                <input type="date" style={inputStyle} value={demoViolator.demolitionDate} onChange={e => setDemoViolator({ ...demoViolator, demolitionDate: e.target.value })} />
                {renderError("demolitionDate")}
              </div>
              <div>
                <label style={labelStyle}>Demolition Type *</label>
                <select style={inputStyle} value={demoViolator.demolitionType} onChange={e => setDemoViolator({ ...demoViolator, demolitionType: e.target.value as DemolitionType })}>
                  <option value="full">Full Demolition</option>
                  <option value="partial">Partial Demolition</option>
                </select>
                {renderError("demolitionType")}
              </div>
              <div>
                <label style={labelStyle}>Verification Date *</label>
                <input type="date" style={inputStyle} value={demoViolator.verificationDate} onChange={e => setDemoViolator({ ...demoViolator, verificationDate: e.target.value })} />
                {renderError("verificationDate")}
              </div>
              <div>
                <label style={labelStyle}>Verification Status *</label>
                <select style={inputStyle} value={demoViolator.verificationStatus} onChange={e => setDemoViolator({ ...demoViolator, verificationStatus: e.target.value as VerificationStatus })}>
                  <option value="">Select Status</option>
                  <option value="verified">Verified</option>
                  <option value="not_verified">Not Verified</option>
                </select>
                {renderError("verificationStatus")}
              </div>

              {demoViolator.demolitionType === "partial" && (
                <>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={labelStyle}>Demolished / Removed Portion *</label>
                    <textarea style={{ ...inputStyle, minHeight: "80px" }} value={demoViolator.demolishedPortion} onChange={e => setDemoViolator({ ...demoViolator, demolishedPortion: e.target.value })} />
                    {renderError("demolishedPortion")}
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={labelStyle}>Remaining Violation *</label>
                    <textarea style={{ ...inputStyle, minHeight: "80px" }} value={demoViolator.remainingViolation} onChange={e => setDemoViolator({ ...demoViolator, remainingViolation: e.target.value })} />
                    {renderError("remainingViolation")}
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={labelStyle}>Further Action / Next Step *</label>
                    <input type="text" style={inputStyle} value={demoViolator.furtherAction} onChange={e => setDemoViolator({ ...demoViolator, furtherAction: e.target.value })} />
                    {renderError("furtherAction")}
                  </div>
                </>
              )}
            </div>
          </section>
        )}

        {outcome === "demolition_mcl" && (
          <section style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: "10px", padding: "24px 28px", marginBottom: "24px" }}>
            <h3 style={{ margin: "0 0 16px", fontSize: "15px", fontWeight: 600 }}>MCL Execution Details</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
              <div>
                <label style={labelStyle}>Demolition Date *</label>
                <input type="date" style={inputStyle} value={demoMcl.demolitionDate} onChange={e => setDemoMcl({ ...demoMcl, demolitionDate: e.target.value })} />
                {renderError("demolitionDate")}
              </div>
              <div>
                <label style={labelStyle}>Executed By *</label>
                <input type="text" style={inputStyle} placeholder="Officer/Team Name" value={demoMcl.executedBy} onChange={e => setDemoMcl({ ...demoMcl, executedBy: e.target.value })} />
                {renderError("executedBy")}
              </div>
              <div>
                <label style={labelStyle}>Demolition Type *</label>
                <select style={inputStyle} value={demoMcl.demolitionType} onChange={e => setDemoMcl({ ...demoMcl, demolitionType: e.target.value as DemolitionType })}>
                  <option value="full">Full Demolition</option>
                  <option value="partial">Partial Demolition</option>
                </select>
                {renderError("demolitionType")}
              </div>

              {demoMcl.demolitionType === "partial" && (
                <>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={labelStyle}>Demolished Portion *</label>
                    <textarea style={{ ...inputStyle, minHeight: "60px" }} value={demoMcl.demolishedPortion} onChange={e => setDemoMcl({ ...demoMcl, demolishedPortion: e.target.value })} />
                    {renderError("demolishedPortion")}
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={labelStyle}>Remaining Violation *</label>
                    <textarea style={{ ...inputStyle, minHeight: "60px" }} value={demoMcl.remainingViolation} onChange={e => setDemoMcl({ ...demoMcl, remainingViolation: e.target.value })} />
                    {renderError("remainingViolation")}
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={labelStyle}>Further Action / Next Step *</label>
                    <input type="text" style={inputStyle} value={demoMcl.furtherAction} onChange={e => setDemoMcl({ ...demoMcl, furtherAction: e.target.value })} />
                    {renderError("furtherAction")}
                  </div>
                </>
              )}
            </div>

            <hr style={{ border: "0", borderTop: "1px solid var(--border)", margin: "24px 0" }} />

            <h4 style={{ margin: "0 0 16px", fontSize: "14px", fontWeight: 600 }}>Cost Recovery</h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
              <div>
                <label style={labelStyle}>Cost Recovery Applicable?</label>
                <select style={inputStyle} value={demoMcl.costRecovery} onChange={e => setDemoMcl({ ...demoMcl, costRecovery: e.target.value as YesNo })}>
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </div>

              {demoMcl.costRecovery === "yes" && (
                <>
                  <div>
                    <label style={labelStyle}>Demolition Cost (₹)</label>
                    <input type="number" style={inputStyle} value={demoMcl.demolitionCost} onChange={e => setDemoMcl({ ...demoMcl, demolitionCost: e.target.value })} />
                  </div>
                  <div>
                    <label style={labelStyle}>Recovery Amount (₹)</label>
                    <input type="number" style={inputStyle} value={demoMcl.recoveryAmount} onChange={e => setDemoMcl({ ...demoMcl, recoveryAmount: e.target.value })} />
                  </div>
                  <div>
                    <label style={labelStyle}>Recovery Status</label>
                    <select style={inputStyle} value={demoMcl.recoveryStatus} onChange={e => setDemoMcl({ ...demoMcl, recoveryStatus: e.target.value })}>
                      <option value="">Select Status</option>
                      <option value="pending">Pending</option>
                      <option value="recovered">Recovered</option>
                    </select>
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={labelStyle}>Recovery Reference / Notes</label>
                    <input type="text" style={inputStyle} value={demoMcl.recoveryReference} onChange={e => setDemoMcl({ ...demoMcl, recoveryReference: e.target.value })} />
                  </div>
                </>
              )}
            </div>
          </section>
        )}

        {outcome === "appeal_stay" && (
          <section style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: "10px", padding: "24px 28px", marginBottom: "24px" }}>
            {appealStay.stayGranted === "yes" && (
              <div style={{ padding: "12px 16px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", color: "#991b1b", marginBottom: "20px", display: "flex", gap: "12px", alignItems: "center" }}>
                <Icon name="alert-circle" size={20} />
                <div style={{ fontWeight: 600, fontSize: "14px" }}>Demolition action is blocked while the stay is active.</div>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
              <div>
                <label style={labelStyle}>Appeal Filed?</label>
                <select style={inputStyle} value={appealStay.appealFiled} onChange={e => setAppealStay({ ...appealStay, appealFiled: e.target.value as YesNo })}>
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </div>

              {appealStay.appealFiled === "yes" && (
                <>
                  <div>
                    <label style={labelStyle}>Appeal Number</label>
                    <input type="text" style={inputStyle} value={appealStay.appealNumber} onChange={e => setAppealStay({ ...appealStay, appealNumber: e.target.value })} />
                  </div>
                  <div>
                    <label style={labelStyle}>Appeal Date</label>
                    <input type="date" style={inputStyle} value={appealStay.appealDate} onChange={e => setAppealStay({ ...appealStay, appealDate: e.target.value })} />
                  </div>
                  <div>
                    <label style={labelStyle}>Authority / Court</label>
                    <input type="text" style={inputStyle} value={appealStay.authority} onChange={e => setAppealStay({ ...appealStay, authority: e.target.value })} />
                  </div>
                </>
              )}
            </div>

            <hr style={{ border: "0", borderTop: "1px solid var(--border)", margin: "24px 0" }} />

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
              <div>
                <label style={labelStyle}>Stay Granted?</label>
                <select style={inputStyle} value={appealStay.stayGranted} onChange={e => setAppealStay({ ...appealStay, stayGranted: e.target.value as YesNo })}>
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </div>

              {appealStay.stayGranted === "yes" && (
                <>
                  <div>
                    <label style={labelStyle}>Stay Date</label>
                    <input type="date" style={inputStyle} value={appealStay.stayDate} onChange={e => setAppealStay({ ...appealStay, stayDate: e.target.value })} />
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={labelStyle}>Court / Authority Directions</label>
                    <textarea style={{ ...inputStyle, minHeight: "80px" }} value={appealStay.courtDirections} onChange={e => setAppealStay({ ...appealStay, courtDirections: e.target.value })} />
                  </div>
                </>
              )}
            </div>
          </section>
        )}

        {outcome === "further_action" && (
          <section style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: "10px", padding: "24px 28px", marginBottom: "24px" }}>
            <h3 style={{ margin: "0 0 16px", fontSize: "15px", fontWeight: 600 }}>Further Action Details</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Reason *</label>
                <input type="text" style={inputStyle} value={furtherAction.reason} onChange={e => setFurtherAction({ ...furtherAction, reason: e.target.value })} />
                {renderError("reason")}
              </div>
              <div>
                <label style={labelStyle}>Next Action *</label>
                <input type="text" style={inputStyle} value={furtherAction.nextAction} onChange={e => setFurtherAction({ ...furtherAction, nextAction: e.target.value })} />
                {renderError("nextAction")}
              </div>
              <div>
                <label style={labelStyle}>Expected Action Date</label>
                <input type="date" style={inputStyle} value={furtherAction.expectedActionDate} onChange={e => setFurtherAction({ ...furtherAction, expectedActionDate: e.target.value })} />
              </div>
            </div>
          </section>
        )}

        {/* ── COMMON SECTION (Evidence, Remarks, Submit) ── */}
        {outcome && (
          <section style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: "10px", padding: "24px 28px" }}>
            <h3 style={{ margin: "0 0 16px", fontSize: "15px", fontWeight: 600 }}>Supporting Evidence & Remarks</h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div>
                <label style={labelStyle}>Evidence / Document Upload {outcome !== 'appeal_stay' ? '*' : ''}</label>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "8px" }}>
                  <button type="button" onClick={() => fileInputRef.current?.click()} style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "8px 16px", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px", fontWeight: 600, color: "var(--ink)", cursor: "pointer" }}>
                    <Icon name="upload" size={16} /> Choose File
                  </button>
                  <button type="button" onClick={() => cameraInputRef.current?.click()} style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "8px 16px", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px", fontWeight: 600, color: "var(--ink)", cursor: "pointer" }}>
                    <Icon name="camera" size={16} /> Take Photo
                  </button>
                </div>

                <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: "none" }} accept="image/*,application/pdf" />
                <input type="file" ref={cameraInputRef} onChange={handleFileChange} style={{ display: "none" }} accept="image/*" capture="environment" />

                {evidencePhoto && (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "6px 12px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "13px", marginTop: "8px" }}>
                    <Icon name="file" size={14} color="#64748b" />
                    <span
                      style={{ cursor: "pointer", color: "#3b82f6", textDecoration: "underline" }}
                      onClick={() => {
                        const url = URL.createObjectURL(evidencePhoto);
                        window.open(url, "_blank");
                      }}
                    >
                      {evidencePhoto.name}
                    </span>
                    <button type="button" onClick={() => setEvidencePhoto(null)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: "4px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon name="close" size={14} />
                    </button>
                  </div>
                )}
                {renderError("evidencePhoto")}
              </div>

              <div>
                <label style={labelStyle}>Remarks {outcome !== 'appeal_stay' ? '*' : ''}</label>
                <textarea style={{ ...inputStyle, minHeight: "100px" }} placeholder="Enter any additional details or remarks..." value={remarks} onChange={e => { setRemarks(e.target.value); setFieldErrors(prev => ({ ...prev, remarks: "" })) }} />
                {renderError("remarks")}
              </div>

              {submitError && (
                <div style={{ padding: "12px", background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", borderRadius: "6px", fontSize: "13px", fontWeight: 500 }}>
                  {submitError}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "8px", borderTop: "1px solid var(--border)", paddingTop: "20px" }}>
                <button type="button" onClick={() => navigate?.("/cases")} style={{ padding: "10px 20px", background: "#fff", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px", fontWeight: 600, color: "var(--ink)", cursor: "pointer" }}>
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} style={{ padding: "10px 20px", background: "#3b82f6", border: "none", borderRadius: "6px", fontSize: "14px", fontWeight: 600, color: "#fff", cursor: isSubmitting ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
                  {isSubmitting ? "Saving..." : "Submit Action"}
                </button>
              </div>
            </div>
          </section>
        )}
      </form>
    </div>
  );
}
