import { useEffect, useMemo, useState } from "react";
import Icon from "../../shared/components/Icon";
import StatusBadge from "../../shared/components/StatusBadge";
import type { Status } from "../../shared/types";

type DashboardPageProps = {
  navigate: (route: string) => void;
  setSelectedComplaintId: (id: string) => void;
};

type ComplaintRecord = {
  complaintId: string;
  citizenName: string;
  zone: string;
  block: string;
  ward?: string | null;
  assignedOfficerName: string | null;
  status: Status;
  createdAt: string;
};

function DashboardPage({ navigate, setSelectedComplaintId }: DashboardPageProps) {
  const [complaints, setComplaints] = useState<ComplaintRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [zoneFilter, setZoneFilter] = useState("All zones");
  const [blockFilter, setBlockFilter] = useState("All blocks");
  const [wardFilter, setWardFilter] = useState("All wards");
  const [statusFilter, setStatusFilter] = useState("All status");

  useEffect(() => {
    let active = true;
    const apiUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:5000/api";
    fetch(`${apiUrl}/complaints`)
      .then(async (response) => {
        const result = (await response.json()) as { complaints?: ComplaintRecord[]; message?: string };
        if (!response.ok) throw new Error(result.message || "Unable to load complaints.");
        return result.complaints ?? [];
      })
      .then((data) => {
        if (active) setComplaints(data);
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : "Unable to load dashboard data.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo(() => {
    const total = complaints.length;
    const open = complaints.filter((c) =>
      ["registered", "assigned", "in progress"].includes(c.status.toLowerCase()),
    ).length;
    const pending = complaints.filter((c) =>
      ["pending approval", "resolution submitted"].includes(c.status.toLowerCase()),
    ).length;

    const todayStr = new Date().toISOString().split("T")[0];
    const closedToday = complaints.filter(
      (c) =>
        c.status.toLowerCase().includes("approved") ||
        c.status.toLowerCase().includes("closed") && c.createdAt.startsWith(todayStr),
    ).length;

    return [
      { label: "Total complaints", value: total.toLocaleString(), sublabel: "All time records", accent: "navy" },
      { label: "Open complaints", value: open.toLocaleString(), sublabel: "Registered + Assigned + In progress", accent: "blue" },
      { label: "Pending approval", value: pending.toLocaleString(), sublabel: "Awaiting ATP / MTP sign-off", accent: "amber" },
      { label: "Closed today", value: closedToday.toLocaleString(), sublabel: "Approved today", accent: "green" },
    ];
  }, [complaints]);

  const uniqueZones = useMemo(() => ["All zones", ...new Set(complaints.map((c) => c.zone).filter(Boolean))], [complaints]);
  const uniqueBlocks = useMemo(() => ["All blocks", ...new Set(complaints.map((c) => c.block).filter(Boolean))], [complaints]);
  const uniqueWards = useMemo(() => ["All wards", ...new Set(complaints.map((c) => c.ward).filter((w): w is string => Boolean(w)))], [complaints]);
  const uniqueStatuses = useMemo(() => ["All status", ...new Set(complaints.map((c) => c.status).filter(Boolean))], [complaints]);

  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) => {
      return (
        (zoneFilter === "All zones" || c.zone === zoneFilter) &&
        (blockFilter === "All blocks" || c.block === blockFilter) &&
        (wardFilter === "All wards" || c.ward === wardFilter) &&
        (statusFilter === "All status" || c.status === statusFilter)
      );
    });
  }, [complaints, zoneFilter, blockFilter, wardFilter, statusFilter]);

  const exportCSV = () => {
    if (filteredComplaints.length === 0) return;
    const headers = ["Complaint ID", "Citizen Name", "Zone", "Block", "Ward", "Assigned Officer", "Status", "Created At"];
    const rows = filteredComplaints.map((c) => [
      c.complaintId,
      `"${c.citizenName.replace(/"/g, '""')}"`,
      c.zone,
      c.block,
      c.ward ?? "",
      `"${(c.assignedOfficerName ?? "Pending assignment").replace(/"/g, '""')}"`,
      c.status,
      new Date(c.createdAt).toLocaleString(),
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `complaints_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="dashboard-page">
      <div className="stats-grid">
        {stats.map((card) => (
          <div className="stat-card" key={card.label}>
            <div className={`stat-card__icon stat-card__icon--${card.accent}`}>
              <Icon name="chart" />
            </div>
            <div className="stat-card__value">{card.value}</div>
            <div className="stat-card__label">{card.label}</div>
            <div className="stat-card__sublabel">{card.sublabel}</div>
          </div>
        ))}
      </div>

      <section className="panel panel--table">
        <div className="panel__header">
          <h2>Recent complaints</h2>
          <div className="toolbar">
            <select value={zoneFilter} onChange={(e) => setZoneFilter(e.target.value)}>
              {uniqueZones.map((z) => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
            <select value={blockFilter} onChange={(e) => setBlockFilter(e.target.value)}>
              {uniqueBlocks.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
            <select value={wardFilter} onChange={(e) => setWardFilter(e.target.value)}>
              {uniqueWards.map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              {uniqueStatuses.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button className="secondary-button small-button" type="button" onClick={exportCSV}>
              <Icon name="download" /> Export
            </button>
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Complaint ID</th>
              <th>Citizen</th>
              <th>Ward</th>
              <th>Assigned officer</th>
              <th>Status</th>
              <th>Registered</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="table-message">
                  Loading complaints from server...
                </td>
              </tr>
            )}
            {!loading && error && (
              <tr>
                <td colSpan={7} className="table-message table-message--error">
                  {error}
                </td>
              </tr>
            )}
            {!loading && !error && filteredComplaints.length === 0 && (
              <tr>
                <td colSpan={7} className="table-message">
                  No registered complaints found.
                </td>
              </tr>
            )}
            {!loading &&
              !error &&
              filteredComplaints.slice(0, 10).map((complaint) => (
                <tr
                  key={complaint.complaintId}
                  onClick={() => {
                    setSelectedComplaintId(complaint.complaintId);
                    navigate(`/complaints/${complaint.complaintId}`);
                  }}
                  className="table-row"
                >
                  <td>{complaint.complaintId}</td>
                  <td>{complaint.citizenName}</td>
                  <td>{complaint.ward ?? "—"}</td>
                  <td>{complaint.assignedOfficerName ?? "Pending assignment"}</td>
                  <td>
                    <StatusBadge status={complaint.status} />
                  </td>
                  <td>{new Date(complaint.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button
                      className="icon-only-button"
                      type="button"
                      aria-label={`View ${complaint.complaintId}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedComplaintId(complaint.complaintId);
                        navigate(`/complaints/${complaint.complaintId}`);
                      }}
                    >
                      <Icon name="eye" />
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

export default DashboardPage;
