import { useState } from "react";
import type { ChangeEvent } from "react";
import { readExtractedComplaint } from "../../services/complaintApi";
import type { ExtractedComplaint } from "../../services/complaintApi";
import { zoneForBlock } from "../../data/locationData";

type ExtractedComplaintPageProps = {
  navigate: (route: string) => void;
};

function ExtractedComplaintPage({ navigate }: ExtractedComplaintPageProps) {
  const [complaint, setComplaint] = useState<ExtractedComplaint | null>(
    readExtractedComplaint,
  );

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    setComplaint((previous) => {
      if (!previous) return previous;
      if (name === "block") {
        return { ...previous, block: value, zone: zoneForBlock(value) || previous.zone };
      }
      return { ...previous, [name]: value };
    });
  };

  if (!complaint) {
    return (
      <div className="form-page">
        <div className="page-card">
          <h2>Complaint information unavailable</h2>
          <p>Extract complaint information from a document before opening this page.</p>
          <button type="button" className="primary-button" onClick={() => navigate("/complaints/new")}>
            Back to new complaint
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="form-page">
      <div className="page-card complaint-form-card">
        <div className="page-card__header">
          <h2 style={{ marginBottom: 0 }}>Complaint Information Extracted</h2>
        </div>

        <p>
          The information has been translated and extracted into English.
          Please review and edit it before registration.
        </p>

        <div className="extracted-complaint-section">
          <span className="ocr-result-section__status">✓ Extracted</span>

          <div className="extracted-complaint-form">
            <div className="field-grid field-grid--2">
              <label className="field">
                <span>Citizen Name</span>
                <input name="citizenName" value={complaint.citizenName} onChange={handleChange} />
              </label>
              <label className="field">
                <span>Phone Number</span>
                <input name="phoneNumber" value={complaint.phoneNumber} onChange={handleChange} />
              </label>
            </div>

            <div className="field-grid field-grid--2">
              <label className="field">
                <span>Block</span>
                <input name="block" value={complaint.block} onChange={handleChange} />
              </label>
              <label className="field">
                <span>Zone</span>
                <input name="zone" value={complaint.zone} readOnly />
              </label>
            </div>

            <div className="field-grid field-grid--2">
              <label className="field">
                <span>Ward</span>
                <input name="ward" value={complaint.ward} onChange={handleChange} />
              </label>
              <label className="field">
                <span>Address</span>
                <input name="address" value={complaint.address} onChange={handleChange} />
              </label>
            </div>

            <label className="field">
              <span>Complaint Title</span>
              <input name="title" value={complaint.title} onChange={handleChange} />
            </label>

            <label className="field">
              <span>Complaint Description</span>
              <textarea name="description" rows={5} value={complaint.description} onChange={handleChange} />
            </label>
          </div>
        </div>

        <div className="sticky-actions">
          <button type="button" className="secondary-button" onClick={() => navigate("/complaints/new")}>
            Back to document
          </button>
        </div>
      </div>
    </div>
  );
}

export default ExtractedComplaintPage;
