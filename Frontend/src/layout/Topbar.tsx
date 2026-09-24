import { useEffect, useRef, useState } from "react";

type TopbarProps = {
  userName?: string;
  userRole?: string;
  onLogout?: () => void;
};

function Topbar({
  userName = "Yuvraj Singh",
  userRole = "Building Branch (Staff)",
}: TopbarProps) {
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [fontScale, setFontScale] = useState<number>(() => {
    const saved = localStorage.getItem("mcl-font-scale");
    return saved ? Number(saved) : 100;
  });
  const [showFontPopover, setShowFontPopover] = useState(false);
  const fontPopoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    document.documentElement.style.fontSize = `${(fontScale / 100) * 16}px`;
    localStorage.setItem("mcl-font-scale", String(fontScale));
  }, [fontScale]);

  useEffect(() => {
    if (!showFontPopover) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (fontPopoverRef.current && !fontPopoverRef.current.contains(event.target as Node)) {
        setShowFontPopover(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showFontPopover]);

  const formattedDate = new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(currentTime);

  const formattedTime = new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(currentTime);

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="topbar">
      {/* Row 1: Government utility bar */}
      <div className="topbar__gov-bar">
        <div className="topbar__gov-left">
          <span className="topbar__gov-punjabi">ਪੰਜਾਬ ਸਰਕਾਰ</span>
          <span className="topbar__gov-separator">|</span>
          <span className="topbar__gov-eng">GOVERNMENT OF PUNJAB</span>
          <span className="topbar__gov-separator">|</span>
          <span className="topbar__gov-punjabi">ਨਗਰ ਨਿਗਮ ਲੁਧਿਆਣਾ</span>
          <span className="topbar__gov-separator">|</span>
          <span className="topbar__gov-eng">Municipal Corporation Ludhiana</span>
        </div>
      </div>

      {/* Row 2: Main header with logo and user profile controls */}
      <div className="topbar__main-header">
        <div className="topbar__brand-group">
          <div className="topbar__logo-wrap">
            <img src="/mcl-logo.png" alt="MCL Logo" className="topbar__logo" />
          </div>
          <div className="topbar__brand-text">
            <div className="topbar__brand-eng">MUNICIPAL CORPORATION LUDHIANA</div>
            <div className="topbar__brand-punjabi">ਨਗਰ ਨਿਗਮ ਲੁਧਿਆਣਾ</div>
            <div className="topbar__brand-title">Building Branch</div>
            <div className="topbar__brand-subtitle">Building Permission &amp; Enforcement Operations</div>
          </div>
        </div>

        <div className="topbar__header-controls">
          <div className="topbar__datetime-badge">
            <span className="topbar__gov-icon">📅</span>
            <time dateTime={currentTime.toISOString()}>
              {formattedDate} &nbsp; {formattedTime}
            </time>
          </div>

          {/* Text Scaling Slider Popover */}
          <div style={{ position: "relative" }} ref={fontPopoverRef}>
            <button
              type="button"
              className={`topbar__text-size-btn ${showFontPopover ? "topbar__text-size-btn--active" : ""}`}
              onClick={() => setShowFontPopover((prev) => !prev)}
              title="Display text scaling"
              aria-label="Text size"
            >
              <span style={{ fontWeight: 700, fontSize: "13px", letterSpacing: "-0.5px" }}>Aa</span>
              <span style={{ fontSize: "11px", color: "var(--muted)", marginLeft: "2px" }}>{fontScale}%</span>
            </button>

            {showFontPopover && (
              <div className="topbar__font-popover">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "#334155" }}>Text Size</span>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#2563eb", background: "#eff6ff", padding: "2px 6px", borderRadius: "4px" }}>
                    {fontScale}%
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                  <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 500 }}>A</span>
                  <input
                    type="range"
                    min="85"
                    max="115"
                    step="5"
                    value={fontScale}
                    onChange={(e) => setFontScale(Number(e.target.value))}
                    style={{ flex: 1, accentColor: "#2563eb", cursor: "pointer" }}
                  />
                  <span style={{ fontSize: "15px", color: "#64748b", fontWeight: 700 }}>A</span>
                </div>

                <div style={{ display: "flex", gap: "6px", justifyContent: "space-between" }}>
                  {[85, 100, 115].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      className={`topbar__font-preset-btn ${fontScale === preset ? "topbar__font-preset-btn--active" : ""}`}
                      onClick={() => setFontScale(preset)}
                    >
                      {preset === 100 ? "Default" : `${preset}%`}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="topbar__profile-card">
            <div className="topbar__avatar-wrap">
              <div className="topbar__avatar">{initials}</div>
              <span className="topbar__status-dot" title="Active Online"></span>
            </div>
            <div className="topbar__profile-meta">
              <div className="topbar__user-name">{userName}</div>
              <div className="topbar__user-role">{userRole}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Dark Blue Sub-header strip */}
      <div className="topbar__sub-strip">
        <span className="topbar__sub-strip-left">
          <span className="status-dot-green">●</span> MCL BUILDING BRANCH
        </span>
        <span className="topbar__sub-strip-right">Official Portal for Internal Administration &nbsp; v2.1</span>
      </div>
    </header>
  );
}

export default Topbar;
