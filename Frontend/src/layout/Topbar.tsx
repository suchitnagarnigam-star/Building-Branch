import { useState } from "react";
import Icon from "../shared/components/Icon";
import { formatPageTitle } from "../shared/constants/navigation";
import { notifications } from "../shared/constants/mockData";

type TopbarProps = {
  route: string;
};

function Topbar({ route }: TopbarProps) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  return (
    <header className="topbar">
      <div className="topbar__left">
        <div className="mcl-mark">
          <img src="/mcl-logo.png" alt="MCL logo" className="mcl-mark__logo" />
        </div>
        <div className="topbar__page">{formatPageTitle(route)}</div>
      </div>

      <div className="topbar__right">
        <button className="icon-button" type="button" aria-label="Search complaints">
          <Icon name="search" />
        </button>

        <div className="notification-wrap">
          <button
            className="icon-button"
            type="button"
            aria-label="Notifications"
            onClick={() => setNotificationsOpen((prev) => !prev)}
          >
            <Icon name="bell" />
          </button>
          <span className="notification-dot" />

          {notificationsOpen && (
            <div className="notification-menu">
              <div className="notification-menu__header">Notifications</div>
              {notifications.map((notification) => (
                <button key={notification.title} className="notification-item" type="button">
                  <span className={`notification-item__stripe notification-item__stripe--${notification.tone}`} />
                  <span className="notification-item__content">
                    <strong>{notification.title}</strong>
                    <small>{notification.body}</small>
                    <em>{notification.time}</em>
                  </span>
                  {notification.unread && <span className="notification-item__dot" />}
                </button>
              ))}
              <div className="notification-menu__footer">Mark all as read</div>
            </div>
          )}
        </div>

        <button className="profile-button" type="button">
          <span className="profile-button__avatar">AM</span>
          <span className="profile-button__meta">
            <span className="profile-button__name">Arjun Mehta</span>
            <span className="profile-button__role">Assistant Commissioner</span>
          </span>
        </button>
      </div>
    </header>
  );
}

export default Topbar;
