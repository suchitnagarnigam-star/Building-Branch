import Icon from "../../shared/components/Icon";
import StatusBadge from "../../shared/components/StatusBadge";
import type { Status } from "../../shared/types";
import { locationData } from "../../data/locationData";
import { useEffect, useMemo, useState } from "react";
import { getComplaintAction } from "../../shared/utils/complaintNavigation";

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
  caseId?: string | null;
};

type ComplaintsPageProps = {
  route: string;
  navigate: (path: string) => void;
  setSelectedComplaintId: (id: string) => void;
};

type CategoryFilter = "all" | "unassigned" | "assigned_case" | "resolved";

function isResolved(status: string): boolean {
  const s = (status || "").toLowerCase();
  return s.includes("approved") || s.includes("closed") || s.includes("resolved");
}

function ComplaintsPage({ route, navigate, setSelectedComplaintId }: ComplaintsPageProps) {
  const [complaints, setComplaints] = useState<ComplaintRecord[]>([]);
  const [search, setSearch] = useState("");
  const [zone, setZone] = useState("All zones");
  const [block, setBlock] = useState("All blocks");
  const [status, setStatus] = useState("All status");
  const [categoryTab, setCategoryTab] = useState<CategoryFilter>("all");
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

  const categoryCounts = useMemo(() => {
    let unassigned = 0;
    let assigned_case = 0;
    let resolved = 0;

    complaints.forEach((c) => {
      if (isResolved(c.status)) {
        resolved += 1;
      } else if (c.caseId || c.assignedOfficerName || c.status.toLowerCase() === "assigned") {
        assigned_case += 1;
      } else {
        unassigned += 1;
      }
    });

    return {
      all: complaints.length,
      unassigned,
      assigned_case,
      resolved,
    };
  }, [complaints]);

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

    const matchesCategory =
      categoryTab === "all"
        ? true
        : categoryTab === "unassigned"
        ? (!complaint.assignedOfficerName || complaint.status.toLowerCase() === "registered") && !complaint.caseId && !isResolved(complaint.status)
        : categoryTab === "assigned_case"
        ? Boolean(complaint.assignedOfficerName || complaint.caseId || complaint.status.toLowerCase() === "assigned") && !isResolved(complaint.status)
        : isResolved(complaint.status);

    return matchesRoute
      && matchesCategory
      && (!query || [complaint.complaintId, complaint.citizenName, complaint.block, complaint.caseId || ""].some((value) => value.toLowerCase().includes(query)))
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

      {/* Category Tabs */}
      <div style={{ marginBottom: "16px", display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
        <div className="source-type-tabs">
          <button
            type="button"
            className={`source-type-tab ${categoryTab === "all" ? "source-type-tab--active" : ""}`}
            onClick={() => setCategoryTab("all")}
          >
            All Complaints ({categoryCounts.all})
          </button>
          <button
            type="button"
            className={`source-type-tab ${categoryTab === "unassigned" ? "source-type-tab--active" : ""}`}
            onClick={() => setCategoryTab("unassigned")}
          >
            Active / Unassigned ({categoryCounts.unassigned})
          </button>
          <button
            type="button"
            className={`source-type-tab ${categoryTab === "assigned_case" ? "source-type-tab--active" : ""}`}
            onClick={() => setCategoryTab("assigned_case")}
          >
            Assigned / Converted to Case ({categoryCounts.assigned_case})
          </button>
          <button
            type="button"
            className={`source-type-tab ${categoryTab === "resolved" ? "source-type-tab--active" : ""}`}
            onClick={() => setCategoryTab("resolved")}
          >
            Resolved / Closed ({categoryCounts.resolved})
          </button>
        </div>
      </div>

      <div className="complaints-toolbar">
        <div className="complaints-filters">
          <div className="search-box complaints-search">
            <Icon name="search" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} type="text" placeholder="Complaint ID, case, citizen, block" />
          </div>
          <select value={zone} onChange={(event) => handleZoneChange(event.target.value)}>{zones.map((item) => <option key={item}>{item}</option>)}</select>
          <select value={block} onChange={(event) => handleBlockChange(event.target.value)}>{blocks.map((item) => <option key={item}>{item}</option>)}</select>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>{statuses.map((item) => <option key={item}>{item}</option>)}</select>
          <button className="secondary-button small-button complaints-export" type="button">
            <Icon name="download"/>Export CSV</button>
        </div>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Complaint ID</th>
            <th>Citizen</th>
            <th>Block</th>
            <th>Assigned officer</th>
            <th>Case File</th>
            <th>Status</th>
            <th>Registered</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {loading && <tr><td colSpan={8} className="table-message">Loading complaints...</td></tr>}
          {!loading && error && <tr><td colSpan={8} className="table-message table-message--error">{error}</td></tr>}
          {!loading && !error && visibleComplaints.length === 0 && <tr><td colSpan={8} className="table-message">No complaints match the selected filters.</td></tr>}
          {!loading && !error && visibleComplaints.map((complaint) => {
            const action = getComplaintAction(complaint);
            return (
              <tr
                key={complaint.complaintId}
                className="table-row"
                onClick={() => {
                  setSelectedComplaintId(complaint.complaintId);
                  navigate(action.route);
                }}
              >
                <td><strong>{complaint.complaintId}</strong></td>
                <td>{complaint.citizenName}</td>
                <td>{complaint.block}</td>
                <td>{complaint.assignedOfficerName ?? "Pending assignment"}</td>
                <td>
                  {complaint.caseId ? (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate(`/cases/${encodeURIComponent(complaint.caseId!)}`);
                      }}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: "3px 8px",
                        borderRadius: "6px",
                        border: "1px solid var(--accent-light, #bae6fd)",
                        background: "var(--surface-subtle, #f0f9ff)",
                        color: "var(--accent, #0284c7)",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                      title="Open linked enforcement case"
                    >
                      <span>{complaint.caseId}</span>
                      <Icon name="arrow-right" />
                    </button>
                  ) : (
                    <span style={{ color: "var(--muted, #94a3b8)", fontSize: "12px" }}>—</span>
                  )}
                </td>
                <td><StatusBadge status={complaint.status} /></td>
                <td>{new Date(complaint.createdAt).toLocaleDateString()}</td>
                <td>
                  <button
                    className="primary-button small-button"
                    type="button"
                    style={{
                      padding: "4px 10px",
                      fontSize: "12px",
                      background: action.isCase ? "var(--accent, #0284c7)" : undefined,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedComplaintId(complaint.complaintId);
                      navigate(action.route);
                    }}
                  >
                    <span>{action.label}</span>
                    <Icon name="arrow-right" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default ComplaintsPage;
