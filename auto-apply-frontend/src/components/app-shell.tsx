import { NotificationList } from "@/components/notification-list";
import type { NotificationSummary } from "@/lib/api-types";

export function AppShell({
  title,
  notifications = [],
  children,
}: Readonly<{
  title: string;
  notifications?: NotificationSummary[];
  children: React.ReactNode;
}>) {
  return (
    <div>
      <header>
        <h1>{title}</h1>
      </header>
      <main>{children}</main>
      <aside>
        <NotificationList notifications={notifications} />
      </aside>
    </div>
  );
}
