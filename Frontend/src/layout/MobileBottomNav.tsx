import Icon from "../shared/components/Icon";

type MobileBottomNavProps = {
  currentRoute: string;
  navigate: (route: string) => void;
  onOpenDrawer: () => void;
};

export default function MobileBottomNav({
  currentRoute,
  navigate,
  onOpenDrawer,
}: MobileBottomNavProps) {
  const isHome = currentRoute === "/" || currentRoute === "/dashboard";
  const isCases = currentRoute === "/cases" || currentRoute.startsWith("/cases/");
  const isAlerts = currentRoute === "/notices";

  return (
    <nav className="mobile-bottom-nav">
      <button
        type="button"
        className={`mobile-bottom-nav__item ${isHome ? "mobile-bottom-nav__item--active" : ""}`}
        onClick={() => navigate("/dashboard")}
        aria-label="Home Dashboard"
      >
        <span className="mobile-bottom-nav__icon">
          <Icon name="dashboard" />
        </span>
        <span className="mobile-bottom-nav__label">Home</span>
      </button>

      <button
        type="button"
        className={`mobile-bottom-nav__item ${isCases ? "mobile-bottom-nav__item--active" : ""}`}
        onClick={() => navigate("/cases")}
        aria-label="Cases"
      >
        <span className="mobile-bottom-nav__icon">
          <Icon name="folder" />
        </span>
        <span className="mobile-bottom-nav__label">Cases</span>
      </button>

      {/* Elevated Action Button in Center */}
      <div className="mobile-bottom-nav__center">
        <button
          type="button"
          className="mobile-bottom-nav__fab"
          onClick={() => navigate("/complaints/new")}
          aria-label="Register Complaint"
        >
          <Icon name="plus" />
        </button>
      </div>

      <button
        type="button"
        className={`mobile-bottom-nav__item ${isAlerts ? "mobile-bottom-nav__item--active" : ""}`}
        onClick={() => navigate("/notices")}
        aria-label="Alerts & Notices"
      >
        <span className="mobile-bottom-nav__icon">
          <Icon name="bell" />
        </span>
        <span className="mobile-bottom-nav__label">Alerts</span>
      </button>

      <button
        type="button"
        className="mobile-bottom-nav__item"
        onClick={onOpenDrawer}
        aria-label="More navigation options"
      >
        <span className="mobile-bottom-nav__icon">
          <Icon name="menu" />
        </span>
        <span className="mobile-bottom-nav__label">More</span>
      </button>
    </nav>
  );
}
