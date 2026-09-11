import ComplaintFormPage from "../../pages/ComplaintFormPage";
import {
  readExtractedComplaint,
  readPendingExternalFiles,
} from "../../services/complaintApi";
import type { ComplaintFormData } from "../../types/complaint";

type ExtractedComplaintPageProps = {
  navigate: (route: string) => void;
  setSelectedComplaintId: (id: string) => void;
};

function ExtractedComplaintPage({
  navigate,
  setSelectedComplaintId,
}: ExtractedComplaintPageProps) {
  const extractedComplaint = readExtractedComplaint();
  const pendingFiles = readPendingExternalFiles();

  if (!extractedComplaint) {
    return (
      <div className="form-page">
        <div className="page-card">
          <h2>Complaint information unavailable</h2>
          <p>Process an external document before opening this page.</p>
          <button
            type="button"
            className="primary-button"
            onClick={() => navigate("/complaints/new")}
          >
            Back to new complaint
          </button>
        </div>
      </div>
    );
  }

  return (
    <ComplaintFormPage
      navigate={navigate}
      setSelectedComplaintId={setSelectedComplaintId}
      initialFormData={extractedComplaint as ComplaintFormData}
      initialSourceFiles={pendingFiles}
      isDocumentReview
    />
  );
}

export default ExtractedComplaintPage;
