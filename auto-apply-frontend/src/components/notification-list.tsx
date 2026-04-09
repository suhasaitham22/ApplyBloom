import type { NotificationSummary } from "@/lib/api-types";

export function NotificationList({
  notifications = [],
}: Readonly<{
  notifications?: NotificationSummary[];
}>) {
  return (
    <section aria-label="Notification list">
      {notifications.length === 0 ? (
        <p className="muted-copy" style={{ marginTop: "0.9rem" }}>
          No notifications.
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: "0.9rem 0 0", display: "grid", gap: "0.7rem" }}>
          {notifications.map((notification) => (
            <li key={notification.id} className="mini-timeline-row" style={{ flexDirection: "column", alignItems: "flex-start" }}>
              <strong>{notification.title}</strong>
              <p className="muted-copy" style={{ margin: "0.2rem 0 0" }}>
                {notification.body}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
