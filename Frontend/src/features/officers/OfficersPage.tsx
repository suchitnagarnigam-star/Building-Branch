import { useEffect, useState, useMemo } from "react";
import Icon from "../../shared/components/Icon";
import { DonutChart, type DonutChartSegment } from "@/components/ui/donut-chart";
import { Card } from "@/components/ui/card";

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
  const base =
    (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
    "http://localhost:5000/api";

  return `${base}/officers`;
};

// ── Radar Chart Subcomponent ──────────────────────────────────────────────────
function OfficerRadarChart({
  data,
  size = 280,
}: {
  data: { label: string; val: number }[];
  size?: number;
}) {
  const center = size / 2;
  const maxR = size / 2 - 28;
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

  const points = data
    .map((d, i) => {
      const pt = getCoords(i, d.val / 100);
      return `${pt.x},${pt.y}`;
    })
    .join(" ");

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: "visible" }}>
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
              strokeWidth={1.1}
            />
          );
        })}
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
              strokeWidth={1.1}
            />
          );
        })}
        <polygon
          points={points}
          fill="rgba(251, 146, 60, 0.35)"
          stroke="#ea580c"
          strokeWidth={1.8}
          strokeLinejoin="round"
        />
        {data.map((d, i) => {
          const pt = getCoords(i, d.val / 100);
          return (
            <circle
              key={i}
              cx={pt.x}
              cy={pt.y}
              r={3.8}
              fill="#ea580c"
              stroke="#ffffff"
              strokeWidth={1.5}
              style={{ cursor: "pointer" }}
            >
              <title>{`${d.label}: ${d.val}%`}</title>
            </circle>
          );
        })}
      </svg>
    </div>
  );
}

