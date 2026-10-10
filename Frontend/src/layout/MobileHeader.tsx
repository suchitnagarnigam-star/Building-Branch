import { useState, useEffect } from "react";
import Icon from "../shared/components/Icon";
import { API_BASE_URL } from "../shared/utils/apiConfig";

import {
  NOTIFICATIONS_UPDATED_EVENT,
  type NotificationsUpdatedDetail,
} from "../shared/utils/notificationEvents";

type MobileHeaderProps = {
  title?: string;
  userName?: string;
  unreadCount?: number;
  onOpenDrawer: () => void;
  onNavigate?: (route: string) => void;
};

export default function MobileHeader({
  title = "MCL Building Branch",
  userName = "Super Admin",
  unreadCount: propUnreadCount,
  onOpenDrawer,
  onNavigate,
}: MobileHeaderProps) {
  const [liveUnreadCount, setLiveUnreadCount] = useState<number>(0);
  const unreadCount = propUnreadCount !== undefined ? propUnreadCount : liveUnreadCount;

  useEffect(() => {
    if (propUnreadCount !== undefined) return;
    const fetchUnread = async () => {
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("mcl_token") : null;
        const res = await fetch(`${API_BASE_URL}/notifications`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          if (typeof data.unreadCount === "number") {
            setLiveUnreadCount(data.unreadCount);
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
        setLiveUnreadCount(customEvent.detail.unreadCount);
      } else {
        fetchUnread();
      }
    };
    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, handleSync);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, handleSync);
    };
  }, [propUnreadCount]);

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "SA";

  return (
    <header className="mobile-header">
      <div className="mobile-header__left">
        <button
          type="button"
          className="mobile-header__menu-btn"
          onClick={onOpenDrawer}
          aria-label="Open Navigation Drawer"
        >
          <Icon name="menu" />
        </button>
        <span className="mobile-header__title">{title}</span>
      </div>

      <div className="mobile-header__right">
        <button
          type="button"
          className="mobile-header__icon-btn"
          aria-label="Notifications"
          onClick={() => onNavigate?.("/notices")}
        >
          <Icon name="bell" />
          {unreadCount > 0 && <span className="mobile-header__badge">{unreadCount}</span>}
        </button>

        <button
          type="button"
          className="mobile-header__avatar"
          onClick={() => (onNavigate ? onNavigate("/profile") : onOpenDrawer())}
          aria-label="User Profile"
        >
          {initials}
        </button>
      </div>
    </header>
  );
}
