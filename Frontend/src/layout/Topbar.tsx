import { useEffect, useState } from "react";

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

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

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

          <div className="topbar__font-controls">
            <button type="button" className="topbar__font-btn">A-</button>
            <button type="button" className="topbar__font-btn topbar__font-btn--active">A</button>
            <button type="button" className="topbar__font-btn">A+</button>
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
