import type { ApplicationSummary } from "@/lib/api-types";

export function ApplicationStatusTimeline({
  applications = [],
}: Readonly<{
  applications?: ApplicationSummary[];
}>) {
  return (
    <section className="soft-card summary-card" aria-label="Application status timeline">
      <div className="eyebrow">
        <span className="eyebrow-dot" />
        Application timeline
      </div>
      {applications.length === 0 ? (
        <p className="muted-copy" style={{ marginTop: "0.9rem" }}>
          No applications yet.
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: "1rem 0 0", display: "grid", gap: "0.75rem" }}>
          {applications.map((application) => (
            <li
              key={application.id}
              className="mini-timeline-row"
              style={{ alignItems: "flex-start", flexDirection: "column" }}
            >
              <strong>
                {application.job_title} at {application.company}
              </strong>
              <small style={{ color: "var(--muted)" }}>{application.status}</small>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
