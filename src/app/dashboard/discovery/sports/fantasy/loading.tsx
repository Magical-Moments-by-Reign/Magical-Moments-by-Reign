// Route loading boundary for the Fantasy Football landing page. See
// dashboard/loading.tsx's doc comment — same shared .mm-skel* treatment.
export default function FantasyLoading() {
  return (
    <div className="mm-loading" aria-busy="true" aria-label="Loading Fantasy Football">
      <div className="mm-skel mm-skel--eyebrow" />
      <div className="mm-skel mm-skel--title" style={{ width: "40%" }} />
      <div className="mm-skel mm-skel--text" />
      <div className="mm-skel mm-skel--row" />
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <div className="mm-skel mm-skel--card" style={{ flex: "1 1 260px", height: "12rem" }} />
        <div className="mm-skel mm-skel--card" style={{ flex: "1 1 260px", height: "12rem" }} />
        <div className="mm-skel mm-skel--card" style={{ flex: "1 1 240px", height: "12rem" }} />
      </div>
    </div>
  );
}
