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
  const base = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:5000/api";
  return `${base}/officers`;
};

function OfficersPage() {
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
                <th>Name</th>
                <th>Designation</th>
                <th>Zone</th>
                <th>Blocks</th>
                <th>Active complaints</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {officers.map((officer) => (
                <tr key={officer.officerId}>
                  <td>{officer.name}</td>
                  <td>{officer.designation}</td>
                  <td>{officer.zone}</td>
                  <td>{officer.blocks.map((block) => `${block}`).join(", ")}</td>
                  <td>{officer.activeComplaints}</td>
                  <td>
                    <div className="icon-action-group">
                      <button className="icon-only-button" type="button" aria-label={`View ${officer.name}`}>
                        <Icon name="eye" />
                      </button>
                      <button className="icon-only-button" type="button" aria-label={`Edit ${officer.name}`}>
                        <Icon name="edit" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default OfficersPage;
