import { useEffect, useState, useMemo } from "react";
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

type Complaint = {
  complaintId: string;
  title?: string;
  block?: string;
  status?: string;
  createdAt?: string;
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

  // Calculations for summary cards
  const totalOfficersCount = officers.length;
  const biOfficersCount = officers.filter(o => {
    const d = o.designation.trim().toUpperCase();
    return d === "BI" || d.includes("BI");
  }).length;
  const atpOfficersCount = officers.filter(o => {
    const d = o.designation.trim().toUpperCase();
    return d === "ATP" || d.includes("ATP");
  }).length;

  // Filter officers based on active tab
  const tabFilteredOfficers = useMemo(() => {
    if (selectedTab === "BI Officers") {
      return officers.filter(o => {
        const d = o.designation.trim().toUpperCase();
        return d === "BI" || d.includes("BI");
      });
    }
    if (selectedTab === "ATP Officers") {
      return officers.filter(o => {
        const d = o.designation.trim().toUpperCase();
        return d === "ATP" || d.includes("ATP");
      });
    }
    return officers;
  }, [officers, selectedTab]);

  // Filter by search query and zone
  const filteredOfficers = useMemo(() => {
    return tabFilteredOfficers.filter(officer => {
      const matchesSearch = 
        officer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        officer.designation.toLowerCase().includes(searchQuery.toLowerCase()) ||
        officer.zone.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesZone = 
        selectedZone === "All Zones" || 
        officer.zone.toLowerCase() === selectedZone.toLowerCase() ||
        officer.zone.toLowerCase() === selectedZone.replace("Zone ", "").toLowerCase();

      return matchesSearch && matchesZone;
    });
  }, [tabFilteredOfficers, searchQuery, selectedZone]);

  // Unique zones for dropdown
  const availableZones = useMemo(() => {
    const zones = new Set(officers.map(o => o.zone));
    return Array.from(zones).sort();
  }, [officers]);

  return (
    <div className="analytics-page officers-performance-page" style={{ padding: "24px", maxWidth: "1600px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "var(--navy)", margin: "0 0 6px 0" }}>Officers & Performance</h1>
          <p style={{ color: "var(--muted)", fontSize: "14px", margin: 0 }}>Track performance, ensure accountability, build a better Ludhiana</p>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", background: "#ffffff", border: "1px solid var(--border)", borderRadius: "6px", padding: "6px 12px", gap: "8px", fontSize: "13px", fontWeight: 500 }}>
            <span style={{ display: "inline-flex", width: "16px", height: "16px", alignItems: "center", justifyContent: "center" }}><Icon name="calendar" /></span>
            <select 
              value={reportingPeriod} 
              onChange={(e) => setReportingPeriod(e.target.value)}
              style={{ border: "none", background: "transparent", outline: "none", fontWeight: 500, color: "var(--ink)", cursor: "pointer" }}
            >
              <option value="This Month">This Month</option>
              <option value="Last Month">Last Month</option>
              <option value="Quarterly">Quarterly</option>
              <option value="Year to Date">Year to Date</option>
            </select>
          </div>
          <button 
            type="button" 
            className="primary-button" 
            onClick={handleExportReport}
            style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "var(--navy)", color: "#fff", padding: "8px 16px", borderRadius: "6px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
          >
            <span style={{ display: "inline-flex", width: "14px", height: "14px", alignItems: "center", justifyContent: "center" }}><Icon name="download" /></span> Export Report
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", marginBottom: "24px", gap: "28px" }}>
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
              fontWeight: selectedTab === tab ? 600 : 500,
              fontSize: "14px",
              cursor: "pointer",
              marginBottom: "-1px",
              transition: "all 0.2s"
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading && <p className="upload-empty-hint" style={{ textAlign: "center", padding: "40px" }}>Loading officers and metrics...</p>}
      {error && <p className="error-text" style={{ textAlign: "center", padding: "40px" }}>{error}</p>}

      {!loading && !error && selectedTab === "Performance Analytics" && (
        <div className="panel" style={{ background: "#ffffff", padding: "32px", borderRadius: "12px", border: "1px solid var(--border)", textAlign: "center" }}>
          <div style={{ maxWidth: "600px", margin: "0 auto" }}>
            <h3 style={{ fontSize: "18px", color: "var(--navy)", marginBottom: "12px" }}>Performance Analytics & Metrics</h3>
            <p style={{ color: "var(--muted)", fontSize: "14px", lineHeight: 1.6, marginBottom: "20px" }}>
              Detailed analytics breakdown based on live inspection outcomes, notice cycles, and complaint resolution timelines across zones and building blocks.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginTop: "24px" }}>
              <div style={{ padding: "16px", background: "var(--slate)", borderRadius: "8px" }}>
                <span style={{ fontSize: "12px", color: "var(--muted)" }}>Total Active Officers</span>
                <h4 style={{ fontSize: "24px", color: "var(--navy)", margin: "8px 0 0" }}>{totalOfficersCount}</h4>
              </div>
              <div style={{ padding: "16px", background: "var(--slate)", borderRadius: "8px" }}>
                <span style={{ fontSize: "12px", color: "var(--muted)" }}>Building Inspectors</span>
                <h4 style={{ fontSize: "24px", color: "var(--navy)", margin: "8px 0 0" }}>{biOfficersCount}</h4>
              </div>
              <div style={{ padding: "16px", background: "var(--slate)", borderRadius: "8px" }}>
                <span style={{ fontSize: "12px", color: "var(--muted)" }}>Assistant Town Planners</span>
                <h4 style={{ fontSize: "24px", color: "var(--navy)", margin: "8px 0 0" }}>{atpOfficersCount}</h4>
              </div>
              <div style={{ padding: "16px", background: "var(--slate)", borderRadius: "8px" }}>
                <span style={{ fontSize: "12px", color: "var(--muted)" }}>Performance Status</span>
                <h4 style={{ fontSize: "16px", color: "var(--success)", margin: "8px 0 0" }}>Active Tracking</h4>
              </div>
            </div>
          </div>
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
                  <div style={{ fontSize: "28px", fontWeight: 700, color: "var(--navy)" }}>—</div>
                </div>
                <div style={{ width: "40px", height: "40px", borderRadius: "8px", background: "var(--slate)", display: "grid", placeItems: "center", color: "var(--muted)" }}>
                  <Icon name="chart" />
                </div>
              </div>
              <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "12px" }}>
                <span>Metrics pending sync</span>
              </div>
            </div>
          </div>

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
                      background: "#fafafa"
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
                    cursor: "pointer"
                  }}
                >
                  <option value="All Zones">All Zones</option>
                  {availableZones.map(zone => (
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
                          <span style={{
                            display: "inline-block",
                            padding: "2px 8px",
                            borderRadius: "4px",
                            fontSize: "11px",
                            fontWeight: 600,
                            background: officer.designation.includes("ATP") ? "#fef3c7" : "#e0f2fe",
                            color: officer.designation.includes("ATP") ? "#b45309" : "#0369a1"
                          }}>
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
                          <span style={{ color: "var(--muted)", fontSize: "13px" }}>—</span>
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
                              gap: "4px"
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
            animation: "fadeIn 0.2s ease"
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
              gap: "24px"
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
                        marginBottom: "-1px"
                      }}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Tab: Overview */}
                {drawerTab === "Overview" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    {/* Quick Metric Grid */}
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

                    {/* Assigned Complaints Table */}
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

                {/* Tab: Performance */}
                {drawerTab === "Performance" && (
                  <div style={{ padding: "20px 0", textAlign: "center", color: "var(--muted)" }}>
                    <p style={{ fontSize: "14px", marginBottom: "8px" }}>Performance analytics for {selectedOfficer.officer.name}</p>
                    <p style={{ fontSize: "12px" }}>Detailed monthly inspection and notice metrics will appear here once synchronized with live field reports.</p>
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
                        {selectedOfficer.officer.blocks.map(block => (
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
                        {selectedOfficer.complaints.map(c => (
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
