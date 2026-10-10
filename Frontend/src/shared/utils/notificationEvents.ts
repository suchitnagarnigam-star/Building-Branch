/**
 * Event system for cross-component in-app notification synchronization
 */

export const NOTIFICATIONS_UPDATED_EVENT = "mcl_notifications_updated";

export interface NotificationsUpdatedDetail {
  unreadCount?: number;
}

/**
 * Dispatches an event notifying all mounted components (Topbar, MobileHeader, MobileBottomNav, AlertsPage)
 * that notifications or the unread count have been updated.
 */
export function emitNotificationsUpdated(unreadCount?: number): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent<NotificationsUpdatedDetail>(NOTIFICATIONS_UPDATED_EVENT, {
        detail: { unreadCount },
      })
    );
  }
}
