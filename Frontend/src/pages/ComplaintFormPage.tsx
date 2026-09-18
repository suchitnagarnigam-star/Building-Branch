import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, DragEvent, FormEvent } from "react";
import type { ComplaintFormData } from "../types/complaint";
import { locationData, zoneForBlock } from "../data/locationData";
import {
  submitComplaint,
  processExternalSource,
  extractComplaintFromSource,
  writeExtractedComplaint,
  writePendingExternalFiles,
} from "../services/complaintApi";
import Icon from "../shared/components/Icon";

type ComplaintFormPageProps = {
  navigate?: (route: string) => void;
  setSelectedComplaintId?: (id: string) => void;
  initialFormData?: ComplaintFormData;
  initialSourceFiles?: File[];
  isDocumentReview?: boolean;
};

type FormErrors = Partial<Record<keyof ComplaintFormData | "complaintImage", string>>;

type UploadedFile = {
  file: File;
  name: string;
  size: number;
  preview: string | null;
};

type SourceType = "news" | "email" | "other";

// ── Accepted formats ─────────────────────────────────────────────────────────
const IMAGE_TYPES   = ["image/jpeg", "image/png"];
const SOURCE_TYPES  = ["image/jpeg", "image/png", "application/pdf"];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const initialFormData: ComplaintFormData = {
  citizenName: "",
  phoneNumber: "",
  zone: "",
  block: "",
  ward: "",
  address: "",
  title: "",
  description: "",
};

