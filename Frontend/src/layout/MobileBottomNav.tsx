import { useState, useEffect } from "react";
import Icon from "../shared/components/Icon";
import { API_BASE_URL } from "../shared/utils/apiConfig";
import {
  NOTIFICATIONS_UPDATED_EVENT,
  type NotificationsUpdatedDetail,
} from "../shared/utils/notificationEvents";

type MobileBottomNavProps = {
  currentRoute: string;
  navigate: (route: string) => void;
  onOpenDrawer: () => void;
};

export default function MobileBottomNav({
  currentRoute,
  navigate,
  onOpenDrawer,
}: MobileBottomNavProps) {
  const isHome = currentRoute === "/" || currentRoute === "/dashboard";
  const isCases = currentRoute === "/cases" || currentRoute.startsWith("/cases/");
  const isAlerts = currentRoute === "/notices" || currentRoute === "/alerts";

  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("mcl_token") : null;
        const res = await fetch(`${API_BASE_URL}/notifications`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          if (typeof data.unreadCount === "number") {
            setUnreadCount(data.unreadCount);
          }
        }
      } catch {
        // silent fallback
      }
    };

    fetchUnread();
    const interval = window.setInterval(fetchUnread, 30000);

    const handleSync = (event: Event) => {
      const customEvent = event as CustomEvent<NotificationsUpdatedDetail>;
      if (typeof customEvent.detail?.unreadCount === "number") {
        setUnreadCount(customEvent.detail.unreadCount);
      } else {
        fetchUnread();
      }
    };
    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, handleSync);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, handleSync);
    };
  }, []);

  return (
    <nav className="mobile-bottom-nav">
      <button
        type="button"
        className={`mobile-bottom-nav__item ${isHome ? "mobile-bottom-nav__item--active" : ""}`}
        onClick={() => navigate("/dashboard")}
        aria-label="Home Dashboard"
      >
        <span className="mobile-bottom-nav__icon">
          <Icon name="dashboard" />
        </span>
        <span className="mobile-bottom-nav__label">Home</span>
      </button>

      <button
        type="button"
        className={`mobile-bottom-nav__item ${isCases ? "mobile-bottom-nav__item--active" : ""}`}
        onClick={() => navigate("/cases")}
        aria-label="Cases"
      >
        <span className="mobile-bottom-nav__icon">
          <Icon name="folder" />
        </span>
        <span className="mobile-bottom-nav__label">Cases</span>
      </button>

      {/* Elevated Action Button in Center */}
      <div className="mobile-bottom-nav__center">
        <button
          type="button"
          className="mobile-bottom-nav__fab"
          onClick={() => navigate("/complaints/new")}
          aria-label="Register Complaint"
        >
          <Icon name="plus" />
        </button>
      </div>

      <button
        type="button"
        className={`mobile-bottom-nav__item ${isAlerts ? "mobile-bottom-nav__item--active" : ""}`}
        onClick={() => navigate("/notices")}
        aria-label="Alerts & Notices"
      >
        <span className="mobile-bottom-nav__icon" style={{ position: "relative" }}>
          <Icon name="bell" />
          {unreadCount > 0 && <span className="mobile-bottom-nav__badge-dot" />}
        </span>
        <span className="mobile-bottom-nav__label">Alerts</span>
      </button>

      <button
        type="button"
        className="mobile-bottom-nav__item"
        onClick={onOpenDrawer}
        aria-label="More navigation options"
      >
        <span className="mobile-bottom-nav__icon">
          <Icon name="menu" />
        </span>
        <span className="mobile-bottom-nav__label">More</span>
      </button>
    </nav>
  );
}
