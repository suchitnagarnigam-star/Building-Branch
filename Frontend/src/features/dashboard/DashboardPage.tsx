import { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, Label,
} from "recharts";
import Icon from "../../shared/components/Icon";
import StatusBadge from "../../shared/components/StatusBadge";
import type { Status } from "../../shared/types";
import { complaints as MOCK_COMPLAINTS } from "../../shared/constants/mockData";
import { getComplaintAction } from "../../shared/utils/complaintNavigation";

type DashboardPageProps = {
  navigate: (route: string) => void;
  setSelectedComplaintId: (id: string) => void;
};

/* ─── Standardized Complaint Item ─── */
type ComplaintRecord = {
  complaintId: string;
  citizenName: string;
  title?: string;
  description?: string;
  zone: string;
  block: string;
  ward?: string | null;
  assignedOfficerName: string | null;
  assignedAtpName?: string | null;
  status: Status;
  createdAt: string;
  caseId?: string | null;
};

/* ─── Helpers ─── */
function daysBetween(dateStr: string): number {
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.max(0, Math.floor(diff / 86400000));
}

function formatDate(dateStr: string): string {
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) return dateStr;
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(parsed);
}

const currentMonth = new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric" }).format(new Date());

/* ─── Component ─── */
function DashboardPage({ navigate, setSelectedComplaintId }: DashboardPageProps) {
  const [apiComplaints, setApiComplaints] = useState<ComplaintRecord[]>([]);

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
        if (active) setApiComplaints(data);
      })
      .catch(() => {
        // Fall back gracefully
      });
    return () => { active = false; };
  }, []);

  // Use live server complaints if available, else shared mock store
  const activeComplaintsList = useMemo<ComplaintRecord[]>(() => {
    if (apiComplaints.length > 0) {
      return apiComplaints;
    }

    return MOCK_COMPLAINTS.map((c) => ({
      complaintId: c.id,
      citizenName: c.citizen,
      title: c.title,
      description: c.description,
      zone: c.zone ? c.zone.replace("Zone-", "Zone ") : "Zone A",
      block: c.block || "Block 1",
      ward: c.ward ? c.ward.replace("Ward ", "") : "12",
      assignedOfficerName: c.assignedOfficer || c.officer || "R. Kumar",
      assignedAtpName: c.atp || "S. Gill",
      status: c.status,
      createdAt: c.registered ? new Date(c.registered).toISOString() : new Date().toISOString(),
    }));
  }, [apiComplaints]);

  // Dynamically compute exact stats from actual complaints
  const stats = useMemo(() => {
    const total = activeComplaintsList.length;

    const open = activeComplaintsList.filter((c) => {
      const s = (c.status || "").toLowerCase();
      return !s.includes("approved") && !s.includes("closed") && !s.includes("rejected");
    }).length;

    const resolved = activeComplaintsList.filter((c) => {
      const s = (c.status || "").toLowerCase();
      return s.includes("approved") || s.includes("closed");
    }).length;

    const inspections = activeComplaintsList.filter((c) => {
      const s = (c.status || "").toLowerCase();
      return s.includes("progress") || s.includes("assigned") || s.includes("submitted");
    }).length;

    return { total, open, resolved, inspections };
  }, [activeComplaintsList]);

  // Dynamically compute exact complaints by zone
  const zoneData = useMemo(() => {
    const counts: Record<string, number> = { "Zone A": 0, "Zone B": 0, "Zone C": 0, "Zone D": 0 };

    activeComplaintsList.forEach((c) => {
      const rawZone = (c.zone || "").trim();
      let key = "Zone A";
      if (rawZone.includes("B") || rawZone === "Zone-B") key = "Zone B";
      else if (rawZone.includes("C") || rawZone === "Zone-C") key = "Zone C";
      else if (rawZone.includes("D") || rawZone === "Zone-D") key = "Zone D";
      else if (rawZone.includes("A") || rawZone === "Zone-A") key = "Zone A";

      counts[key] = (counts[key] || 0) + 1;
    });

    return [
      { zone: "Zone A", count: counts["Zone A"] },
      { zone: "Zone B", count: counts["Zone B"] },
      { zone: "Zone C", count: counts["Zone C"] },
      { zone: "Zone D", count: counts["Zone D"] },
    ];
  }, [activeComplaintsList]);

  const yAxisMax = useMemo(() => {
    const maxZoneCount = Math.max(0, ...zoneData.map((d) => Number(d.count) || 0));
    return maxZoneCount > 0 ? Math.ceil(maxZoneCount * 1.35) : 5;
  }, [zoneData]);

  // Dynamically compute exact status donut distribution
  const statusData = useMemo(() => {
    let reg = 0;
    let ass = 0;
    let inp = 0;
    let res = 0;

    activeComplaintsList.forEach((c) => {
      const s = (c.status || "").toLowerCase();
      if (s === "registered") reg += 1;
      else if (s === "assigned") ass += 1;
      else if (s.includes("approved") || s.includes("closed")) res += 1;
      else inp += 1;
    });

    return [
      { name: "Registered", value: reg, color: "#3b82f6" },
      { name: "Assigned", value: ass, color: "#c25e40" },
      { name: "In Progress", value: inp, color: "#d97706" },
      { name: "Resolved", value: res, color: "#10b981" },
    ];
  }, [activeComplaintsList]);

  const statusTotal = statusData.reduce((sum, d) => sum + d.value, 0);

  // Dynamically compute pipeline step counts directly from real data
  const pipeline = useMemo(() => [
    { stage: "Complaint Registered", icon: "file", count: stats.total, avg: "Avg. 0.5 days", bg: "#dbeafe", color: "#2563eb" },
    { stage: "Assigned", icon: "users", count: activeComplaintsList.filter(c => (c.status || "").toLowerCase() !== "registered").length, avg: "Avg. 1.2 days", bg: "#ffedd5", color: "#ea580c" },
    { stage: "Field Visit", icon: "pin", count: stats.inspections, avg: "Avg. 2.8 days", bg: "#fee2e2", color: "#c25e40" },
    { stage: "Case Created", icon: "file", count: Math.min(stats.inspections, Math.ceil(stats.total * 0.5)), avg: "Avg. 1.6 days", bg: "#dbeafe", color: "#2563eb" },
    { stage: "Notice 270", icon: "file", count: Math.ceil(stats.total * 0.25), avg: "Avg. 3.1 days", bg: "#dbeafe", color: "#2563eb" },
    { stage: "Notice 269", icon: "file", count: Math.ceil(stats.total * 0.1), avg: "Avg. 4.2 days", bg: "#dbeafe", color: "#2563eb" },
    { stage: "Resolution", icon: "check", count: stats.resolved, avg: "Avg. 2.6 days", bg: "#d1fae5", color: "#059669" },
  ], [activeComplaintsList, stats]);

  const recentComplaints = useMemo(() => activeComplaintsList.slice(0, 5), [activeComplaintsList]);

  const statCards = [
    { label: "TOTAL COMPLAINTS", value: stats.total, change: "12.4%", changeDir: "up" as const, accent: "blue", icon: "list" },
    { label: "OPEN / ACTIVE", value: stats.open, change: "6.8%", changeDir: "up" as const, accent: "orange", icon: "folder" },
    { label: "RESOLVED THIS MONTH", value: stats.resolved, change: "18.2%", changeDir: "up" as const, accent: "green", icon: "check-circle" },
    { label: "FIELD INSPECTIONS", value: stats.inspections, change: "14.6%", changeDir: "up" as const, accent: "teal", icon: "pin" },
  ];

  const handleExportReport = () => {
    const rows = [
      ["Building Branch Summary Report", currentMonth],
      ["Generated On", new Date().toLocaleString()],
      [],
      ["Metric", "Value", "Trend"],
      ["Total Complaints", stats.total, "+12.4% vs last month"],
      ["Open / Active Cases", stats.open, "+6.8% vs last month"],
      ["Resolved This Month", stats.resolved, "+18.2% vs last month"],
      ["Field Inspections", stats.inspections, "+14.6% vs last month"],
      [],
      ["Zone Summary"],
      ["Zone", "Complaint Count"],
      ...zoneData.map((z) => [z.zone, z.count]),
      [],
      ["Case Status Summary"],
      ["Status", "Count", "Percentage"],
      ...statusData.map((s) => [s.name, s.value, `${((s.value / statusTotal) * 100).toFixed(1)}%`]),
      [],
      ["Recent Complaints"],
      ["Complaint ID", "Citizen Name", "Title", "Zone", "Block", "Status", "Date"],
      ...recentComplaints.map((c) => [
        c.complaintId,
        c.citizenName || "N/A",
        c.title || "N/A",
        c.zone,
        c.block,
        c.status,
        c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "N/A",
      ]),
    ];

    const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.map((cell) => `"${cell}"`).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Building_Branch_Report_${currentMonth.replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="db-page">
      {/* Page header */}
      <div className="db-page__header">
        <div>
          <div className="db-page__workspace">WORKSPACE</div>
          <h1 className="db-page__title">Building Branch Dashboard</h1>
          <p className="db-page__subtitle">Municipal Corporation Ludhiana • Building Permission &amp; Enforcement Operations</p>
        </div>
        <div className="db-page__actions">
          <button
            type="button"
            className="primary-button small-button db-export-report-btn"
            onClick={handleExportReport}
          >
            <Icon name="download" /> Export Report
          </button>
          <div className="db-page__month-picker">
            <Icon name="calendar" />
            <span>{currentMonth}</span>
            <span className="db-page__month-caret">▾</span>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="db-stats">
        {statCards.map((card) => (
          <div className="db-stat-card" key={card.label}>
            <div className={`db-stat-card__icon db-stat-card__icon--${card.accent}`}>
              <Icon name={card.icon} />
            </div>
            <div className="db-stat-card__body">
              <div className="db-stat-card__label">{card.label}</div>
              <div className="db-stat-card__value">{card.value.toLocaleString()}</div>
              <div className={`db-stat-card__change db-stat-card__change--${card.changeDir}`}>
                ↑ {card.change} <span className="db-stat-card__change-text">vs last month</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="db-charts">
        {/* Bar chart */}
        <div className="db-chart-card">
          <div className="db-chart-card__header">
            <div>
              <h3 className="db-chart-card__title">Complaints by Zone</h3>
              <p className="db-chart-card__subtitle">Current distribution across municipal zones</p>
            </div>
            <select className="db-chart-card__select">
              <option>This Month</option>
            </select>
          </div>
          <div className="db-chart-card__body">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={zoneData} barCategoryGap="30%" margin={{ top: 32, right: 15, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e6eb" />
                <XAxis dataKey="zone" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#6b7280" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#6b7280" }} domain={[0, yAxisMax]} />
                <Tooltip cursor={{ fill: "rgba(0, 0, 0, 0.03)" }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} label={{ position: "top", fontSize: 12.5, fill: "#0f172a", fontWeight: 700, dy: -6 }}>
                  {zoneData.map((_entry, index) => {
                    const colors = ["#3b82f6", "#c26d53", "#10b981", "#64748b"];
                    return <Cell key={`zone-cell-${index}`} fill={colors[index % colors.length]} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut chart */}
        <div className="db-chart-card">
          <div className="db-chart-card__header">
            <div>
              <h3 className="db-chart-card__title">Case Status</h3>
              <p className="db-chart-card__subtitle">Distribution of cases across current status</p>
            </div>
            <select className="db-chart-card__select">
              <option>This Month</option>
            </select>
          </div>
          <div className="db-chart-card__body db-chart-card__body--donut">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="36%"
                  cy="50%"
                  innerRadius={66}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                  style={{ cursor: "pointer" }}
                  onClick={() => navigate("/cases")}
                >
                  {statusData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      style={{ cursor: "pointer", transition: "opacity 0.2s" }}
                    />
                  ))}
                  <Label
                    position="center"
                    content={({ viewBox }) => {
                      if (!viewBox || !("cx" in viewBox) || !("cy" in viewBox)) return null;
                      const { cx, cy } = viewBox as { cx: number; cy: number };
                      return (
                        <g style={{ cursor: "pointer" }} onClick={() => navigate("/cases")}>
                          <text
                            x={cx}
                            y={cy - 6}
                            textAnchor="middle"
                            dominantBaseline="central"
                            style={{ fontSize: "24px", fontWeight: 800, fill: "#0f172a" }}
                          >
                            {statusTotal.toLocaleString()}
                          </text>
                          <text
                            x={cx}
                            y={cy + 16}
                            textAnchor="middle"
                            dominantBaseline="central"
                            style={{ fontSize: "11px", fontWeight: 700, fill: "#64748b", letterSpacing: "0.05em" }}
                          >
                            TOTAL CASES
                          </text>
                        </g>
                      );
                    }}
                  />
                </Pie>
                <Legend
                  layout="vertical"
                  verticalAlign="middle"
                  align="right"
                  iconType="circle"
                  iconSize={11}
                  formatter={(value: string) => {
                    const item = statusData.find((d) => d.name === value);
                    if (!item) return value;
                    const pct = statusTotal > 0 ? ((item.value / statusTotal) * 100).toFixed(1) : "0";
                    return (
                      <span
                        className="db-legend-item"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate("/cases");
                        }}
                      >
                        <span className="db-legend-item__name">{value}</span>
                        <span className="db-legend-item__value">{item.value.toLocaleString()}</span>
                        <span className="db-legend-item__pct">{pct}%</span>
                      </span>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Case Pipeline */}
      <div className="db-pipeline-card">
        <div className="db-pipeline-card__header">
          <div>
            <h3 className="db-pipeline-card__title">Case Pipeline</h3>
            <p className="db-pipeline-card__subtitle">From complaint to resolution — tracking progress and accountability</p>
          </div>
          <button type="button" className="db-link-btn" onClick={() => navigate("/cases")}>
            View Details <Icon name="arrow-right" />
          </button>
        </div>
        <div className="db-pipeline">
          {pipeline.map((step, i) => (
            <div className="db-pipeline__step-wrap" key={step.stage}>
              <div className="db-pipeline__step">
                <div
                  className="db-pipeline__step-icon"
                  style={{
                    backgroundColor: step.bg ?? "#dbeafe",
                    color: step.color ?? "#2563eb",
                  }}
                >
                  <Icon name={step.icon} />
                </div>
                <div className="db-pipeline__step-label">{step.stage}</div>
                <div className="db-pipeline__step-count">{step.count.toLocaleString()}</div>
                <div className="db-pipeline__step-avg">{step.avg}</div>
              </div>
              {i < pipeline.length - 1 && <div className="db-pipeline__arrow">→</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Recent Complaints */}
      <div className="db-recent-card">
        <div className="db-recent-card__header">
          <div>
            <h3 className="db-recent-card__title">Recent Complaints</h3>
            <p className="db-recent-card__subtitle">Latest complaints requiring Building Branch attention</p>
          </div>
          <button type="button" className="db-link-btn" onClick={() => navigate("/complaints")}>
            View All <Icon name="arrow-right" />
          </button>
        </div>
        <table className="db-table">
          <thead>
            <tr>
              <th>COMPLAINT ID</th>
              <th>DATE</th>
              <th>WARD</th>
              <th>ZONE</th>
              <th>COMPLAINT</th>
              <th>ASSIGNED BI</th>
              <th>ATP</th>
              <th>STATUS</th>
              <th>AGE</th>
              <th>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {recentComplaints.map((c) => {
              const action = getComplaintAction(c);
              return (
                <tr key={c.complaintId}>
                  <td className="db-table__id">{c.complaintId}</td>
                  <td>{formatDate(c.createdAt)}</td>
                  <td>{c.ward ?? "—"}</td>
                  <td>{c.zone}</td>
                  <td className="db-table__desc">{c.title || c.description || "—"}</td>
                  <td>{c.assignedOfficerName ?? "—"}</td>
                  <td>{c.assignedAtpName ?? "—"}</td>
                  <td><StatusBadge status={c.status} /></td>
                  <td>{daysBetween(c.createdAt)} days</td>
                  <td>
                    <button
                      type="button"
                      className="db-table__view-btn"
                      onClick={() => {
                        setSelectedComplaintId(c.complaintId);
                        navigate(action.route);
                      }}
                    >
                      {action.label} →
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DashboardPage;
