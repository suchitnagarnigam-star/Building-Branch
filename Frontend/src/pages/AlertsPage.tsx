import { useState, useEffect, useMemo, useCallback } from "react";
import Icon from "../shared/components/Icon";
import { API_BASE_URL } from "../shared/utils/apiConfig";
import { useAuth } from "../context/AuthContext";
import type { InAppNotification } from "../shared/types";
import {
  NOTIFICATIONS_UPDATED_EVENT,
  emitNotificationsUpdated,
  type NotificationsUpdatedDetail,
} from "../shared/utils/notificationEvents";
import "./AlertsPage.css";

interface AlertsPageProps {
  navigate: (route: string) => void;
}

/**
 * Format ISO timestamp into a human-friendly relative string
 */
function formatTimeAgo(isoString?: string): string {
  if (!isoString) return "";
  const date = new Date(isoString);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatFullDate(isoString?: string): string {
  if (!isoString) return "";
  const date = new Date(isoString);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Extract or derive complaint reference number
 */
function getComplaintReference(item: InAppNotification): string | null {
  if (item.entityId) return item.entityId;

  // Try url /complaints/:id
  if (item.url && item.url.startsWith("/complaints/")) {
    const rawId = item.url.replace("/complaints/", "").split(/[?#]/)[0];
    if (rawId) return decodeURIComponent(rawId);
  }

  // Regex match in body text (e.g. Complaint #CMP-2026-001)
  const match = item.body.match(/Complaint\s+#?([A-Za-z0-9_-]+)/i);
  if (match?.[1]) return match[1];

  return null;
}

export default function AlertsPage({ navigate }: AlertsPageProps) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<"unseen" | "all">("unseen");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const getAuthHeaders = (): Record<string, string> => {
    const token = typeof window !== "undefined" ? localStorage.getItem("mcl_token") : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchNotifications = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE_URL}/notifications`, {
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        throw new Error("Unable to load notifications.");
      }

      const data = await res.json();
      if (data.success && Array.isArray(data.notifications)) {
        setNotifications(data.notifications);
        const count = typeof data.unreadCount === "number" ? data.unreadCount : 0;
        setUnreadCount(count);
        emitNotificationsUpdated(count);
      }
    } catch (err: unknown) {
      if (!isSilent) {
        setError(err instanceof Error ? err.message : "Failed to load notifications.");
      }
    } finally {
      if (!isSilent) setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial load & 30s auto-refresh
  useEffect(() => {
    fetchNotifications();
    const interval = window.setInterval(() => {
      fetchNotifications(true);
    }, 30000);
    return () => window.clearInterval(interval);
  }, [fetchNotifications]);

  // Synchronize across other tabs / components
  useEffect(() => {
    const handleSync = (event: Event) => {
      const customEvent = event as CustomEvent<NotificationsUpdatedDetail>;
      if (typeof customEvent.detail?.unreadCount === "number") {
        setUnreadCount(customEvent.detail.unreadCount);
      }
    };
    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, handleSync);
    return () => window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, handleSync);
  }, []);

  // Mark specific notification as read and navigate to complaint
  const handleNotificationClick = async (item: InAppNotification) => {
    if (processingIds.has(item.notificationId)) return;

    setProcessingIds((prev) => new Set(prev).add(item.notificationId));

    const wasUnread = !item.isRead;

    // Optimistic local update
    if (wasUnread) {
      const newUnreadCount = Math.max(0, unreadCount - 1);
      setUnreadCount(newUnreadCount);
      setNotifications((prev) =>
        prev.map((n) =>
          n.notificationId === item.notificationId
            ? { ...n, isRead: true, readAt: new Date().toISOString() }
            : n
        )
      );
      emitNotificationsUpdated(newUnreadCount);

      // Persist in backend
      try {
        await fetch(`${API_BASE_URL}/notifications/${item.notificationId}/read`, {
          method: "PATCH",
          headers: getAuthHeaders(),
        });
      } catch (err) {
        console.error("Failed to mark notification as read in backend:", err);
      }
    }

    // Determine target route
    const complaintRef = getComplaintReference(item);
    let targetRoute = "/complaints";

    if (item.url && item.url !== "/" && item.url.startsWith("/complaints/")) {
      targetRoute = item.url;
    } else if (complaintRef) {
      targetRoute = `/complaints/${encodeURIComponent(complaintRef)}`;
    }

    navigate(targetRoute);
  };

  // Mark all unread notifications as read
  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;

    // Optimistic update
    setUnreadCount(0);
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
    );
    emitNotificationsUpdated(0);

    try {
      await fetch(`${API_BASE_URL}/notifications/read-all`, {
        method: "PATCH",
        headers: getAuthHeaders(),
      });
    } catch (err) {
      console.error("Failed to mark all as read:", err);
      fetchNotifications(true);
    }
  };

  // Filtered lists
  const unseenList = useMemo(() => {
    return notifications.filter((n) => !n.isRead);
  }, [notifications]);

  const displayedList = useMemo(() => {
    const base = activeTab === "unseen" ? unseenList : notifications;

    if (!searchQuery.trim()) return base;

    const q = searchQuery.toLowerCase().trim();
    return base.filter((n) => {
      const titleMatch = n.title?.toLowerCase().includes(q);
      const bodyMatch = n.body?.toLowerCase().includes(q);
      const ref = getComplaintReference(n);
      const refMatch = ref ? ref.toLowerCase().includes(q) : false;
      return titleMatch || bodyMatch || refMatch;
    });
  }, [activeTab, unseenList, notifications, searchQuery]);

  return (
    <div className="alerts-page">
      {/* ── HEADER ── */}
      <header className="alerts-header">
        <div className="alerts-header__info">
          <div className="alerts-header__title-row">
            <h1 className="alerts-header__title">Alerts & Notifications</h1>
            {unreadCount > 0 && (
              <span className="alerts-header__count-badge" title={`${unreadCount} unseen alerts`}>
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </div>
          <p className="alerts-header__subtitle">
            Statutory notices, newly assigned citizen complaints, and field directives for{" "}
            <strong>{user?.name || "Building Inspector"}</strong>.
          </p>
        </div>

        <div className="alerts-header__actions">
          <button
            type="button"
            className="alerts-btn"
            onClick={() => {
              setIsRefreshing(true);
              fetchNotifications();
            }}
            disabled={loading || isRefreshing}
            title="Refresh alerts"
          >
            <Icon name="refresh" size={15} />
            <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
          </button>

          {unreadCount > 0 && (
            <button
              type="button"
              className="alerts-btn alerts-btn--primary"
              onClick={handleMarkAllAsRead}
              title="Mark all notifications as read"
            >
              <Icon name="check" size={15} />
              <span>Mark all as read</span>
            </button>
          )}
        </div>
      </header>

      {/* ── CONTROL TOOLBAR (TABS + SEARCH) ── */}
      <div className="alerts-toolbar">
        <div className="alerts-tabs">
          <button
            type="button"
            className={`alerts-tab-btn ${activeTab === "unseen" ? "alerts-tab-btn--active" : ""}`}
            onClick={() => setActiveTab("unseen")}
          >
            <span>Action Required</span>
            <span
              className={`alerts-tab-pill ${
                activeTab === "unseen" && unreadCount === 0 ? "alerts-tab-pill--muted" : ""
              }`}
            >
              {unreadCount}
            </span>
          </button>

          <button
            type="button"
            className={`alerts-tab-btn ${activeTab === "all" ? "alerts-tab-btn--active" : ""}`}
            onClick={() => setActiveTab("all")}
          >
            <span>All Alerts</span>
            <span className="alerts-tab-pill alerts-tab-pill--muted">
              {notifications.length}
            </span>
          </button>
        </div>

        <div className="alerts-search-wrap">
          <span className="alerts-search-icon">
            <Icon name="search" size={14} />
          </span>
          <input
            type="text"
            className="alerts-search-input"
            placeholder="Search by ID, keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* ── CONTENT AREA ── */}
      {loading ? (
        <div className="alerts-loading">
          <div className="alerts-spinner" />
          <p style={{ color: "var(--muted)", fontSize: "14px", margin: 0 }}>
            Loading statutory alerts...
          </p>
        </div>
      ) : error ? (
        <div className="alerts-error">
          <p style={{ color: "#dc2626", fontWeight: 600, marginBottom: "8px" }}>{error}</p>
          <button
            type="button"
            className="alerts-btn"
            onClick={() => fetchNotifications()}
          >
            Retry
          </button>
        </div>
      ) : displayedList.length === 0 ? (
        /* ── EMPTY STATE ── */
        <div className="alerts-empty">
          <div className="alerts-empty__icon-wrap">
            <Icon name="check-circle" size={32} />
          </div>
          <h2 className="alerts-empty__title">
            {searchQuery
              ? "No matching notifications"
              : activeTab === "unseen"
              ? "You're all caught up — no new notifications"
              : "No notifications available"}
          </h2>
          <p className="alerts-empty__description">
            {searchQuery
              ? `No notifications found matching "${searchQuery}". Clear your search to see all alerts.`
              : activeTab === "unseen"
              ? "All assigned complaints and statutory alerts have been reviewed. When new complaints are assigned by the administration, they will appear here immediately."
              : "No notifications have been recorded for your account yet."}
          </p>
          {activeTab === "unseen" && notifications.length > 0 && !searchQuery && (
            <button
              type="button"
              className="alerts-btn"
              onClick={() => setActiveTab("all")}
            >
              View notification history ({notifications.length})
            </button>
          )}
        </div>
      ) : (
        /* ── NOTIFICATIONS FEED ── */
        <div className="alerts-list">
          {displayedList.map((item) => {
            const complaintRef = getComplaintReference(item);
            const timeAgo = formatTimeAgo(item.createdAt);
            const fullDate = formatFullDate(item.createdAt);

            return (
              <article
                key={item.notificationId}
                className={`alert-card ${
                  item.isRead ? "alert-card--read" : "alert-card--unread"
                }`}
                onClick={() => handleNotificationClick(item)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleNotificationClick(item);
                  }
                }}
              >
                {/* Card Top Row */}
                <div className="alert-card__top">
                  <div className="alert-card__type-wrap">
                    <span className="alert-card__icon-box">
                      <Icon
                        name={item.type === "complaint_assignment" ? "folder" : "bell"}
                        size={15}
                      />
                    </span>
                    <h3 className="alert-card__title">{item.title}</h3>
                  </div>

                  <div className="alert-card__meta-right">
                    {!item.isRead ? (
                      <span className="alert-card__unread-tag">
                        <span className="alert-card__unread-dot" />
                        <span>Action Required</span>
                      </span>
                    ) : (
                      <span className="alert-card__read-tag">
                        <Icon name="check" size={13} />
                        <span>Seen</span>
                      </span>
                    )}

                    <span className="alert-card__time" title={fullDate}>
                      <Icon name="clock" size={13} />
                      <span>{timeAgo}</span>
                    </span>
                  </div>
                </div>

                {/* Card Message Body */}
                <p className="alert-card__body">{item.body}</p>

                {/* Card Reference & Action Row */}
                <div className="alert-card__ref-row">
                  {complaintRef ? (
                    <div className="alert-card__ref-chip" title="Complaint Reference Number">
                      <Icon name="file-text" size={13} />
                      <span className="alert-card__ref-label">Complaint:</span>
                      <span>#{complaintRef}</span>
                    </div>
                  ) : (
                    <span />
                  )}

                  <span className="alert-card__action-hint">
                    <span>Open complaint details</span>
                    <Icon name="chevron-right" size={13} />
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
