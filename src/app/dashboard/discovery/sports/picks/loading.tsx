// Route loading boundary for Magical Picks. See dashboard/loading.tsx's
// doc comment — same shared .mm-skel* treatment.
export default function PicksLoading() {
  return (
    <div className="mm-loading" aria-busy="true" aria-label="Loading Magical Picks">
      <div className="mm-skel mm-skel--eyebrow" />
      <div className="mm-skel mm-skel--title" style={{ width: "40%" }} />
      <div className="mm-skel mm-skel--text" />
      <div className="mm-skel mm-skel--row" style={{ height: "2.4rem", width: "60%" }} />
      <div className="mm-skel mm-skel--row" />
      <div className="mm-skel mm-skel--row" />
      <div className="mm-skel mm-skel--row" />
      <div className="mm-skel mm-skel--row" />
    </div>
  );
}
