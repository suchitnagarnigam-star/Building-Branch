import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import Icon from "../shared/components/Icon";
import { API_BASE_URL } from "../shared/utils/apiConfig";
import {
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  checkPushSubscriptionActive,
} from "../hooks/usePushNotifications";
import "./ProfilePage.css";

type ProfilePageProps = {
  navigate?: (route: string) => void;
  onLogout?: () => void;
};

export default function ProfilePage({ navigate, onLogout }: ProfilePageProps) {
  const { user, updateToken, refreshUser, logout } = useAuth();

  // Change PIN states
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showCurrentPin, setShowCurrentPin] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [isSubmittingPin, setIsSubmittingPin] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSuccess, setPinSuccess] = useState<string | null>(null);

  // Push notification states
  const [pushPermission, setPushPermission] = useState<string>("default");
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [isTogglingPush, setIsTogglingPush] = useState(false);
  const [pushActionMessage, setPushActionMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [isTestingPush, setIsTestingPush] = useState(false);
  const [pushTestResult, setPushTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Logout modal
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const refreshPushStatus = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPushPermission(Notification.permission);
      const active = await checkPushSubscriptionActive();
      setIsSubscribed(active);
    }
  };

  useEffect(() => {
    refreshPushStatus();
  }, []);

  // Form submit for Change PIN
  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    setPinSuccess(null);

    const trimmedCurrent = currentPin.trim();
    const trimmedNew = newPin.trim();
    const trimmedConfirm = confirmPin.trim();

    if (!trimmedCurrent) {
      setPinError("Please enter your current PIN.");
      return;
    }

    if (!trimmedNew) {
      setPinError("Please enter your new PIN.");
      return;
    }

    if (trimmedNew.length < 4) {
      setPinError("New PIN must be at least 4 digits.");
      return;
    }

    if (trimmedNew !== trimmedConfirm) {
      setPinError("New PIN and Confirm PIN do not match.");
      return;
    }

    setIsSubmittingPin(true);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/change-pin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPin: trimmedCurrent,
          newPin: trimmedNew,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setPinError(data.message || "Failed to update PIN. Please verify your current PIN.");
        return;
      }

      if (data.token) {
        updateToken(data.token);
      }
      await refreshUser();

      setPinSuccess("Security PIN updated successfully! Your persistent login session has been renewed.");
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
    } catch {
      setPinError("Network error while updating PIN. Please check your connection.");
    } finally {
      setIsSubmittingPin(false);
    }
  };

  // Test push notification
  const handleTestPush = async () => {
    setIsTestingPush(true);
    setPushTestResult(null);

    try {
      const res = await fetch(`${API_BASE_URL}/push/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setPushTestResult({
          success: true,
          message: "Test notification dispatched to your registered device!",
        });
      } else {
        setPushTestResult({
          success: false,
          message: data.message || "Failed to dispatch test notification.",
        });
      }
    } catch {
      setPushTestResult({
        success: false,
        message: "Network error sending test notification.",
      });
    } finally {
      setIsTestingPush(false);
    }
  };

  // Toggle push notifications ON or OFF
  const handleTogglePushNotifications = async () => {
    setIsTogglingPush(true);
    setPushActionMessage(null);

    try {
      if (isSubscribed) {
        // Turn OFF
        const success = await unsubscribeFromPushNotifications();
        if (success) {
          setIsSubscribed(false);
          setPushActionMessage({
            type: "info",
            text: "Push notifications turned OFF for this device. You will not receive background alerts.",
          });
        } else {
          setPushActionMessage({
            type: "error",
            text: "Could not turn off push notifications. Please check your network connection.",
          });
        }
      } else {
        // Turn ON
        const res = await subscribeToPushNotifications();
        setPushPermission(res.permission);

        if (res.success) {
          setIsSubscribed(true);
          setPushActionMessage({
            type: "success",
            text: "Push notifications turned ON! You will receive background alerts in your phone control centre.",
          });
        } else {
          if (res.permission === "denied") {
            setPushActionMessage({
              type: "error",
              text: "Notifications are blocked by your browser settings. To re-enable, tap the padlock / site settings icon in your browser address bar and change Notifications to 'Allow'.",
            });
          } else {
            setPushActionMessage({
              type: "error",
              text: res.error || "Permission was not granted.",
            });
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error updating notification settings.";
      setPushActionMessage({ type: "error", text: msg });
    } finally {
      await refreshPushStatus();
      setIsTogglingPush(false);
    }
  };

  const handleConfirmLogout = () => {
    setShowLogoutModal(false);
    if (onLogout) {
      onLogout();
    } else {
      logout();
    }
  };

  const initials =
    user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "OF";

  // Friendly role title
  const roleDisplayMap: Record<string, string> = {
    bi: "Building Inspector (BI)",
    atp: "Assistant Town Planner (ATP)",
    mtp: "Municipal Town Planner (MTP)",
    jc: "Joint Commissioner (JC)",
    superadmin: "Super Administrator",
    admin: "System Administrator",
    operator: "Operator / Clerk",
  };

  const roleTitle = roleDisplayMap[user?.role?.toLowerCase() || ""] || user?.role?.toUpperCase() || "Officer";

  return (
    <div className="profile-page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button
          type="button"
          className="profile-btn profile-btn--outline"
          onClick={() => navigate?.("/dashboard")}
          style={{ padding: "5px 12px", fontSize: "12px" }}
        >
          <Icon name="arrow-left" />
          <span>Back to Dashboard</span>
        </button>
        <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 500 }}>
          MCL Building Branch Portal
        </span>
      </div>

      {/* ── Officer Hero Card ── */}
      <section className="profile-hero">
        <div className="profile-hero__left">
          <div className="profile-hero__avatar">{initials}</div>
          <div className="profile-hero__details">
            <div className="profile-hero__title-row">
              <h1 className="profile-hero__name">{user?.name || "Officer Name"}</h1>
              <span className="profile-hero__role-badge">{roleTitle}</span>
            </div>
            <div className="profile-hero__designation">
              {user?.designation || "Building Branch Official"} • Municipal Corporation Ludhiana
            </div>
            <div className="profile-hero__meta-row">
              {user?.officerId && (
                <span className="profile-hero__meta-item">
                  Officer ID: <strong>{user.officerId}</strong>
                </span>
              )}
              <span className="profile-hero__meta-item">
                User ID: <strong>#{user?.userId}</strong>
              </span>
              {user?.username && (
                <span className="profile-hero__meta-item">
                  Username: <strong>{user.username}</strong>
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="profile-hero__status-badge">
          <span className="profile-hero__status-dot" />
          <span>Active Duty</span>
        </div>
      </section>

      {/* ── Details Grid ── */}
      <div className="profile-grid">
        {/* Jurisdiction & Posting Card */}
        <section className="profile-card">
          <div className="profile-card__header">
            <div className="profile-card__title-group">
              <div className="profile-card__icon profile-card__icon--blue">
                <Icon name="map" />
              </div>
              <div>
                <h2 className="profile-card__title">Jurisdiction &amp; Posting</h2>
                <p className="profile-card__subtitle">Administrative jurisdiction in Ludhiana</p>
              </div>
            </div>
          </div>

          <div className="profile-meta-list">
            <div className="profile-meta-row">
              <span className="profile-meta-label">
                <Icon name="folder" /> Assigned Zone
              </span>
              <span className="profile-meta-val">
                {user?.zone ? `Zone ${user.zone.toUpperCase().replace("ZONE ", "")}` : "All Zones / HQ"}
              </span>
            </div>

            <div className="profile-meta-row">
              <span className="profile-meta-label">
                <Icon name="pin" /> Assigned Blocks
              </span>
              <span className="profile-meta-val">
                {Array.isArray(user?.blocks) && user.blocks.length > 0 ? (
                  <div className="profile-pills-wrap">
                    {user.blocks.map((blk) => (
                      <span key={blk} className="profile-pill">
                        Block {blk}
                      </span>
                    ))}
                  </div>
                ) : user?.block ? (
                  <span className="profile-pill">Block {user.block}</span>
                ) : (
                  <span style={{ color: "#64748b", fontWeight: 400 }}>All Blocks</span>
                )}
              </span>
            </div>

            <div className="profile-meta-row">
              <span className="profile-meta-label">
                <Icon name="user" /> Designation
              </span>
              <span className="profile-meta-val">{user?.designation || roleTitle}</span>
            </div>

            <div className="profile-meta-row">
              <span className="profile-meta-label">
                <Icon name="phone" /> Official Mobile
              </span>
              <span className="profile-meta-val">
                {user?.phoneNumber ? `+91 ${user.phoneNumber}` : "Not Registered"}
              </span>
            </div>

            <div className="profile-meta-row">
              <span className="profile-meta-label">
                <Icon name="shield" /> Department
              </span>
              <span className="profile-meta-val">Building Branch (MCL)</span>
            </div>
          </div>
        </section>

        {/* Device Push Notifications Card */}
        <section className="profile-card">
          <div className="profile-card__header">
            <div className="profile-card__title-group">
              <div className="profile-card__icon profile-card__icon--amber">
                <Icon name="bell" />
              </div>
              <div>
                <h2 className="profile-card__title">Push Notifications &amp; PWA</h2>
                <p className="profile-card__subtitle">Field alerts for statutory notices &amp; cases</p>
              </div>
            </div>
            {pushPermission === "granted" ? (
              <span className="profile-badge profile-badge--success">
                <span style={{ fontSize: "9px" }}>●</span> Active
              </span>
            ) : pushPermission === "denied" ? (
              <span className="profile-badge profile-badge--danger">Blocked</span>
            ) : (
              <span className="profile-badge profile-badge--warning">Prompt Needed</span>
            )}
          </div>

          <div className="profile-meta-list">
            {/* Status & Active Switch */}
            <div className="profile-meta-row" style={{ alignItems: "center" }}>
              <div>
                <span className="profile-meta-label">Push Alerts on this Device</span>
                <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "2px" }}>
                  {isSubscribed ? "Device is actively receiving notifications" : "Device notifications are currently turned off"}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <button
                  type="button"
                  className={`profile-toggle-btn ${isSubscribed ? "profile-toggle-btn--active" : ""}`}
                  onClick={handleTogglePushNotifications}
                  disabled={isTogglingPush}
                  title={isSubscribed ? "Click to turn off notifications" : "Click to turn on notifications"}
                  aria-pressed={isSubscribed}
                >
                  <span className="profile-toggle-btn__thumb" />
                  <span className="profile-toggle-btn__label">{isSubscribed ? "ON" : "OFF"}</span>
                </button>
              </div>
            </div>

            <div className="profile-meta-row">
              <span className="profile-meta-label">Browser Permission State</span>
              <span className="profile-meta-val">
                {pushPermission === "granted" ? (
                  <span style={{ color: "#16a34a", fontWeight: 700 }}>● Allowed</span>
                ) : pushPermission === "denied" ? (
                  <span style={{ color: "#dc2626", fontWeight: 700 }}>✕ Blocked</span>
                ) : (
                  <span style={{ color: "#d97706", fontWeight: 700 }}>▲ Not Prompted</span>
                )}
              </span>
            </div>

            <div className="profile-meta-row">
              <span className="profile-meta-label">Enforcement Trigger Alerts</span>
              <span className="profile-meta-val" style={{ color: "#16a34a" }}>
                Active (Sec 269 / 270 / Assignment)
              </span>
            </div>

            <div style={{ marginTop: "6px" }}>
              <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 12px", lineHeight: 1.45 }}>
                Field inspectors receive instant vibration and sound alerts in the phone control centre upon case assignment or notice
                replies even when the browser or app is closed.
              </p>

              {pushActionMessage && (
                <div
                  className={`profile-alert ${
                    pushActionMessage.type === "success"
                      ? "profile-alert--success"
                      : pushActionMessage.type === "error"
                      ? "profile-alert--error"
                      : "profile-alert--info"
                  }`}
                  style={{ marginBottom: "12px" }}
                >
                  <Icon
                    name={
                      pushActionMessage.type === "success"
                        ? "check-circle"
                        : pushActionMessage.type === "error"
                        ? "alert"
                        : "info"
                    }
                  />
                  <span>{pushActionMessage.text}</span>
                </div>
              )}

              {pushPermission === "denied" && (
                <div
                  style={{
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: "8px",
                    padding: "12px 14px",
                    marginBottom: "14px",
                    fontSize: "12px",
                    color: "#991b1b",
                    lineHeight: 1.45,
                  }}
                >
                  <strong>How to re-allow blocked notifications:</strong>
                  <ol style={{ margin: "6px 0 0", paddingLeft: "18px" }}>
                    <li>Tap the <strong>tune / padlock icon (🔒)</strong> on the left side of the browser URL bar.</li>
                    <li>Tap <strong>Site settings</strong> or <strong>Permissions</strong>.</li>
                    <li>Change <strong>Notifications</strong> from <em>Blocked</em> to <strong>Allow</strong>.</li>
                    <li>Reload the page and tap the toggle switch above to <strong>ON</strong>.</li>
                  </ol>
                </div>
              )}

              {pushTestResult && (
                <div
                  className={`profile-alert ${
                    pushTestResult.success ? "profile-alert--success" : "profile-alert--error"
                  }`}
                  style={{ marginBottom: "12px" }}
                >
                  <Icon name={pushTestResult.success ? "check-circle" : "alert"} />
                  <span>{pushTestResult.message}</span>
                </div>
              )}

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                {!isSubscribed && (
                  <button
                    type="button"
                    className="profile-btn profile-btn--primary"
                    style={{ flex: 1, minWidth: "160px" }}
                    onClick={handleTogglePushNotifications}
                    disabled={isTogglingPush}
                  >
                    <Icon name="bell" />
                    <span>{isTogglingPush ? "Enabling..." : "Enable Push Notifications"}</span>
                  </button>
                )}

                {isSubscribed && (
                  <button
                    type="button"
                    className="profile-btn profile-btn--outline"
                    style={{ flex: 1, minWidth: "160px" }}
                    onClick={handleTestPush}
                    disabled={isTestingPush}
                  >
                    <Icon name="bell" />
                    <span>{isTestingPush ? "Dispatching Alert..." : "Send Test Phone Notification"}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Security & Change PIN Card */}
        <section className="profile-card profile-card--full">
          <div className="profile-card__header">
            <div className="profile-card__title-group">
              <div className="profile-card__icon profile-card__icon--green">
                <Icon name="key" />
              </div>
              <div>
                <h2 className="profile-card__title">Security &amp; Access PIN</h2>
                <p className="profile-card__subtitle">Manage your login credentials &amp; persistent access</p>
              </div>
            </div>
          </div>

          {/* Persistent Session Notice */}
          <div className="persistent-session-strip">
            <div className="persistent-session-strip__icon">
              <Icon name="check-circle" />
            </div>
            <p className="persistent-session-strip__text">
              <strong>Persistent Session Active (365 Days):</strong> Daily sign-in resets have been removed. This device
              maintains your authenticated officer token across browser restarts and app closures. You do not need to
              log in every day.
            </p>
          </div>

          {pinSuccess && (
            <div className="profile-alert profile-alert--success">
              <Icon name="check-circle" />
              <span>{pinSuccess}</span>
            </div>
          )}

          {pinError && (
            <div className="profile-alert profile-alert--error">
              <Icon name="alert" />
              <span>{pinError}</span>
            </div>
          )}

          <form onSubmit={handleChangePin} className="profile-form">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: "14px",
              }}
            >
              <div className="profile-form-group">
                <label className="profile-form-label">
                  <span>Current PIN / Password</span>
                </label>
                <div className="profile-input-wrap">
                  <input
                    type={showCurrentPin ? "text" : "password"}
                    className="profile-input"
                    placeholder="Enter current PIN"
                    value={currentPin}
                    onChange={(e) => setCurrentPin(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="profile-input-eye"
                    onClick={() => setShowCurrentPin(!showCurrentPin)}
                    aria-label="Toggle password visibility"
                  >
                    <Icon name={showCurrentPin ? "eye-off" : "eye"} />
                  </button>
                </div>
              </div>

              <div className="profile-form-group">
                <label className="profile-form-label">
                  <span>New PIN</span>
                </label>
                <div className="profile-input-wrap">
                  <input
                    type={showNewPin ? "text" : "password"}
                    className="profile-input"
                    placeholder="Enter new 4+ digit PIN"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    minLength={4}
                    required
                  />
                  <button
                    type="button"
                    className="profile-input-eye"
                    onClick={() => setShowNewPin(!showNewPin)}
                    aria-label="Toggle password visibility"
                  >
                    <Icon name={showNewPin ? "eye-off" : "eye"} />
                  </button>
                </div>
                <span className="profile-form-hint">Minimum 4 numeric or alphanumeric digits</span>
              </div>

              <div className="profile-form-group">
                <label className="profile-form-label">
                  <span>Confirm New PIN</span>
                </label>
                <div className="profile-input-wrap">
                  <input
                    type={showConfirmPin ? "text" : "password"}
                    className="profile-input"
                    placeholder="Re-enter new PIN"
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value)}
                    minLength={4}
                    required
                  />
                  <button
                    type="button"
                    className="profile-input-eye"
                    onClick={() => setShowConfirmPin(!showConfirmPin)}
                    aria-label="Toggle password visibility"
                  >
                    <Icon name={showConfirmPin ? "eye-off" : "eye"} />
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
              <button
                type="submit"
                className="profile-btn profile-btn--primary"
                disabled={isSubmittingPin}
              >
                <Icon name="check" />
                <span>{isSubmittingPin ? "Updating PIN..." : "Update Security PIN"}</span>
              </button>
            </div>
          </form>
        </section>

        {/* Danger Zone: Logout */}
        <section className="profile-card profile-card--full">
          <div className="profile-card__header">
            <div className="profile-card__title-group">
              <div className="profile-card__icon profile-card__icon--danger">
                <Icon name="logout" />
              </div>
              <div>
                <h2 className="profile-card__title">Account Session &amp; Sign Out</h2>
                <p className="profile-card__subtitle">Disconnect this device from MCL portal</p>
              </div>
            </div>
          </div>

          <div className="profile-logout-box">
            <div className="profile-logout-box__info">
              <span className="profile-logout-box__title">Sign out of this device</span>
              <span className="profile-logout-box__sub">
                This will terminate your persistent session and clear stored tokens on this browser.
              </span>
            </div>
            <button
              type="button"
              className="profile-btn profile-btn--danger"
              onClick={() => setShowLogoutModal(true)}
            >
              <Icon name="logout" />
              <span>Sign Out</span>
            </button>
          </div>
        </section>
      </div>

      {/* ── Logout Confirmation Modal ── */}
      {showLogoutModal && (
        <div className="profile-modal-overlay" onClick={() => setShowLogoutModal(false)}>
          <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="profile-modal__title">Sign Out of MCL Portal?</h3>
            <p className="profile-modal__text">
              Are you sure you want to sign out? Your persistent 365-day login will be cleared from this browser, and
              you will need to enter your PIN again when returning.
            </p>
            <div className="profile-modal__actions">
              <button
                type="button"
                className="profile-btn profile-btn--outline"
                onClick={() => setShowLogoutModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="profile-btn profile-btn--danger"
                onClick={handleConfirmLogout}
              >
                Confirm Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
