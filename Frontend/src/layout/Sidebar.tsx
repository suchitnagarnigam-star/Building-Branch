import Icon from "../shared/components/Icon";
import { NAV_ITEMS } from "../shared/constants/navigation";
import type { Role } from "../shared/types";

type SidebarProps = {
  route: string;
  userRole: Role;
  userName: string;
  navigate: (route: string) => void;
  onLogout?: () => void;
};

function Sidebar({ route, userRole, navigate, onLogout }: SidebarProps) {
  const visibleNavItems = NAV_ITEMS.filter((item) => item.roles.includes(userRole));

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
        <button
          className="nav-item"
          type="button"
          onClick={() => navigate("/settings")}
        >
          <span className="nav-item__icon"><Icon name="settings" /></span>
          <span>Settings</span>
        </button>
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
