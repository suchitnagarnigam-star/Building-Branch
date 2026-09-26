import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";
import Icon from "../../shared/components/Icon";
import StatusBadge from "../../shared/components/StatusBadge";
import type { Status } from "../../shared/types";
import { API_BASE_URL } from "../../shared/utils/apiConfig";

type DashboardPageProps = {
  navigate: (route: string) => void;
  setSelectedComplaintId: (id: string) => void;
};

/* ─── Types ─── */
interface DashboardData {
  kpi: {
    totalComplaints: number;
    totalFieldVisits: number;
    linkedFieldVisits: number;
    standaloneFieldVisits: number;
    totalCases: number;
    resolvedCases: number;
  };
  complaintStatus: { status: string; count: number }[];
  zoneDistribution: { zone: string; count: number }[];
  enforcement: {
    notices270: number;
    notices269: number;
    standaloneFieldVisits: number;
  };
  needsAttention: {
    complaintsNoFieldVisit: number;
    notices270Expired: number;
    violatorRepliesPending: number;
    casesNoNotice: number;
  };
  recentComplaints: {
    complaintId: string;
    zone: string;
    status: Status;
    createdAt: string;
    ageDays: number;
    caseId?: string | null;
  }[];
}

const INITIAL_DATA: DashboardData = {
  kpi: {
    totalComplaints: 0,
    totalFieldVisits: 0,
    linkedFieldVisits: 0,
    standaloneFieldVisits: 0,
    totalCases: 0,
    resolvedCases: 0,
  },
  complaintStatus: [],
  zoneDistribution: [],
  enforcement: {
    notices270: 0,
    notices269: 0,
    standaloneFieldVisits: 0,
  },
  needsAttention: {
    complaintsNoFieldVisit: 0,
    notices270Expired: 0,
    violatorRepliesPending: 0,
    casesNoNotice: 0,
  },
  recentComplaints: [],
};

const currentMonth = new Intl.DateTimeFormat("en-IN", {
  month: "short",
  year: "numeric",
}).format(new Date());

