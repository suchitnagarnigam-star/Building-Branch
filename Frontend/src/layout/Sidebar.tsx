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
          <svg viewBox="0 0 160 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="sidebar__building-svg">
            <path d="M20 90V40L40 25L60 40V90H20Z" stroke="#cbd5e1" strokeWidth="1.5" fill="none"/>
            <path d="M60 90V20L80 10L100 20V90H60Z" stroke="#cbd5e1" strokeWidth="1.5" fill="none"/>
            <path d="M100 90V45L120 30L140 45V90H100Z" stroke="#cbd5e1" strokeWidth="1.5" fill="none"/>
            <path d="M10 90H150" stroke="#cbd5e1" strokeWidth="1.5"/>
            <circle cx="80" cy="35" r="4" stroke="#cbd5e1" strokeWidth="1"/>
            <rect x="73" y="50" width="14" height="20" stroke="#cbd5e1" strokeWidth="1"/>
          </svg>
        </div>
        <div className="sidebar__tagline">
          A Cleaner<br />
          Safer<br />
          Greater Ludhiana
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
