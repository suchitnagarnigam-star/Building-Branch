import { useEffect } from "react";
import Icon from "../shared/components/Icon";
import { NAV_ITEMS } from "../shared/constants/navigation";

type MobileNavDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  route: string;
  userRole: string;
  userName?: string;
  navigate: (route: string) => void;
  onLogout?: () => void;
};

function isRouteAllowedForRole(itemRoute: string, role: string): boolean {
  const normRole = (role || "").toLowerCase();
  switch (normRole) {
    case "operator":
      return ["/dashboard", "/complaints/new", "/complaints", "/notices", "/alerts"].includes(itemRoute);
    case "bi":
      return [
        "/dashboard",
        "/complaints",
        "/cases",
        "/notices",
        "/alerts",
        "/field-inspection",
        "/construction-status",
        "/officers",
      ].includes(itemRoute);
    case "atp":
    case "mtp":
      return [
        "/dashboard",
        "/complaints/new",
        "/complaints",
        "/cases",
        "/notices",
        "/alerts",
        "/field-inspection",
        "/officers",
      ].includes(itemRoute);
    case "jc":
      return itemRoute !== "/settings";
    case "superadmin":
    case "admin":
      return true;
    default:
      return ["/dashboard"].includes(itemRoute);
  }
}

export default function MobileNavDrawer({
  isOpen,
  onClose,
  route,
  userRole,
  userName = "Super Admin",
  navigate,
  onLogout,
}: MobileNavDrawerProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    // Lock body scroll while drawer is open
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const visibleNavItems = NAV_ITEMS.filter((item) =>
    isRouteAllowedForRole(item.route, userRole)
  );

  const normRole = (userRole || "").toLowerCase();
  const canSeeSettings = normRole === "superadmin" || normRole === "admin";
  const isSuperAdmin = normRole === "superadmin";

  const handleNav = (targetRoute: string) => {
    navigate(targetRoute);
    onClose();
  };

  return (
    <div className="mobile-drawer-overlay" onClick={onClose}>
      <aside
        className="mobile-drawer"
        onClick={(e) => e.stopPropagation()}
        aria-modal="true"
        role="dialog"
      >
        <div className="mobile-drawer__header">
          <div className="mobile-drawer__brand">
            <img src="/mcl-logo.png" alt="MCL Logo" className="mobile-drawer__logo" />
            <span className="mobile-drawer__title">MCL Building Branch</span>
          </div>
          <button
            type="button"
            className="mobile-drawer__close-btn"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <Icon name="x" />
          </button>
        </div>

        <div
          className="mobile-drawer__user"
          onClick={() => handleNav("/profile")}
          style={{ cursor: "pointer" }}
          role="button"
          tabIndex={0}
        >
          <div className="mobile-drawer__avatar">
            {userName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2) || "SA"}
          </div>
          <div className="mobile-drawer__user-meta">
            <span className="mobile-drawer__user-name">{userName}</span>
            <span className="mobile-drawer__user-role">{userRole}</span>
          </div>
        </div>

        <nav className="mobile-drawer__nav">
          {visibleNavItems.map(({ label, route: itemRoute, icon }) => {
            const isActive = route === itemRoute;
            return (
              <button
                key={itemRoute}
                type="button"
                className={`mobile-drawer__item ${isActive ? "mobile-drawer__item--active" : ""}`}
                onClick={() => handleNav(itemRoute)}
              >
                <span className="mobile-drawer__icon">
                  <Icon name={icon} />
                </span>
                <span>{label}</span>
              </button>
            );
          })}

          <button
            type="button"
            className={`mobile-drawer__item ${route === "/profile" ? "mobile-drawer__item--active" : ""}`}
            onClick={() => handleNav("/profile")}
          >
            <span className="mobile-drawer__icon">
              <Icon name="user" />
            </span>
            <span>My Profile</span>
          </button>

          <div className="mobile-drawer__divider" />

          {isSuperAdmin && (
            <button
              type="button"
              className={`mobile-drawer__item ${route === "/users" ? "mobile-drawer__item--active" : ""}`}
              onClick={() => handleNav("/users")}
            >
              <span className="mobile-drawer__icon">
                <Icon name="users" />
              </span>
              <span>User Management</span>
            </button>
          )}

          {canSeeSettings && (
            <button
              type="button"
              className={`mobile-drawer__item ${route === "/settings" ? "mobile-drawer__item--active" : ""}`}
              onClick={() => handleNav("/settings")}
            >
              <span className="mobile-drawer__icon">
                <Icon name="settings" />
              </span>
              <span>Settings</span>
            </button>
          )}

          {onLogout && (
            <button
              type="button"
              className="mobile-drawer__item mobile-drawer__item--logout"
              onClick={() => {
                onLogout();
                onClose();
              }}
            >
              <span className="mobile-drawer__icon">
                <Icon name="logout" />
              </span>
              <span>Logout</span>
            </button>
          )}
        </nav>
      </aside>
    </div>
  );
}
