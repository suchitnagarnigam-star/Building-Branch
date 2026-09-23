import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import Icon from "../shared/components/Icon";
import ConstructionStatusDropdown, {type PartlyCompoundableType,} from "../shared/components/ConstructionStatusDropdown";
import type { ConstructionStatusType, CompoundableDetails, NonCompoundableDetails, ConstructionFormPayload,} from "../types/construction";

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
  const [typedId, setTypedId] = useState("");
  const [caseRecord, setCaseRecord] = useState<CaseRecord | null>(null);
  const [caseError, setCaseError] = useState("");
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
          }
        })
        .catch((e) => console.warn("Could not load case list", e));
    }
  }, [propCaseId]);

  const fetchCaseDetails = async (id: string) => {
    const cleanId = id.trim();
    if (!cleanId) {
      setCaseRecord(null);
      setCaseError("");
      setStatus("");
      setCompoundableType("full");
      setCompoundable({
        assessmentStatus: "",
        totalCharges: "",
        assessmentDate: "",
        receiptNumber: "",
        receiptDate: "",
        receiptPhoto: null,
      });
      setNonCompoundable({
        noticeNumber: "",
        noticeDate: "",
        noticePhoto: null,
      });
      return;
    }
    setIsLoadingCase(true);
    setCaseError("");
    try {
      const res = await fetch(`/api/cases/${encodeURIComponent(cleanId)}`);
      const data = await res.json();
      if (data.success && data.caseRecord) {
        setCaseRecord(data.caseRecord);
        setTargetCaseId(data.caseRecord.case_id);
        // Initialize form state from case record construction status
        const constStatus = data.caseRecord.construction_status;
        setStatus(constStatus || "");

        // Prefill section details if available
        if (data.compoundable) {
          setCompoundable({
            assessmentStatus: data.compoundable.assessmentStatus === "assessed" ? "Assessed" : (data.compoundable.assessmentStatus || ""),
            totalCharges: data.compoundable.totalCharges ? String(data.compoundable.totalCharges) : "",
            assessmentDate: data.compoundable.assessmentDate ? data.compoundable.assessmentDate.split("T")[0] : "",
            receiptNumber: data.compoundable.receiptNumber || "",
            receiptDate: data.compoundable.receiptDate ? data.compoundable.receiptDate.split("T")[0] : "",
            receiptPhoto: null,
          });
        }
        if (data.notices && data.notices.length > 0) {
          const sec269 = data.notices.find((n: any) => n.notice_type === "269" || n.notice_type === "SECTION_269");
          if (sec269) {
            setNonCompoundable({
              noticeNumber: sec269.notice_number || "",
              noticeDate: sec269.issued_at ? sec269.issued_at.split("T")[0] : "",
              noticePhoto: null,
            });
          }
        }

        const compDone = data.compoundable?.partStatus === "completed";
        const nonCompDone = data.nonCompoundable?.partStatus === "completed";

        let receiptNo = data.compoundable?.receiptNumber || "";
        let noticeNo = "";
        if (data.notices && data.notices.length > 0) {
          const sec269 = data.notices.find((n: any) => n.notice_type === "269" || n.notice_type === "SECTION_269");
          if (sec269) noticeNo = sec269.notice_number || "";
        }

        setCasePartsState({
          compoundableDone: compDone,
          nonCompoundableDone: nonCompDone,
          compoundableReceipt: receiptNo,
          nonCompoundableNotice: noticeNo,
        });

        // Initialize compoundableType based on completed sections
        if (constStatus === "partly_compoundable") {
          if (compDone && !nonCompDone) {
            setCompoundableType("non_compoundable");
          } else if (nonCompDone && !compDone) {
            setCompoundableType("compoundable");
          } else {
            setCompoundableType("full");
          }
        } else if (constStatus === "compoundable") {
          setCompoundableType("compoundable");
        } else if (constStatus === "non_compoundable") {
          setCompoundableType("non_compoundable");
        }
      } else {
        setCaseRecord(null);
        setCaseError(data.message || `No case found matching "${cleanId}". Please check the Case or Complaint ID.`);
        setStatus("");
        setCompoundableType("full");
        setCompoundable({
          assessmentStatus: "",
          totalCharges: "",
          assessmentDate: "",
          receiptNumber: "",
          receiptDate: "",
          receiptPhoto: null,
        });
        setNonCompoundable({
          noticeNumber: "",
          noticeDate: "",
          noticePhoto: null,
        });
      }
    } catch (e) {
      console.warn("Could not load case details", e);
      setCaseRecord(null);
      setCaseError("Could not load case details. Please try again.");
      setStatus("");
      setCompoundableType("full");
      setCompoundable({
        assessmentStatus: "",
        totalCharges: "",
        assessmentDate: "",
        receiptNumber: "",
        receiptDate: "",
        receiptPhoto: null,
      });
      setNonCompoundable({
        noticeNumber: "",
        noticeDate: "",
        noticePhoto: null,
      });
    } finally {
      setIsLoadingCase(false);
    }
  };

  // ── Optional Reply by Violator fields (rendered at end) ────────────────────
  const [replyByViolator, setReplyByViolator] = useState("");
  const [replyPhoto, setReplyPhoto] = useState<File | null>(null);

  // ── Construction Status details ─────────────────────────────────────────────
  const [status, setStatus] = useState<ConstructionStatusType>("");
  const [isOpen, setIsOpen] = useState(false);
  const [compoundableType, setCompoundableType] = useState<PartlyCompoundableType>("full");
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
  const [casePartsState, setCasePartsState] = useState<{
    compoundableDone: boolean;
    nonCompoundableDone: boolean;
    compoundableReceipt?: string;
    nonCompoundableNotice?: string;
  }>({ compoundableDone: false, nonCompoundableDone: false });

  // ── Form State ──────────────────────────────────────────────────────────────
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({
    compoundableType: "",
  });
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

    if (newStatus === "partly_compoundable") {
      setCompoundableType("full");
    } 
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

  const needsCompoundable =
    status === "compoundable" ||
    (status === "partly_compoundable" &&
      (compoundableType === "full" ||
        compoundableType === "compoundable"));

  const needsNonCompoundable =
    status === "non_compoundable" ||
    (status === "partly_compoundable" &&
      (compoundableType === "full" ||
        compoundableType === "non_compoundable"));

  if (
    status === "partly_compoundable" &&
    !compoundableType
  ) {
    errors.compoundableType =
      "Please select a Partly Compoundable type.";
  }

  if (needsCompoundable) {
    if (!compoundable.assessmentStatus) {
      errors.assessmentStatus =
        "Status of Assessment is required.";
    } else if (compoundable.assessmentStatus === "Assessed") {
      if (!compoundable.totalCharges.trim()) {
        errors.totalCharges = "Total Charges is required.";
      }

      if (!compoundable.assessmentDate) {
        errors.assessmentDate =
          "Date of Assessment is required.";
      }

      if (!compoundable.receiptNumber.trim()) {
        errors.receiptNumber =
          "Receipt No. is required.";
      }

      if (!compoundable.receiptDate) {
        errors.receiptDate =
          "Receipt Date is required.";
      }

      if (!compoundable.receiptPhoto) {
        errors.receiptPhoto =
          "Photo of Receipt is required.";
      }
    }
  }

  if (needsNonCompoundable) {
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
    setSubmitError(
      "Please fill in all required fields marked with *.",
    );
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
      formData.append("compoundableType", compoundableType);

const needsCompoundable =
  status === "compoundable" ||
  (status === "partly_compoundable" &&
    (compoundableType === "full" ||
      compoundableType === "compoundable"));

const needsNonCompoundable =
  status === "non_compoundable" ||
  (status === "partly_compoundable" &&
    (compoundableType === "full" ||
      compoundableType === "non_compoundable"));

if (needsCompoundable) {
  formData.append(
    "assessmentStatus",
    compoundable.assessmentStatus,
  );

  if (compoundable.assessmentStatus === "Assessed") {
    formData.append(
      "totalCharges",
      compoundable.totalCharges,
    );

    formData.append(
      "assessmentDate",
      compoundable.assessmentDate,
    );

    formData.append(
      "receiptNumber",
      compoundable.receiptNumber,
    );

    formData.append(
      "receiptDate",
      compoundable.receiptDate,
    );

    if (compoundable.receiptPhoto) {
      formData.append(
        "receiptPhoto",
        compoundable.receiptPhoto,
      );
    }
  }
}

if (needsNonCompoundable) {
  formData.append(
    "noticeNumber",
    nonCompoundable.noticeNumber,
  );

  formData.append(
    "noticeDate",
    nonCompoundable.noticeDate,
  );

  if (nonCompoundable.noticePhoto) {
    formData.append(
      "noticePhoto",
      nonCompoundable.noticePhoto,
    );
  }
}

      if (replyByViolator.trim()) {
        formData.append("replyByViolator", replyByViolator.trim());
      }
      if (replyPhoto) {
        formData.append("replyPhoto", replyPhoto);
      }

      if (caseRecord?.assigned_bi_id) {
        formData.append("officerId", caseRecord.assigned_bi_id as string);
      }
      if (caseRecord?.assigned_bi_name) {
        formData.append("officerName", caseRecord.assigned_bi_name as string);
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
          constStatusPayload = { status: "partly_compoundable" as const, compoundable, nonCompoundable, compoundableType };
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
                    className="primary-button"
                    onClick={() => navigate("/cases")}
                  >
                    <Icon name="list" /> Enforcement Cases
                  </button>
                  <button
                    type="button"
                    className="primary-button"
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
              <label htmlFor="caseSelect">Target Case / Complaint ID <span>*</span></label>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                {availableCases.length > 0 && (
                  <select
                    id="caseSelect"
                    value={targetCaseId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTargetCaseId(val);
                      setTypedId("");
                      if (val) fetchCaseDetails(val);
                      else setCaseRecord(null);
                    }}
                    style={{ flex: "1 1 340px", minWidth: "260px" }}
                  >
                    <option value="">-- Choose an Existing Case or enter Complaint ID --</option>
                    {availableCases.map((c) => (
                      <option key={c.case_id} value={c.case_id}>
                        {c.case_id} — {c.location || "Ludhiana"} ({c.current_status})
                      </option>
                    ))}
                  </select>
                )}

                <div style={{ display: "flex", gap: "8px", flex: "1 1 240px", minWidth: "220px" }}>
                  <input
                    type="text"
                    placeholder="Or enter Complaint / Case ID..."
                    value={typedId}
                    onChange={(e) => setTypedId(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (typedId.trim()) fetchCaseDetails(typedId);
                      }
                    }}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => {
                      const idToFetch = typedId.trim() || targetCaseId.trim();
                      if (idToFetch) fetchCaseDetails(idToFetch);
                    }}
                    disabled={isLoadingCase || (!typedId.trim() && !targetCaseId.trim())}
                  >
                    {isLoadingCase ? "Loading..." : "Load Case"}
                  </button>
                </div>
              </div>
              {caseError && (
                <small className="field-error" style={{ marginTop: "6px", display: "block" }}>
                  {caseError}
                </small>
              )}
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
              <ConstructionStatusDropdown
                selectedStatus={status}
                onStatusChange={handleStatusChange}
                selectedPartlyType={compoundableType}
                onPartlyTypeChange={(type) =>{
                  setCompoundableType(type);
                  setSubmitError("");
                  setSubmitSuccess(false);
                }}
                isOpen={isOpen}
                onOpenChange={setIsOpen}
              />
              {fieldErrors.status && <small className="field-error">{fieldErrors.status}</small>}

              {status === "partly_compoundable" && casePartsState.compoundableDone && !casePartsState.nonCompoundableDone && (
                <div style={{ marginTop: "12px", padding: "10px 14px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", fontSize: "13px", color: "#166534", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ display: "inline-flex", width: "16px", height: "16px", flexShrink: 0, alignItems: "center", justifyContent: "center" }}>
                    <Icon name="check-circle" />
                  </span>
                  <span>
                    <strong>Compoundable Section Completed ✓</strong>
                    {casePartsState.compoundableReceipt ? ` (Receipt #${casePartsState.compoundableReceipt})` : ""}. Section B (Non-Compoundable Details) is pending. The form below is auto-selected for Section B.
                  </span>
                </div>
              )}

              {status === "partly_compoundable" && casePartsState.nonCompoundableDone && !casePartsState.compoundableDone && (
                <div style={{ marginTop: "12px", padding: "10px 14px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", fontSize: "13px", color: "#166534", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ display: "inline-flex", width: "16px", height: "16px", flexShrink: 0, alignItems: "center", justifyContent: "center" }}>
                    <Icon name="check-circle" />
                  </span>
                  <span>
                    <strong>Non-Compoundable Section Completed ✓</strong>
                    {casePartsState.nonCompoundableNotice ? ` (Section 269 Notice #${casePartsState.nonCompoundableNotice})` : ""}. Section A (Compoundable Details) is pending. The form below is auto-selected for Section A.
                  </span>
                </div>
              )}

              {status === "partly_compoundable" && casePartsState.compoundableDone && casePartsState.nonCompoundableDone && (
                <div style={{ marginTop: "12px", padding: "10px 14px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", fontSize: "13px", color: "#166534", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ display: "inline-flex", width: "16px", height: "16px", flexShrink: 0, alignItems: "center", justifyContent: "center" }}>
                    <Icon name="check-circle" />
                  </span>
                  <span>
                    <strong>Both Compoundable and Non-Compoundable Sections Completed ✓</strong>.
                  </span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── DETAILS SECTIONS BASED ON CONSTRUCTION STATUS AND TYPE ── */}
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
            {/* ── DETAILS SECTIONS BASED ON CONSTRUCTION TYPE ── */}
            {compoundableType === "full" && (
              <>
                {renderCompoundableFields("02", "SECTION A — Compoundable Part")}
                {renderNonCompoundableFields("03", "SECTION B — Non-Compoundable Part")}
                {renderReplyByViolatorFields("04")}
              </>
            )}

            {compoundableType === "compoundable" && (
              <>
                {renderCompoundableFields("02", "SECTION A — Compoundable Part")}
                {renderReplyByViolatorFields("03")}
              </>
            )}

            {compoundableType === "non_compoundable" && (
              <>
                {renderNonCompoundableFields("02", "SECTION B — Non-Compoundable Part")}
                {renderReplyByViolatorFields("03")}
              </>
            )}
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

