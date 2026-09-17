import Icon from "../shared/components/Icon";
import { NAV_ITEMS } from "../shared/constants/navigation";
import type { Role } from "../shared/types";

type SidebarProps = {
  route: string;
  userRole: Role;
  userName: string;
  navigate: (route: string) => void;
};

function Sidebar({ route, userRole, userName, navigate }: SidebarProps) {
  const visibleNavItems = NAV_ITEMS.filter((item) => item.roles.includes(userRole));

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <aside className="sidebar sidebar--light">
      {/* User profile section */}
      <div className="sidebar__profile">
        <div className="sidebar__avatar-wrap">
          <div className="sidebar__avatar">{initials}</div>
          <span className="sidebar__status-dot" title="Active Online"></span>
        </div>
        <div className="sidebar__profile-text">
          <div className="sidebar__user-name">{userName}</div>
          <div className="sidebar__user-role">Building Branch (Staff)</div>
        </div>
      </div>

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
            src="/ludhiana-illustration.jpg"
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
        <button className="nav-item" type="button">
          <span className="nav-item__icon"><Icon name="logout" /></span>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
