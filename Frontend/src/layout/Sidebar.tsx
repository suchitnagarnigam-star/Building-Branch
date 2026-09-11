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

  return (
    <aside className="sidebar">

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
            <div className="user-pill__name">{userName}</div>
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
