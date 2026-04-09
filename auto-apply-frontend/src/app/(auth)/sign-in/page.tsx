export default function SignInPage() {
  return (
    <main className="page-shell">
      <div className="container" style={{ padding: "5rem 0" }}>
        <section className="soft-card" style={{ padding: "1.4rem" }}>
          <div className="eyebrow">
            <span className="eyebrow-dot" />
            Secure access
          </div>
          <h1 className="section-title" style={{ marginTop: "0.85rem" }}>
            Sign in to manage your autopilot.
          </h1>
          <p className="section-subtitle" style={{ marginTop: "0.85rem" }}>
            Use Supabase Auth to access your profile, ranked jobs, application history, and the
            workflow studio.
          </p>
          <div className="hero-actions">
            <a className="primary-button" href="/resume-upload">
              Continue to studio
            </a>
            <a className="secondary-button" href="/">
              Back to overview
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
