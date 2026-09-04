import Icon from "../shared/components/Icon";
import { NAV_ITEMS } from "../shared/constants/navigation";
import type { Role } from "../shared/types";

type SidebarProps = {
  route: string;
  userRole: Role;
  navigate: (route: string) => void;
};

function Sidebar({ route, userRole, navigate }: SidebarProps) {
  const visibleNavItems = NAV_ITEMS.filter((item) => item.roles.includes(userRole));

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <div className="brand-logo-wrap">
          <img src="/mcl-logo.png" alt="MCL logo" className="brand-logo" />
        </div>
        <div>
          <div className="brand-name">MCL-BB</div>
          <div className="brand-subtitle">Complaint Management</div>
        </div>
      </div>

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

      <div className="sidebar__footer">
        <div className="user-pill">
          <div className="user-pill__avatar">AM</div>
          <div>
            <div className="user-pill__name">Arjun Mehta</div>
            <div className="user-pill__role">{userRole}</div>
          </div>
        </div>
        <button className="logout-button" type="button">
          <span className="nav-item__icon"><Icon name="logout" /></span>
          Logout
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
