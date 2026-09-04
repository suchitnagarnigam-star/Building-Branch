import Icon from "../../shared/components/Icon";

type UploadScreenProps = {
  navigate: (route: string) => void;
};

function UploadScreen({ navigate }: UploadScreenProps) {
  return (
    <div className="form-page">
      <div className="page-card upload-card">
        <div className="page-card__header">
          <h2>Upload complaint document</h2>
        </div>

        <div className="upload-zone">
          <h3 className="upload-zone__icon"><Icon name="upload" /></h3>
          <div className="upload-zone__copy">
            <strong>Drop your file here, or click to browse</strong>
            <small>Accepts JPG, PNG, PDF</small>
          </div>
        </div>

        <div className="processing-state">
          <div className="spinner" />
          <div>
            <strong>Reading document…</strong>
            <p>Extracting fields…</p>
          </div>
        </div>

        <div className="sticky-actions">
          <button type="button" className="secondary-button" onClick={() => navigate("/dashboard")}>
            Cancel
          </button>
          <button type="button" className="primary-button" onClick={() => navigate("/complaints/new/preview")}>
            Process document
          </button>
        </div>
      </div>
    </div>
  );
}

export default UploadScreen;
