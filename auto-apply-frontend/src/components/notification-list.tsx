import type { NotificationSummary } from "@/lib/api-types";

export function NotificationList({
  notifications = [],
}: Readonly<{
  notifications?: NotificationSummary[];
}>) {
  return (
    <section aria-label="Notification list">
      {notifications.length === 0 ? (
        <p>No notifications.</p>
      ) : (
        <ul>
          {notifications.map((notification) => (
            <li key={notification.id}>
              <strong>{notification.title}</strong>
              <p>{notification.body}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
