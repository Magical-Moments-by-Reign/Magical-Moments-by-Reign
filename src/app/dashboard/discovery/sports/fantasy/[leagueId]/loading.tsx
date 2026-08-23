// Route loading boundary for a Fantasy league detail page (draft/roster/
// waivers/trades/standings — whichever section that league's real
// draftStatus renders). See dashboard/loading.tsx's doc comment — same
// shared .mm-skel* treatment.
export default function FantasyLeagueLoading() {
  return (
    <div className="mm-loading" aria-busy="true" aria-label="Loading your league">
      <div className="mm-skel mm-skel--eyebrow" />
      <div className="mm-skel mm-skel--title" style={{ width: "45%" }} />
      <div className="mm-skel mm-skel--text" />
      <div className="mm-skel mm-skel--row" style={{ height: "2.2rem", width: "70%" }} />
      <div className="mm-skel mm-skel--row" />
      <div className="mm-skel mm-skel--row" />
      <div className="mm-skel mm-skel--row" />
    </div>
  );
}
