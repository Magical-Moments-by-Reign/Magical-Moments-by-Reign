// Route loading boundary for the Sports landing page. See
// dashboard/loading.tsx's doc comment — same shared .mm-skel* treatment.
export default function SportsLoading() {
  return (
    <div className="mm-loading" aria-busy="true" aria-label="Loading Sports">
      <div className="mm-skel mm-skel--card" style={{ height: "14rem", marginBottom: "1.6rem" }} />
      <div className="mm-skel mm-skel--eyebrow" style={{ margin: "0 auto .8rem" }} />
      <div className="mm-skel-grid">
        <div className="mm-skel mm-skel--card" style={{ height: "6.5rem" }} />
        <div className="mm-skel mm-skel--card" style={{ height: "6.5rem" }} />
        <div className="mm-skel mm-skel--card" style={{ height: "6.5rem" }} />
        <div className="mm-skel mm-skel--card" style={{ height: "6.5rem" }} />
        <div className="mm-skel mm-skel--card" style={{ height: "6.5rem" }} />
        <div className="mm-skel mm-skel--card" style={{ height: "6.5rem" }} />
      </div>
    </div>
  );
}
