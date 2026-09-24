import { useMemo } from "react";
import Icon from "../../shared/components/Icon";
import { readExternalSourceResult } from "../../services/complaintApi";
import type { OCRImageResult } from "../../services/complaintApi";

type ExternalUploadSuccessScreenProps = {
  navigate: (route: string) => void;
};

function ExternalUploadSuccessScreen({ navigate }: ExternalUploadSuccessScreenProps) {
  const result = useMemo(() => readExternalSourceResult(), []);

  return (
    <div className="confirmation-wrap">
      <div className="confirmation-card external-source-result-card">
        <div className="confirmation-banner">
          <div className="confirmation-banner__icon"><Icon name="check" /></div>
          <h2>OCR Processing Complete</h2>
          <p className="external-source-result-card__intro">
            Text has been successfully extracted from the uploaded document.
          </p>
        </div>

        {result ? (
          <>
            <div className="confirmation-panel">
              <div className="meta-row">
                <span>Processing status</span>
                <strong className="success-text">✓ Completed</strong>
              </div>
              <div className="meta-row">
                <span>Files processed</span>
                <strong>{result.fileCount}</strong>
              </div>
            </div>

            <div className="ocr-result-section external-source-result">
              {result.images.map((image: OCRImageResult) => (
                <div key={`${image.img_index}-${image.filename}`} className="ocr-page">
                  <div className="ocr-page__header">
                    <strong>Page {image.img_index}</strong>
                    <span>{image.filename}</span>
                  </div>
                  <div className="ocr-page__text">
                    {image.ocr_md || (
                      <span className="ocr-page__empty">
                        No text could be extracted from this file.
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="confirmation-panel">
            <div className="meta-row">
              <span>Processing status</span>
              <strong className="success-text">Source uploaded successfully</strong>
            </div>
            <p className="external-source-result-card__empty">
              No OCR response is available for this upload.
            </p>
          </div>
        )}

        <div className="sticky-actions confirmation-actions">
          <button type="button" className="secondary-button" onClick={() => navigate("/complaints/new")}>
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

export default ExternalUploadSuccessScreen;
