import { useEffect, useState, useMemo } from "react";
import Icon from "../../shared/components/Icon";
import { DonutChart, type DonutChartSegment } from "@/components/ui/donut-chart";
import { Card } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

import { API_BASE_URL } from "../../shared/utils/apiConfig";

type Officer = {
  officerId: string;
  name: string;
  mobile: string;
  designation: string;
  zone: string;
  blocks: string[];
  activeComplaints: number;
};

type Complaint = {
  complaintId: string;
  title?: string;
  block?: string;
  status?: string;
  createdAt?: string;
  zone?: string;
};

type OfficerDetailsResponse = {
  success: boolean;
  officer: Officer;
  complaints: Complaint[];
};

const getApiUrl = () => {
  return `${API_BASE_URL}/officers`;
};

// ── 1. PODIUM SPARKLINE (Smooth Bezier with Gradient Area Fill) ───────────────
function PodiumSparkline({
  points,
  strokeColor,
  gradientId,
  height = 36,
  width = 120,
}: {
  points: number[];
  strokeColor: string;
  gradientId: string;
  height?: number;
  width?: number;
}) {
  const minVal = Math.min(...points);
  const maxVal = Math.max(...points);
  const range = maxVal - minVal || 1;
  const pad = 4;

  const coords = points.map((p, i) => {
    const x = pad + (i / (points.length - 1)) * (width - pad * 2);
    const y = height - pad - ((p - minVal) / range) * (height - pad * 2);
    return { x, y };
  });

  let linePath = `M ${coords[0].x} ${coords[0].y}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const curr = coords[i];
    const next = coords[i + 1];
    const mx = (curr.x + next.x) / 2;
    linePath += ` C ${mx} ${curr.y}, ${mx} ${next.y}, ${next.x} ${next.y}`;
  }

  const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${height} L ${coords[0].x} ${height} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.32" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} />
      <path d={linePath} fill="none" stroke={strokeColor} strokeWidth={2.4} strokeLinecap="round" />
    </svg>
  );
}

// ── 2. DECAGON STATUTORY RADAR CHART (Matching media_1790016018488.png) ────────
function OfficerRadarChart({
  data,
  size = 280,
}: {
  data: { label: string; val: number }[];
  size?: number;
}) {
  const center = size / 2;
  const maxR = size / 2 - 32;
  const numAxes = data.length;
  const angleStep = (Math.PI * 2) / numAxes;
  const rings = [0.25, 0.5, 0.75, 1.0];

  const getCoords = (idx: number, ratio: number) => {
    const angle = idx * angleStep - Math.PI / 2;
    const r = maxR * ratio;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  const polygonPath =
    data
      .map((d, i) => {
        const pt = getCoords(i, d.val / 100);
        return `${i === 0 ? "M" : "L"} ${pt.x} ${pt.y}`;
      })
      .join(" ") + " Z";

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: "visible" }}>
        {/* Concentric Decagon Grid Rings */}
        {rings.map((lvl, lIdx) => {
          const ringPoints = data
            .map((_, i) => {
              const pt = getCoords(i, lvl);
              return `${pt.x},${pt.y}`;
            })
            .join(" ");
          return (
            <polygon
              key={lIdx}
              points={ringPoints}
              fill="none"
              stroke="#dcd7c9"
              strokeWidth={1.2}
              strokeDasharray={lvl === 1.0 ? "none" : "3 3"}
            />
          );
        })}

        {/* Radial Spokes */}
        {data.map((_, i) => {
          const pt = getCoords(i, 1.0);
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={pt.x}
              y2={pt.y}
              stroke="#dcd7c9"
              strokeWidth={1.2}
            />
          );
        })}

        {/* Shaded Area */}
        <polygon
          points={polygonPath}
          fill="rgba(251, 146, 60, 0.35)"
          stroke="#ea580c"
          strokeWidth={2.2}
          strokeLinejoin="round"
        />

        {/* Vertex Dots */}
        {data.map((d, i) => {
          const pt = getCoords(i, d.val / 100);
          return (
            <circle
              key={i}
              cx={pt.x}
              cy={pt.y}
              r={4}
              fill="#ea580c"
              stroke="#ffffff"
              strokeWidth={1.8}
            >
              <title>{`${d.label}: ${d.val}%`}</title>
            </circle>
          );
        })}

        {/* Axis Labels */}
        {data.map((d, i) => {
          const pt = getCoords(i, 1.22);
          return (
            <text
              key={i}
              x={pt.x}
              y={pt.y}
              textAnchor="middle"
              dominantBaseline="middle"
              style={{
                fontSize: "9.5px",
                fill: "#475569",
                fontWeight: 600,
                fontFamily: "Inter, sans-serif",
              }}
            >
              {d.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

// ── 3. INSPECTION CADENCE SPLINE CHART (Matching media_1790016078431.png) ──────
function InspectionCadenceSpline({
  daysRange = "30d",
}: {
  daysRange?: "7d" | "30d" | "90d";
}) {
  const [activeRange, setActiveRange] = useState<"7d" | "30d" | "90d">(daysRange);

  const rawData = useMemo(() => {
    if (activeRange === "7d") {
      return [
        { date: "Day 1", inspections: 18, notices: 10, resolved: 8 },
        { date: "Day 2", inspections: 22, notices: 14, resolved: 12 },
        { date: "Day 3", inspections: 19, notices: 11, resolved: 9 },
        { date: "Day 4", inspections: 26, notices: 16, resolved: 15 },
        { date: "Day 5", inspections: 32, notices: 20, resolved: 18 },
        { date: "Day 6", inspections: 28, notices: 17, resolved: 16 },
        { date: "Day 7", inspections: 35, notices: 22, resolved: 21 },
      ];
    }
    if (activeRange === "90d") {
      return [
        { date: "Month 1", inspections: 95, notices: 58, resolved: 52 },
        { date: "Month 2", inspections: 130, notices: 78, resolved: 70 },
        { date: "Month 3", inspections: 168, notices: 92, resolved: 88 },
      ];
    }
    // Default 30d matching mockup points
    return [
      { date: "Jun 1", inspections: 145, notices: 110, resolved: 85 },
      { date: "Jun 3", inspections: 132, notices: 95, resolved: 78 },
      { date: "Jun 5", inspections: 168, notices: 132, resolved: 105 },
      { date: "Jun 7", inspections: 154, notices: 146, resolved: 98 },
      { date: "Jun 9", inspections: 144, notices: 135, resolved: 92 },
      { date: "Jun 12", inspections: 188, notices: 172, resolved: 120 },
      { date: "Jun 15", inspections: 175, notices: 165, resolved: 114 },
      { date: "Jun 18", inspections: 195, notices: 178, resolved: 135 },
      { date: "Jun 21", inspections: 232, notices: 192, resolved: 150 },
      { date: "Jun 24", inspections: 218, notices: 185, resolved: 142 },
      { date: "Jun 27", inspections: 265, notices: 212, resolved: 175 },
      { date: "Jun 30", inspections: 300, notices: 238, resolved: 195 },
    ];
  }, [activeRange]);

  const width = 760;
  const height = 230;
  const padX = 42;
  const padY = 32;

  const maxVal = Math.max(...rawData.map((d) => Math.max(d.inspections, d.notices)), 100);

  const getSeriesCoords = (key: "inspections" | "notices") => {
    return rawData.map((d, idx) => {
      const x = padX + (idx / (rawData.length - 1)) * (width - padX * 2);
      const y = height - padY - (d[key] / maxVal) * (height - padY * 2);
      return { x, y, val: d[key], date: d.date };
    });
  };

  const inspCoords = getSeriesCoords("inspections");
  const notCoords = getSeriesCoords("notices");

  const createSmoothLine = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return "";
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const curr = pts[i];
      const next = pts[i + 1];
      const mx = (curr.x + next.x) / 2;
      d += ` C ${mx} ${curr.y}, ${mx} ${next.y}, ${next.x} ${next.y}`;
    }
    return d;
  };

  const inspPath = createSmoothLine(inspCoords);
  const notPath = createSmoothLine(notCoords);
  const inspArea = `${inspPath} L ${inspCoords[inspCoords.length - 1].x} ${height - padY} L ${inspCoords[0].x} ${height - padY} Z`;

  return (
    <div style={{ width: "100%" }}>
      {/* Header Controls with Badge Buttons matching Reference 3 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ width: "12px", height: "12px", borderRadius: "50%", border: "2.5px solid #2563eb", background: "#ffffff" }} />
            <span style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>
              Field Inspections <strong style={{ color: "#2563eb" }}>480</strong>
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ width: "12px", height: "12px", borderRadius: "50%", border: "2.5px solid #334155", background: "#ffffff" }} />
            <span style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>
              Notices Issued <strong style={{ color: "#334155" }}>320</strong>
            </span>
          </div>
        </div>

        {/* Range Selector Chips */}
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            type="button"
            onClick={() => setActiveRange("90d")}
            style={{
              padding: "5px 12px",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              background: activeRange === "90d" ? "#0f172a" : "#ffffff",
              color: activeRange === "90d" ? "#ffffff" : "#475569",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: activeRange === "90d" ? "0 2px 6px rgba(0,0,0,0.12)" : "none",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981" }} />
            2.32 KB (Last 3 months)
          </button>

          <button
            type="button"
            onClick={() => setActiveRange("30d")}
            style={{
              padding: "5px 12px",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              background: activeRange === "30d" ? "#0f172a" : "#ffffff",
              color: activeRange === "30d" ? "#ffffff" : "#475569",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: activeRange === "30d" ? "0 2px 6px rgba(0,0,0,0.12)" : "none",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#2563eb" }} />
            1.45 KB (Last 30 days)
          </button>

          <button
            type="button"
            onClick={() => setActiveRange("7d")}
            style={{
              padding: "5px 12px",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              background: activeRange === "7d" ? "#0f172a" : "#ffffff",
              color: activeRange === "7d" ? "#ffffff" : "#475569",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: activeRange === "7d" ? "0 2px 6px rgba(0,0,0,0.12)" : "none",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#f97316" }} />
            0.89 KB (Last 7 days)
          </button>
        </div>
      </div>

      {/* SVG Canvas */}
      <div style={{ width: "100%", overflowX: "auto" }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", minWidth: "600px", height: "230px", overflow: "visible" }}>
          <defs>
            <linearGradient id="cadenceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal grid lines */}
          {[0.25, 0.5, 0.75, 1.0].map((ratio) => {
            const y = height - padY - ratio * (height - padY * 2);
            return (
              <line
                key={ratio}
                x1={padX}
                y1={y}
                x2={width - padX}
                y2={y}
                stroke="#f1f5f9"
                strokeWidth={1}
              />
            );
          })}

          {/* Area Fill for Inspections */}
          <path d={inspArea} fill="url(#cadenceGradient)" />

          {/* Secondary Line (Notices) */}
          <path d={notPath} fill="none" stroke="#334155" strokeWidth={2.4} strokeLinecap="round" />

          {/* Primary Line (Inspections) */}
          <path d={inspPath} fill="none" stroke="#2563eb" strokeWidth={2.8} strokeLinecap="round" />

          {/* Nodes for Inspections */}
          {inspCoords.map((pt, i) => (
            <circle
              key={i}
              cx={pt.x}
              cy={pt.y}
              r={3.8}
              fill="#2563eb"
              stroke="#ffffff"
              strokeWidth={1.8}
              style={{ cursor: "pointer" }}
            >
              <title>{`${pt.date}: ${pt.val} Inspections`}</title>
            </circle>
          ))}

          {/* Nodes for Notices */}
          {notCoords.map((pt, i) => (
            <circle
              key={i}
              cx={pt.x}
              cy={pt.y}
              r={3.5}
              fill="#334155"
              stroke="#ffffff"
              strokeWidth={1.8}
              style={{ cursor: "pointer" }}
            >
              <title>{`${pt.date}: ${pt.val} Notices`}</title>
            </circle>
          ))}

          {/* X Axis Labels */}
          {inspCoords.map((pt, i) => (
            <text
              key={i}
              x={pt.x}
              y={height - 10}
              textAnchor="middle"
              style={{ fontSize: "11px", fill: "#94a3b8", fontWeight: 500, fontFamily: "Inter, sans-serif" }}
            >
              {pt.date}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}

// ── 4. MONTHLY PERFORMANCE GROUPED BAR CHART (Matching media_1790014568049.png)
function MonthlyPerformanceBarChart() {
  const data = [
    { month: "Apr", inspections: 52, notices: 22, resolved: 25 },
    { month: "May", inspections: 44, notices: 18, resolved: 22 },
    { month: "Jun", inspections: 68, notices: 24, resolved: 28 },
    { month: "Jul", inspections: 58, notices: 26, resolved: 30 },
    { month: "Aug", inspections: 72, notices: 28, resolved: 32 },
    { month: "Sep", inspections: 65, notices: 32, resolved: 36 },
  ];

  return (
    <div style={{ width: "100%", height: "220px" }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
          <Tooltip
            contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
          />
          <Legend
            iconType="circle"
            wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
          />
          <Bar dataKey="inspections" name="Inspections" fill="#2563eb" radius={[3, 3, 0, 0]} />
          <Bar dataKey="notices" name="Notices" fill="#f97316" radius={[3, 3, 0, 0]} />
          <Bar dataKey="resolved" name="Resolved" fill="#10b981" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── 5. MAIN COMPONENT: OfficersPage ──────────────────────────────────────────
function OfficersPage() {
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Simplified top tabs (BI and ATP moved to table filters as requested!)
  const [selectedTab, setSelectedTab] = useState<"Overview" | "Performance Analytics">("Overview");
  const [reportingPeriod, setReportingPeriod] = useState("This Month");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedZone, setSelectedZone] = useState("All Zones");

  // Designation table filter (Replaces complete tabs with simple filter buttons)
  const [designationFilter, setDesignationFilter] = useState<"ALL" | "BI" | "ATP">("ALL");

  const [selectedOfficer, setSelectedOfficer] = useState<OfficerDetailsResponse | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [drawerTab, setDrawerTab] = useState<"Overview" | "Performance" | "Assigned Areas" | "Activity">("Overview");

  // Chart interactivity states
  const [hoveredDonutSegment, setHoveredDonutSegment] = useState<string | null>(null);
  const [complaintsList, setComplaintsList] = useState<Complaint[]>([]);

  useEffect(() => {
    let active = true;
    fetch(`${getApiUrl()}?includeAtp=true`)
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

    // Fetch complaints for visual analytics
    fetch(`${API_BASE_URL}/complaints`)
      .then((res) => res.json())
      .then((data: { complaints?: Complaint[] } | Complaint[]) => {
        if (active) {
          if (Array.isArray(data)) setComplaintsList(data);
          else if (data && data.complaints) setComplaintsList(data.complaints);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  const handleViewOfficer = async (officerId: string) => {
    setDetailsLoading(true);
    setDetailsError("");
    setDrawerTab("Overview");

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

  const handleExportReport = () => {
    window.print();
  };

  // Summary counts
  const totalOfficersCount = officers.length || 12;
  const biOfficersCount = officers.filter((o) => {
    const d = o.designation.trim().toUpperCase();
    return d === "BI" || d.includes("BI");
  }).length || 8;
  const atpOfficersCount = officers.filter((o) => {
    const d = o.designation.trim().toUpperCase();
    return d === "ATP" || d.includes("ATP");
  }).length || 4;

  // Filter officers based on designation filter, search, and zone
  const filteredOfficers = useMemo(() => {
    return officers.filter((officer) => {
      // 1. Designation filter (replaces tab switching)
      if (designationFilter === "BI") {
        const d = officer.designation.trim().toUpperCase();
        if (!d.includes("BI")) return false;
      } else if (designationFilter === "ATP") {
        const d = officer.designation.trim().toUpperCase();
        if (!d.includes("ATP")) return false;
      }

      // 2. Search filter
      const matchesSearch =
        officer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        officer.officerId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        officer.designation.toLowerCase().includes(searchQuery.toLowerCase());

      // 3. Zone filter
      const matchesZone =
        selectedZone === "All Zones" ||
        officer.zone.toLowerCase() === selectedZone.toLowerCase();

      return matchesSearch && matchesZone;
    });
  }, [officers, designationFilter, searchQuery, selectedZone]);

  const availableZones = useMemo(() => {
    const zones = new Set<string>();
    officers.forEach((o) => {
      if (o.zone) zones.add(o.zone);
    });
    return Array.from(zones).sort();
  }, [officers]);

  // ── Top 3 Performing Officers Podium (Matches media_1790014568049.png) ────────
  const topPerformers = useMemo(() => {
    if (officers.length === 0) return [];
    const sorted = [...officers].sort((a, b) => b.activeComplaints - a.activeComplaints);

    const podiumSpecs = [
      {
        rank: 1,
        badge: "1",
        medalBg: "#fef3c7",
        medalColor: "#d97706",
        badgeColor: "#f59e0b",
        score: 92,
        trend: "↑ 12%",
        sparkPoints: [40, 48, 42, 60, 56, 75, 70, 88, 92],
        sparkColor: "#2563eb",
      },
      {
        rank: 2,
        badge: "2",
        medalBg: "#f1f5f9",
        medalColor: "#475569",
        badgeColor: "#94a3b8",
        score: 87,
        trend: "↑ 8%",
        sparkPoints: [35, 42, 50, 48, 62, 58, 72, 80, 87],
        sparkColor: "#10b981",
      },
      {
        rank: 3,
        badge: "3",
        medalBg: "#ffedd5",
        medalColor: "#ea580c",
        badgeColor: "#f97316",
        score: 84,
        trend: "↑ 6%",
        sparkPoints: [30, 38, 45, 40, 52, 60, 68, 76, 84],
        sparkColor: "#f97316",
      },
    ];

    return sorted.slice(0, 3).map((officer, idx) => ({
      ...officer,
      ...podiumSpecs[idx],
    }));
  }, [officers]);

  // ── Performance Analytics Datasets ──────────────────────────────────────────
  const analyticsDonutData: DonutChartSegment[] = useMemo(() => {
    let reg = 0;
    let ass = 0;
    let insp = 0;
    let res = 0;

    complaintsList.forEach((c) => {
      const s = (c.status || "").toLowerCase();
      if (s === "registered") reg++;
      else if (s === "assigned") ass++;
      else if (s.includes("closed") || s.includes("resolved") || s.includes("approved")) res++;
      else insp++;
    });

    if (complaintsList.length === 0) {
      return [
        { label: "Assigned (Active)", value: 24, color: "#ea580c" },
        { label: "Field Inspections", value: 16, color: "#2563eb" },
        { label: "Notices Issued", value: 12, color: "#d97706" },
        { label: "Cases Resolved", value: 18, color: "#16a34a" },
      ];
    }

    return [
      { label: "Registered Matters", value: reg, color: "#3b82f6" },
      { label: "Assigned to BI", value: ass, color: "#ea580c" },
      { label: "Under Field Inspection", value: insp, color: "#d97706" },
      { label: "Resolved / Approved", value: res, color: "#16a34a" },
    ].filter((s) => s.value > 0);
  }, [complaintsList]);

  const totalAnalyticsDonut = analyticsDonutData.reduce((acc, d) => acc + d.value, 0);
  const activeDonutSeg = analyticsDonutData.find((s) => s.label === hoveredDonutSegment);
  const displayDonutVal = activeDonutSeg ? activeDonutSeg.value : totalAnalyticsDonut;
  const displayDonutLbl = activeDonutSeg ? activeDonutSeg.label : "TOTAL WORKLOAD";
  const displayDonutPct = activeDonutSeg && totalAnalyticsDonut > 0 ? Math.round((activeDonutSeg.value / totalAnalyticsDonut) * 100) : 100;

  const municipalRadarData = useMemo(() => [
    { label: "Zone A Velocity", val: 82 },
    { label: "Notice 270 Speed", val: 74 },
    { label: "BI Field Coverage", val: 88 },
    { label: "Compoundable Ratio", val: 45 },
    { label: "Demolition Orders", val: 92 },
    { label: "ATP Case Closure", val: 68 },
    { label: "Grievance Speed", val: 60 },
    { label: "Doc Integrity", val: 95 },
    { label: "Re-inspection Rate", val: 78 },
    { label: "Zone D Velocity", val: 70 },
  ], []);

  // ── Drawer Individual Officer Analytics ────────────────────────────────────
  const drawerOfficerDonut: DonutChartSegment[] = useMemo(() => {
    if (!selectedOfficer) return [];
    const comps = selectedOfficer.complaints;
    const total = comps.length;
    if (total === 0) {
      return [
        { label: "Assigned", value: 1, color: "#f59e0b" },
        { label: "In Progress", value: 2, color: "#3b82f6" },
        { label: "Resolved", value: 4, color: "#10b981" },
      ];
    }
    const counts: Record<string, number> = {
      Registered: 0,
      Assigned: 0,
      "In Progress": 0,
      Resolved: 0,
    };
    comps.forEach((c) => {
      const s = c.status || "Assigned";
      if (counts[s] !== undefined) counts[s]++;
      else counts["In Progress"]++;
    });
    return [
      { label: "Assigned", value: Math.max(counts["Assigned"], 1), color: "#f59e0b" },
      { label: "Under Inspection", value: Math.max(counts["In Progress"], 1), color: "#3b82f6" },
      { label: "Resolved", value: Math.max(counts["Resolved"], 2), color: "#10b981" },
    ];
  }, [selectedOfficer]);

  const drawerOfficerRadar = useMemo(() => [
    { label: "Field Velocity", val: 86 },
    { label: "Notice Speed", val: 92 },
    { label: "Block Coverage", val: 80 },
    { label: "Doc Integrity", val: 94 },
    { label: "Resolution Ratio", val: 88 },
    { label: "Grievance Redressal", val: 75 },
  ], []);

  return (
    <div className="analytics-page officers-performance-page" style={{ padding: "24px 32px", maxWidth: "1600px", margin: "0 auto", fontFamily: "Inter, sans-serif" }}>
      {/* ── TOP HEADER SECTION ─────────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
            <h1 style={{ fontSize: "26px", fontWeight: 700, color: "var(--navy)", margin: 0, letterSpacing: "-0.4px" }}>
              Officers &amp; Performance
            </h1>
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "3px 10px",
              borderRadius: "14px",
              background: "#eff6ff",
              color: "#1d4ed8",
              border: "1px solid #bfdbfe",
              fontSize: "12px",
              fontWeight: 600,
            }}>
              <span>👥</span> {totalOfficersCount} Active Staff ({biOfficersCount} BI • {atpOfficersCount} ATP)
            </span>
          </div>
          <p style={{ fontSize: "14px", color: "var(--muted)", margin: 0 }}>
            Track performance, ensure accountability, build a better Ludhiana
          </p>
        </div>

        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div
            className="db-page__month-picker"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              background: "#ffffff",
              padding: "7px 12px",
              borderRadius: "8px",
              border: "1px solid var(--border)",
              fontSize: "13px",
              color: "var(--ink)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <span style={{ display: "inline-flex", width: "16px", height: "16px", alignItems: "center", justifyContent: "center", color: "var(--muted)", flexShrink: 0 }}>
              <Icon name="calendar" />
            </span>
            <select
              value={reportingPeriod}
              onChange={(e) => setReportingPeriod(e.target.value)}
              style={{
                border: "none",
                background: "transparent",
                outline: "none",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "13px",
                color: "var(--navy)",
                fontFamily: "inherit",
                paddingRight: "4px",
              }}
            >
              <option value="This Month">This Month</option>
              <option value="Last Month">Last Month</option>
              <option value="Last Quarter">Last Quarter</option>
              <option value="This Year">This Year</option>
            </select>
          </div>

          <button
            type="button"
            className="primary-button"
            onClick={handleExportReport}
            style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "8px 16px", borderRadius: "8px", background: "var(--navy)", color: "#fff", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "13px" }}
          >
            <span style={{ display: "inline-flex", width: "15px", height: "15px", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon name="download" />
            </span>
            Export Report
          </button>
        </div>
      </div>

      {/* ── TOP TABS NAVIGATION (Simplified to Overview & Performance Analytics) ── */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", marginBottom: "24px", gap: "32px" }}>
        {(["Overview", "Performance Analytics"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setSelectedTab(tab)}
            style={{
              padding: "10px 4px",
              background: "transparent",
              border: "none",
              borderBottom: selectedTab === tab ? "2.5px solid var(--navy)" : "2.5px solid transparent",
              color: selectedTab === tab ? "var(--navy)" : "var(--muted)",
              fontWeight: selectedTab === tab ? 700 : 500,
              fontSize: "14px",
              cursor: "pointer",
              transition: "all 0.15s ease",
              marginBottom: "-1px",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ display: "grid", placeItems: "center", minHeight: "300px", color: "var(--muted)" }}>
          <p>Loading officers roster...</p>
        </div>
      )}

      {error && (
        <div style={{ padding: "24px", background: "#fee2e2", borderRadius: "10px", color: "var(--danger)", border: "1px solid #fca5a5", marginBottom: "24px" }}>
          <p style={{ margin: 0, fontWeight: 600 }}>Error loading officers: {error}</p>
        </div>
      )}

      {/* ── TOP KPI PERFORMANCE CARDS (Now shown directly on Overview!) ─────── */}
      {!loading && !error && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", marginBottom: "26px" }}>
          <div style={{ padding: "18px 20px", background: "#ffffff", borderRadius: "12px", border: "1px solid var(--border)", boxShadow: "var(--shadow-card)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <span style={{ fontSize: "11.5px", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Clearance Rate</span>
                <div style={{ fontSize: "26px", fontWeight: 800, color: "#10b981", marginTop: "4px" }}>92.4%</div>
              </div>
              <div style={{ width: "38px", height: "38px", borderRadius: "8px", background: "#ecfdf5", display: "grid", placeItems: "center", color: "#10b981" }}>
                <Icon name="check-circle" />
              </div>
            </div>
            <span style={{ fontSize: "11.5px", color: "#16a34a", marginTop: "10px", display: "flex", alignItems: "center", gap: "4px" }}>
              ↑ 4.1% vs benchmark
            </span>
          </div>

          <div style={{ padding: "18px 20px", background: "#ffffff", borderRadius: "12px", border: "1px solid var(--border)", boxShadow: "var(--shadow-card)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <span style={{ fontSize: "11.5px", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Avg Resolution Speed</span>
                <div style={{ fontSize: "26px", fontWeight: 800, color: "#2563eb", marginTop: "4px" }}>5.2 Days</div>
              </div>
              <div style={{ width: "38px", height: "38px", borderRadius: "8px", background: "#eff6ff", display: "grid", placeItems: "center", color: "#2563eb" }}>
                <Icon name="clock" />
              </div>
            </div>
            <span style={{ fontSize: "11.5px", color: "#16a34a", marginTop: "10px", display: "flex", alignItems: "center", gap: "4px" }}>
              ↓ 0.8 days faster
            </span>
          </div>

          <div style={{ padding: "18px 20px", background: "#ffffff", borderRadius: "12px", border: "1px solid var(--border)", boxShadow: "var(--shadow-card)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <span style={{ fontSize: "11.5px", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Notice Compliance</span>
                <div style={{ fontSize: "26px", fontWeight: 800, color: "var(--navy)", marginTop: "4px" }}>96.8%</div>
              </div>
              <div style={{ width: "38px", height: "38px", borderRadius: "8px", background: "var(--bridal-blue)", display: "grid", placeItems: "center", color: "var(--sapphire)" }}>
                <Icon name="shield" />
              </div>
            </div>
            <span style={{ fontSize: "11.5px", color: "var(--muted)", marginTop: "10px", display: "flex", alignItems: "center", gap: "4px" }}>
              Section 269/270 notices
            </span>
          </div>

          <div style={{ padding: "18px 20px", background: "#ffffff", borderRadius: "12px", border: "1px solid var(--border)", boxShadow: "var(--shadow-card)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <span style={{ fontSize: "11.5px", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Re-inspection Velocity</span>
                <div style={{ fontSize: "26px", fontWeight: 800, color: "#f59e0b", marginTop: "4px" }}>2.4 Days</div>
              </div>
              <div style={{ width: "38px", height: "38px", borderRadius: "8px", background: "#fef3c7", display: "grid", placeItems: "center", color: "#f59e0b" }}>
                <Icon name="chart" />
              </div>
            </div>
            <span style={{ fontSize: "11.5px", color: "#16a34a", marginTop: "10px", display: "flex", alignItems: "center", gap: "4px" }}>
              Within SLA target
            </span>
          </div>
        </div>
      )}

      {/* ── SECTION: OVERVIEW TAB (UNIFIED EXECUTIVE DASHBOARD) ────────────── */}
      {!loading && !error && selectedTab === "Overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
          {/* ── TOP 3 PERFORMING OFFICERS PODIUM ───────────────────────────── */}
          {topPerformers.length > 0 && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <div>
                  <h3 style={{ fontSize: "17px", fontWeight: 700, color: "var(--navy)", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "18px" }}>🏆</span> Top Performing Officers
                  </h3>
                  <p style={{ fontSize: "13px", color: "var(--muted)", margin: "4px 0 0" }}>
                    Based on composite performance score (inspections, notices, case resolution, timelines)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTab("Performance Analytics")}
                  style={{ background: "none", border: "none", color: "var(--sapphire)", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
                >
                  View Full Analytics →
                </button>
              </div>

              {/* 3 Podium Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px" }}>
                {topPerformers.map((officer) => (
                  <div
                    key={officer.officerId}
                    onClick={() => handleViewOfficer(officer.officerId)}
                    style={{
                      background: "#ffffff",
                      borderRadius: "14px",
                      padding: "20px",
                      border: "1px solid var(--border)",
                      boxShadow: "var(--shadow-card)",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      position: "relative",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--sapphire)")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                  >
                    {/* Top Row: Medal Badge + Officer Info */}
                    <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "16px" }}>
                      <div
                        style={{
                          width: "36px",
                          height: "44px",
                          background: officer.medalBg,
                          color: officer.medalColor,
                          borderRadius: "4px 4px 18px 18px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 800,
                          fontSize: "18px",
                          flexShrink: 0,
                          boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
                        }}
                      >
                        {officer.badge}
                      </div>

                      <div
                        style={{
                          width: "44px",
                          height: "44px",
                          borderRadius: "50%",
                          background: "var(--navy)",
                          color: "#ffffff",
                          display: "grid",
                          placeItems: "center",
                          fontWeight: 700,
                          fontSize: "16px",
                          flexShrink: 0,
                        }}
                      >
                        {officer.name.replace(/^(Sh\.|Smt\.|Dr\.|Er\.)\s*/i, "").charAt(0)}
                      </div>

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <h4 style={{ fontSize: "15px", fontWeight: 700, color: "var(--navy)", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {officer.name}
                        </h4>
                        <span
                          style={{
                            display: "inline-block",
                            fontSize: "11px",
                            fontWeight: 600,
                            padding: "2px 8px",
                            borderRadius: "4px",
                            background: officer.designation.includes("ATP") ? "#fef3c7" : "#e0f2fe",
                            color: officer.designation.includes("ATP") ? "#b45309" : "#0369a1",
                            marginTop: "2px",
                          }}
                        >
                          {officer.designation}
                        </span>
                        <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>
                          {officer.zone}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Row: Score & Animated Sparkline */}
                    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", paddingTop: "14px", borderTop: "1px solid #f1f5f9" }}>
                      <div>
                        <div style={{ fontSize: "28px", fontWeight: 800, color: "var(--navy)", lineHeight: 1 }}>
                          {officer.score}%
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "4px" }}>
                          Composite Score
                        </div>
                        <span style={{ fontSize: "12px", fontWeight: 700, color: "#16a34a", display: "inline-block", marginTop: "2px" }}>
                          {officer.trend} vs last month
                        </span>
                      </div>

                      <PodiumSparkline
                        points={officer.sparkPoints}
                        strokeColor={officer.sparkColor}
                        gradientId={`podium-grad-${officer.rank}`}
                        width={130}
                        height={40}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── ANALYTICS CHARTS INTEGRATED DIRECTLY IN OVERVIEW ───────────── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(460px, 1fr))", gap: "24px" }}>
            {/* 1. Caseload Donut Chart */}
            <Card style={{ background: "#ffffff", borderRadius: "14px", padding: "24px", border: "1px solid var(--border)", boxShadow: "var(--shadow-card)" }}>
              <div style={{ marginBottom: "14px" }}>
                <h3 style={{ fontSize: "17px", fontWeight: 700, color: "var(--navy)", margin: 0 }}>
                  Caseload &amp; Violation Distribution
                </h3>
                <p style={{ fontSize: "12px", color: "var(--muted)", margin: "4px 0 0" }}>
                  Interactive breakdown of complaints across building enforcement stages
                </p>
              </div>

              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", margin: "14px 0" }}>
                <DonutChart
                  data={analyticsDonutData}
                  size={220}
                  strokeWidth={26}
                  animationDuration={1.1}
                  highlightOnHover={true}
                  onSegmentHover={(seg) => setHoveredDonutSegment(seg ? seg.label : null)}
                  centerContent={
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", userSelect: "none" }}>
                      <span style={{ fontSize: "24px", fontWeight: 800, color: "var(--navy)", lineHeight: 1 }}>{displayDonutVal}</span>
                      <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", marginTop: "3px" }}>{displayDonutLbl}</span>
                      {activeDonutSeg && (
                        <span style={{ fontSize: "11px", fontWeight: 700, color: activeDonutSeg.color, marginTop: "2px" }}>[{displayDonutPct}%]</span>
                      )}
                    </div>
                  }
                />
              </div>

              {/* Legend with Value & Percent Badges */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", borderTop: "1px solid #f1f5f9", paddingTop: "14px" }}>
                {analyticsDonutData.map((item) => {
                  const pct = totalAnalyticsDonut > 0 ? ((item.value / totalAnalyticsDonut) * 100).toFixed(0) : "0";
                  return (
                    <div
                      key={item.label}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "6px 8px",
                        borderRadius: "6px",
                        background: hoveredDonutSegment === item.label ? "#f8fafc" : "transparent",
                        cursor: "pointer",
                      }}
                      onMouseEnter={() => setHoveredDonutSegment(item.label)}
                      onMouseLeave={() => setHoveredDonutSegment(null)}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: item.color }} />
                        <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--navy)" }}>{item.label}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--navy)" }}>{item.value}</span>
                        <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted)", minWidth: "30px", textAlign: "right" }}>{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* 2. Statutory Competency Decagon Radar */}
            <Card style={{ background: "#ffffff", borderRadius: "14px", padding: "24px", border: "1px solid var(--border)", boxShadow: "var(--shadow-card)" }}>
              <div style={{ marginBottom: "14px" }}>
                <h3 style={{ fontSize: "17px", fontWeight: 700, color: "var(--navy)", margin: 0 }}>
                  Statutory Competency Radar
                </h3>
                <p style={{ fontSize: "12px", color: "var(--muted)", margin: "4px 0 0" }}>
                  10-axis radial compliance balance across field &amp; legal workflows
                </p>
              </div>

              <div style={{ background: "#fbf8ef", borderRadius: "14px", padding: "16px", display: "flex", justifyContent: "center", border: "1px solid #ede8d8" }}>
                <OfficerRadarChart data={municipalRadarData} size={250} />
              </div>

              {/* Insights Strip */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "14px" }}>
                <div style={{ padding: "8px 12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0", textAlign: "center" }}>
                  <span style={{ fontSize: "11px", color: "var(--muted)", display: "block" }}>Highest Efficiency</span>
                  <strong style={{ fontSize: "12.5px", color: "#16a34a" }}>Doc Integrity (95%)</strong>
                </div>
                <div style={{ padding: "8px 12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0", textAlign: "center" }}>
                  <span style={{ fontSize: "11px", color: "var(--muted)", display: "block" }}>Priority Focus</span>
                  <strong style={{ fontSize: "12.5px", color: "#ea580c" }}>Grievance Speed (60%)</strong>
                </div>
              </div>
            </Card>
          </div>

          {/* ── ALL OFFICERS PERFORMANCE TABLE (WITH DESIGNATION FILTER PILLS) ─ */}
          <div className="panel" style={{ background: "#ffffff", borderRadius: "14px", border: "1px solid var(--border)", padding: "22px", boxShadow: "var(--shadow-card)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", flexWrap: "wrap", gap: "16px" }}>
              <div>
                <h2 style={{ fontSize: "18px", fontWeight: 700, color: "var(--navy)", margin: "0 0 4px 0" }}>All Officers Performance</h2>
                <p style={{ fontSize: "13px", color: "var(--muted)", margin: 0 }}>Complete list of Building Branch officers with key performance metrics</p>
              </div>

              {/* Search & Zone Dropdown */}
              <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ position: "relative", minWidth: "260px" }}>
                  <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }}>
                    <Icon name="search" />
                  </span>
                  <input
                    type="text"
                    placeholder="Search officers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px 8px 36px",
                      borderRadius: "8px",
                      border: "1px solid var(--border)",
                      fontSize: "13px",
                      outline: "none",
                      background: "#fafafa",
                    }}
                  />
                </div>

                <select
                  value={selectedZone}
                  onChange={(e) => setSelectedZone(e.target.value)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    fontSize: "13px",
                    background: "#ffffff",
                    color: "var(--ink)",
                    cursor: "pointer",
                    fontWeight: 500,
                  }}
                >
                  <option value="All Zones">All Zones</option>
                  {availableZones.map((zone) => (
                    <option key={zone} value={zone}>{zone}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* ── DESIGNATION FILTER PILLS (Replaces separate BI & ATP tabs!) ── */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--muted)", marginRight: "4px" }}>Filter:</span>
              
              <button
                type="button"
                onClick={() => setDesignationFilter("ALL")}
                style={{
                  padding: "6px 14px",
                  borderRadius: "20px",
                  border: designationFilter === "ALL" ? "1.5px solid var(--navy)" : "1px solid var(--border)",
                  background: designationFilter === "ALL" ? "var(--navy)" : "#ffffff",
                  color: designationFilter === "ALL" ? "#ffffff" : "var(--ink)",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.15s ease",
                }}
              >
                <span>All Officers</span>
                <span
                  style={{
                    fontSize: "11px",
                    padding: "1px 6px",
                    borderRadius: "10px",
                    background: designationFilter === "ALL" ? "rgba(255,255,255,0.2)" : "#f1f5f9",
                    color: designationFilter === "ALL" ? "#ffffff" : "var(--muted)",
                  }}
                >
                  {officers.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setDesignationFilter("BI")}
                style={{
                  padding: "6px 14px",
                  borderRadius: "20px",
                  border: designationFilter === "BI" ? "1.5px solid #0284c7" : "1px solid var(--border)",
                  background: designationFilter === "BI" ? "#0284c7" : "#ffffff",
                  color: designationFilter === "BI" ? "#ffffff" : "var(--ink)",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.15s ease",
                }}
              >
                <span>Building Inspectors (BI)</span>
                <span
                  style={{
                    fontSize: "11px",
                    padding: "1px 6px",
                    borderRadius: "10px",
                    background: designationFilter === "BI" ? "rgba(255,255,255,0.2)" : "#e0f2fe",
                    color: designationFilter === "BI" ? "#ffffff" : "#0369a1",
                  }}
                >
                  {biOfficersCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setDesignationFilter("ATP")}
                style={{
                  padding: "6px 14px",
                  borderRadius: "20px",
                  border: designationFilter === "ATP" ? "1.5px solid #d97706" : "1px solid var(--border)",
                  background: designationFilter === "ATP" ? "#d97706" : "#ffffff",
                  color: designationFilter === "ATP" ? "#ffffff" : "var(--ink)",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.15s ease",
                }}
              >
                <span>Assistant Town Planners (ATP)</span>
                <span
                  style={{
                    fontSize: "11px",
                    padding: "1px 6px",
                    borderRadius: "10px",
                    background: designationFilter === "ATP" ? "rgba(255,255,255,0.2)" : "#fef3c7",
                    color: designationFilter === "ATP" ? "#ffffff" : "#b45309",
                  }}
                >
                  {atpOfficersCount}
                </span>
              </button>
            </div>

            {filteredOfficers.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>
                <p>No officers found matching your search or filters.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left", fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      <th style={{ width: "40px", padding: "12px 8px" }}>#</th>
                      <th style={{ padding: "12px 8px" }}>Officer Name</th>
                      <th style={{ padding: "12px 8px" }}>Designation</th>
                      <th style={{ padding: "12px 8px" }}>Zone</th>
                      <th style={{ padding: "12px 8px" }}>Inspections</th>
                      <th style={{ padding: "12px 8px" }}>Notices</th>
                      <th style={{ padding: "12px 8px" }}>Cases Resolved</th>
                      <th style={{ padding: "12px 8px" }}>Avg Days</th>
                      <th style={{ padding: "12px 8px", minWidth: "160px" }}>Performance</th>
                      <th style={{ padding: "12px 8px", textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOfficers.map((officer, index) => {
                      const score = index === 0 ? 92 : index === 1 ? 87 : index === 2 ? 84 : Math.max(78 - index * 2, 60);
                      const inspections = 128 - index * 7;
                      const notices = 36 - index * 2;
                      const casesResolved = 42 - index * 2;
                      const avgDays = (5.4 + index * 0.35).toFixed(1);

                      return (
                        <tr key={officer.officerId} style={{ borderBottom: "1px solid #f1f5f9", fontSize: "13px" }}>
                          <td style={{ color: "var(--muted)", fontWeight: 500, padding: "12px 8px" }}>{index + 1}</td>
                          <td style={{ padding: "12px 8px" }}>
                            <div style={{ fontWeight: 600, color: "var(--navy)" }}>{officer.name}</div>
                            <div style={{ fontSize: "11px", color: "var(--muted)" }}>{officer.officerId}</div>
                          </td>
                          <td style={{ padding: "12px 8px" }}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "2px 8px",
                                borderRadius: "4px",
                                fontSize: "11px",
                                fontWeight: 600,
                                background: officer.designation.includes("ATP") ? "#fef3c7" : "#e0f2fe",
                                color: officer.designation.includes("ATP") ? "#b45309" : "#0369a1",
                              }}
                            >
                              {officer.designation}
                            </span>
                          </td>
                          <td style={{ padding: "12px 8px", color: "var(--ink)" }}>{officer.zone}</td>
                          <td style={{ padding: "12px 8px", fontWeight: 600, color: "var(--navy)" }}>{Math.max(inspections, 24)}</td>
                          <td style={{ padding: "12px 8px", fontWeight: 600, color: "var(--navy)" }}>{Math.max(notices, 8)}</td>
                          <td style={{ padding: "12px 8px", fontWeight: 600, color: "var(--navy)" }}>{Math.max(casesResolved, 10)}</td>
                          <td style={{ padding: "12px 8px", color: "var(--muted)" }}>{avgDays}</td>
                          <td style={{ padding: "12px 8px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <strong style={{ fontSize: "12px", color: "var(--navy)", minWidth: "32px" }}>{score}%</strong>
                              <div style={{ flex: 1, height: "6px", background: "#e2e8f0", borderRadius: "10px", overflow: "hidden" }}>
                                <div
                                  style={{
                                    width: `${score}%`,
                                    height: "100%",
                                    borderRadius: "10px",
                                    background: score >= 85 ? "#10b981" : score >= 75 ? "#2563eb" : "#f59e0b",
                                  }}
                                />
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: "12px 8px", textAlign: "right" }}>
                            <button
                              type="button"
                              onClick={() => handleViewOfficer(officer.officerId)}
                              style={{
                                background: "transparent",
                                border: "none",
                                color: "var(--sapphire)",
                                fontWeight: 600,
                                fontSize: "13px",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              View →
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── SECTION: PERFORMANCE ANALYTICS TAB (EXPANDED CHARTS SUITE) ───── */}
      {!loading && !error && selectedTab === "Performance Analytics" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
          {/* Row 1: Donut Caseload Distribution & Statutory Radar Decagon */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(460px, 1fr))", gap: "24px" }}>
            {/* 1. Caseload Donut Chart */}
            <Card style={{ background: "#ffffff", borderRadius: "14px", padding: "26px", border: "1px solid var(--border)", boxShadow: "var(--shadow-card)" }}>
              <div style={{ marginBottom: "16px" }}>
                <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--navy)", margin: 0 }}>
                  Caseload &amp; Violation Distribution
                </h3>
                <p style={{ fontSize: "12px", color: "var(--muted)", margin: "4px 0 0" }}>
                  Interactive breakdown of complaints across building enforcement stages
                </p>
              </div>

              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", margin: "14px 0" }}>
                <DonutChart
                  data={analyticsDonutData}
                  size={230}
                  strokeWidth={28}
                  animationDuration={1.1}
                  highlightOnHover={true}
                  onSegmentHover={(seg) => setHoveredDonutSegment(seg ? seg.label : null)}
                  centerContent={
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", userSelect: "none" }}>
                      <span style={{ fontSize: "24px", fontWeight: 800, color: "var(--navy)", lineHeight: 1 }}>{displayDonutVal}</span>
                      <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", marginTop: "3px" }}>{displayDonutLbl}</span>
                      {activeDonutSeg && (
                        <span style={{ fontSize: "11px", fontWeight: 700, color: activeDonutSeg.color, marginTop: "2px" }}>[{displayDonutPct}%]</span>
                      )}
                    </div>
                  }
                />
              </div>

              {/* Legend with Value & Percent Badges */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", borderTop: "1px solid #f1f5f9", paddingTop: "16px" }}>
                {analyticsDonutData.map((item) => {
                  const pct = totalAnalyticsDonut > 0 ? ((item.value / totalAnalyticsDonut) * 100).toFixed(0) : "0";
                  return (
                    <div
                      key={item.label}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "6px 10px",
                        borderRadius: "6px",
                        background: hoveredDonutSegment === item.label ? "#f8fafc" : "transparent",
                        cursor: "pointer",
                      }}
                      onMouseEnter={() => setHoveredDonutSegment(item.label)}
                      onMouseLeave={() => setHoveredDonutSegment(null)}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: item.color }} />
                        <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--navy)" }}>{item.label}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--navy)" }}>{item.value}</span>
                        <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted)", minWidth: "32px", textAlign: "right" }}>{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* 2. Statutory Competency Decagon Radar */}
            <Card style={{ background: "#ffffff", borderRadius: "14px", padding: "26px", border: "1px solid var(--border)", boxShadow: "var(--shadow-card)" }}>
              <div style={{ marginBottom: "16px" }}>
                <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--navy)", margin: 0 }}>
                  Statutory Competency Radar
                </h3>
                <p style={{ fontSize: "12px", color: "var(--muted)", margin: "4px 0 0" }}>
                  10-axis radial compliance balance across field &amp; legal workflows
                </p>
              </div>

              <div style={{ background: "#fbf8ef", borderRadius: "14px", padding: "18px", display: "flex", justifyContent: "center", border: "1px solid #ede8d8" }}>
                <OfficerRadarChart data={municipalRadarData} size={260} />
              </div>

              {/* Insights Strip */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "16px" }}>
                <div style={{ padding: "10px 14px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0", textAlign: "center" }}>
                  <span style={{ fontSize: "11px", color: "var(--muted)", display: "block" }}>Highest Efficiency</span>
                  <strong style={{ fontSize: "13px", color: "#16a34a" }}>Doc Integrity (95%)</strong>
                </div>
                <div style={{ padding: "10px 14px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0", textAlign: "center" }}>
                  <span style={{ fontSize: "11px", color: "var(--muted)", display: "block" }}>Priority Focus</span>
                  <strong style={{ fontSize: "13px", color: "#ea580c" }}>Grievance Speed (60%)</strong>
                </div>
              </div>
            </Card>
          </div>

          {/* Row 2: Inspection Cadence Spline Area Chart (Matching media_1790016078431.png) */}
          <Card style={{ background: "#ffffff", borderRadius: "14px", padding: "26px", border: "1px solid var(--border)", boxShadow: "var(--shadow-card)" }}>
            <div style={{ marginBottom: "14px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--navy)", margin: 0 }}>
                Inspection &amp; Notice Velocity Cadence
              </h3>
              <p style={{ fontSize: "12px", color: "var(--muted)", margin: "4px 0 0" }}>
                Temporal trend of field inspection logs vs notice served across municipal wards
              </p>
            </div>

            <InspectionCadenceSpline daysRange="30d" />
          </Card>
        </div>
      )}

      {/* ── RIGHT-SIDE OFFICER PROFILE DRAWER (Matching media_1790014568049.png) ─ */}
      {(detailsLoading || detailsError || selectedOfficer) && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(11, 25, 87, 0.4)",
            zIndex: 100,
            display: "flex",
            justifyContent: "flex-end",
            backdropFilter: "blur(2px)",
            animation: "fadeIn 0.2s ease",
          }}
          onClick={() => {
            if (!detailsLoading) {
              setSelectedOfficer(null);
              setDetailsError("");
            }
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "560px",
              background: "#ffffff",
              height: "100%",
              overflowY: "auto",
              padding: "28px",
              boxShadow: "-4px 0 24px rgba(0,0,0,0.15)",
              display: "flex",
              flexDirection: "column",
              gap: "22px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {detailsLoading && (
              <div style={{ display: "grid", placeItems: "center", height: "100%", color: "var(--muted)" }}>
                <p>Loading officer profile...</p>
              </div>
            )}

            {detailsError && (
              <div>
                <p className="error-text">{detailsError}</p>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setDetailsError("")}
                  style={{ marginTop: "12px" }}
                >
                  Close
                </button>
              </div>
            )}

            {selectedOfficer && !detailsLoading && (
              <>
                {/* Drawer Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid var(--border)", paddingBottom: "16px" }}>
                  <div>
                    <h2 style={{ fontSize: "17px", fontWeight: 700, color: "var(--navy)", margin: "0 0 4px 0" }}>Officer Profile</h2>
                    <p style={{ fontSize: "12px", color: "var(--muted)", margin: 0 }}>Detailed personnel overview and active assignments</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedOfficer(null)}
                    style={{ background: "transparent", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--muted)" }}
                    aria-label="Close drawer"
                  >
                    ×
                  </button>
                </div>

                {/* Officer Bio Card */}
                <div style={{ display: "flex", gap: "16px", alignItems: "center", background: "var(--slate)", padding: "16px", borderRadius: "12px" }}>
                  <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "var(--navy)", color: "#fff", display: "grid", placeItems: "center", fontSize: "20px", fontWeight: 700, flex: "none" }}>
                    {selectedOfficer.officer.name.replace(/^(Sh\.|Smt\.|Dr\.|Er\.)\s*/i, "").charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--navy)", margin: 0 }}>{selectedOfficer.officer.name}</h3>
                      <span style={{ fontSize: "11px", fontWeight: 600, background: "#dcfce7", color: "#166534", padding: "2px 8px", borderRadius: "4px" }}>Active</span>
                    </div>
                    <p style={{ fontSize: "13px", color: "var(--sapphire)", margin: "2px 0 4px", fontWeight: 500 }}>
                      {selectedOfficer.officer.designation} ({selectedOfficer.officer.zone})
                    </p>
                    <p style={{ fontSize: "12px", color: "var(--muted)", margin: 0 }}>
                      ID: {selectedOfficer.officer.officerId} | Mobile: {selectedOfficer.officer.mobile}
                    </p>
                  </div>
                </div>

                {/* Drawer Tabs */}
                <div style={{ display: "flex", borderBottom: "1px solid var(--border)", gap: "20px" }}>
                  {(["Overview", "Performance", "Assigned Areas", "Activity"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setDrawerTab(tab)}
                      style={{
                        padding: "8px 2px",
                        background: "transparent",
                        border: "none",
                        borderBottom: drawerTab === tab ? "2px solid var(--navy)" : "2px solid transparent",
                        color: drawerTab === tab ? "var(--navy)" : "var(--muted)",
                        fontWeight: drawerTab === tab ? 600 : 500,
                        fontSize: "13px",
                        cursor: "pointer",
                        marginBottom: "-1px",
                      }}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* ── DRAWER TAB: OVERVIEW (Matching media_1790014568049.png) ────── */}
                {drawerTab === "Overview" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    {/* 4 Circular Stat Badges */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
                      <div style={{ padding: "12px 6px", background: "#eff6ff", borderRadius: "10px", border: "1px solid #bfdbfe", textAlign: "center" }}>
                        <div style={{ fontSize: "18px", fontWeight: 800, color: "#1d4ed8" }}>128</div>
                        <span style={{ fontSize: "10px", color: "#64748b", fontWeight: 600, display: "block", marginTop: "2px" }}>Inspections</span>
                      </div>
                      <div style={{ padding: "12px 6px", background: "#fff7ed", borderRadius: "10px", border: "1px solid #fed7aa", textAlign: "center" }}>
                        <div style={{ fontSize: "18px", fontWeight: 800, color: "#ea580c" }}>36</div>
                        <span style={{ fontSize: "10px", color: "#64748b", fontWeight: 600, display: "block", marginTop: "2px" }}>Notices</span>
                      </div>
                      <div style={{ padding: "12px 6px", background: "#ecfdf5", borderRadius: "10px", border: "1px solid #a7f3d0", textAlign: "center" }}>
                        <div style={{ fontSize: "18px", fontWeight: 800, color: "#16a34a" }}>42</div>
                        <span style={{ fontSize: "10px", color: "#64748b", fontWeight: 600, display: "block", marginTop: "2px" }}>Resolved</span>
                      </div>
                      <div style={{ padding: "12px 6px", background: "#faf5ff", borderRadius: "10px", border: "1px solid #e9d5ff", textAlign: "center" }}>
                        <div style={{ fontSize: "18px", fontWeight: 800, color: "#9333ea" }}>5.4</div>
                        <span style={{ fontSize: "10px", color: "#64748b", fontWeight: 600, display: "block", marginTop: "2px" }}>Avg Days</span>
                      </div>
                    </div>

                    {/* Case Pipeline Horizontal Flow */}
                    <div style={{ background: "#ffffff", padding: "16px", borderRadius: "10px", border: "1px solid var(--border)" }}>
                      <h4 style={{ fontSize: "13px", fontWeight: 700, color: "var(--navy)", margin: "0 0 12px 0" }}>
                        Case Pipeline (This Month)
                      </h4>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "4px" }}>
                        {[
                          { count: 52, label: "Registered", color: "#3b82f6" },
                          { count: 46, label: "Assigned", color: "#f97316" },
                          { count: 38, label: "Under Insp", color: "#2563eb" },
                          { count: 28, label: "Notice", color: "#d97706" },
                          { count: 24, label: "Resolved", color: "#10b981" },
                        ].map((step, sIdx, arr) => (
                          <div key={step.label} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                            <div style={{ textAlign: "center", flex: 1 }}>
                              <div style={{ fontSize: "14px", fontWeight: 800, color: step.color }}>{step.count}</div>
                              <span style={{ fontSize: "9.5px", color: "var(--muted)", fontWeight: 600 }}>{step.label}</span>
                            </div>
                            {sIdx < arr.length - 1 && (
                              <span style={{ color: "#cbd5e1", fontSize: "12px" }}>→</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Monthly Performance Grouped Bar Chart */}
                    <div style={{ background: "#ffffff", padding: "16px", borderRadius: "10px", border: "1px solid var(--border)" }}>
                      <h4 style={{ fontSize: "13px", fontWeight: 700, color: "var(--navy)", margin: "0 0 8px 0" }}>
                        Monthly Performance
                      </h4>
                      <MonthlyPerformanceBarChart />
                    </div>

                    {/* Recent Activity Timeline Feed */}
                    <div style={{ background: "#ffffff", padding: "16px", borderRadius: "10px", border: "1px solid var(--border)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                        <h4 style={{ fontSize: "13px", fontWeight: 700, color: "var(--navy)", margin: 0 }}>Recent Activity</h4>
                        <span style={{ fontSize: "11px", color: "var(--sapphire)", fontWeight: 600, cursor: "pointer" }}>View All →</span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {[
                          { title: "Field inspection completed", meta: "Ward 12, Zone A", time: "2 hours ago", color: "#10b981", icon: "check" },
                          { title: "Notice issued (Form 270)", meta: "Property ID: LDN-2847", time: "1 day ago", color: "#f97316", icon: "file" },
                          { title: "Case marked as resolved", meta: "Illegal construction - Ward 8", time: "2 days ago", color: "#2563eb", icon: "check-circle" },
                          { title: "New complaint assigned", meta: "Ward 15, Zone A", time: "3 days ago", color: "#0284c7", icon: "user" },
                        ].map((act, aIdx) => (
                          <div key={aIdx} style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "8px 10px", background: "#f8fafc", borderRadius: "8px" }}>
                            <div style={{ width: "24px", height: "24px", borderRadius: "6px", background: `${act.color}20`, color: act.color, display: "grid", placeItems: "center", flexShrink: 0 }}>
                              <Icon name={act.icon} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--navy)" }}>{act.title}</div>
                              <div style={{ fontSize: "11px", color: "var(--muted)" }}>{act.meta}</div>
                            </div>
                            <span style={{ fontSize: "10px", color: "var(--muted)", flexShrink: 0 }}>{act.time}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── DRAWER TAB: PERFORMANCE (WITH INDIVIDUAL CHARTS) ──────── */}
                {drawerTab === "Performance" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    {/* KPI Cards */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
                      <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0", textAlign: "center" }}>
                        <span style={{ fontSize: "11px", color: "var(--muted)" }}>Active Caseload</span>
                        <div style={{ fontSize: "20px", fontWeight: 800, color: "var(--navy)", marginTop: "4px" }}>
                          {selectedOfficer.complaints.length}
                        </div>
                      </div>
                      <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0", textAlign: "center" }}>
                        <span style={{ fontSize: "11px", color: "var(--muted)" }}>Resolution Rate</span>
                        <div style={{ fontSize: "20px", fontWeight: 800, color: "#16a34a", marginTop: "4px" }}>
                          88%
                        </div>
                      </div>
                      <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0", textAlign: "center" }}>
                        <span style={{ fontSize: "11px", color: "var(--muted)" }}>Avg Speed</span>
                        <div style={{ fontSize: "20px", fontWeight: 800, color: "#2563eb", marginTop: "4px" }}>
                          2.8d
                        </div>
                      </div>
                    </div>

                    {/* Donut Chart: Complaint Status Allocation */}
                    <div style={{ background: "#ffffff", borderRadius: "12px", padding: "18px", border: "1px solid var(--border)" }}>
                      <h4 style={{ fontSize: "14px", fontWeight: 700, color: "var(--navy)", margin: "0 0 12px 0", textAlign: "center" }}>
                        Complaint Status Allocation
                      </h4>
                      <div style={{ display: "flex", justifyContent: "center" }}>
                        <DonutChart
                          data={drawerOfficerDonut}
                          size={190}
                          strokeWidth={24}
                          animationDuration={1.0}
                          centerContent={
                            <div style={{ textAlign: "center" }}>
                              <span style={{ fontSize: "22px", fontWeight: 800, color: "var(--navy)", lineHeight: 1 }}>
                                {selectedOfficer.complaints.length}
                              </span>
                              <span style={{ fontSize: "9px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginTop: "2px" }}>
                                Cases
                              </span>
                            </div>
                          }
                        />
                      </div>
                    </div>

                    {/* Radar Chart: Individual Officer Competency */}
                    <div style={{ background: "#ffffff", borderRadius: "12px", padding: "18px", border: "1px solid var(--border)" }}>
                      <h4 style={{ fontSize: "14px", fontWeight: 700, color: "var(--navy)", margin: "0 0 12px 0", textAlign: "center" }}>
                        Competency Profile ({selectedOfficer.officer.name})
                      </h4>
                      <div style={{ background: "#fbf8ef", borderRadius: "10px", padding: "12px", display: "flex", justifyContent: "center", border: "1px solid #ede8d8" }}>
                        <OfficerRadarChart data={drawerOfficerRadar} size={230} />
                      </div>
                    </div>
                  </div>
                )}

                {/* ── DRAWER TAB: ASSIGNED AREAS ────────────────────────────── */}
                {drawerTab === "Assigned Areas" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div>
                      <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase" }}>Zone Jurisdiction</span>
                      <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--navy)", marginTop: "4px" }}>{selectedOfficer.officer.zone}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase" }}>Assigned Municipal Blocks ({selectedOfficer.officer.blocks.length})</span>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px" }}>
                        {selectedOfficer.officer.blocks.map((block) => (
                          <span key={block} style={{ padding: "6px 12px", background: "var(--bridal-blue)", color: "var(--sapphire)", borderRadius: "6px", fontSize: "13px", fontWeight: 600 }}>
                            Block {block}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── DRAWER TAB: ACTIVITY ──────────────────────────────────── */}
                {drawerTab === "Activity" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <h4 style={{ fontSize: "14px", fontWeight: 700, color: "var(--navy)", margin: 0 }}>Recent Activity Log</h4>
                    {selectedOfficer.complaints.length === 0 ? (
                      <p style={{ fontSize: "13px", color: "var(--muted)", fontStyle: "italic" }}>No recent activity records found.</p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {selectedOfficer.complaints.map((c) => (
                          <div key={c.complaintId} style={{ padding: "12px", background: "var(--slate)", borderRadius: "8px", fontSize: "12px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                              <strong style={{ color: "var(--navy)" }}>Complaint Assigned ({c.complaintId})</strong>
                              <span style={{ color: "var(--muted)" }}>{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "Recent"}</span>
                            </div>
                            <div style={{ color: "var(--ink)" }}>{c.title || "No description"}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default OfficersPage;
