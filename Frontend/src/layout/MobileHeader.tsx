import Icon from "../shared/components/Icon";

type MobileHeaderProps = {
  title?: string;
  userName?: string;
  unreadCount?: number;
  onOpenDrawer: () => void;
  onNavigate?: (route: string) => void;
};

export default function MobileHeader({
  title = "MCL Building Branch",
  userName = "Super Admin",
  unreadCount = 2,
  onOpenDrawer,
  onNavigate,
}: MobileHeaderProps) {
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "SA";

  return (
    <header className="mobile-header">
      <div className="mobile-header__left">
        <button
          type="button"
          className="mobile-header__menu-btn"
          onClick={onOpenDrawer}
          aria-label="Open Navigation Drawer"
        >
          <Icon name="menu" />
        </button>
        <span className="mobile-header__title">{title}</span>
      </div>

      <div className="mobile-header__right">
        <button
          type="button"
          className="mobile-header__icon-btn"
          aria-label="Notifications"
          onClick={() => onNavigate?.("/notices")}
        >
          <Icon name="bell" />
          {unreadCount > 0 && <span className="mobile-header__badge">{unreadCount}</span>}
        </button>

        <button
          type="button"
          className="mobile-header__avatar"
          onClick={onOpenDrawer}
          aria-label="User Profile"
        >
          {initials}
        </button>
      </div>
    </header>
  );
}
