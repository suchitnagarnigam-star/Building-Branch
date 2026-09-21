import { useState, useEffect } from "react";

function SettingsPage() {
  const [fontScale, setFontScale] = useState<number>(() => {
    const saved = localStorage.getItem("mcl-font-scale");
    return saved ? Number(saved) : 100;
  });

  useEffect(() => {
    document.documentElement.style.fontSize = `${(fontScale / 100) * 16}px`;
    localStorage.setItem("mcl-font-scale", String(fontScale));
  }, [fontScale]);

  return (
    <div className="settings-page">
      <div className="panel settings-card" style={{ marginBottom: "20px" }}>
        <h2>Display &amp; Accessibility</h2>
        <p style={{ color: "var(--muted)", fontSize: "13px", margin: "4px 0 16px" }}>
          Adjust dashboard text scaling and readability preferences.
        </p>

        <div className="settings-group">
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "14px", fontWeight: 600 }}>Text Size Scaling</span>
              <strong style={{ fontSize: "14px", color: "var(--accent, #0284c7)" }}>{fontScale}%</strong>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "12px", color: "var(--muted)" }}>A (85%)</span>
              <input
                type="range"
                min="85"
                max="115"
                step="5"
                value={fontScale}
                onChange={(e) => setFontScale(Number(e.target.value))}
                style={{ flex: 1, accentColor: "#2563eb", cursor: "pointer" }}
              />
              <span style={{ fontSize: "16px", fontWeight: 700, color: "var(--muted)" }}>A (115%)</span>
            </div>

            <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
              {[85, 95, 100, 105, 115].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className="secondary-button"
                  style={{
                    padding: "4px 10px",
                    fontSize: "12px",
                    background: fontScale === preset ? "var(--accent, #0284c7)" : undefined,
                    color: fontScale === preset ? "#fff" : undefined,
                    borderColor: fontScale === preset ? "var(--accent, #0284c7)" : undefined,
                  }}
                  onClick={() => setFontScale(preset)}
                >
                  {preset === 100 ? "Default (100%)" : `${preset}%`}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="panel settings-card">
        <h2>System settings</h2>
        <div className="settings-group">
          <label className="field">
            <span>Municipal office</span>
            <input defaultValue="Ludhiana Municipal Corporation" />
          </label>
          <label className="field">
            <span>Default complaint workflow</span>
            <input defaultValue="Assigned → In progress → Resolution submitted" />
          </label>
          <label className="field">
            <span>Approval threshold</span>
            <input defaultValue="2-step ATP / MTP sign-off" />
          </label>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