function ComplaintFormPage({
  navigate,
  setSelectedComplaintId,
  initialFormData: prefilledFormData,
  initialSourceFiles = [],
  isDocumentReview = false,
}: ComplaintFormPageProps = {}) {
  const [formData, setFormData] = useState<ComplaintFormData>(
    prefilledFormData ?? initialFormData,
  );
  const [errors, setErrors]     = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingSource, setIsProcessingSource] = useState(false);

  // ── Complaint image evidence ─────────────────────────────────────────────
  const [complaintImages, setComplaintImages]     = useState<UploadedFile[]>([]);
  const [previewImage, setPreviewImage]           = useState<UploadedFile | null>(null);
  const [imageError, setImageError]               = useState("");
  const [isImageDragOver, setIsImageDragOver]     = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // ── External source upload (OR section) ──────────────────────────────────
  const [sourceType]                              = useState<SourceType>("news");
  const [sourceFiles, setSourceFiles]             = useState<UploadedFile[]>(
    () => initialSourceFiles.map((file) => ({
      file,
      name: file.name,
      size: file.size,
      preview: null,
    })),
  );
  const [previewSourceFile, setPreviewSourceFile] = useState<UploadedFile | null>(null);
  const [sourceFileError, setSourceFileError]     = useState("");
  const [isSourceDragOver, setIsSourceDragOver]   = useState(false);
  const sourceFileInputRef = useRef<HTMLInputElement>(null);
  const [isDocumentProcessed, setIsDocumentProcessed] = useState(false);

  useEffect(() => {
    if (initialSourceFiles.length === 0) return;

    const previewUrls = initialSourceFiles
      .filter((file) => file.type.startsWith("image/") || file.type === "application/pdf")
      .map((file) => ({ file, preview: URL.createObjectURL(file) }));

    const updateTimer = window.setTimeout(() => {
      setSourceFiles((current) => current.map((item) => ({
        ...item,
        preview: previewUrls.find((entry) => entry.file === item.file)?.preview ?? null,
      })));
    }, 0);

    return () => {
      window.clearTimeout(updateTimer);
      previewUrls.forEach(({ preview }) => URL.revokeObjectURL(preview));
    };
  }, [initialSourceFiles]);

  // ── Form field handlers ───────────────────────────────────────────────────

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    setSubmitError("");

    setFormData((prev) => {
      if (name === "block") {
        return { ...prev, block: value, zone: zoneForBlock(value) || prev.zone };
      }
      if (name === "zone") {
        const selectedBlock = locationData.find(
          (entry) => entry.zone === value && entry.block === prev.block,
        )?.block;
        return { ...prev, zone: value, block: selectedBlock ? prev.block : "" };
      }
      return { ...prev, [name]: value };
    });

    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  // ── Complaint image handlers ──────────────────────────────────────────────

  const processImages = (fileList: FileList) => {
    setImageError("");
    const incoming = Array.from(fileList);
    for (const file of incoming) {
      if (!IMAGE_TYPES.includes(file.type)) {
        setImageError("Only JPG and PNG images are accepted.");
        return;
      }
    }

    setComplaintImages((previous) => [
      ...previous,
      ...incoming.map((file) => ({
        file,
        name: file.name,
        size: file.size,
        preview: URL.createObjectURL(file),
      })),
    ]);
    setErrors((e) => ({ ...e, complaintImage: undefined }));
  };

  const handleImageInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.length) processImages(event.target.files);
    event.target.value = "";
  };

  const handleImageDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsImageDragOver(false);
    if (event.dataTransfer.files?.length) processImages(event.dataTransfer.files);
  };

  const removeImage = (index: number) => {
    setComplaintImages((previous) => {
      const next = [...previous];
      const removed = next.splice(index, 1)[0];
      if (previewImage === removed) setPreviewImage(null);
      if (removed?.preview) URL.revokeObjectURL(removed.preview);
      return next;
    });
  };

  // ── Source file handlers ──────────────────────────────────────────────────

  const processSourceFiles = (fileList: FileList) => {
    setSourceFileError("");
    setIsDocumentProcessed(false);

    const incoming = Array.from(fileList);

    for (const file of incoming) {
      if (!SOURCE_TYPES.includes(file.type)) {
        setSourceFileError("Only JPG, PNG, and PDF files are accepted.");
        return;
      }
    }

    const next: UploadedFile[] = incoming.map((file) => ({
      file,
      name: file.name,
      size: file.size,
      preview: URL.createObjectURL(file),
    }));

    setSourceFiles((prev) => [...prev, ...next]);
  };

  const handleSourceFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.length) processSourceFiles(event.target.files);
    event.target.value = "";
  };

  const handleSourceDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsSourceDragOver(false);
    if (event.dataTransfer.files?.length) processSourceFiles(event.dataTransfer.files);
  };

  const removeSourceFile = (index: number) => {
    setIsDocumentProcessed(false);

    setSourceFiles((prev) => {
      const copy = [...prev];
      const removed = copy.splice(index, 1)[0];
      if (removed.preview) URL.revokeObjectURL(removed.preview);
      if (previewSourceFile === removed) setPreviewSourceFile(null);
      return copy;
    });
  };

  // ── Validation ────────────────────────────────────────────────────────────

  const validateForm = (): FormErrors => {
    const next: FormErrors = {};
    if (!formData.citizenName.trim()) next.citizenName = "Name/Source is required";
    if (!formData.phoneNumber.trim()) {
      next.phoneNumber = "Phone number is required";
    } else if (!/^(\+91)?[6-9]\d{9}$/.test(formData.phoneNumber.trim())) {
      next.phoneNumber = "Enter a valid 10-digit phone number";
    }
    if (!formData.block)   next.block   = "Please select a block";
    if (!formData.address.trim()) next.address = "Address is required";
    if (!formData.title.trim())   next.title   = "Complaint title is required";
    if (!formData.description.trim()) next.description = "Complaint description is required";
    if (!isDocumentReview && complaintImages.length === 0) {
      next.complaintImage = "Please upload at least one complaint evidence image";
    }
    return next;
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validatedErrors = validateForm();
    setErrors(validatedErrors);
    if (Object.keys(validatedErrors).length > 0) return;

    setIsSubmitting(true);

    try {
      const registrationSource = sourceFiles.length > 0 ? "document" : "manual";
     
      const response = await submitComplaint(
        formData,
        complaintImages.map((img) => img.file),
        registrationSource,
        sourceFiles.map((file) => file.file),
      );
      const complaintId = response?.complaintId ?? response?.complaint?.complaintId;

      if (!complaintId) throw new Error("Complaint registration response did not include an ID.");

      if (typeof setSelectedComplaintId === "function") setSelectedComplaintId(complaintId);
      if (typeof navigate === "function") navigate(`/complaints/confirm/${complaintId}`);

      // Reset form
      setFormData(initialFormData);
      setErrors({});
      setSubmitError("");
      complaintImages.forEach((image) => {
        if (image.preview) URL.revokeObjectURL(image.preview);
      });
      setComplaintImages([]);
      setSourceFiles([]);
    } catch (error) {
      console.error("Complaint submission failed:", error);
      setSubmitError("Unable to submit the complaint right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleProcessDocument = async () => {
  setSourceFileError("");
  setSubmitError("");

  if (sourceFiles.length === 0) {
    setSourceFileError(
      "Please attach at least one source image or PDF before processing.",
    );
    return;
  }

  setIsProcessingSource(true);

  try {
    const result = await processExternalSource(
      sourceFiles.map((file) => file.file),
    );

    const extracted = await extractComplaintFromSource(
      result.combinedOcr,
      sourceType,
    );

    writeExtractedComplaint({
      ...extracted.complaint,
      zone: zoneForBlock(extracted.complaint.block) || extracted.complaint.zone,
    });
    writePendingExternalFiles(sourceFiles.map((file) => file.file));
    navigate?.("/complaints/new/extracted");
  } catch (error) {
    console.error("External source processing failed:", error);

    setSourceFileError(
      error instanceof Error
        ? error.message
        : "Unable to process the source document right now.",
    );
  } finally {
    setIsProcessingSource(false);
  }
  };

  // ── Derived state ─────────────────────────────────────────────────────────

  const availableBlocks = formData.zone
    ? locationData.filter((entry) => entry.zone === formData.zone)
    : locationData;

  const sourceDropLabel =
    sourceType === "news"  ? "news image / PDF" :
    sourceType === "email" ? "email screenshot / PDF" :
    "file";

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="form-page">
      {isDocumentReview && (
        <div className="complaint-form-back">
          <button
            type="button"
            className="back-link"
            onClick={() => navigate?.("/complaints/new")}
          >
            <Icon name="arrow" /> Back
          </button>
        </div>
      )}
      <div className={`complaint-form-layout${isDocumentReview ? " complaint-form-layout--extracted" : ""}`}>

        {/* ── Left: manual entry form ── */}
        <div className="page-card complaint-form-card complaint-form-card--manual">
          <div className="option-badge option-badge--manual">
            <span className="option-badge__tag">OPTION 1</span>
            <span className="option-badge__text">Direct Form Filing</span>
          </div>
          <div className="page-card__header">
            <h1 style={{ marginBottom: 0, paddingBottom: "0.5rem" }}>Register a Complaint</h1>
            <p className="option-card__subtitle">Fill out the complaint details manually for citizen reports</p>
          </div>

          <form onSubmit={handleSubmit} className="complaint-form" noValidate>

            {/* Citizen info */}
            <div className="field-grid field-grid--2">
              <div className="field">
                <span>Name/Source <span className="field__required">*</span></span>
                <input
                  name="citizenName"
                  type="text"
                  placeholder="Enter citizen name"
                  value={formData.citizenName}
                  onChange={handleChange}
                />
                {errors.citizenName && <small className="error-text">{errors.citizenName}</small>}
              </div>

              <div className="field">
                <span>Phone Number <span className="field__required">*</span></span>
                <input
                  name="phoneNumber"
                  type="tel"
                  placeholder="10-digit mobile number"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                />
                {errors.phoneNumber && <small className="error-text">{errors.phoneNumber}</small>}
              </div>
            </div>

            {/* Location — Block first, Zone derived */}
            <div className="form-section-label">Complaint Location</div>

            <div className="field-grid field-grid--2">
              <div className="field">
                <span>Zone <span className="field__required">*</span></span>
                <select name="zone" value={formData.zone} onChange={handleChange}>
                  <option value="">Select Zone</option>
                  {[...new Set(locationData.map((entry) => entry.zone))].map((zone) => (
                    <option key={zone} value={zone}>{zone}</option>
                  ))}
                </select>
              </div>

              <div className="field">
                <span>Block <span className="field__required">*</span></span>
                <select name="block" value={formData.block} onChange={handleChange}>
                  <option value="">Select Block</option>
                {availableBlocks.map((entry) => (
                    <option key={entry.block} value={entry.block}>{entry.block}</option>
                  ))}
                </select>
                {errors.block && <small className="error-text">{errors.block}</small>}
              </div>
            </div>

            <div className="field-grid field-grid--2">
              <div className="field">
                <span>Ward <span className="field__optional">(optional)</span></span>
                <input
                  name="ward"
                  type="text"
                  placeholder="Enter ward if known"
                  value={formData.ward ?? ""}
                  onChange={handleChange}
                />
              </div>

              <div className="field">
                <span>Address <span className="field__required">*</span></span>
                <input
                  name="address"
                  type="text"
                  placeholder="Exact location / address of the complaint"
                  value={formData.address}
                  onChange={handleChange}
                />
                {errors.address && <small className="error-text">{errors.address}</small>}
              </div>
            </div>

            {/* Complaint details */}
            <div className="field">
              <span>Complaint Title <span className="field__required">*</span></span>
              <input
                name="title"
                type="text"
                placeholder="Brief title for the complaint"
                value={formData.title}
                onChange={handleChange}
              />
              {errors.title && <small className="error-text">{errors.title}</small>}
            </div>

            <div className="field">
              <span>Complaint Description <span className="field__required">*</span></span>
              <textarea
                name="description"
                rows={4}
                placeholder="Describe the complaint in detail"
                value={formData.description}
                onChange={handleChange}
              />
              {errors.description && <small className="error-text">{errors.description}</small>}
            </div>

            {/* ── Complaint image evidence ── */}
            <div className="field">
              <span>
                Complaint Evidence{" "}
                <span className={isDocumentReview ? "field__optional" : "field__required"}>
                  {isDocumentReview ? "(optional)" : "*"}
                </span>
                <span className="field__hint"> — JPG / PNG</span>
              </span>

              <div
                  className={`upload-dropzone upload-dropzone--compact${isImageDragOver ? " upload-dropzone--active" : ""}${errors.complaintImage ? " upload-dropzone--error" : ""}`}
                  onDrop={handleImageDrop}
                  onDragOver={(e) => { e.preventDefault(); setIsImageDragOver(true); }}
                  onDragLeave={() => setIsImageDragOver(false)}
                  onClick={() => imageInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  aria-label="Upload complaint evidence images"
                  onKeyDown={(e) => e.key === "Enter" && imageInputRef.current?.click()}
                >
                  <span className="upload-dropzone__icon"><Icon name="upload" /></span>
                  <strong>Add evidence images</strong>
                  <small>JPG / PNG · select multiple</small>
                </div>
              {complaintImages.length > 0 && (
               <ul className="upload-file-list" style={{ marginTop: 4 }}>
                 {complaintImages.map((image, index) => (
                   <li key={`${image.name}-${index}`} className="upload-file-item">
                     <button
                       type="button"
                       className="image-preview-button"
                       onClick={() => setPreviewImage(image)}
                       aria-label={`Preview ${image.name}`}
                     >
                       <img src={image.preview!} alt={image.name} className="upload-file-item__thumb" />
                     </button>
                     <div className="upload-file-item__meta">
                       <span className="upload-file-item__name">{image.name}</span>
                       <span className="upload-file-item__size">{formatBytes(image.size)}</span>
                     </div>
                     <button
                       type="button"
                       className="upload-file-item__remove"
                       aria-label={`Remove ${image.name}`}
                       onClick={() => removeImage(index)}
                     >
                       <Icon name="close" />
                     </button>
                   </li>
                 ))}
               </ul>
              )}

              <input
                ref={imageInputRef}
                type="file"
                accept=".jpg,.jpeg,.png"
                multiple
                style={{ display: "none" }}
                onChange={handleImageInputChange}
              />
              {imageError && <small className="error-text">{imageError}</small>}
              {errors.complaintImage && !imageError && (
                <small className="error-text">{errors.complaintImage}</small>
              )}
            </div>

            {submitError && (
              <div className="error-text" style={{ marginBottom: 4 }}>{submitError}</div>
            )}

            <div className="sticky-actions" style={{ borderTop: "none", paddingTop: 0, marginTop: 8 }}>
              <button
                type="submit"
                className="primary-button"
                style={{ minWidth: 180 }}
                disabled={isSubmitting}
                aria-busy={isSubmitting}
              >
                {isSubmitting && <span className="button-spinner" aria-hidden="true" />}
                <span>Submit Complaint</span>
              </button>
            </div>

          </form>
        </div>

        {!isDocumentReview && (
          <div className="page-card complaint-upload-card complaint-upload-card--ocr">
            <div className="option-badge option-badge--ocr">
              <span className="option-badge__tag">OPTION 2</span>
              <span className="option-badge__text">AI / Document Auto-Fill</span>
            </div>
            <h2 className="panel__header" style={{ marginBottom: 0 }}>Register from External Source</h2>
            <p className="option-card__subtitle">Extract complaint information automatically from news image, PDF, or email</p>
            <div className="source-upload-section">
              <div className="source-upload-section__header">
                <p className="source-upload-section__hint">
                  Upload a news article, email screenshot, PDF, or other external document.
                </p>
              </div>

              <div
                className={`upload-dropzone source-upload-dropzone${isSourceDragOver ? " upload-dropzone--active" : ""}`}
                onDrop={handleSourceDrop}
                onDragOver={(e) => { e.preventDefault(); setIsSourceDragOver(true); }}
                onDragLeave={() => setIsSourceDragOver(false)}
                onClick={() => sourceFileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                aria-label={`Upload ${sourceType} source document`}
                onKeyDown={(e) => e.key === "Enter" && sourceFileInputRef.current?.click()}
              >
                <span className="upload-dropzone__icon"><Icon name="upload" /></span>
                <strong>Drop {sourceDropLabel} here or click to browse</strong>
                <small>JPG, PNG, PDF</small>
              </div>

              <input
                ref={sourceFileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                multiple
                style={{ display: "none" }}
                onChange={handleSourceFileInputChange}
              />

              {sourceFileError && (
                <p className="error-text" style={{ marginTop: 4 }}>{sourceFileError}</p>
              )}

              {sourceFiles.length > 0 ? (
                <ul className="upload-file-list" style={{ marginTop: 4 }}>
                  {sourceFiles.map((f, index) => (
                    <li key={`src-${f.name}-${index}`} className="upload-file-item">
                      <button
                        type="button"
                        className="image-preview-button"
                        onClick={() => setPreviewSourceFile(f)}
                        aria-label={`Preview ${f.name}`}
                      >
                        {f.file.type.startsWith("image/") ? (
                          <img src={f.preview!} alt={f.name} className="upload-file-item__thumb" />
                        ) : (
                          <span className="upload-file-item__icon"><Icon name="file" /></span>
                        )}
                      </button>
                      <div className="upload-file-item__meta">
                        <span className="upload-file-item__name">{f.name}</span>
                        <span className="upload-file-item__size">{formatBytes(f.size)}</span>
                      </div>
                      <button
                        type="button"
                        className="upload-file-item__remove"
                        aria-label={`Remove ${f.name}`}
                        onClick={() => removeSourceFile(index)}
                      >
                        <Icon name="close" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="upload-empty-hint">No source document attached yet.</p>
              )}

              <div className="source-upload-actions">
                <button
                  type="button"
                  className="primary-button"
                  onClick={handleProcessDocument}
                  disabled={isProcessingSource}
                  aria-busy={isProcessingSource}
                >
                  {isProcessingSource && <span className="button-spinner" aria-hidden="true" />}
                  <span>{isProcessingSource ? "Processing..." : "Process Document"}</span>
                </button>
                {isDocumentProcessed && (
                  <span className="ocr-result-section__status">✓ Fields prefilled</span>
                )}
              </div>
            </div>
          </div>
        )}

        {isDocumentReview && (
          <div className="page-card complaint-source-preview-card">
            <h3 className="complaint-upload-card__title">Source files used for extraction</h3>
            <p className="complaint-upload-card__hint">
              Review the uploaded image or document while checking the extracted fields.
            </p>
            <div className="complaint-source-preview-list">
              {sourceFiles.map((file, index) => (
                <button
                  type="button"
                  className="complaint-source-preview"
                  key={`${file.name}-${index}`}
                  onClick={() => setPreviewSourceFile(file)}
                >
                  {file.file.type.startsWith("image/") && file.preview ? (
                    <img src={file.preview} alt={file.name} className="complaint-source-preview__image" />
                  ) : (
                    <span className="complaint-source-preview__file"><Icon name="file" /></span>
                  )}
                  <span className="complaint-source-preview__name">{file.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
      {previewImage && (
        <div className="image-preview-modal" role="dialog" aria-modal="true" aria-label="Image preview" onClick={() => setPreviewImage(null)}>
          <div className="image-preview-modal__content" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="image-preview-modal__close" onClick={() => setPreviewImage(null)} aria-label="Close image preview">
              <Icon name="close" />
            </button>
            <img src={previewImage.preview!} alt={previewImage.name} className="image-preview-modal__image" />
            <span className="image-preview-modal__name">{previewImage.name}</span>
          </div>
        </div>
      )}
      {previewSourceFile && (
        <div className="image-preview-modal" role="dialog" aria-modal="true" aria-label="Source preview" onClick={() => setPreviewSourceFile(null)}>
          <div className="image-preview-modal__content" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="image-preview-modal__close" onClick={() => setPreviewSourceFile(null)} aria-label="Close source preview">
              <Icon name="close" />
            </button>
            {previewSourceFile.file.type.startsWith("image/") ? (
              <img src={previewSourceFile.preview!} alt={previewSourceFile.name} className="image-preview-modal__image" />
            ) : (
              <iframe
                src={previewSourceFile.preview!}
                title={previewSourceFile.name}
                className="source-preview-modal__document"
              />
            )}
            <span className="image-preview-modal__name">{previewSourceFile.name}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default ComplaintFormPage;
