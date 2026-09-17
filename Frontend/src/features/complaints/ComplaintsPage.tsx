import Icon from "../../shared/components/Icon";
import StatusBadge from "../../shared/components/StatusBadge";
import type { Status } from "../../shared/types";
import { locationData } from "../../data/locationData";
import { useEffect, useMemo, useState } from "react";

const ALL_STATUSES = [
  "Registered",
  "Assigned",
  "In progress",
  "Resolution submitted",
  "Pending approval",
  "Approved / Closed",
  "Rejected",
  "Rework required",
] as const satisfies readonly Status[];

type ComplaintRecord = {
  complaintId: string;
  citizenName: string;
  zone: string;
  block: string;
  assignedOfficerName: string | null;
  status: Status;
  createdAt: string;
};

type ComplaintsPageProps = {
  route: string;
  navigate: (path: string) => void;
  setSelectedComplaintId: (id: string) => void;
};

function ComplaintsPage({ route, navigate, setSelectedComplaintId }: ComplaintsPageProps) {
  const [complaints, setComplaints] = useState<ComplaintRecord[]>([]);
  const [search, setSearch] = useState("");
  const [zone, setZone] = useState("All zones");
  const [block, setBlock] = useState("All blocks");
  const [status, setStatus] = useState("All status");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const apiUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:5000/api";
    fetch(`${apiUrl}/complaints`)
      .then(async (response) => {
        const result = await response.json() as { complaints?: ComplaintRecord[]; message?: string };
        if (!response.ok) throw new Error(result.message || "Unable to load complaints.");
        return result.complaints ?? [];
      })
      .then((result) => {
        if (active) setComplaints(result);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Unable to load complaints.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const zones = useMemo(
    () => ["All zones", ...new Set(locationData.map((item) => item.zone))],
    [],
  );
  const blocks = useMemo(
    () => [
      "All blocks",
      ...new Set(
        locationData
          .filter((item) => zone === "All zones" || item.zone === zone)
          .map((item) => item.block),
      ),
    ],
    [zone],
  );
  const statuses = ["All status", ...ALL_STATUSES];

  const handleZoneChange = (nextZone: string) => {
    setZone(nextZone);
    if (
      block !== "All blocks"
      && nextZone !== "All zones"
      && !locationData.some((item) => item.zone === nextZone && item.block === block)
    ) {
      setBlock("All blocks");
    }
  };

  const handleBlockChange = (nextBlock: string) => {
    setBlock(nextBlock);
    if (nextBlock !== "All blocks") {
      const matchingLocation = locationData.find((item) => item.block === nextBlock);
      if (matchingLocation) setZone(matchingLocation.zone);
    }
  };

  const visibleComplaints = complaints.filter((complaint) => {
    const query = search.trim().toLowerCase();
    const matchesRoute = route !== "/complaints/pending"
      || complaint.status.toLowerCase() === "pending approval"
      || complaint.status.toLowerCase() === "resolution submitted";
    return matchesRoute
      && (!query || [complaint.complaintId, complaint.citizenName, complaint.block].some((value) => value.toLowerCase().includes(query)))
      && (zone === "All zones" || complaint.zone === zone)
      && (block === "All blocks" || complaint.block === block)
      && (status === "All status" || complaint.status === status);
  });

  return (
    <div className="panel panel--table">
      <div className="complaints-page-header">
        <div>
          <h2 className="complaints-page-title">Complaints & Applications</h2>
          <p className="complaints-page-subtitle">Track, assign, and register building violation complaints</p>
        </div>
        <button
          className="primary-button small-button complaints-create-btn"
          type="button"
          onClick={() => navigate("/complaints/new")}
        >
          <Icon name="plus" /> Register New Complaint
        </button>
      </div>

      <div className="complaints-toolbar">
        <div className="complaints-filters">
          <div className="search-box complaints-search">
            <Icon name="search" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} type="text" placeholder="Complaint ID, citizen, block" />
          </div>
          <select value={zone} onChange={(event) => handleZoneChange(event.target.value)}>{zones.map((item) => <option key={item}>{item}</option>)}</select>
          <select value={block} onChange={(event) => handleBlockChange(event.target.value)}>{blocks.map((item) => <option key={item}>{item}</option>)}</select>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>{statuses.map((item) => <option key={item}>{item}</option>)}</select>
          <button className="secondary-button small-button complaints-export" type="button">
            <Icon name="download" /> Export CSV
          </button>
        </div>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Complaint ID</th>
            <th>Citizen</th>
            <th>Block</th>
            <th>Assigned officer</th>
            <th>Status</th>
            <th>Registered</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {loading && <tr><td colSpan={7} className="table-message">Loading complaints...</td></tr>}
          {!loading && error && <tr><td colSpan={7} className="table-message table-message--error">{error}</td></tr>}
          {!loading && !error && visibleComplaints.length === 0 && <tr><td colSpan={7} className="table-message">No complaints match the selected filters.</td></tr>}
          {!loading && !error && visibleComplaints.map((complaint) => (
            <tr
              key={complaint.complaintId}
              className="table-row"
              onClick={() => {
                setSelectedComplaintId(complaint.complaintId);
                navigate(`/complaints/${complaint.complaintId}`);
              }}
            >
              <td>{complaint.complaintId}</td>
              <td>{complaint.citizenName}</td>
              <td>{complaint.block}</td>
              <td>{complaint.assignedOfficerName ?? "Pending assignment"}</td>
              <td><StatusBadge status={complaint.status} /></td>
              <td>{new Date(complaint.createdAt).toLocaleDateString()}</td>
              <td>
                <button className="icon-only-button" type="button" onClick={(event) => {
                  event.stopPropagation();
                  navigate(`/complaints/${complaint.complaintId}`);
                }}>
                  <Icon name="eye" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ComplaintsPage;
