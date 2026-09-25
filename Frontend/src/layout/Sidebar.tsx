import Icon from "../shared/components/Icon";
import { NAV_ITEMS } from "../shared/constants/navigation";

type SidebarProps = {
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
      return ["/dashboard", "/complaints/new", "/complaints"].includes(itemRoute);

    case "bi":
      return [
        "/dashboard",
        "/complaints",
        "/cases",
        "/field-inspection",
      ].includes(itemRoute);

    case "atp":
    case "mtp":
      return [
        "/dashboard",
        "/complaints",
        "/cases",
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

function Sidebar({ route, userRole, navigate, onLogout }: SidebarProps) {
  const visibleNavItems = NAV_ITEMS.filter((item) =>
    isRouteAllowedForRole(item.route, userRole)
  );

  const normRole = (userRole || "").toLowerCase();
  const canSeeSettings = normRole === "superadmin" || normRole === "admin";
  const isSuperAdmin = normRole === "superadmin";

  return (
    <aside className="sidebar sidebar--light">
      {/* Main navigation */}
      <nav className="sidebar__nav">
        {visibleNavItems.map(({ label, route: itemRoute, icon }) => (
          <button
            key={itemRoute}
            className={`nav-item ${route === itemRoute ? "nav-item--active" : ""}`}
            type="button"
            onClick={() => navigate(itemRoute)}
          >
            <span className="nav-item__icon"><Icon name={icon} /></span>
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {/* Footer section */}
      <div className="sidebar__footer">
        <div className="sidebar__illustration">
          <img
            src="/ludhiana-illustration.png"
            alt="Ludhiana Heritage & Landmark"
            className="sidebar__illustration-img"
          />
        </div>
        {isSuperAdmin && (
          <button
            className={`nav-item ${route === "/users" ? "nav-item--active" : ""}`}
            type="button"
            onClick={() => navigate("/users")}
          >
            <span className="nav-item__icon"><Icon name="users" /></span>
            <span>User Management</span>
          </button>
        )}
        {canSeeSettings && (
          <button
            className={`nav-item ${route === "/settings" ? "nav-item--active" : ""}`}
            type="button"
            onClick={() => navigate("/settings")}
          >
            <span className="nav-item__icon"><Icon name="settings" /></span>
            <span>Settings</span>
          </button>
        )}
        <button
          className="nav-item"
          type="button"
          onClick={onLogout}
        >
          <span className="nav-item__icon"><Icon name="logout" /></span>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
