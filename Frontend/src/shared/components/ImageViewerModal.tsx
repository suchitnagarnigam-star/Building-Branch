import React, { useEffect, useState } from "react";

interface ImageViewerModalProps {
  isOpen: boolean;
  imageUrl: string;
  title?: string;
  onClose: () => void;
  originalUrl?: string;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  isOpen,
  imageUrl,
  title,
  onClose,
  originalUrl,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setZoomLevel(1);
      setIsLoading(true);
      setHasError(false);
      // Lock background scrolling
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "+" || e.key === "=") setZoomLevel((z) => Math.min(z + 0.25, 3));
      if (e.key === "-") setZoomLevel((z) => Math.max(z - 0.25, 0.5));
      if (e.key === "0") setZoomLevel(1);
    };

    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, imageUrl, onClose]);

  if (!isOpen || !imageUrl) return null;

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomLevel((z) => Math.min(z + 0.25, 3));
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomLevel((z) => Math.max(z - 0.25, 0.5));
  };

  const handleResetZoom = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomLevel(1);
  };

  return (
    <div
      className="mcl-image-viewer-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title || "Image Viewer"}
    >
      <div
        className="mcl-image-viewer-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="mcl-image-viewer-header">
          <div className="mcl-image-viewer-title">
            <span>📷</span>
            <span className="truncate">{title || "Evidence Preview"}</span>
          </div>

          <div className="mcl-image-viewer-toolbar">
            <button
              type="button"
              className="mcl-viewer-btn"
              onClick={handleZoomOut}
              title="Zoom out (-)"
              disabled={zoomLevel <= 0.5}
            >
              −
            </button>
            <button
              type="button"
              className="mcl-viewer-btn zoom-indicator"
              onClick={handleResetZoom}
              title="Reset zoom (0)"
            >
              {Math.round(zoomLevel * 100)}%
            </button>
            <button
              type="button"
              className="mcl-viewer-btn"
              onClick={handleZoomIn}
              title="Zoom in (+)"
              disabled={zoomLevel >= 3}
            >
              +
            </button>

            <a
              href={imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mcl-viewer-btn"
              title="Open full resolution in new tab"
            >
              ↗
            </a>

            <a
              href={imageUrl}
              download={title || "evidence.jpg"}
              className="mcl-viewer-btn"
              title="Download file"
            >
              ↓
            </a>

            <button
              type="button"
              className="mcl-viewer-btn close-btn"
              onClick={onClose}
              title="Close (Esc)"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Viewport Area */}
        <div className="mcl-image-viewer-viewport">
          {isLoading && !hasError && (
            <div className="mcl-image-viewer-loading">
              <div className="mcl-spinner" />
              <span>Loading high-resolution image...</span>
            </div>
          )}

          {hasError ? (
            <div className="mcl-image-viewer-error">
              <span>⚠️</span>
              <p>Unable to preview this file inline.</p>
              {originalUrl && (
                <a
                  href={originalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="secondary-button"
                  style={{ marginTop: "12px", display: "inline-block" }}
                >
                  Try Opening Direct Link
                </a>
              )}
            </div>
          ) : (
            <div
              className="mcl-image-viewer-img-wrap"
              style={{
                transform: `scale(${zoomLevel})`,
                transition: "transform 0.15s ease-out",
              }}
            >
              <img
                src={imageUrl}
                alt={title || "Evidence preview"}
                className="mcl-image-viewer-img"
                onLoad={() => setIsLoading(false)}
                onError={() => {
                  setIsLoading(false);
                  setHasError(true);
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageViewerModal;
