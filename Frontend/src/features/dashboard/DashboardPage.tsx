import { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { DonutChart, type DonutChartSegment } from "@/components/ui/donut-chart";
import Icon from "../../shared/components/Icon";
import StatusBadge from "../../shared/components/StatusBadge";
import type { Status } from "../../shared/types";
import { API_BASE_URL } from "../../shared/utils/apiConfig";
import { getComplaintAction } from "../../shared/utils/complaintNavigation";

type DashboardPageProps = {
  navigate: (route: string) => void;
  setSelectedComplaintId: (id: string) => void;
};

/* ─── Types ─── */
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

interface AnalyticsOverview {
  stats: {
    total: number;
    open: number;
    resolved: number;
    inspections: number;
  };
  zones: { zone: string; count: number }[];
  statuses: { status: string; count: number }[];
  pipeline: {
    registered: number;
    assigned: number;
    fieldVisits: number;
    casesCreated: number;
    notices270: number;
    notices269: number;
    resolved: number;
  };
  recentComplaints: ComplaintRecord[];
}

const INITIAL_DATA: AnalyticsOverview = {
  stats: { total: 0, open: 0, resolved: 0, inspections: 0 },
  zones: [],
  statuses: [],
  pipeline: {
    registered: 0,
    assigned: 0,
    fieldVisits: 0,
    casesCreated: 0,
    notices270: 0,
    notices269: 0,
    resolved: 0,
  },
  recentComplaints: [],
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
  const [data, setData] = useState<AnalyticsOverview>(INITIAL_DATA);
  const [hoveredDonutSegment, setHoveredDonutSegment] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`${API_BASE_URL}/analytics/overview`)
      .then(async (response) => {
        const result = (await response.json()) as { success?: boolean } & AnalyticsOverview;
        if (!response.ok || !result.success) {
          throw new Error("Unable to load analytics.");
        }
        return result;
      })
      .then((overview) => {
        if (active) {
          setData(overview);
        }
      })
      .catch((error) => {
        console.error("Dashboard analytics fetch failed:", error);
      });

    return () => {
      active = false;
    };
  }, []);

  const stats = data.stats;

  // Normalized complaints by zone: ensure canonical Zone A, B, C, D order
  const zoneData = useMemo(() => {
    const canonical = ["Zone A", "Zone B", "Zone C", "Zone D"];
    const countMap: Record<string, number> = { "Zone A": 0, "Zone B": 0, "Zone C": 0, "Zone D": 0 };

    data.zones.forEach((z) => {
      const raw = (z.zone || "").trim();
      let key = "Zone A";
      if (raw.includes("B") || raw === "Zone-B") key = "Zone B";
      else if (raw.includes("C") || raw === "Zone-C") key = "Zone C";
      else if (raw.includes("D") || raw === "Zone-D") key = "Zone D";
      else if (raw.includes("A") || raw === "Zone-A") key = "Zone A";

      countMap[key] = (countMap[key] || 0) + Number(z.count);
    });

    return canonical.map((zone) => ({ zone, count: countMap[zone] }));
  }, [data.zones]);

  const yAxisMax = useMemo(() => {
    const maxZoneCount = Math.max(0, ...zoneData.map((d) => Number(d.count) || 0));
    return maxZoneCount > 0 ? Math.ceil(maxZoneCount * 1.35) : 5;
  }, [zoneData]);

  // Aggregate statuses into standard 4 lifecycle categories
  const statusData = useMemo(() => {
    let reg = 0;
    let ass = 0;
    let inp = 0;
    let res = 0;

    data.statuses.forEach((s) => {
      const name = (s.status || "").toLowerCase();
      const count = Number(s.count) || 0;
      if (name === "registered") reg += count;
      else if (name === "assigned") ass += count;
      else if (name.includes("approved") || name.includes("closed") || name.includes("resolved")) res += count;
      else inp += count;
    });

    return [
      { name: "Registered", value: reg, color: "#3b82f6" },
      { name: "Assigned", value: ass, color: "#c25e40" },
      { name: "In Progress", value: inp, color: "#d97706" },
      { name: "Resolved", value: res, color: "#10b981" },
    ];
  }, [data.statuses]);

  const statusTotal = statusData.reduce((sum, d) => sum + d.value, 0);

  const donutSegments: DonutChartSegment[] = useMemo(() => [
    { label: "Registered", value: statusData[0].value, color: "#3b82f6" },
    { label: "Assigned", value: statusData[1].value, color: "#ea580c" },
    { label: "In Progress", value: statusData[2].value, color: "#d97706" },
    { label: "Resolved", value: statusData[3].value, color: "#10b981" },
  ], [statusData]);

  const activeDonutSeg = donutSegments.find((s) => s.label === hoveredDonutSegment);
  const displayDonutVal = activeDonutSeg ? activeDonutSeg.value : statusTotal;
  const displayDonutLbl = activeDonutSeg ? activeDonutSeg.label : "TOTAL CASES";
  const displayDonutPct = activeDonutSeg && statusTotal > 0 ? Math.round((activeDonutSeg.value / statusTotal) * 100) : 100;

  // Real pipeline stage counts from backend analytics
  const pipeline = useMemo(() => [
    { stage: "Complaint Registered", icon: "file", count: data.pipeline.registered, bg: "#dbeafe", color: "#2563eb" },
    { stage: "Assigned", icon: "users", count: data.pipeline.assigned, bg: "#ffedd5", color: "#ea580c" },
    { stage: "Field Visit", icon: "pin", count: data.pipeline.fieldVisits, bg: "#fee2e2", color: "#c25e40" },
    { stage: "Case Created", icon: "file", count: data.pipeline.casesCreated, bg: "#dbeafe", color: "#2563eb" },
    { stage: "Notice 270", icon: "file", count: data.pipeline.notices270, bg: "#dbeafe", color: "#2563eb" },
    { stage: "Notice 269", icon: "file", count: data.pipeline.notices269, bg: "#dbeafe", color: "#2563eb" },
    { stage: "Resolution", icon: "check", count: data.pipeline.resolved, bg: "#d1fae5", color: "#059669" },
  ], [data.pipeline]);

  const statCards = [
    { label: "TOTAL COMPLAINTS", value: stats.total, accent: "blue", icon: "list" },
    { label: "OPEN / ACTIVE", value: stats.open, accent: "orange", icon: "folder" },
    { label: "RESOLVED THIS MONTH", value: stats.resolved, accent: "green", icon: "check-circle" },
    { label: "FIELD INSPECTIONS", value: stats.inspections, accent: "teal", icon: "pin" },
  ];

  const handleExportReport = () => {
    const rows = [
      ["Building Branch Summary Report", currentMonth],
      ["Generated On", new Date().toLocaleString()],
      [],
      ["Metric", "Value"],
      ["Total Complaints", stats.total],
      ["Open / Active Cases", stats.open],
      ["Resolved This Month", stats.resolved],
      ["Field Inspections", stats.inspections],
      [],
      ["Zone Summary"],
      ["Zone", "Complaint Count"],
      ...zoneData.map((z) => [z.zone, z.count]),
      [],
      ["Case Status Summary"],
      ["Status", "Count", "Percentage"],
      ...statusData.map((s) => [s.name, s.value, `${statusTotal > 0 ? ((s.value / statusTotal) * 100).toFixed(1) : 0}%`]),
      [],
      ["Recent Complaints"],
      ["Complaint ID", "Citizen Name", "Title", "Zone", "Block", "Status", "Date"],
      ...data.recentComplaints.map((c) => [
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
          <div className="db-chart-card__body db-chart-card__body--donut" style={{ display: "flex", alignItems: "center", justifyContent: "space-around", flexWrap: "wrap", gap: "16px", minHeight: "240px", padding: "12px 16px" }}>
            <div style={{ cursor: "pointer" }} onClick={() => navigate("/cases")}>
              <DonutChart
                data={donutSegments}
                size={210}
                strokeWidth={26}
                animationDuration={1.1}
                animationDelayPerSegment={0.06}
                highlightOnHover={true}
                onSegmentHover={(seg) => setHoveredDonutSegment(seg ? seg.label : null)}
                centerContent={
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      textAlign: "center",
                      userSelect: "none",
                    }}
                  >
                    <span style={{ fontSize: "22px", fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>
                      {displayDonutVal.toLocaleString()}
                    </span>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: "#64748b", letterSpacing: "0.05em", marginTop: "3px", textTransform: "uppercase" }}>
                      {displayDonutLbl}
                    </span>
                    {activeDonutSeg && (
                      <span style={{ fontSize: "11px", fontWeight: 700, color: activeDonutSeg.color, marginTop: "2px" }}>
                        [{displayDonutPct}%]
                      </span>
                    )}
                  </div>
                }
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", minWidth: "190px" }}>
              {donutSegments.map((item) => {
                const pct = statusTotal > 0 ? ((item.value / statusTotal) * 100).toFixed(1) : "0";
                const isHovered = hoveredDonutSegment === item.label;
                return (
                  <div
                    key={item.label}
                    className="db-legend-item"
                    style={{
                      background: isHovered ? "#f1f5f9" : "transparent",
                      borderRadius: "6px",
                      padding: "4px 8px",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={() => setHoveredDonutSegment(item.label)}
                    onMouseLeave={() => setHoveredDonutSegment(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate("/cases");
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: item.color, flexShrink: 0 }} />
                      <span className="db-legend-item__name">{item.label}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span className="db-legend-item__value">{item.value.toLocaleString()}</span>
                      <span className="db-legend-item__pct">{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
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
            {data.recentComplaints.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: "center", padding: "24px", color: "var(--muted)" }}>
                  No complaints found
                </td>
              </tr>
            ) : (
              data.recentComplaints.map((c) => {
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
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DashboardPage;
