import { useRef, useState } from "react";
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
};

const ASSESSMENT_STATUS_OPTIONS = ["Assessed", "Pending"];

function ConstructionStatusForm({ navigate, onSubmitSuccess }: ConstructionStatusFormProps) {
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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);

    let constStatusPayload;
    if (status === "compoundable") {
      constStatusPayload = { status: "compoundable" as const, compoundable };
    } else if (status === "non_compoundable") {
      constStatusPayload = { status: "non_compoundable" as const, nonCompoundable };
    } else {
      constStatusPayload = { status: "partly_compoundable" as const, compoundable, nonCompoundable };
    }

    const payload: ConstructionFormPayload = {
      replyByViolator: replyByViolator.trim() || undefined,
      replyPhoto,
      constructionStatus: constStatusPayload,
    };

    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitSuccess(true);
      if (onSubmitSuccess) {
        onSubmitSuccess(payload);
      }
    }, 400);
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

  return (
    <div className="field-inspection-page">
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
                onClick={() => navigate("/dashboard")}
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

