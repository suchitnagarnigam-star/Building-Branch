import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import Icon from "../shared/components/Icon";
import type {
  ConstructionStatusType,
  CompoundableDetails,
  NonCompoundableDetails,
  ConstructionFormPayload,
} from "../types/construction";

type ConstructionStatusFormProps = {
  navigate?: (route: string) => void;
  onSubmitSuccess?: (payload: ConstructionFormPayload) => void;
  caseId?: string;
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
  assigned_bi_id?: string | null;
  assigned_bi_name?: string | null;
  assigned_atp_id?: string | null;
  assigned_atp_name?: string | null;
  current_status?: string;
  construction_status?: string | null;
};

const ASSESSMENT_STATUS_OPTIONS = ["Assessed", "Pending"];

function ConstructionStatusForm({ navigate, onSubmitSuccess, caseId: propCaseId }: ConstructionStatusFormProps) {
  // ── Target Case State ───────────────────────────────────────────────────────
  const [targetCaseId, setTargetCaseId] = useState(propCaseId || "");
  const [caseRecord, setCaseRecord] = useState<CaseRecord | null>(null);
  const [isLoadingCase, setIsLoadingCase] = useState(false);
  const [availableCases, setAvailableCases] = useState<CaseRecord[]>([]);

  useEffect(() => {
    if (propCaseId) {
      setTargetCaseId(propCaseId);
      fetchCaseDetails(propCaseId);
    } else {
      fetch("/api/cases")
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.cases)) {
            setAvailableCases(data.cases);
            if (data.cases.length > 0 && !targetCaseId) {
              setTargetCaseId(data.cases[0].case_id);
              fetchCaseDetails(data.cases[0].case_id);
            }
          }
        })
        .catch((e) => console.warn("Could not load case list", e));
    }
  }, [propCaseId]);

  const fetchCaseDetails = async (id: string) => {
    if (!id.trim()) return;
    setIsLoadingCase(true);
    try {
      const res = await fetch(`/api/cases/${encodeURIComponent(id.trim())}`);
      const data = await res.json();
      if (data.success && data.caseRecord) {
        setCaseRecord(data.caseRecord);
      }
    } catch (e) {
      console.warn("Could not load case details", e);
    } finally {
      setIsLoadingCase(false);
    }
  };

  // ── Optional Reply by Violator fields (rendered at end) ────────────────────
  const [replyByViolator, setReplyByViolator] = useState("");
  const [replyPhoto, setReplyPhoto] = useState<File | null>(null);

  // ── Construction Status details ─────────────────────────────────────────────
  const [status, setStatus] = useState<ConstructionStatusType>("");
  const [compoundable, setCompoundable] = useState<CompoundableDetails>({
    assessmentStatus: "",
    totalCharges: "",
    assessmentDate: "",
    receiptNumber: "",
    receiptDate: "",
    receiptPhoto: null,
  });
  const [nonCompoundable, setNonCompoundable] = useState<NonCompoundableDetails>({
    noticeNumber: "",
    noticeDate: "",
    noticePhoto: null,
  });

  // ── Form State ──────────────────────────────────────────────────────────────
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // ── Refs ────────────────────────────────────────────────────────────────────
  const replyPhotoInputRef = useRef<HTMLInputElement>(null);
  const replyPhotoCameraInputRef = useRef<HTMLInputElement>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);
  const receiptCameraInputRef = useRef<HTMLInputElement>(null);
  const noticeInputRef = useRef<HTMLInputElement>(null);
  const noticeCameraInputRef = useRef<HTMLInputElement>(null);

  const handleStatusChange = (newStatus: ConstructionStatusType) => {
    setStatus(newStatus);
    setSubmitError("");
    setFieldErrors({});
    setSubmitSuccess(false);
  };

  const handleCompoundableChange = (
    field: keyof CompoundableDetails,
    value: string | File | null,
  ) => {
    setCompoundable((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: "" }));
    setSubmitError("");
  };

  const handleNonCompoundableChange = (
    field: keyof NonCompoundableDetails,
    value: string | File | null,
  ) => {
    setNonCompoundable((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: "" }));
    setSubmitError("");
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    setSubmitError("");

    if (!status) {
      errors.status = "Status of Construction is required.";
      setFieldErrors(errors);
      setSubmitError("Please select the Status of Construction.");
      return false;
    }

    if (status === "compoundable" || status === "partly_compoundable") {
      if (!compoundable.assessmentStatus) {
        errors.assessmentStatus = "Status of Assessment is required.";
      } else if (compoundable.assessmentStatus === "Assessed") {
        if (!compoundable.totalCharges.trim()) {
          errors.totalCharges = "Total Charges is required.";
        }
        if (!compoundable.assessmentDate) {
          errors.assessmentDate = "Date of Assessment is required.";
        }
        if (!compoundable.receiptNumber.trim()) {
          errors.receiptNumber = "Receipt No. is required.";
        }
        if (!compoundable.receiptDate) {
          errors.receiptDate = "Receipt Date is required.";
        }
        if (!compoundable.receiptPhoto) {
          errors.receiptPhoto = "Photo of Receipt is required.";
        }
      }
    }

    if (status === "non_compoundable" || status === "partly_compoundable") {
      if (!nonCompoundable.noticeNumber.trim()) {
        errors.noticeNumber = "Notice No. is required.";
      }
      if (!nonCompoundable.noticeDate) {
        errors.noticeDate = "Date of Notice is required.";
      }
      if (!nonCompoundable.noticePhoto) {
        errors.noticePhoto = "Photo of Notice is required.";
      }
    }

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      if (status === "partly_compoundable") {
        setSubmitError(
          "Both Compoundable Part and Non-Compoundable Part are compulsory. Please complete all required fields in both sections.",
        );
      } else {
        setSubmitError("Please fill in all required fields marked with *.");
      }
      return false;
    }

    return true;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!targetCaseId.trim()) {
      setSubmitError("Case ID is required. Please select or specify a Case ID.");
      return;
    }
    if (!validate()) return;

    setIsSubmitting(true);
    setSubmitError("");

    try {
      const formData = new FormData();
      formData.append("status", status);

      if (status === "compoundable" || status === "partly_compoundable") {
        formData.append("assessmentStatus", compoundable.assessmentStatus);
        if (compoundable.assessmentStatus === "Assessed") {
          formData.append("totalCharges", compoundable.totalCharges);
          formData.append("assessmentDate", compoundable.assessmentDate);
          formData.append("receiptNumber", compoundable.receiptNumber);
          formData.append("receiptDate", compoundable.receiptDate);
          if (compoundable.receiptPhoto) {
            formData.append("receiptPhoto", compoundable.receiptPhoto);
          }
        }
      }

      if (status === "non_compoundable" || status === "partly_compoundable") {
        formData.append("noticeNumber", nonCompoundable.noticeNumber);
        formData.append("noticeDate", nonCompoundable.noticeDate);
        if (nonCompoundable.noticePhoto) {
          formData.append("noticePhoto", nonCompoundable.noticePhoto);
        }
      }

      if (replyByViolator.trim()) {
        formData.append("replyByViolator", replyByViolator.trim());
      }
      if (replyPhoto) {
        formData.append("replyPhoto", replyPhoto);
      }

      const response = await fetch(
        `/api/cases/${encodeURIComponent(targetCaseId.trim())}/construction-status`,
        {
          method: "POST",
          body: formData,
        }
      );

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to record construction status.");
      }

      setIsSubmitting(false);
      setSubmitSuccess(true);

      if (onSubmitSuccess) {
        let constStatusPayload;
        if (status === "compoundable") {
          constStatusPayload = { status: "compoundable" as const, compoundable };
        } else if (status === "non_compoundable") {
          constStatusPayload = { status: "non_compoundable" as const, nonCompoundable };
        } else {
          constStatusPayload = { status: "partly_compoundable" as const, compoundable, nonCompoundable };
        }
        onSubmitSuccess({
          replyByViolator: replyByViolator.trim() || undefined,
          replyPhoto,
          constructionStatus: constStatusPayload,
        });
      }
    } catch (err) {
      setIsSubmitting(false);
      setSubmitError(err instanceof Error ? err.message : "Submission failed. Please check network connection.");
    }
  };

  const renderCompoundableFields = (sectionNumber: string, sectionLabel?: string) => {
    const isAssessed = compoundable.assessmentStatus === "Assessed";

    return (
      <section className="inspection-card">
        <div className="inspection-card__header">
          <span className="inspection-card__number">{sectionNumber}</span>
          <div>
            <h2>{sectionLabel ?? "Compoundable Details"}</h2>
          </div>
        </div>
        <div className="inspection-grid">
          <div className="form-field">
            <label htmlFor="assessmentStatus">
              Status of Assessment <span>*</span>
            </label>
            <select
              id="assessmentStatus"
              required
              value={compoundable.assessmentStatus}
              onChange={(e) => handleCompoundableChange("assessmentStatus", e.target.value)}
            >
              <option value="">Select status of assessment</option>
              {ASSESSMENT_STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            {fieldErrors.assessmentStatus && (
              <small className="field-error">{fieldErrors.assessmentStatus}</small>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="totalCharges">
              Total Charges {isAssessed ? <span>*</span> : <em>Optional</em>}
            </label>
            <input
              id="totalCharges"
              type="number"
              min="0"
              step="any"
              required={isAssessed}
              value={compoundable.totalCharges}
              onChange={(e) => handleCompoundableChange("totalCharges", e.target.value)}
              placeholder="Enter charge amount"
            />
            {fieldErrors.totalCharges && (
              <small className="field-error">{fieldErrors.totalCharges}</small>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="assessmentDate">
              Date of Assessment {isAssessed ? <span>*</span> : <em>Optional</em>}
            </label>
            <input
              id="assessmentDate"
              type="date"
              required={isAssessed}
              value={compoundable.assessmentDate}
              onChange={(e) => handleCompoundableChange("assessmentDate", e.target.value)}
            />
            {fieldErrors.assessmentDate && (
              <small className="field-error">{fieldErrors.assessmentDate}</small>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="receiptNumber">
              Receipt No. {isAssessed ? <span>*</span> : <em>Optional</em>}
            </label>
            <input
              id="receiptNumber"
              type="text"
              required={isAssessed}
              value={compoundable.receiptNumber}
              onChange={(e) => handleCompoundableChange("receiptNumber", e.target.value)}
              placeholder="Enter receipt number"
            />
            {fieldErrors.receiptNumber && (
              <small className="field-error">{fieldErrors.receiptNumber}</small>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="receiptDate">
              Receipt Date {isAssessed ? <span>*</span> : <em>Optional</em>}
            </label>
            <input
              id="receiptDate"
              type="date"
              required={isAssessed}
              value={compoundable.receiptDate}
              onChange={(e) => handleCompoundableChange("receiptDate", e.target.value)}
            />
            {fieldErrors.receiptDate && (
              <small className="field-error">{fieldErrors.receiptDate}</small>
            )}
          </div>

          <div className="form-field form-field--full">
            <label>
              Photo of Receipt {isAssessed ? <span>*</span> : <em>Optional</em>}
            </label>
            <div className={`notice-upload ${compoundable.receiptPhoto ? "notice-upload--success" : ""}`}>
              <Icon name={compoundable.receiptPhoto ? "check-circle" : "upload"} />
              <span>{compoundable.receiptPhoto ? compoundable.receiptPhoto.name : "Upload or capture receipt photo"}</span>
              <div className="notice-upload__actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => receiptCameraInputRef.current?.click()}
                >
                  <Icon name="camera" /> Camera
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => receiptInputRef.current?.click()}
                >
                  Choose File
                </button>
              </div>
              <input
                ref={receiptCameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  const file = e.target.files?.[0] ?? null;
                  handleCompoundableChange("receiptPhoto", file);
                }}
              />
              <input
                ref={receiptInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  const file = e.target.files?.[0] ?? null;
                  handleCompoundableChange("receiptPhoto", file);
                }}
              />
            </div>
            {fieldErrors.receiptPhoto && (
              <small className="field-error">{fieldErrors.receiptPhoto}</small>
            )}
          </div>
        </div>
      </section>
    );
  };

  const renderNonCompoundableFields = (sectionNumber: string, sectionLabel?: string) => (
    <section className="inspection-card">
      <div className="inspection-card__header">
        <span className="inspection-card__number">{sectionNumber}</span>
        <div>
          <h2>{sectionLabel ?? "Non-Compoundable Details"}</h2>
        </div>
      </div>
      <div className="inspection-grid">
        <div className="form-field">
          <label htmlFor="noticeNumber">
            Notice No. <span>*</span>
          </label>
          <input
            id="noticeNumber"
            type="text"
            required
            value={nonCompoundable.noticeNumber}
            onChange={(e) => handleNonCompoundableChange("noticeNumber", e.target.value)}
            placeholder="Enter notice number"
          />
          {fieldErrors.noticeNumber && (
            <small className="field-error">{fieldErrors.noticeNumber}</small>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="noticeDate">
            Date of Notice <span>*</span>
          </label>
          <input
            id="noticeDate"
            type="date"
            required
            value={nonCompoundable.noticeDate}
            onChange={(e) => handleNonCompoundableChange("noticeDate", e.target.value)}
          />
          {fieldErrors.noticeDate && (
            <small className="field-error">{fieldErrors.noticeDate}</small>
          )}
        </div>

        <div className="form-field form-field--full">
          <label>
            Photo of Notice <span>*</span>
          </label>
          <div className={`notice-upload ${nonCompoundable.noticePhoto ? "notice-upload--success" : ""}`}>
            <Icon name={nonCompoundable.noticePhoto ? "check-circle" : "upload"} />
            <span>{nonCompoundable.noticePhoto ? nonCompoundable.noticePhoto.name : "Upload or capture notice photo"}</span>
            <div className="notice-upload__actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => noticeCameraInputRef.current?.click()}
              >
                <Icon name="camera" /> Camera
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => noticeInputRef.current?.click()}
              >
                Choose File
              </button>
            </div>
            <input
              ref={noticeCameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                const file = e.target.files?.[0] ?? null;
                handleNonCompoundableChange("noticePhoto", file);
              }}
            />
            <input
              ref={noticeInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                const file = e.target.files?.[0] ?? null;
                handleNonCompoundableChange("noticePhoto", file);
              }}
            />
          </div>
          {fieldErrors.noticePhoto && (
            <small className="field-error">{fieldErrors.noticePhoto}</small>
          )}
        </div>
      </div>
    </section>
  );

  const renderReplyByViolatorFields = (sectionNumber: string) => (
    <section className="inspection-card">
      <div className="inspection-card__header">
        <span className="inspection-card__number">{sectionNumber}</span>
        <div>
          <h2>Reply by Violator <em>Optional</em></h2>
        </div>
      </div>
      <div className="inspection-grid">
        <div className="form-field form-field--full">
          <label htmlFor="replyByViolator">
            Reply / Description <em>Optional</em>
          </label>
          <textarea
            id="replyByViolator"
            rows={3}
            value={replyByViolator}
            onChange={(e) => setReplyByViolator(e.target.value)}
            placeholder="Enter violator's reply or response details if available"
          />
        </div>

        <div className="form-field form-field--full">
          <label>
            Photo of Reply by Violator <em>Optional</em>
          </label>
          <div className={`notice-upload ${replyPhoto ? "notice-upload--success" : ""}`}>
            <Icon name={replyPhoto ? "check-circle" : "upload"} />
            <span>{replyPhoto ? replyPhoto.name : "Upload or capture reply photo"}</span>
            <div className="notice-upload__actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => replyPhotoCameraInputRef.current?.click()}
              >
                <Icon name="camera" /> Camera
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => replyPhotoInputRef.current?.click()}
              >
                Choose File
              </button>
            </div>
            <input
              ref={replyPhotoCameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                const file = e.target.files?.[0] ?? null;
                setReplyPhoto(file);
              }}
            />
            <input
              ref={replyPhotoInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                const file = e.target.files?.[0] ?? null;
                setReplyPhoto(file);
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );

  const isFormActive = Boolean(status);

  if (submitSuccess) {
    return (
      <div className="field-inspection-page">
        <div className="field-inspection-form compact-form">
          <section className="inspection-card" style={{ textAlign: "center", padding: "48px 24px" }}>
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: "#dcfce7",
                color: "#16a34a",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "28px",
                margin: "0 auto 16px",
              }}
            >
              ✓
            </div>
            <h2 style={{ fontSize: "22px", margin: "0 0 8px", color: "var(--text-primary)" }}>
              Construction Status Recorded
            </h2>
            <p style={{ color: "var(--muted)", margin: "0 0 24px", fontSize: "14px" }}>
              Case <strong>{targetCaseId}</strong> has been updated with{" "}
              <strong style={{ textTransform: "capitalize" }}>{status.replace("_", " ")}</strong> construction details.
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
              {navigate && (
                <>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => navigate(`/cases/${encodeURIComponent(targetCaseId.trim())}`)}
                  >
                    <Icon name="eye" /> View Case Details
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => navigate("/cases")}
                  >
                    <Icon name="list" /> Enforcement Cases
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => navigate("/field-inspection")}
                  >
                    <Icon name="arrow" /> Field Inspection
                  </button>
                </>
              )}
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="field-inspection-page">
      <div className="field-inspection-page__intro" style={{ marginBottom: "18px" }}>
        <div>
          <p className="eyebrow" style={{ textTransform: "uppercase", fontSize: "11px", letterSpacing: "0.08em", color: "var(--accent)" }}>
            Statutory Field Operations
          </p>
          <h1 style={{ margin: "4px 0 6px", fontSize: "24px" }}>
            Construction Status Assessment
          </h1>
          <p style={{ color: "var(--muted)", fontSize: "13px", margin: 0 }}>
            Assess compoundable fee compliance, record Section 269 notices, and file violator replies.
          </p>
        </div>
        {caseRecord && (
          <div className="field-inspection-page__status">
            <span></span>
            Case: {caseRecord.case_id}
          </div>
        )}
      </div>

      {/* ── CASE INFORMATION & SELECTION CARD ── */}
      <section className="inspection-card" style={{ marginBottom: "16px" }}>
        <div className="inspection-card__header">
          <span className="inspection-card__number">
            <Icon name="folder" />
          </span>
          <div>
            <h2>Target Case Information</h2>
          </div>
        </div>

        {propCaseId ? (
          <div className="inspection-grid">
            <div className="form-field">
              <label>Case ID</label>
              <div style={{ fontWeight: 700, fontSize: "15px", color: "var(--accent)" }}>
                {targetCaseId}
              </div>
            </div>
            <div className="form-field">
              <label>Current Status</label>
              <div>
                <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: "12px", background: "var(--accent-light, #e0f2fe)", color: "var(--accent, #0284c7)", fontWeight: 600, fontSize: "12px" }}>
                  {caseRecord?.current_status || "Open"}
                </span>
              </div>
            </div>
            {caseRecord && (
              <>
                <div className="form-field">
                  <label>Location & Zone</label>
                  <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                    {caseRecord.location || "Ludhiana"} ({caseRecord.zone || "Zone A"}, {caseRecord.block || "Block"})
                  </div>
                </div>
                <div className="form-field">
                  <label>Assigned Officer</label>
                  <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                    {caseRecord.assigned_bi_name || "Sonia Mehta (BI)"}
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="inspection-grid">
            <div className="form-field form-field--full">
              <label htmlFor="caseSelect">Target Case ID <span>*</span></label>
              <div style={{ display: "flex", gap: "8px" }}>
                {availableCases.length > 0 ? (
                  <select
                    id="caseSelect"
                    value={targetCaseId}
                    onChange={(e) => {
                      setTargetCaseId(e.target.value);
                      fetchCaseDetails(e.target.value);
                    }}
                    style={{ flex: 1 }}
                  >
                    <option value="">-- Choose an Existing Case --</option>
                    {availableCases.map((c) => (
                      <option key={c.case_id} value={c.case_id}>
                        {c.case_id} — {c.location || "Ludhiana"} ({c.current_status})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="Enter Case ID e.g. CASE-F689612E08BB"
                    value={targetCaseId}
                    onChange={(e) => setTargetCaseId(e.target.value)}
                    style={{ flex: 1 }}
                  />
                )}
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => fetchCaseDetails(targetCaseId)}
                  disabled={isLoadingCase}
                >
                  {isLoadingCase ? "Loading..." : "Load Case"}
                </button>
              </div>
            </div>
            {caseRecord && (
              <div className="form-field form-field--full" style={{ background: "rgba(0,0,0,0.03)", padding: "10px 14px", borderRadius: "8px" }}>
                <div style={{ fontSize: "13px", display: "flex", gap: "24px", flexWrap: "wrap" }}>
                  <div><strong>Location:</strong> {caseRecord.location || "N/A"}</div>
                  <div><strong>Zone:</strong> {caseRecord.zone || "Zone A"}</div>
                  <div><strong>Status:</strong> {caseRecord.current_status || "Open"}</div>
                  <div><strong>Assigned BI:</strong> {caseRecord.assigned_bi_name || "Sonia Mehta"}</div>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <form className="field-inspection-form compact-form" onSubmit={handleSubmit} noValidate>
        {/* ── SECTION 01: STATUS OF CONSTRUCTION ── */}
        <section className="inspection-card">
          <div className="inspection-card__header">
            <span className="inspection-card__number">01</span>
            <div>
              <h2>Construction Status</h2>
            </div>
          </div>
          <div className="inspection-grid">
            <div className="form-field form-field--full">
              <label htmlFor="statusSelect">
                Status of Construction <span>*</span>
              </label>
              <select
                id="statusSelect"
                required
                value={status}
                onChange={(e) => handleStatusChange(e.target.value as ConstructionStatusType)}
              >
                <option value="">Select Status</option>
                <option value="compoundable">Compoundable</option>
                <option value="partly_compoundable">Partly Compoundable</option>
                <option value="non_compoundable">Non-Compoundable</option>
              </select>
              {fieldErrors.status && <small className="field-error">{fieldErrors.status}</small>}
            </div>
          </div>
        </section>

        {/* ── DETAILS SECTIONS BASED ON CONSTRUCTION STATUS ── */}
        {status === "compoundable" && (
          <>
            {renderCompoundableFields("02", "Compoundable Details")}
            {renderReplyByViolatorFields("03")}
          </>
        )}

        {status === "non_compoundable" && (
          <>
            {renderNonCompoundableFields("02", "Non-Compoundable Details")}
            {renderReplyByViolatorFields("03")}
          </>
        )}

        {status === "partly_compoundable" && (
          <>
            {renderCompoundableFields("02", "SECTION A — Compoundable Part")}
            {renderNonCompoundableFields("03", "SECTION B — Non-Compoundable Part")}
            {renderReplyByViolatorFields("04")}
          </>
        )}

        {submitSuccess && (
          <div
            className="field-success"
            style={{
              padding: "12px 16px",
              borderRadius: "8px",
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              color: "#166534",
            }}
          >
            Construction status recorded successfully.
          </div>
        )}

        {/* ── SUBMIT / CANCEL ACTIONS BAR (HIDDEN UNTIL STATUS IS CHOSEN) ── */}
        {isFormActive && (
          <div className="inspection-actions">
            {submitError && (
              <div className="field-error" role="alert" style={{ marginRight: "auto", fontSize: "13px" }}>
                {submitError}
              </div>
            )}

            {navigate && (
              <button
                type="button"
                className="secondary-button"
                onClick={() => navigate(targetCaseId ? `/cases/${encodeURIComponent(targetCaseId)}` : "/cases")}
                disabled={isSubmitting}
              >
                Cancel
              </button>
            )}

            <button type="submit" className="primary-button" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit"}
              {!isSubmitting && <Icon name="arrow" />}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}

export default ConstructionStatusForm;

