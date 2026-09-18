import { useEffect, useState } from "react";
import Icon from "../../shared/components/Icon";

type Officer = {
  officerId: string;
  name: string;
  mobile: string;
  designation: string;
  zone: string;
  blocks: string[];
  activeComplaints: number;
};

const getApiUrl = () => {
  const base =
    (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
    "http://localhost:5000/api";

  return `${base}/officers`;
};

type Complaint = {
  complaintId: string;
  title?: string;
  block?: string;
  status?: string;
  createdAt?: string;
};

type OfficerDetailsResponse = {
  success: boolean;
  officer: Officer;
  complaints: Complaint[];
};

function OfficersPage() {
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedOfficer, setSelectedOfficer] = useState<OfficerDetailsResponse| null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");

  useEffect(() => {
    let active = true;
    fetch(getApiUrl())
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Unable to load officers.");
        return result;
      })
      .then((result) => {
        if (active) setOfficers(result.officers as Officer[]);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Unable to load officers.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleViewOfficer = async (officerId: string) => {
  setDetailsLoading(true);
  setDetailsError("");

  try {
    const response = await fetch(
      `${getApiUrl()}/${encodeURIComponent(officerId)}`
    );

    const result =
      (await response.json()) as OfficerDetailsResponse & {
        message?: string;
      };

    if (!response.ok || !result.success) {
      throw new Error(
        result.message || "Unable to load officer details."
      );
    }

    setSelectedOfficer(result);
  } catch (reason: unknown) {
    setDetailsError(
      reason instanceof Error
        ? reason.message
        : "Unable to load officer details."
    );
  } finally {
    setDetailsLoading(false);
  }
};

  return (
    <div className="panel panel--table">
      <div className="panel__header">
        <h2>Block Inspectors (BI)</h2>
      </div>

      {loading && <p className="upload-empty-hint">Loading officers...</p>}
      {error && <p className="error-text">{error}</p>}
      {!loading && !error && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Officer ID</th>
                <th>Name</th>
                <th>Blocks</th>
                <th>Active complaints</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {officers.map((officer) => (
                <tr key={officer.officerId}>
                  <td>{officer.officerId}</td>
                  <td>{officer.name}</td>
                  <td>{officer.blocks.join(", ")}</td>
                  <td>{officer.activeComplaints}</td>
                  <td>
                    <div className="icon-action-group">
                      <button 
                       className="icon-only-button" 
                       type="button" 
                       aria-label={`View ${officer.name}`}
                       onClick={() => handleViewOfficer(officer.officerId)}
                      >
                        <Icon name="eye" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {detailsLoading && (
  <div className="officer-modal-backdrop">
    <div className="officer-modal">
      <p>Loading officer details...</p>
    </div>
  </div>
)}

{detailsError && (
  <div className="officer-modal-backdrop">
    <div className="officer-modal">
      <p className="error-text">{detailsError}</p>

      <button
        type="button"
        className="secondary-button"
        onClick={() => setDetailsError("")}
      >
        Close
      </button>
    </div>
  </div>
)}

{selectedOfficer && !detailsLoading && (
  <div className="officer-modal-backdrop">
    <div className="officer-modal">
      <div className="officer-modal__header">
        <div>
          <h2>{selectedOfficer.officer.name}</h2>
          <p>
            {selectedOfficer.officer.designation}
          </p>
        </div>

        <button
          type="button"
          className="icon-only-button"
          aria-label="Close"
          onClick={() => setSelectedOfficer(null)}
        >
          ×
        </button>
      </div>

      <div className="officer-details-grid">
        <div>
          <span>Officer ID</span>
          <strong>
            {selectedOfficer.officer.officerId}
          </strong>
        </div>

        <div>
          <span>Mobile</span>
          <strong>
            {selectedOfficer.officer.mobile}
          </strong>
        </div>

        <div>
          <span>Designation</span>
          <strong>
            {selectedOfficer.officer.designation}
          </strong>
        </div>

        <div>
          <span>Zone</span>
          <strong>
            {selectedOfficer.officer.zone}
          </strong>
        </div>

        <div className="officer-details-grid__full">
          <span>Assigned Blocks</span>
          <strong>
            {selectedOfficer.officer.blocks.join(", ")}
          </strong>
        </div>
      </div>

      <div className="officer-complaints">
        <h3>
          Assigned Complaints
        </h3>

        {selectedOfficer.complaints.length === 0 ? (
          <p className="upload-empty-hint">
            No complaints are currently assigned to this officer.
          </p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Complaint ID</th>
                  <th>Title</th>
                  <th>Block</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {selectedOfficer.complaints.map(
                  (complaint) => (
                    <tr
                      key={complaint.complaintId}
                    >
                      <td>
                        {complaint.complaintId}
                      </td>

                      <td>
                        {complaint.title || "—"}
                      </td>

                      <td>
                        {complaint.block || "—"}
                      </td>

                      <td>
                        {complaint.status || "—"}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  </div>
)}
    </div>
  );
}

export default OfficersPage;
