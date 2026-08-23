// Route loading boundary for /dashboard (overview). Shown immediately on
// navigation while the real server component resolves — see the
// .mm-skel* classes in dashboard-ui.css (already loaded via
// DashboardChrome on every dashboard route). Plain shimmer blocks sized
// to the real page's layout weight — never invented content.
export default function DashboardLoading() {
  return (
    <div className="mm-loading" aria-busy="true" aria-label="Loading your dashboard">
      <div className="mm-skel mm-skel--eyebrow" />
      <div className="mm-skel mm-skel--title" style={{ width: "55%" }} />
      <div className="mm-skel mm-skel--text" />
      <div className="mm-skel-grid" style={{ marginBottom: "1.6rem" }}>
        <div className="mm-skel mm-skel--card" style={{ height: "6rem" }} />
        <div className="mm-skel mm-skel--card" style={{ height: "6rem" }} />
        <div className="mm-skel mm-skel--card" style={{ height: "6rem" }} />
        <div className="mm-skel mm-skel--card" style={{ height: "6rem" }} />
      </div>
      <div className="mm-skel-grid">
        <div className="mm-skel mm-skel--card" />
        <div className="mm-skel mm-skel--card" />
        <div className="mm-skel mm-skel--card" />
      </div>
    </div>
  );
}
