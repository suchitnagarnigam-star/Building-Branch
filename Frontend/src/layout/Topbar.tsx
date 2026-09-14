import { useEffect, useState } from "react";

function Topbar() {
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const formattedDateTime = new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(currentTime);

  return (
    <header className="topbar">
      <div className="topbar__utility">
        <div className="topbar__government">
          <strong>Punjab Government</strong>
          <span>Government of Punjab</span>
          <strong>Municipal Corporation Ludhiana</strong>
          <span>Civic Works Division</span>
        </div>
        <time dateTime={currentTime.toISOString()}>{formattedDateTime}</time>
      </div>

      <div className="topbar__main">
        <div className="topbar__brand">
          <div className="mcl-mark">
            <img src="/mcl-logo.png" alt="MCL logo" className="mcl-mark__logo" />
          </div>
          <div>
            <div className="topbar__eyebrow">Commissioner's Control Desk</div>
            <div className="topbar__title">Building Branch Monitoring System</div>
            <div className="topbar__subtitle">B&amp;R Department · Municipal Corporation Ludhiana</div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Topbar;
