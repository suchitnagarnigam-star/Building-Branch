import { useEffect, useState, useMemo } from "react";
import Icon from "../../shared/components/Icon";
import { API_BASE_URL } from "../../shared/utils/apiConfig";

export type OfficerAnalyticsRecord = {
  officerId: string;
  name: string;
  mobile: string;
  designation: string;
  zone: string;
  blocks: string[];
  fieldVisits: number;
  noticesIssued: number;
  casesAssigned: number;
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
  officer: {
    officerId: string;
    name: string;
    phone_number?: string;
    mobile?: string;
    designation: string;
    zone: string;
    blocks: string[];
  };
  complaints: Complaint[];
};

function OfficersPage() {
  const [officers, setOfficers] = useState<OfficerAnalyticsRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedZone, setSelectedZone] = useState("All Zones");
  const [designationFilter, setDesignationFilter] = useState<"All" | "BI" | "ATP">("All");

  // Drawer
  const [selectedOfficer, setSelectedOfficer] = useState<OfficerDetailsResponse | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`${API_BASE_URL}/analytics/officers`)
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.message || "Unable to load officers analytics.");
        }
        return result.officers ?? [];
      })
      .then((data: OfficerAnalyticsRecord[]) => {
        if (active) setOfficers(data);
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : "Unable to load officers.");
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

    try {
      const response = await fetch(`${API_BASE_URL}/officers/${encodeURIComponent(officerId)}`);
      const result = (await response.json()) as OfficerDetailsResponse & { message?: string };

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to load officer details.");
      }

      setSelectedOfficer(result);
    } catch (err: unknown) {
      setDetailsError(err instanceof Error ? err.message : "Unable to load officer details.");
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleExportReport = () => {
    const rows = [
      ["Building Branch Officers Roster Report"],
      ["Generated On", new Date().toLocaleString()],
      [],
      ["Officer", "Designation", "Zone", "Field Visits", "Notices Issued", "Cases Assigned", "Activity"],
      ...filteredOfficers.map((o) => {
        const total = (o.fieldVisits || 0) + (o.casesAssigned || 0);
        const activity = total > 10 ? "High" : total > 4 ? "Medium" : total > 0 ? "Low" : "Inactive";
        return [o.name, o.designation, o.zone, o.fieldVisits, o.noticesIssued, o.casesAssigned, activity];
      }),
    ];

    const csvContent =
      "data:text/csv;charset=utf-8," +
      rows.map((e) => e.map((cell) => `"${cell}"`).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Officers_Report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Summary counts
  const totalOfficersCount = officers.length;
  const biOfficersCount = officers.filter((o) => {
    const d = (o.designation || "").trim().toUpperCase();
    return d === "BI" || d.includes("BI");
  }).length;
  const atpOfficersCount = officers.filter((o) => {
    const d = (o.designation || "").trim().toUpperCase();
    return d === "ATP" || d.includes("ATP");
  }).length;

  // Filter officers based on designation, search, and zone
  const filteredOfficers = useMemo(() => {
    return officers.filter((officer) => {
      // 1. Designation filter
      if (designationFilter === "BI") {
        const d = (officer.designation || "").trim().toUpperCase();
        if (!d.includes("BI")) return false;
      } else if (designationFilter === "ATP") {
        const d = (officer.designation || "").trim().toUpperCase();
        if (!d.includes("ATP")) return false;
      }

      // 2. Search filter
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        (officer.name || "").toLowerCase().includes(q) ||
        (officer.officerId || "").toLowerCase().includes(q) ||
        (officer.designation || "").toLowerCase().includes(q);

      // 3. Zone filter
      const matchesZone =
        selectedZone === "All Zones" ||
        (officer.zone || "").toLowerCase() === selectedZone.toLowerCase() ||
        `Zone ${officer.zone || ""}`.toLowerCase() === selectedZone.toLowerCase();

      return matchesSearch && matchesZone;
    });
  }, [officers, designationFilter, searchQuery, selectedZone]);

  const availableZones = useMemo(() => {
    const zones = new Set<string>();
    officers.forEach((o) => {
      if (o.zone) zones.add(o.zone.startsWith("Zone ") ? o.zone : `Zone ${o.zone}`);
    });
    return Array.from(zones).sort();
  }, [officers]);

  return (
    <div
      className="analytics-page officers-performance-page"
      style={{
        padding: "24px 32px",
        maxWidth: "1600px",
        margin: "0 auto",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {/* ── TOP HEADER SECTION ─────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "24px",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
            <h1
              style={{
                fontSize: "26px",
                fontWeight: 700,
                color: "var(--navy)",
                margin: 0,
                letterSpacing: "-0.4px",
              }}
            >
              Officers &amp; Enforcement Personnel
            </h1>
            <span
              style={{
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
              }}
            >
              <span>👥</span> {totalOfficersCount} Active Staff ({biOfficersCount} BI •{" "}
              {atpOfficersCount} ATP)
            </span>
          </div>
          <p style={{ fontSize: "14px", color: "var(--muted)", margin: 0 }}>
            Municipal Corporation Ludhiana • Building Branch Personnel &amp; Statutory Workload
          </p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={handleExportReport}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 16px",
            borderRadius: "8px",
            background: "var(--navy)",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "13px",
          }}
        >
          <Icon name="download" />
          Export Report
        </button>
      </div>

      {/* ── FILTER CONTROLS BAR ────────────────────────────────────────────── */}
      <div
        style={{
          background: "#fff",
          border: "1px solid var(--border)",
          borderRadius: "10px",
          padding: "16px 20px",
          marginBottom: "20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          boxShadow: "var(--shadow-card)",
        }}
      >
        {/* Left: Search input */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: "1 1 300px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "#f8fafc",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "7px 12px",
              width: "100%",
              maxWidth: "360px",
            }}
          >
            <span style={{ color: "var(--muted)", display: "flex" }}>
              <Icon name="search" />
            </span>
            <input
              type="text"
              placeholder="Search officer name, designation, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: "none",
                background: "transparent",
                outline: "none",
                fontSize: "13px",
                width: "100%",
                color: "var(--ink)",
              }}
            />
          </div>
        </div>

        {/* Right: Designation Tabs & Zone Dropdown */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          {/* Designation pills */}
          <div
            style={{
              display: "inline-flex",
              background: "#f1f5f9",
              padding: "3px",
              borderRadius: "8px",
            }}
          >
            {(["All", "BI", "ATP"] as const).map((desig) => (
              <button
                key={desig}
                type="button"
                onClick={() => setDesignationFilter(desig)}
                style={{
                  padding: "5px 14px",
                  borderRadius: "6px",
                  border: "none",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  background: designationFilter === desig ? "#fff" : "transparent",
                  color: designationFilter === desig ? "var(--midnight)" : "var(--muted)",
                  boxShadow:
                    designationFilter === desig ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                {desig === "All" ? "All Roles" : desig}
              </button>
            ))}
          </div>

          {/* Zone filter dropdown */}
          <select
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            style={{
              padding: "7px 12px",
              borderRadius: "8px",
              border: "1px solid var(--border)",
              fontSize: "13px",
              fontWeight: 500,
              color: "var(--ink)",
              background: "#fff",
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="All Zones">All Zones</option>
            {availableZones.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && (
        <div
          style={{
            display: "grid",
            placeItems: "center",
            minHeight: "260px",
            color: "var(--muted)",
          }}
        >
          <p>Loading officers roster...</p>
        </div>
      )}

      {error && (
        <div
          style={{
            padding: "16px 20px",
            background: "#fee2e2",
            borderRadius: "10px",
            color: "#dc2626",
            border: "1px solid #fca5a5",
            marginBottom: "20px",
            fontSize: "13px",
            fontWeight: 500,
          }}
        >
          Error loading officers: {error}
        </div>
      )}

      {/* ── OFFICERS ROSTER TABLE ─────────────────────────────────────────── */}
      {!loading && !error && (
        <div
          style={{
            background: "#fff",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            boxShadow: "var(--shadow-card)",
            overflow: "hidden",
          }}
        >
          <table className="db-table" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th>OFFICER</th>
                <th>DESIGNATION</th>
                <th>ZONE</th>
                <th style={{ textAlign: "center" }}>FIELD VISITS</th>
                <th style={{ textAlign: "center" }}>NOTICES ISSUED</th>
                <th style={{ textAlign: "center" }}>CASES ASSIGNED</th>
                <th style={{ textAlign: "center" }}>ACTIVITY</th>
                <th style={{ textAlign: "right" }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filteredOfficers.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    style={{ textAlign: "center", padding: "32px", color: "var(--muted)" }}
                  >
                    No officers match the current filters.
                  </td>
                </tr>
              ) : (
                filteredOfficers.map((officer) => {
                  const total = (officer.fieldVisits || 0) + (officer.casesAssigned || 0);
                  const activityLabel =
                    total > 10
                      ? "High"
                      : total > 4
                      ? "Medium"
                      : total > 0
                      ? "Low"
                      : "Inactive";

                  const badgeStyle =
                    activityLabel === "High"
                      ? { bg: "#dcfce7", color: "#166534" }
                      : activityLabel === "Medium"
                      ? { bg: "#eff6ff", color: "#1d4ed8" }
                      : activityLabel === "Low"
                      ? { bg: "#fef3c7", color: "#92400e" }
                      : { bg: "#f1f5f9", color: "#64748b" };

                  return (
                    <tr key={officer.officerId}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div
                            style={{
                              width: "32px",
                              height: "32px",
                              borderRadius: "50%",
                              background: "#e0e7ff",
                              color: "#3730a3",
                              display: "grid",
                              placeItems: "center",
                              fontSize: "12px",
                              fontWeight: 700,
                              flexShrink: 0,
                            }}
                          >
                            {officer.name
                              .replace(/^(Sh\.|Smt\.|Dr\.|Er\.)\s*/i, "")
                              .charAt(0) || "O"}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: "var(--navy)" }}>
                              {officer.name}
                            </div>
                            {officer.mobile && (
                              <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                                {officer.mobile}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "2px 8px",
                            borderRadius: "4px",
                            background: "#f1f5f9",
                            fontSize: "11.5px",
                            fontWeight: 600,
                            color: "#334155",
                          }}
                        >
                          {officer.designation}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 500, color: "var(--ink)" }}>
                          {officer.zone ? (officer.zone.startsWith("Zone") ? officer.zone : `Zone ${officer.zone}`) : "—"}
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span style={{ fontWeight: 700, color: "var(--navy)", fontSize: "14px" }}>
                          {officer.fieldVisits || 0}
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span style={{ fontWeight: 700, color: "var(--navy)", fontSize: "14px" }}>
                          {officer.noticesIssued || 0}
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span style={{ fontWeight: 700, color: "var(--navy)", fontSize: "14px" }}>
                          {officer.casesAssigned || 0}
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 10px",
                            borderRadius: "12px",
                            fontSize: "11px",
                            fontWeight: 700,
                            background: badgeStyle.bg,
                            color: badgeStyle.color,
                          }}
                        >
                          {activityLabel}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          className="db-table__view-btn"
                          onClick={() => handleViewOfficer(officer.officerId)}
                        >
                          View Details →
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── RIGHT-SIDE OFFICER PROFILE DRAWER ──────────────────────────────── */}
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
              maxWidth: "520px",
              background: "#ffffff",
              height: "100%",
              overflowY: "auto",
              padding: "24px",
              boxShadow: "-4px 0 24px rgba(0,0,0,0.15)",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {detailsLoading && (
              <div
                style={{
                  display: "grid",
                  placeItems: "center",
                  height: "100%",
                  color: "var(--muted)",
                }}
              >
                <p>Loading officer profile...</p>
              </div>
            )}

            {detailsError && (
              <div>
                <p className="error-text" style={{ color: "#dc2626" }}>
                  {detailsError}
                </p>
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
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    borderBottom: "1px solid var(--border)",
                    paddingBottom: "16px",
                  }}
                >
                  <div>
                    <h2
                      style={{
                        fontSize: "17px",
                        fontWeight: 700,
                        color: "var(--navy)",
                        margin: "0 0 4px 0",
                      }}
                    >
                      Officer Profile
                    </h2>
                    <p style={{ fontSize: "12px", color: "var(--muted)", margin: 0 }}>
                      Personnel overview and current assignments
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedOfficer(null)}
                    style={{
                      background: "transparent",
                      border: "none",
                      fontSize: "22px",
                      cursor: "pointer",
                      color: "var(--muted)",
                    }}
                    aria-label="Close drawer"
                  >
                    ×
                  </button>
                </div>

                {/* Officer Bio Card */}
                <div
                  style={{
                    display: "flex",
                    gap: "16px",
                    alignItems: "center",
                    background: "#f8fafc",
                    padding: "16px",
                    borderRadius: "10px",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div
                    style={{
                      width: "50px",
                      height: "50px",
                      borderRadius: "50%",
                      background: "var(--navy)",
                      color: "#fff",
                      display: "grid",
                      placeItems: "center",
                      fontSize: "18px",
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {selectedOfficer.officer.name
                      .replace(/^(Sh\.|Smt\.|Dr\.|Er\.)\s*/i, "")
                      .charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3
                      style={{
                        fontSize: "16px",
                        fontWeight: 700,
                        color: "var(--navy)",
                        margin: 0,
                      }}
                    >
                      {selectedOfficer.officer.name}
                    </h3>
                    <p
                      style={{
                        fontSize: "13px",
                        color: "#2563eb",
                        margin: "3px 0 0",
                        fontWeight: 500,
                      }}
                    >
                      {selectedOfficer.officer.designation} • Zone {selectedOfficer.officer.zone}
                    </p>
                    {(selectedOfficer.officer.phone_number ||
                      selectedOfficer.officer.mobile) && (
                      <p
                        style={{
                          fontSize: "12px",
                          color: "var(--muted)",
                          margin: "2px 0 0",
                        }}
                      >
                        📞{" "}
                        {selectedOfficer.officer.phone_number ||
                          selectedOfficer.officer.mobile}
                      </p>
                    )}
                  </div>
                </div>

                {/* Assigned Blocks */}
                <div>
                  <h4
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      margin: "0 0 8px 0",
                    }}
                  >
                    Assigned Blocks
                  </h4>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {selectedOfficer.officer.blocks &&
                    selectedOfficer.officer.blocks.length > 0 ? (
                      selectedOfficer.officer.blocks.map((b) => (
                        <span
                          key={b}
                          style={{
                            padding: "3px 8px",
                            background: "#eff6ff",
                            color: "#1d4ed8",
                            borderRadius: "4px",
                            fontSize: "11px",
                            fontWeight: 500,
                          }}
                        >
                          {b}
                        </span>
                      ))
                    ) : (
                      <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                        No specific blocks listed
                      </span>
                    )}
                  </div>
                </div>

                {/* Assigned Complaints / Matters */}
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "8px",
                    }}
                  >
                    <h4
                      style={{
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "var(--muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        margin: 0,
                      }}
                    >
                      Active Assigned Matters
                    </h4>
                    <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 500 }}>
                      {selectedOfficer.complaints.length} matters
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                      maxHeight: "360px",
                      overflowY: "auto",
                    }}
                  >
                    {selectedOfficer.complaints.length === 0 ? (
                      <p
                        style={{
                          fontSize: "13px",
                          color: "var(--muted)",
                          padding: "16px",
                          textAlign: "center",
                          background: "#f8fafc",
                          borderRadius: "8px",
                        }}
                      >
                        No complaints currently assigned to this officer.
                      </p>
                    ) : (
                      selectedOfficer.complaints.map((c) => (
                        <div
                          key={c.complaintId}
                          style={{
                            padding: "10px 12px",
                            background: "#f8fafc",
                            borderRadius: "8px",
                            border: "1px solid var(--border)",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <div>
                            <span
                              style={{
                                fontSize: "12px",
                                fontWeight: 700,
                                color: "#2563eb",
                                display: "block",
                              }}
                            >
                              {c.complaintId}
                            </span>
                            <span
                              style={{
                                fontSize: "11.5px",
                                color: "var(--ink)",
                                display: "block",
                                maxWidth: "260px",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {c.title || "Building violation complaint"}
                            </span>
                          </div>
                          <span
                            style={{
                              fontSize: "11px",
                              padding: "2px 8px",
                              borderRadius: "4px",
                              background: "#e2e8f0",
                              color: "#334155",
                              fontWeight: 600,
                            }}
                          >
                            {c.status || "Assigned"}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default OfficersPage;