/* ─── Component ─── */
function DashboardPage({ navigate, setSelectedComplaintId }: DashboardPageProps) {
  const [data, setData] = useState<DashboardData>(INITIAL_DATA);

  useEffect(() => {
    let active = true;
    fetch(`${API_BASE_URL}/analytics/overview`)
      .then(async (response) => {
        const result = (await response.json()) as { success?: boolean } & DashboardData;
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

  // 1. KPI cards mapping
  const kpiCards = [
    {
      label: "TOTAL COMPLAINTS",
      value: data.kpi.totalComplaints,
      accent: "blue",
      icon: "file",
      subtitle: null,
    },
    {
      label: "FIELD VISITS",
      value: data.kpi.totalFieldVisits,
      accent: "green",
      icon: "pin",
      subtitle: `${data.kpi.linkedFieldVisits} complaint-linked · ${data.kpi.standaloneFieldVisits} standalone`,
    },
    {
      label: "TOTAL CASES",
      value: data.kpi.totalCases,
      accent: "orange",
      icon: "folder",
      subtitle: null,
    },
    {
      label: "RESOLVED",
      value: data.kpi.resolvedCases,
      accent: "purple",
      icon: "check-circle",
      subtitle: null,
    },
  ];

  // 2. Complaint Status horizontal bars
  const complaintStatusData = useMemo(() => {
    const regItem = data.complaintStatus.find(
      (s) => (s.status || "").toLowerCase() === "registered"
    );
    const assItem = data.complaintStatus.find(
      (s) => (s.status || "").toLowerCase() === "assigned"
    );

    return [
      {
        label: "Registered",
        sublabel: "awaiting action",
        count: regItem ? Number(regItem.count) : 0,
        color: "#c25e40",
      },
      {
        label: "Assigned",
        sublabel: "field visit done",
        count: assItem ? Number(assItem.count) : 0,
        color: "#10b981",
      },
    ];
  }, [data.complaintStatus]);

  const statusXMax = useMemo(() => {
    const maxVal = Math.max(0, ...complaintStatusData.map((d) => d.count));
    return maxVal > 0 ? Math.ceil((maxVal * 1.35) / 5) * 5 : 20;
  }, [complaintStatusData]);

  // 3. Needs Attention items
  const attentionItems = useMemo(
    () => [
      {
        label: "Complaints with no field visit yet",
        count: data.needsAttention.complaintsNoFieldVisit,
        priorityLevel: "HIGH" as const,
        dotColor: "#ef4444",
        route: "/complaints",
      },
      {
        label: "Section 270 notices past reply deadline",
        count: data.needsAttention.notices270Expired,
        priorityLevel: "MEDIUM" as const,
        dotColor: "#ea580c",
        route: "/notices",
      },
      {
        label: "Violator replies awaiting ATP review",
        count: data.needsAttention.violatorRepliesPending,
        priorityLevel: "MEDIUM" as const,
        dotColor: "#f59e0b",
        route: "/cases",
      },
      {
        label: "Cases with no notice issued yet",
        count: data.needsAttention.casesNoNotice,
        priorityLevel: "LOW" as const,
        dotColor: "#eab308",
        route: "/cases",
      },
    ],
    [data.needsAttention]
  );

  // 4. Normalized complaints by zone
  const zoneData = useMemo(() => {
    const canonical = ["Zone A", "Zone B", "Zone C", "Zone D"];
    const countMap: Record<string, number> = {
      "Zone A": 0,
      "Zone B": 0,
      "Zone C": 0,
      "Zone D": 0,
    };

    data.zoneDistribution.forEach((z) => {
      const raw = (z.zone || "").trim();
      let key = "Zone A";
      if (raw.includes("B") || raw === "Zone-B") key = "Zone B";
      else if (raw.includes("C") || raw === "Zone-C") key = "Zone C";
      else if (raw.includes("D") || raw === "Zone-D") key = "Zone D";
      else if (raw.includes("A") || raw === "Zone-A") key = "Zone A";

      countMap[key] = (countMap[key] || 0) + Number(z.count);
    });

    return canonical.map((zone) => ({ zone, count: countMap[zone] }));
  }, [data.zoneDistribution]);

  const yAxisMax = useMemo(() => {
    const maxZoneCount = Math.max(0, ...zoneData.map((d) => Number(d.count) || 0));
    return maxZoneCount > 0 ? Math.ceil(maxZoneCount * 1.35) : 10;
  }, [zoneData]);

  const handleExportReport = () => {
    const rows = [
      ["Building Branch Summary Report", currentMonth],
      ["Generated On", new Date().toLocaleString()],
      [],
      ["KPI Metrics", "Value"],
      ["Total Complaints", data.kpi.totalComplaints],
      ["Total Field Visits", data.kpi.totalFieldVisits],
      ["Linked Field Visits", data.kpi.linkedFieldVisits],
      ["Standalone Field Visits", data.kpi.standaloneFieldVisits],
      ["Total Cases", data.kpi.totalCases],
      ["Resolved Cases", data.kpi.resolvedCases],
      [],
      ["Enforcement Activity", "Count"],
      ["Section 270 Notices Issued", data.enforcement.notices270],
      ["Section 269 Notices Issued", data.enforcement.notices269],
      ["Standalone Field Visits", data.enforcement.standaloneFieldVisits],
      [],
      ["Needs Attention", "Count", "Priority"],
      ...attentionItems.map((item) => [item.label, item.count, item.priorityLevel]),
      [],
      ["Zone Summary", "Count"],
      ...zoneData.map((z) => [z.zone, z.count]),
      [],
      ["Recent Complaints"],
      ["Complaint ID", "Zone", "Status", "Age (Days)"],
      ...data.recentComplaints.map((c) => [c.complaintId, c.zone, c.status, c.ageDays ?? 0]),
    ];

    const csvContent =
      "data:text/csv;charset=utf-8," +
      rows.map((e) => e.map((cell) => `"${cell}"`).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Building_Branch_Report_${currentMonth.replace(/\s+/g, "_")}.csv`
    );
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
          <p className="db-page__subtitle">
            Municipal Corporation Ludhiana • Building Permission &amp; Enforcement Operations
          </p>
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

      {/* Row 1: KPI cards */}
      <div className="db-stats">
        {kpiCards.map((card) => (
          <div className="db-stat-card" key={card.label}>
            <div className={`db-stat-card__icon db-stat-card__icon--${card.accent}`}>
              <Icon name={card.icon} />
            </div>
            <div className="db-stat-card__body">
              <div className="db-stat-card__label">{card.label}</div>
              <div className="db-stat-card__value">{card.value.toLocaleString()}</div>
              {card.subtitle && (
                <div className="db-stat-card__subtitle">{card.subtitle}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Row 2: Complaint Status & Enforcement Activity */}
      <div className="db-charts">
        {/* Left: Complaint Status horizontal bar chart */}
        <div className="db-chart-card">
          <div className="db-chart-card__header">
            <div>
              <h3 className="db-chart-card__title">Complaint Status</h3>
              <p className="db-chart-card__subtitle">
                Distribution of complaints across current status
              </p>
            </div>
          </div>
          <div className="db-chart-card__body">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart
                layout="vertical"
                data={complaintStatusData}
                margin={{ top: 20, right: 35, left: 10, bottom: 5 }}
                barSize={22}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e4e6eb" />
                <XAxis
                  type="number"
                  domain={[0, statusXMax]}
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  width={110}
                  tick={({ x, y, payload }) => {
                    const item = complaintStatusData.find((d) => d.label === payload.value);
                    const posX = (Number(x) || 0) - 8;
                    const posY = Number(y) || 0;
                    return (
                      <g transform={`translate(${posX},${posY})`}>
                        <text
                          textAnchor="end"
                          fill="#0f172a"
                          fontSize="12.5"
                          fontWeight="700"
                          dy="-2"
                        >
                          {item?.label}
                        </text>
                        <text
                          textAnchor="end"
                          fill="#64748b"
                          fontSize="10.5"
                          fontWeight="400"
                          dy="12"
                        >
                          {item?.sublabel}
                        </text>
                      </g>
                    );
                  }}
                />
                <Tooltip cursor={{ fill: "rgba(0, 0, 0, 0.03)" }} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {complaintStatusData.map((entry, index) => (
                    <Cell key={`status-cell-${index}`} fill={entry.color} />
                  ))}
                  <LabelList
                    dataKey="count"
                    position="right"
                    style={{ fontSize: "13px", fontWeight: "700", fill: "#0f172a" }}
                    offset={8}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Enforcement Activity list panel */}
        <div className="db-chart-card">
          <div className="db-chart-card__header">
            <div>
              <h3 className="db-chart-card__title">Enforcement Activity</h3>
              <p className="db-chart-card__subtitle">Key enforcement actions for this month</p>
            </div>
          </div>
          <div className="db-chart-card__body">
            <div className="db-enforcement-list">
              <div className="db-enforcement-item">
                <div className="db-enforcement-left">
                  <span className="db-enforcement-dot" style={{ backgroundColor: "#f59e0b" }} />
                  <span className="db-enforcement-label">Section 270 Notices issued</span>
                </div>
                <span className="db-enforcement-count">
                  {data.enforcement.notices270.toLocaleString()}
                </span>
              </div>
              <div className="db-enforcement-item">
                <div className="db-enforcement-left">
                  <span className="db-enforcement-dot" style={{ backgroundColor: "#ef4444" }} />
                  <span className="db-enforcement-label">Section 269 Notices issued</span>
                </div>
                <span className="db-enforcement-count">
                  {data.enforcement.notices269.toLocaleString()}
                </span>
              </div>
              <div className="db-enforcement-item">
                <div className="db-enforcement-left">
                  <span className="db-enforcement-dot" style={{ backgroundColor: "#2563eb" }} />
                  <span className="db-enforcement-label">Standalone Field Visits</span>
                </div>
                <span className="db-enforcement-count">
                  {data.enforcement.standaloneFieldVisits.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Needs Attention full-width table */}
      <div className="db-attention-card">
        <div className="db-attention-card__header">
          <div className="db-attention-card__icon">⚠️</div>
          <div>
            <h3 className="db-attention-card__title">Needs Attention</h3>
            <p className="db-attention-card__subtitle">
              Key items requiring Building Branch attention
            </p>
          </div>
        </div>
        <table className="db-attention-table">
          <thead>
            <tr>
              <th>ITEM</th>
              <th>COUNT</th>
              <th>PRIORITY</th>
              <th>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {attentionItems.map((item) => (
              <tr key={item.label}>
                <td>
                  <div className="db-attention-item-cell">
                    <span
                      className="db-attention-dot"
                      style={{ backgroundColor: item.dotColor }}
                    />
                    <span>{item.label}</span>
                  </div>
                </td>
                <td>
                  <strong style={{ fontSize: "14px", color: "var(--midnight)" }}>
                    {item.count.toLocaleString()}
                  </strong>
                </td>
                <td>
                  <span
                    className={`db-attention-badge db-attention-badge--${item.priorityLevel.toLowerCase()}`}
                  >
                    {item.priorityLevel}
                  </span>
                </td>
                <td>
                  <button
                    type="button"
                    className="db-table__view-btn"
                    onClick={() => navigate(item.route)}
                  >
                    View →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Row 4: Complaints by Zone & Recent Complaints */}
      <div className="db-charts">
        {/* Left: Bar chart */}
        <div className="db-chart-card">
          <div className="db-chart-card__header">
            <div>
              <h3 className="db-chart-card__title">Complaints by Zone</h3>
              <p className="db-chart-card__subtitle">
                Total complaints in each municipal zone
              </p>
            </div>
          </div>
          <div className="db-chart-card__body">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={zoneData}
                barCategoryGap="30%"
                margin={{ top: 32, right: 15, left: -10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e6eb" />
                <XAxis
                  dataKey="zone"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#6b7280" }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#6b7280" }}
                  domain={[0, yAxisMax]}
                />
                <Tooltip cursor={{ fill: "rgba(0, 0, 0, 0.03)" }} />
                <Bar
                  dataKey="count"
                  radius={[4, 4, 0, 0]}
                  label={{
                    position: "top",
                    fontSize: 12.5,
                    fill: "#0f172a",
                    fontWeight: 700,
                    dy: -6,
                  }}
                >
                  {zoneData.map((_entry, index) => {
                    const colors = ["#2563eb", "#c25e40", "#10b981", "#64748b"];
                    return <Cell key={`zone-cell-${index}`} fill={colors[index % colors.length]} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Recent Complaints table */}
        <div className="db-recent-card" style={{ marginBottom: 0 }}>
          <div className="db-recent-card__header">
            <div>
              <h3 className="db-recent-card__title">Recent Complaints</h3>
              <p className="db-recent-card__subtitle">
                Latest complaints requiring Building Branch attention
              </p>
            </div>
            <button
              type="button"
              className="db-link-btn"
              onClick={() => navigate("/complaints")}
            >
              View All →
            </button>
          </div>
          <table className="db-table">
            <thead>
              <tr>
                <th>COMPLAINT ID</th>
                <th>ZONE</th>
                <th>STATUS</th>
                <th>AGE (DAYS)</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {data.recentComplaints.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    style={{ textAlign: "center", padding: "24px", color: "var(--muted)" }}
                  >
                    No complaints found
                  </td>
                </tr>
              ) : (
                data.recentComplaints.map((c) => (
                  <tr key={c.complaintId}>
                    <td className="db-table__id">{c.complaintId}</td>
                    <td>{c.zone}</td>
                    <td>
                      <StatusBadge status={c.status} />
                    </td>
                    <td>{c.ageDays ?? 0}</td>
                    <td>
                      <button
                        type="button"
                        className="db-table__view-btn"
                        onClick={() => {
                          setSelectedComplaintId(c.complaintId);
                          navigate(
                            c.caseId ? `/cases/${c.caseId}` : `/complaints/${c.complaintId}`
                          );
                        }}
                      >
                        View →
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
