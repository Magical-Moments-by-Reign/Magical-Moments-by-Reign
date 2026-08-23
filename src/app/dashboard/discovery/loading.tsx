// Route loading boundary for the Magical Discovery hub. See
// dashboard/loading.tsx's doc comment — same shared .mm-skel* treatment.
export default function DiscoveryLoading() {
  return (
    <div className="mm-loading" aria-busy="true" aria-label="Loading Magical Discovery">
      <div className="mm-skel mm-skel--eyebrow" />
      <div className="mm-skel mm-skel--title" style={{ width: "50%" }} />
      <div className="mm-skel mm-skel--text" />
      <div className="mm-skel mm-skel--card" style={{ height: "16rem", marginBottom: "1.6rem" }} />
      <div className="mm-skel-grid">
        <div className="mm-skel mm-skel--card" />
        <div className="mm-skel mm-skel--card" />
        <div className="mm-skel mm-skel--card" />
        <div className="mm-skel mm-skel--card" />
      </div>
    </div>
  );
}
