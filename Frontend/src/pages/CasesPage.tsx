import { useEffect, useState } from "react";
import Icon from "../shared/components/Icon";

type CasesPageProps = {
  navigate?: (route: string) => void;
};

type CaseRow = {
  case_id: string;
  source_type: string;
  primary_complaint_id?: string | null;
  building_identity?: string | null;
  location?: string | null;
  zone?: string | null;
  block?: string | null;
  ward?: string | null;
  assigned_bi_id?: string | null;
  assigned_bi_name?: string | null;
  assigned_atp_id?: string | null;
  assigned_atp_name?: string | null;
  current_status: string;
  construction_status?: string | null;
  construction_type?: string | null;
  created_at: string;
};

export default function CasesPage({ navigate }: CasesPageProps) {
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [constFilter, setConstFilter] = useState("all");
  const [zoneFilter, setZoneFilter] = useState("all");

  const loadCases = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/cases");
      const data = await res.json();
      if (data.success && Array.isArray(data.cases)) {
        setCases(data.cases);
      } else {
        setError(data.message || "Failed to load cases.");
      }
    } catch (err) {
      setError("Unable to connect to server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCases();
  }, []);

  const formatDate = (isoStr?: string | null) => {
    if (!isoStr) return "N/A";
    try {
      const d = new Date(isoStr);
      return isNaN(d.getTime()) ? isoStr : d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      });
    } catch {
      return isoStr;
    }
  };

  const filteredCases = cases.filter((c) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      c.case_id.toLowerCase().includes(q) ||
      (c.location && c.location.toLowerCase().includes(q)) ||
      (c.assigned_bi_name && c.assigned_bi_name.toLowerCase().includes(q)) ||
      (c.building_identity && c.building_identity.toLowerCase().includes(q));

    const matchesStatus =
      statusFilter === "all" ||
      c.current_status.toLowerCase() === statusFilter.toLowerCase();

    const actualConst = (c.construction_type || c.construction_status || "").toLowerCase();
    const matchesConst =
      constFilter === "all" ||
      (constFilter === "not_assessed" && !actualConst) ||
      actualConst === constFilter.toLowerCase();

    const matchesZone =
      zoneFilter === "all" ||
      (c.zone && c.zone.toLowerCase() === zoneFilter.toLowerCase());

    return matchesSearch && matchesStatus && matchesConst && matchesZone;
  });

  const totalCases = cases.length;
  const recordedCount = cases.filter((c) => c.construction_type || c.construction_status).length;
  const compoundableCount = cases.filter((c) => (c.construction_type || c.construction_status) === "compoundable").length;
  const nonCompoundableCount = cases.filter((c) => {
    const st = c.construction_type || c.construction_status;
    return st === "non_compoundable" || st === "partly_compoundable";
  }).length;

  return (
    <div className="field-inspection-page" style={{ maxWidth: "1120px", margin: "0 auto", paddingBottom: "48px" }}>
      {/* ── HEADER ── */}
      <div className="field-inspection-page__intro" style={{ marginBottom: "20px" }}>
        <div>
          <p className="eyebrow" style={{ textTransform: "uppercase", fontSize: "11px", letterSpacing: "0.08em", color: "var(--accent)" }}>
            Building Enforcement Operations
          </p>
          <h1 style={{ margin: "4px 0 6px", fontSize: "28px" }}>
            Enforcement Cases
          </h1>
          <p style={{ color: "var(--muted)", fontSize: "14px", margin: 0 }}>
            Manage building violation case files, statutory notices, and construction status assessments.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            type="button"
            className="secondary-button"
            onClick={loadCases}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            ↻ Refresh
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => navigate?.("/field-inspection")}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <Icon name="plus" /> New Inspection
          </button>
        </div>
      </div>

      {/* ── STATS METRICS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "20px" }}>
        <div className="inspection-card" style={{ margin: 0, padding: "16px" }}>
          <span style={{ fontSize: "12px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block" }}>Total Cases</span>
          <strong style={{ fontSize: "24px", color: "var(--text-primary)" }}>{totalCases}</strong>
        </div>
        <div className="inspection-card" style={{ margin: 0, padding: "16px" }}>
          <span style={{ fontSize: "12px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block" }}>Status Recorded</span>
          <strong style={{ fontSize: "24px", color: "var(--accent)" }}>{recordedCount}</strong>
        </div>
        <div className="inspection-card" style={{ margin: 0, padding: "16px" }}>
          <span style={{ fontSize: "12px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block" }}>Compoundable</span>
          <strong style={{ fontSize: "24px", color: "#166534" }}>{compoundableCount}</strong>
        </div>
        <div className="inspection-card" style={{ margin: 0, padding: "16px" }}>
          <span style={{ fontSize: "12px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block" }}>Non / Partly Comp.</span>
          <strong style={{ fontSize: "24px", color: "#c2410c" }}>{nonCompoundableCount}</strong>
        </div>
      </div>

      {/* ── FILTERS & SEARCH TOOLBAR ── */}
      <section className="inspection-card" style={{ marginBottom: "20px", padding: "16px" }}>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
          {/* Search Box */}
          <div style={{ flex: "1 1 240px", position: "relative" }}>
            <input
              type="text"
              placeholder="Search Case ID, location, officer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: "100%", padding: "8px 12px 8px 34px", borderRadius: "6px", border: "1px solid var(--border)", fontSize: "13px" }}
            />
            <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }}>
              <Icon name="search" />
            </span>
          </div>

          {/* Status Filter */}
          <div style={{ flex: "0 1 180px" }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--border)", fontSize: "13px" }}
            >
              <option value="all">All Case Statuses</option>
              <option value="open">Open</option>
              <option value="construction status recorded">Construction Recorded</option>
              <option value="notice issued">Notice Issued</option>
            </select>
          </div>

          {/* Construction Status Filter */}
          <div style={{ flex: "0 1 180px" }}>
            <select
              value={constFilter}
              onChange={(e) => setConstFilter(e.target.value)}
              style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--border)", fontSize: "13px" }}
            >
              <option value="all">All Construction</option>
              <option value="compoundable">Compoundable</option>
              <option value="partly_compoundable">Partly Compoundable</option>
              <option value="non_compoundable">Non-Compoundable</option>
              <option value="not_assessed">Not Assessed</option>
            </select>
          </div>

          {/* Zone Filter */}
          <div style={{ flex: "0 1 140px" }}>
            <select
              value={zoneFilter}
              onChange={(e) => setZoneFilter(e.target.value)}
              style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--border)", fontSize: "13px" }}
            >
              <option value="all">All Zones</option>
              <option value="zone a">Zone A</option>
              <option value="zone b">Zone B</option>
              <option value="zone c">Zone C</option>
              <option value="zone d">Zone D</option>
            </select>
          </div>
        </div>
      </section>

      {/* ── CASES TABLE ── */}
      {loading ? (
        <div style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}>
          Loading enforcement cases...
        </div>
      ) : error ? (
        <div className="field-error" style={{ padding: "16px", borderRadius: "8px", background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b" }}>
          {error}
        </div>
      ) : filteredCases.length === 0 ? (
        <section className="inspection-card" style={{ textAlign: "center", padding: "48px 24px" }}>
          <p style={{ color: "var(--muted)", margin: "0 0 16px", fontSize: "15px" }}>
            No cases match the selected filter criteria.
          </p>
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              setSearch("");
              setStatusFilter("all");
              setConstFilter("all");
              setZoneFilter("all");
            }}
          >
            Clear Filters
          </button>
        </section>
      ) : (
        <section className="inspection-card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "var(--surface-subtle, #f8fafc)", borderBottom: "1px solid var(--border)" }}>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--muted)" }}>Case ID</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--muted)" }}>Location / Zone</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--muted)" }}>Building Type</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--muted)" }}>Assigned BI</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--muted)" }}>Construction Status</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--muted)" }}>Case Status</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--muted)", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCases.map((c) => {
                  const constType = c.construction_type || c.construction_status;
                  let constBadgeStyle = { background: "#f1f5f9", color: "#64748b" };
                  if (constType === "compoundable") {
                    constBadgeStyle = { background: "#dcfce7", color: "#166534" };
                  } else if (constType === "non_compoundable") {
                    constBadgeStyle = { background: "#fee2e2", color: "#991b1b" };
                  } else if (constType === "partly_compoundable") {
                    constBadgeStyle = { background: "#ffedd5", color: "#9a3412" };
                  }

                  return (
                    <tr
                      key={c.case_id}
                      style={{ borderBottom: "1px solid var(--border)", cursor: "pointer", transition: "background 0.15s" }}
                      onClick={() => navigate?.(`/cases/${encodeURIComponent(c.case_id)}`)}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-subtle, #f8fafc)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ padding: "14px 16px" }}>
                        <strong style={{ color: "var(--accent)" }}>{c.case_id}</strong>
                        <small style={{ display: "block", color: "var(--muted)", fontSize: "11px" }}>
                          {formatDate(c.created_at)}
                        </small>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <div>{c.location || "Ludhiana Area"}</div>
                        <small style={{ color: "var(--muted)" }}>{c.zone || "Zone A"} • Block {c.block || "12"}</small>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        {c.building_identity || "Residential"}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <div>{c.assigned_bi_name || "Sonia Mehta"}</div>
                        <small style={{ color: "var(--muted)" }}>{c.assigned_bi_id || "BI-001"}</small>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ display: "inline-block", padding: "3px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: 600, textTransform: "capitalize", ...constBadgeStyle }}>
                          {constType ? constType.replace("_", " ") : "Not Assessed"}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ display: "inline-block", padding: "3px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: 600, background: "var(--accent-light, #e0f2fe)", color: "var(--accent, #0284c7)" }}>
                          {c.current_status}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => navigate?.(`/cases/${encodeURIComponent(c.case_id)}`)}
                            style={{ padding: "4px 8px", fontSize: "12px" }}
                            title="View Case"
                          >
                            <Icon name="eye" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
