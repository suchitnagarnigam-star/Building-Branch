import { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, Label,
} from "recharts";
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
  title?: string;
  description?: string;
  zone: string;
  block: string;
  ward?: string | null;
  assignedOfficerName: string | null;
  assignedAtpName?: string | null;
  status: Status;
  createdAt: string;
};

/* ─── Demo fallback data ─── */

const DEMO_STATS = {
  total: 1248, open: 342, resolved: 706, inspections: 428,
};

const DEMO_ZONE_DATA = [
  { zone: "Zone A", count: 278 },
  { zone: "Zone B", count: 236 },
  { zone: "Zone C", count: 198 },
  { zone: "Zone D", count: 148 },
];

const DEMO_STATUS_DATA = [
  { name: "Registered", value: 312, color: "#3b82f6" },
  { name: "Assigned", value: 298, color: "#c25e40" },
  { name: "In Progress", value: 412, color: "#d97706" },
  { name: "Resolved", value: 226, color: "#10b981" },
];

const DEMO_PIPELINE = [
  { stage: "Complaint\nRegistered", icon: "list", count: 1248, avg: "Avg. 0.5 days" },
  { stage: "Assigned", icon: "users", count: 1102, avg: "Avg. 1.2 days" },
  { stage: "Field Visit", icon: "pin", count: 856, avg: "Avg. 2.8 days" },
  { stage: "Case Created", icon: "folder", count: 642, avg: "Avg. 1.6 days" },
  { stage: "Notice 270", icon: "file", count: 428, avg: "Avg. 3.1 days" },
  { stage: "Notice 269", icon: "file", count: 214, avg: "Avg. 4.2 days" },
  { stage: "Resolution", icon: "check-circle", count: 226, avg: "Avg. 2.6 days" },
];

const DEMO_COMPLAINTS: ComplaintRecord[] = [
  { complaintId: "MCL-2025-0148", citizenName: "", title: "Illegal construction on residential plot", zone: "Zone A", block: "", ward: "12", assignedOfficerName: "R. Kumar", assignedAtpName: "S. Gill", status: "Registered", createdAt: "2025-09-16T00:00:00Z" },
  { complaintId: "MCL-2025-0147", citizenName: "", title: "Construction without permission", zone: "Zone B", block: "", ward: "8", assignedOfficerName: "M. Singh", assignedAtpName: "A. Verma", status: "In progress", createdAt: "2025-09-16T00:00:00Z" },
  { complaintId: "MCL-2025-0146", citizenName: "", title: "Encroachment on public land", zone: "Zone C", block: "", ward: "21", assignedOfficerName: "P. Sharma", assignedAtpName: "R. Kaur", status: "Assigned", createdAt: "2025-09-15T00:00:00Z" },
  { complaintId: "MCL-2025-0145", citizenName: "", title: "Additional floors without approval", zone: "Zone A", block: "", ward: "6", assignedOfficerName: "J. Singh", assignedAtpName: "M. Bhatia", status: "Rework required", createdAt: "2025-09-15T00:00:00Z" },
  { complaintId: "MCL-2025-0144", citizenName: "", title: "Change of land use (commercial)", zone: "Zone D", block: "", ward: "18", assignedOfficerName: "K. Gill", assignedAtpName: "S. Nayyar", status: "Approved / Closed", createdAt: "2025-09-14T00:00:00Z" },
];

/* ─── Helpers ─── */

function daysBetween(dateStr: string): number {
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.max(0, Math.floor(diff / 86400000));
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(dateStr));
}

const currentMonth = new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric" }).format(new Date());



/* ─── Component ─── */

function DashboardPage({ navigate, setSelectedComplaintId }: DashboardPageProps) {
  const [complaints, setComplaints] = useState<ComplaintRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
    return () => { active = false; };
  }, []);

  const useLive = !loading && !error && complaints.length > 0;

  const stats = useMemo(() => {
    if (!useLive) return DEMO_STATS;
    const total = complaints.length;
    const open = complaints.filter((c) =>
      ["registered", "assigned", "in progress"].includes(c.status.toLowerCase()),
    ).length;
    const resolved = complaints.filter((c) =>
      c.status.toLowerCase().includes("approved") || c.status.toLowerCase().includes("closed"),
    ).length;
    return { total, open, resolved, inspections: 0 };
  }, [complaints, useLive]);

  const zoneData = useMemo(() => {
    if (!useLive) return DEMO_ZONE_DATA;
    const zoneCounts: Record<string, number> = {};
    complaints.forEach((c) => { zoneCounts[c.zone] = (zoneCounts[c.zone] || 0) + 1; });
    return Object.entries(zoneCounts).map(([zone, count]) => ({ zone, count }));
  }, [complaints, useLive]);

  const statusData = useMemo(() => {
    if (!useLive) return DEMO_STATUS_DATA;
    const statusCounts: Record<string, number> = {};
    complaints.forEach((c) => { statusCounts[c.status] = (statusCounts[c.status] || 0) + 1; });
    const colorMap: Record<string, string> = {
      "Registered": "#2563EB", "Assigned": "#EA580C", "In progress": "#D97706", "Approved / Closed": "#16A34A",
    };
    return Object.entries(statusCounts).map(([name, value]) => ({
      name, value, color: colorMap[name] || "#6b7280",
    }));
  }, [complaints, useLive]);

  const statusTotal = statusData.reduce((sum, d) => sum + d.value, 0);

  const recentComplaints = useLive ? complaints.slice(0, 5) : DEMO_COMPLAINTS;
  const pipeline = DEMO_PIPELINE;

  const statCards = [
    { label: "TOTAL COMPLAINTS", value: stats.total, change: "12.4%", changeDir: "up" as const, accent: "blue", icon: "list" },
    { label: "OPEN / ACTIVE", value: stats.open, change: "6.8%", changeDir: "up" as const, accent: "orange", icon: "folder" },
    { label: "RESOLVED THIS MONTH", value: stats.resolved, change: "18.2%", changeDir: "up" as const, accent: "green", icon: "check-circle" },
    { label: "FIELD INSPECTIONS", value: stats.inspections, change: "14.6%", changeDir: "up" as const, accent: "teal", icon: "pin" },
  ];

  return (
    <div className="db-page">
      {/* Page header */}
      <div className="db-page__header">
        <div>
          <div className="db-page__workspace">WORKSPACE</div>
          <h1 className="db-page__title">Building Branch Dashboard</h1>
          <p className="db-page__subtitle">Municipal Corporation Ludhiana • Building Permission &amp; Enforcement Operations</p>
        </div>
        <div className="db-page__month-picker">
          <Icon name="calendar" />
          <span>{currentMonth}</span>
          <span className="db-page__month-caret">▾</span>
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
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#6b7280" }} domain={[0, "dataMax + 40"]} />
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
                  cx="32%"
                  cy="50%"
                  innerRadius={68}
                  outerRadius={102}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                  <Label
                    position="center"
                    content={({ viewBox }) => {
                      if (!viewBox || !("cx" in viewBox) || !("cy" in viewBox)) return null;
                      const { cx, cy } = viewBox as { cx: number; cy: number };
                      return (
                        <g>
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
                      <span className="db-legend-item">
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
                <div className="db-pipeline__step-icon">
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
            {recentComplaints.map((c) => (
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
                      navigate(`/complaints/${c.complaintId}`);
                    }}
                  >
                    View →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DashboardPage;
