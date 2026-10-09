import { useEffect, useRef, useState } from "react";
import { useFontScale } from "../shared/hooks/useFontScale";
import Icon from "../shared/components/Icon";
import { API_BASE_URL } from "../shared/utils/apiConfig";

type InAppNotification = {
  notificationId: string;
  recipientOfficerId: string;
  type: string;
  title: string;
  body: string;
  url: string;
  readAt: string | null;
  isRead: boolean;
  createdAt: string;
};

function formatTimeAgo(dateStr: string): string {
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return "Just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDays = Math.floor(diffHr / 24);
    return `${diffDays}d ago`;
  } catch {
    return "";
  }
}

function getNotificationStripeColor(type?: string): string {
  switch (type) {
    case "demolition":
    case "violation":
      return "red";
    case "notice":
    case "statutory_alert":
      return "amber";
    case "approval":
    case "closure":
      return "green";
    default:
      return "blue";
  }
}

type TopbarProps = {
  userName?: string;
  userRole?: string;
  onLogout?: () => void;
  navigate?: (route: string) => void;
};

function Topbar({
  userName = "Yuvraj Singh",
  userRole = "Building Branch (Staff)",
  navigate,
}: TopbarProps) {
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const { fontScale, setFontScale } = useFontScale();
  const [showFontPopover, setShowFontPopover] = useState(false);
  const fontPopoverRef = useRef<HTMLDivElement>(null);

  // In-app notifications
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const getAuthHeaders = (): Record<string, string> => {
    const token = typeof window !== "undefined" ? localStorage.getItem("mcl_token") : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/notifications`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.notifications)) {
          setNotifications(data.notifications);
          setUnreadCount(data.unreadCount ?? 0);
        }
      }
    } catch {
      // silent fallback
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = window.setInterval(fetchNotifications, 30000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isNotifOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isNotifOpen]);

  const handleMarkAllAsRead = async () => {
    try {
      await fetch(`${API_BASE_URL}/notifications/read-all`, {
        method: "PATCH",
        headers: getAuthHeaders(),
      });
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch {
      // silent
    }
  };

  const handleNotificationClick = async (item: InAppNotification) => {
    if (!item.isRead) {
      try {
        await fetch(`${API_BASE_URL}/notifications/${item.notificationId}/read`, {
          method: "PATCH",
          headers: getAuthHeaders(),
        });
        setNotifications((prev) =>
          prev.map((n) =>
            n.notificationId === item.notificationId ? { ...n, isRead: true } : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {
        // continue
      }
    }
    setIsNotifOpen(false);
    if (item.url && navigate) {
      navigate(item.url);
    }
  };

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

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

        <div className="topbar__gov-right">
          <span style={{ fontSize: "11px", color: "#cbd5e1", marginRight: "6px" }}>Text Size:</span>
          <button
            type="button"
            className={`topbar__gov-text-btn ${fontScale < 100 ? "topbar__gov-text-btn--active" : ""}`}
            title="Decrease text size"
            onClick={() => setFontScale(Math.max(85, fontScale - 5))}
          >
            A-
          </button>
          <button
            type="button"
            className={`topbar__gov-text-btn ${fontScale === 100 ? "topbar__gov-text-btn--active" : ""}`}
            title="Reset text size to default (100%)"
            onClick={() => setFontScale(100)}
          >
            A
          </button>
          <button
            type="button"
            className={`topbar__gov-text-btn ${fontScale > 100 ? "topbar__gov-text-btn--active" : ""}`}
            title="Increase text size"
            onClick={() => setFontScale(Math.min(115, fontScale + 5))}
          >
            A+
          </button>
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

                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", width: "100%", boxSizing: "border-box" }}>
                  <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 500, flexShrink: 0 }}>A</span>
                  <input
                    type="range"
                    min="85"
                    max="115"
                    step="5"
                    value={fontScale}
                    onChange={(e) => setFontScale(Number(e.target.value))}
                    style={{ flex: 1, minWidth: 0, accentColor: "#2563eb", cursor: "pointer" }}
                  />
                  <span style={{ fontSize: "15px", color: "#64748b", fontWeight: 700, flexShrink: 0 }}>A</span>
                </div>

                <div style={{ display: "flex", gap: "5px", width: "100%", boxSizing: "border-box" }}>
                  {[85, 95, 100, 105, 115].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      className={`topbar__font-preset-btn ${fontScale === preset ? "topbar__font-preset-btn--active" : ""}`}
                      onClick={() => setFontScale(preset)}
                    >
                      {preset === 100 ? "100%" : `${preset}%`}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Notification Bell Dropdown */}
          <div className="notification-wrap" ref={notifRef}>
            <button
              type="button"
              className={`icon-button ${isNotifOpen ? "topbar__text-size-btn--active" : ""}`}
              onClick={() => setIsNotifOpen((prev) => !prev)}
              aria-label="Notifications"
              title="Statutory Notifications"
            >
              <Icon name="bell" />
              {unreadCount > 0 && <span className="notification-dot" />}
            </button>

            {isNotifOpen && (
              <div className="notification-menu">
                <div
                  className="notification-menu__header"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: "1px solid var(--border)",
                    paddingBottom: "10px",
                  }}
                >
                  <strong style={{ color: "var(--ink)", fontSize: "13px" }}>
                    Notifications {unreadCount > 0 && `(${unreadCount})`}
                  </strong>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      style={{
                        background: "none",
                        border: "none",
                        color: "#2563eb",
                        fontSize: "11px",
                        fontWeight: 600,
                        cursor: "pointer",
                        padding: 0,
                      }}
                      onClick={handleMarkAllAsRead}
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div style={{ maxHeight: "320px", overflowY: "auto" }}>
                  {notifications.length === 0 ? (
                    <div
                      style={{
                        padding: "24px 14px",
                        textAlign: "center",
                        color: "var(--muted)",
                        fontSize: "12.5px",
                      }}
                    >
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map((item) => (
                      <button
                        key={item.notificationId}
                        type="button"
                        className="notification-item"
                        style={{
                          opacity: item.isRead ? 0.72 : 1,
                          width: "100%",
                          background: item.isRead ? "transparent" : "rgba(37, 99, 235, 0.03)",
                        }}
                        onClick={() => handleNotificationClick(item)}
                      >
                        <span
                          className={`notification-item__stripe notification-item__stripe--${getNotificationStripeColor(
                            item.type
                          )}`}
                        />
                        <div className="notification-item__content">
                          <strong
                            style={{
                              fontSize: "13px",
                              color: item.isRead ? "#475569" : "#0f172a",
                            }}
                          >
                            {item.title}
                          </strong>
                          <span
                            style={{
                              fontSize: "12px",
                              color: "#64748b",
                              lineHeight: 1.35,
                            }}
                          >
                            {item.body}
                          </span>
                          <small
                            style={{
                              fontSize: "11px",
                              color: "#94a3b8",
                              marginTop: "2px",
                            }}
                          >
                            {formatTimeAgo(item.createdAt)}
                          </small>
                        </div>
                        {!item.isRead && <span className="notification-item__dot" />}
                      </button>
                    ))
                  )}
                </div>

                <div
                  className="notification-menu__footer"
                  style={{ textAlign: "center", fontSize: "11.5px" }}
                  onClick={() => {
                    setIsNotifOpen(false);
                    navigate?.("/cases");
                  }}
                >
                  View All Statutory Cases
                </div>
              </div>
            )}
          </div>

          <div
            className="topbar__profile-card"
            onClick={() => navigate?.("/profile")}
            style={{ cursor: "pointer" }}
            title="View Officer Profile"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                navigate?.("/profile");
              }
            }}
          >
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
