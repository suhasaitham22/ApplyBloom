import type { ApplicationSummary } from "@/lib/api-types";

export function ApplicationStatusTimeline({
  applications = [],
}: Readonly<{
  applications?: ApplicationSummary[];
}>) {
  return (
    <section aria-label="Application status timeline">
      {applications.length === 0 ? (
        <p>No applications yet.</p>
      ) : (
        <ul>
          {applications.map((application) => (
            <li key={application.id}>
              {application.job_title} at {application.company}: {application.status}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