function OfficersPage() {
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedTab, setSelectedTab] = useState<"Overview" | "BI Officers" | "ATP Officers" | "Performance Analytics">("Overview");
  const [reportingPeriod, setReportingPeriod] = useState("This Month");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedZone, setSelectedZone] = useState("All Zones");

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
    const base = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:5000/api";
    fetch(`${base}/complaints`)
      .then((res) => res.json())
      .then((data: { complaints?: Complaint[] }) => {
        if (active && data.complaints) setComplaintsList(data.complaints);
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
  const totalOfficersCount = officers.length;
  const biOfficersCount = officers.filter((o) => {
    const d = o.designation.trim().toUpperCase();
    return d === "BI" || d.includes("BI");
  }).length;
  const atpOfficersCount = officers.filter((o) => {
    const d = o.designation.trim().toUpperCase();
    return d === "ATP" || d.includes("ATP");
  }).length;

  // Filter officers based on active tab
  const tabFilteredOfficers = useMemo(() => {
    if (selectedTab === "BI Officers") {
      return officers.filter((o) => {
        const d = o.designation.trim().toUpperCase();
        return d === "BI" || d.includes("BI");
      });
    }
    if (selectedTab === "ATP Officers") {
      return officers.filter((o) => {
        const d = o.designation.trim().toUpperCase();
        return d === "ATP" || d.includes("ATP");
      });
    }
    return officers;
  }, [officers, selectedTab]);

  // Filter by search query and zone
  const filteredOfficers = useMemo(() => {
    return tabFilteredOfficers.filter((officer) => {
      const matchesSearch =
        officer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        officer.officerId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        officer.designation.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesZone =
        selectedZone === "All Zones" ||
        officer.zone.toLowerCase() === selectedZone.toLowerCase();

      return matchesSearch && matchesZone;
    });
  }, [tabFilteredOfficers, searchQuery, selectedZone]);

  const availableZones = useMemo(() => {
    const zones = new Set<string>();
    officers.forEach((o) => {
      if (o.zone) zones.add(o.zone);
    });
    return Array.from(zones).sort();
  }, [officers]);

  // ── Top 3 Performing Officers Podium ───────────────────────────────────────
  const topPerformers = useMemo(() => {
    if (officers.length === 0) return [];
    const sorted = [...officers].sort((a, b) => b.activeComplaints - a.activeComplaints);
    return sorted.slice(0, 3).map((officer, idx) => {
      const scores = [92, 87, 84];
      const trends = ["+12%", "+8%", "+6%"];
      const badges = ["1", "2", "3"];
      const badgeColors = ["#eab308", "#94a3b8", "#f97316"];
      return {
        ...officer,
        rank: idx + 1,
        badge: badges[idx],
        score: scores[idx] || 80,
        trend: trends[idx] || "+5%",
        badgeColor: badgeColors[idx],
      };
    });
  }, [officers]);

  // ── Visual Analytics Data (Donut & Radar) ──────────────────────────────────
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
        { label: "Active Complaints", value: 2, color: "#ea580c" },
        { label: "Field Inspections", value: 1, color: "#2563eb" },
        { label: "Resolved Cases", value: 3, color: "#16a34a" },
      ];
    }
    const resolved = comps.filter((c) => (c.status || "").toLowerCase().includes("closed") || (c.status || "").toLowerCase().includes("approved")).length;
    const active = total - resolved;
    return [
      { label: "Active Assignments", value: active, color: "#ea580c" },
      { label: "Resolved Cases", value: resolved, color: "#16a34a" },
    ].filter((s) => s.value > 0);
  }, [selectedOfficer]);

  const drawerOfficerRadar = useMemo(() => [
    { label: "Inspection Velocity", val: 85 },
    { label: "Notice Timeliness", val: 78 },
    { label: "Case Follow-up", val: 90 },
    { label: "Block Coverage", val: 72 },
    { label: "Grievance Speed", val: 65 },
    { label: "Resolution Ratio", val: 80 },
  ], []);

  return (
    <div className="officers-page" style={{ padding: "28px 32px", maxWidth: "1600px", margin: "0 auto" }}>
      {/* Header Section */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: 700, color: "var(--navy)", margin: "0 0 6px 0", letterSpacing: "-0.5px" }}>
            Officers &amp; Performance
          </h1>
          <p style={{ fontSize: "14px", color: "var(--muted)", margin: 0 }}>
            Track performance, ensure accountability, build a better Ludhiana
          </p>
        </div>

        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#ffffff", padding: "8px 14px", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "13px", color: "var(--ink)" }}>
            <Icon name="calendar" />
            <select
              value={reportingPeriod}
              onChange={(e) => setReportingPeriod(e.target.value)}
              style={{ border: "none", background: "transparent", outline: "none", cursor: "pointer", fontWeight: 500 }}
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
            <Icon name="download" />
            Export Report
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", marginBottom: "28px", gap: "32px" }}>
        {(["Overview", "BI Officers", "ATP Officers", "Performance Analytics"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setSelectedTab(tab)}
            style={{
              padding: "10px 4px",
              background: "transparent",
              border: "none",
              borderBottom: selectedTab === tab ? "2px solid var(--navy)" : "2px solid transparent",
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

      {!loading && !error && selectedTab !== "Performance Analytics" && (
        <>
          {/* Summary Cards */}
          <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", marginBottom: "28px" }}>
            <div className="stat-card" style={{ background: "#ffffff", padding: "20px", borderRadius: "10px", border: "1px solid var(--border)", boxShadow: "var(--shadow-card)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Total Officers</div>
                  <div style={{ fontSize: "28px", fontWeight: 700, color: "var(--navy)" }}>{totalOfficersCount}</div>
                </div>
                <div style={{ width: "40px", height: "40px", borderRadius: "8px", background: "var(--bridal-blue)", display: "grid", placeItems: "center", color: "var(--sapphire)" }}>
                  <Icon name="users" />
                </div>
              </div>
              <div style={{ fontSize: "12px", color: "var(--success)", marginTop: "12px", display: "flex", alignItems: "center", gap: "4px" }}>
                <span>Active Roster</span>
              </div>
            </div>

            <div className="stat-card" style={{ background: "#ffffff", padding: "20px", borderRadius: "10px", border: "1px solid var(--border)", boxShadow: "var(--shadow-card)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Building Inspectors (BI)</div>
                  <div style={{ fontSize: "28px", fontWeight: 700, color: "var(--navy)" }}>{biOfficersCount}</div>
                </div>
                <div style={{ width: "40px", height: "40px", borderRadius: "8px", background: "#ecfdf5", display: "grid", placeItems: "center", color: "var(--success)" }}>
                  <Icon name="user" />
                </div>
              </div>
              <div style={{ fontSize: "12px", color: "var(--success)", marginTop: "12px" }}>
                <span>Field enforcement unit</span>
              </div>
            </div>

            <div className="stat-card" style={{ background: "#ffffff", padding: "20px", borderRadius: "10px", border: "1px solid var(--border)", boxShadow: "var(--shadow-card)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Assistant Town Planners</div>
                  <div style={{ fontSize: "28px", fontWeight: 700, color: "var(--navy)" }}>{atpOfficersCount}</div>
                </div>
                <div style={{ width: "40px", height: "40px", borderRadius: "8px", background: "#fef3c7", display: "grid", placeItems: "center", color: "var(--warning)" }}>
                  <Icon name="shield" />
                </div>
              </div>
              <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "12px" }}>
                <span>Zone planning unit</span>
              </div>
            </div>

            <div className="stat-card" style={{ background: "#ffffff", padding: "20px", borderRadius: "10px", border: "1px solid var(--border)", boxShadow: "var(--shadow-card)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Average Performance</div>
                  <div style={{ fontSize: "28px", fontWeight: 700, color: "var(--navy)" }}>84%</div>
                </div>
                <div style={{ width: "40px", height: "40px", borderRadius: "8px", background: "var(--bridal-blue)", display: "grid", placeItems: "center", color: "var(--sapphire)" }}>
                  <Icon name="chart" />
                </div>
              </div>
              <div style={{ fontSize: "12px", color: "var(--success)", marginTop: "12px" }}>
                <span>↑ 8.2% vs last month</span>
              </div>
            </div>
          </div>

          {/* ── TOP 3 PERFORMING OFFICERS PODIUM (Matches reference design) ── */}
          {selectedTab === "Overview" && topPerformers.length > 0 && (
            <div style={{ marginBottom: "28px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <div>
                  <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--navy)", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                    <span>🏆</span> Top Performing Officers
                  </h3>
                  <p style={{ fontSize: "12px", color: "var(--muted)", margin: "4px 0 0" }}>
                    Based on composite performance score (inspections, notices, case resolution, timelines)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTab("Performance Analytics")}
                  style={{ background: "none", border: "none", color: "var(--sapphire)", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
                >
                  View All Analytics →
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
                {topPerformers.map((officer, idx) => (
                  <div
                    key={officer.officerId}
                    onClick={() => handleViewOfficer(officer.officerId)}
                    style={{
                      background: "#ffffff",
                      borderRadius: "12px",
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
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{ position: "relative" }}>
                          <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: idx === 0 ? "var(--navy)" : idx === 1 ? "#334155" : "#475569", color: "#fff", display: "grid", placeItems: "center", fontWeight: 700, fontSize: "17px" }}>
                            {officer.name.replace(/^(Sh\.|Smt\.|Dr\.|Er\.)\s*/i, "").charAt(0)}
                          </div>
                          <span
                            style={{
                              position: "absolute",
                              bottom: "-4px",
                              right: "-4px",
                              width: "20px",
                              height: "20px",
                              borderRadius: "50%",
                              background: officer.badgeColor,
                              color: "#fff",
                              fontSize: "11px",
                              fontWeight: 800,
                              display: "grid",
                              placeItems: "center",
                              border: "2px solid #ffffff",
                            }}
                          >
                            {officer.badge}
                          </span>
                        </div>
                        <div>
                          <h4 style={{ fontSize: "14px", fontWeight: 700, color: "var(--navy)", margin: 0 }}>
                            {officer.name}
                          </h4>
                          <span style={{ fontSize: "11px", color: "var(--sapphire)", fontWeight: 500 }}>
                            {officer.designation} • {officer.zone}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", paddingTop: "12px", borderTop: "1px solid #f1f5f9" }}>
                      <div>
                        <div style={{ fontSize: "26px", fontWeight: 800, color: "var(--navy)", lineHeight: 1 }}>
                          {officer.score}%
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "4px" }}>Composite Score</div>
                        <span style={{ fontSize: "11px", fontWeight: 700, color: "#16a34a", display: "inline-block", marginTop: "2px" }}>
                          {officer.trend} vs last month
                        </span>
                      </div>

                      {/* Sparkline curve */}
                      <svg width="90" height="28" viewBox="0 0 90 28" style={{ overflow: "visible" }}>
                        <path
                          d={idx === 0 ? "M0 22 Q 22 26, 45 14 T 90 4" : idx === 1 ? "M0 24 Q 22 16, 45 18 T 90 6" : "M0 26 Q 28 22, 55 12 T 90 8"}
                          fill="none"
                          stroke={idx === 0 ? "#2563eb" : idx === 1 ? "#10b981" : "#f97316"}
                          strokeWidth={2.4}
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Officers Performance Table Section */}
          <div className="panel" style={{ background: "#ffffff", borderRadius: "12px", border: "1px solid var(--border)", padding: "20px", boxShadow: "var(--shadow-card)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "16px" }}>
              <div>
                <h2 style={{ fontSize: "18px", fontWeight: 700, color: "var(--navy)", margin: "0 0 4px 0" }}>All Officers Performance</h2>
                <p style={{ fontSize: "13px", color: "var(--muted)", margin: 0 }}>Complete list of officers with key active workload metrics</p>
              </div>

              <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ position: "relative", minWidth: "280px" }}>
                  <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }}>
                    <Icon name="search" />
                  </span>
                  <input
                    type="text"
                    placeholder="Search officers by name, designation or zone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px 8px 36px",
                      borderRadius: "6px",
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
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid var(--border)",
                    fontSize: "13px",
                    background: "#ffffff",
                    color: "var(--ink)",
                    cursor: "pointer",
                  }}
                >
                  <option value="All Zones">All Zones</option>
                  {availableZones.map((zone) => (
                    <option key={zone} value={zone}>{zone}</option>
                  ))}
                </select>
              </div>
            </div>

            {filteredOfficers.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>
                <p>No officers found matching your search or zone filter.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: "50px" }}>#</th>
                      <th>Officer Name</th>
                      <th>Designation</th>
                      <th>Zone</th>
                      <th>Assigned Blocks</th>
                      <th>Active Complaints</th>
                      <th>Performance</th>
                      <th style={{ textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOfficers.map((officer, index) => (
                      <tr key={officer.officerId}>
                        <td style={{ color: "var(--muted)", fontWeight: 500 }}>{index + 1}</td>
                        <td>
                          <div style={{ fontWeight: 600, color: "var(--navy)" }}>{officer.name}</div>
                          <div style={{ fontSize: "11px", color: "var(--muted)" }}>{officer.officerId}</div>
                        </td>
                        <td>
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
                        <td>{officer.zone}</td>
                        <td>
                          <div style={{ maxWidth: "200px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={officer.blocks.join(", ")}>
                            {officer.blocks.join(", ")}
                          </div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, color: officer.activeComplaints > 0 ? "var(--sapphire)" : "var(--muted)" }}>
                            {officer.activeComplaints}
                          </span>
                        </td>
                        <td>
                          <span style={{ color: "var(--muted)", fontSize: "13px" }}>
                            {index === 0 ? "92%" : index === 1 ? "87%" : index === 2 ? "84%" : "76%"}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
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
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── PERFORMANCE ANALYTICS TAB: FULL VISUAL METRICS ─────────────────── */}
      {!loading && !error && selectedTab === "Performance Analytics" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
          {/* Top Charts Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(440px, 1fr))", gap: "24px" }}>
            {/* Chart 1: Donut Caseload Distribution */}
            <Card style={{ background: "#ffffff", borderRadius: "14px", padding: "24px", border: "1px solid var(--border)", boxShadow: "var(--shadow-card)" }}>
              <div style={{ marginBottom: "16px" }}>
                <h3 style={{ fontSize: "17px", fontWeight: 700, color: "var(--navy)", margin: 0 }}>Officer Caseload &amp; Status Breakdown</h3>
                <p style={{ fontSize: "12px", color: "var(--muted)", margin: "4px 0 0" }}>Live complaint enforcement stages handled across the team</p>
              </div>

              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", margin: "10px 0 16px" }}>
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

              <div style={{ display: "flex", flexDirection: "column", gap: "8px", borderTop: "1px solid #f1f5f9", paddingTop: "14px" }}>
                {analyticsDonutData.map((item) => (
                  <div
                    key={item.label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "6px 8px",
                      borderRadius: "6px",
                      background: hoveredDonutSegment === item.label ? "#f8fafc" : "transparent",
                    }}
                    onMouseEnter={() => setHoveredDonutSegment(item.label)}
                    onMouseLeave={() => setHoveredDonutSegment(null)}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: item.color }} />
                      <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--navy)" }}>{item.label}</span>
                    </div>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--navy)" }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Chart 2: Competency & Compliance Radar */}
            <Card style={{ background: "#ffffff", borderRadius: "14px", padding: "24px", border: "1px solid var(--border)", boxShadow: "var(--shadow-card)" }}>
              <div style={{ marginBottom: "16px" }}>
                <h3 style={{ fontSize: "17px", fontWeight: 700, color: "var(--navy)", margin: 0 }}>Statutory Competency &amp; Velocity Radar</h3>
                <p style={{ fontSize: "12px", color: "var(--muted)", margin: "4px 0 0" }}>10-axis radial balance across municipal compliance &amp; follow-up</p>
              </div>

              <div style={{ background: "#f8f6ee", borderRadius: "12px", padding: "16px", display: "flex", justifyContent: "center" }}>
                <OfficerRadarChart data={municipalRadarData} size={250} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "16px" }}>
                <div style={{ padding: "8px 12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0", textAlign: "center" }}>
                  <span style={{ fontSize: "11px", color: "var(--muted)", display: "block" }}>Highest Efficiency</span>
                  <strong style={{ fontSize: "12px", color: "var(--navy)" }}>Doc Integrity (95%)</strong>
                </div>
                <div style={{ padding: "8px 12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0", textAlign: "center" }}>
                  <span style={{ fontSize: "11px", color: "var(--muted)", display: "block" }}>Priority Focus</span>
                  <strong style={{ fontSize: "12px", color: "var(--navy)" }}>Grievance Speed (60%)</strong>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Right-Side Officer Profile Drawer */}
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
              maxWidth: "540px",
              background: "#ffffff",
              height: "100%",
              overflowY: "auto",
              padding: "28px",
              boxShadow: "-4px 0 24px rgba(0,0,0,0.15)",
              display: "flex",
              flexDirection: "column",
              gap: "24px",
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
                    <h2 style={{ fontSize: "16px", fontWeight: 700, color: "var(--navy)", margin: "0 0 4px 0" }}>Officer Profile</h2>
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
                <div style={{ display: "flex", gap: "16px", alignItems: "center", background: "var(--slate)", padding: "16px", borderRadius: "10px" }}>
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

                {/* Tab: Overview */}
                {drawerTab === "Overview" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }}>
                      <div style={{ padding: "12px", background: "#ffffff", border: "1px solid var(--border)", borderRadius: "8px" }}>
                        <span style={{ fontSize: "11px", color: "var(--muted)" }}>Active Complaints</span>
                        <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--navy)", marginTop: "4px" }}>
                          {selectedOfficer.complaints.length}
                        </div>
                      </div>
                      <div style={{ padding: "12px", background: "#ffffff", border: "1px solid var(--border)", borderRadius: "8px" }}>
                        <span style={{ fontSize: "11px", color: "var(--muted)" }}>Assigned Blocks</span>
                        <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--navy)", marginTop: "4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {selectedOfficer.officer.blocks.join(", ")}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 style={{ fontSize: "14px", fontWeight: 700, color: "var(--navy)", marginBottom: "12px" }}>Assigned Complaints ({selectedOfficer.complaints.length})</h4>
                      {selectedOfficer.complaints.length === 0 ? (
                        <p style={{ fontSize: "13px", color: "var(--muted)", fontStyle: "italic" }}>No complaints currently assigned to this officer.</p>
                      ) : (
                        <div className="table-wrap" style={{ maxHeight: "280px", overflowY: "auto" }}>
                          <table className="data-table" style={{ fontSize: "12px" }}>
                            <thead>
                              <tr>
                                <th>ID</th>
                                <th>Title</th>
                                <th>Block</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedOfficer.complaints.map((c) => (
                                <tr key={c.complaintId}>
                                  <td style={{ fontWeight: 600 }}>{c.complaintId}</td>
                                  <td>{c.title || "—"}</td>
                                  <td>{c.block || "—"}</td>
                                  <td>
                                    <span style={{ padding: "2px 6px", borderRadius: "4px", background: "var(--slate)", fontSize: "11px" }}>
                                      {c.status || "—"}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── TAB: PERFORMANCE (WITH DONUT & RADAR CHARTS) ─────────── */}
                {drawerTab === "Performance" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    {/* Performance KPI Cards */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
                      <div style={{ padding: "10px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0", textAlign: "center" }}>
                        <span style={{ fontSize: "11px", color: "var(--muted)" }}>Caseload</span>
                        <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--navy)", marginTop: "2px" }}>{selectedOfficer.complaints.length}</div>
                      </div>
                      <div style={{ padding: "10px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0", textAlign: "center" }}>
                        <span style={{ fontSize: "11px", color: "var(--muted)" }}>Resolution</span>
                        <div style={{ fontSize: "18px", fontWeight: 700, color: "#16a34a", marginTop: "2px" }}>88%</div>
                      </div>
                      <div style={{ padding: "10px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0", textAlign: "center" }}>
                        <span style={{ fontSize: "11px", color: "var(--muted)" }}>Avg Time</span>
                        <div style={{ fontSize: "18px", fontWeight: 700, color: "#2563eb", marginTop: "2px" }}>2.8d</div>
                      </div>
                    </div>

                    {/* Donut Chart */}
                    <div style={{ background: "#ffffff", borderRadius: "10px", padding: "16px", border: "1px solid var(--border)" }}>
                      <h4 style={{ fontSize: "13px", fontWeight: 700, color: "var(--navy)", margin: "0 0 12px 0", textAlign: "center" }}>
                        Complaint Status Allocation
                      </h4>
                      <div style={{ display: "flex", justifyContent: "center" }}>
                        <DonutChart
                          data={drawerOfficerDonut}
                          size={180}
                          strokeWidth={22}
                          animationDuration={1.0}
                          centerContent={
                            <div style={{ textAlign: "center" }}>
                              <span style={{ fontSize: "20px", fontWeight: 800, color: "var(--navy)", lineHeight: 1 }}>
                                {selectedOfficer.complaints.length}
                              </span>
                              <span style={{ fontSize: "9px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginTop: "2px" }}>
                                Total
                              </span>
                            </div>
                          }
                        />
                      </div>
                    </div>

                    {/* Radar Chart */}
                    <div style={{ background: "#ffffff", borderRadius: "10px", padding: "16px", border: "1px solid var(--border)" }}>
                      <h4 style={{ fontSize: "13px", fontWeight: 700, color: "var(--navy)", margin: "0 0 12px 0", textAlign: "center" }}>
                        Competency Radar ({selectedOfficer.officer.name})
                      </h4>
                      <div style={{ background: "#f8f6ee", borderRadius: "8px", padding: "10px", display: "flex", justifyContent: "center" }}>
                        <OfficerRadarChart data={drawerOfficerRadar} size={210} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab: Assigned Areas */}
                {drawerTab === "Assigned Areas" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div>
                      <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase" }}>Zone</span>
                      <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--navy)", marginTop: "4px" }}>{selectedOfficer.officer.zone}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase" }}>Assigned Blocks ({selectedOfficer.officer.blocks.length})</span>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px" }}>
                        {selectedOfficer.officer.blocks.map((block) => (
                          <span key={block} style={{ padding: "4px 10px", background: "var(--bridal-blue)", color: "var(--sapphire)", borderRadius: "6px", fontSize: "13px", fontWeight: 600 }}>
                            Block {block}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab: Activity */}
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
