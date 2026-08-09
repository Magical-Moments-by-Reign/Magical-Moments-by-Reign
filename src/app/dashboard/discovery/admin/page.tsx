import type { Metadata } from "next";
import { requireOwner } from "@/lib/guard";
import { discoveryProviderStatuses } from "@/lib/discovery/registry";
import { listFeatured, type FeaturedSection } from "@/lib/discovery/admin";
import { createFeaturedAction, deleteFeaturedAction } from "./actions";
import "../discovery.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Discovery Content Center", robots: { index: false } };

const SECTION_META: { id: FeaturedSection; label: string; hasChart?: boolean }[] = [
  { id: "today", label: "Featured Today" },
  { id: "watch", label: "Featured Watch Item" },
  { id: "movie", label: "Featured Movie" },
  { id: "music_chart", label: "Custom Music Chart", hasChart: true },
  { id: "near_you", label: "Featured Local Event" },
  { id: "trending", label: "Featured Trending Item" },
];

function statusTone(status: string): string {
  if (status === "connected") return "disc-badge--live";
  if (status === "error") return "disc-badge--error";
  return "disc-badge--muted";
}

export default async function DiscoveryAdminPage() {
  await requireOwner("/dashboard/discovery/admin");
  const [statuses, allFeatured] = await Promise.all([
    discoveryProviderStatuses(),
    Promise.all(SECTION_META.map((s) => listFeatured(s.id))),
  ]);

  return (
    <div className="disc">
      <div className="pg-head">
        <span className="pg-eyebrow">Owner Only</span>
        <h1 className="pg-title">Discovery Content Center</h1>
        <p className="pg-sub">API status for every Magical Discovery provider, plus manual curation. Manual content here never overwrites live provider data — the two are stored separately, and members never see this page.</p>
      </div>

      <section className="disc-section" style={{ marginTop: "1.4rem" }}>
        <div className="disc-section__head"><h2>API Status</h2></div>
        <div className="disc-admin__status">
          {statuses.map((s) => (
            <div className="disc-admin__status-row" key={s.category}>
              <h4>{s.category.replace("_", " ")} — {s.providerName}</h4>
              <span className={`disc-badge ${statusTone(s.status)}`}>{s.status.replace("_", " ").toUpperCase()}</span>
              <p>{s.detail}</p>
              <p>Last updated: {s.lastUpdatedAt ? new Date(s.lastUpdatedAt).toLocaleString() : "never"}</p>
            </div>
          ))}
        </div>
      </section>

      {SECTION_META.map((meta, i) => (
        <section className="disc-section" key={meta.id}>
          <div className="disc-section__head"><h2>{meta.label}</h2></div>

          <form className="disc-admin__form" action={createFeaturedAction}>
            <input type="hidden" name="section" value={meta.id} />
            <label className="full">Title
              <input type="text" name="title" required placeholder={meta.hasChart ? "e.g. Magical Moments R&B Chart" : "Title"} />
            </label>
            {!meta.hasChart && (
              <>
                <label>Category
                  <input type="text" name="category" placeholder="e.g. Valentine's Day" />
                </label>
                <label>Image URL
                  <input type="text" name="imageUrl" placeholder="https://…" />
                </label>
                <label>External Link
                  <input type="text" name="externalUrl" placeholder="https://…" />
                </label>
                <label className="full">Description
                  <textarea name="description" placeholder="Short description" />
                </label>
              </>
            )}
            {meta.hasChart && (
              <>
                <label>Genre (category key)
                  <input type="text" name="category" placeholder="top | rnb | hip-hop | pop | country | gospel | afrobeats" required />
                </label>
                <div className="full disc-admin__form" style={{ padding: 0, border: 0, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
                  {Array.from({ length: 10 }, (_, idx) => idx + 1).map((rank) => (
                    <label key={rank}>#{rank} Song / Artist
                      <input type="text" name={`song_${rank}`} placeholder="Song" style={{ marginBottom: ".3rem" }} />
                      <input type="text" name={`artist_${rank}`} placeholder="Artist" />
                    </label>
                  ))}
                </div>
              </>
            )}
            <label>Start Date
              <input type="date" name="startAt" />
            </label>
            <label>End Date
              <input type="date" name="endAt" />
            </label>
            <label>Sort Order
              <input type="number" name="sortOrder" defaultValue={0} />
            </label>
            <label style={{ flexDirection: "row", alignItems: "center", gap: ".5rem" }}>
              <input type="checkbox" name="featured" defaultChecked style={{ width: "auto" }} /> Featured (visible to members)
            </label>
            <div className="full">
              <button type="submit" className="btn btn--gold">Add {meta.label}</button>
            </div>
          </form>

          <div className="disc-admin__list">
            {allFeatured[i].length === 0 && <p className="disc-empty">Nothing added yet.</p>}
            {allFeatured[i].map((item) => (
              <div className="disc-admin__list-row" key={item.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {item.imageUrl && <img src={item.imageUrl} alt="" />}
                <div className="grow">
                  <b>{item.title}</b>
                  <span>{item.category ?? "—"} · {item.featured ? "Visible" : "Hidden"}{item.startAt || item.endAt ? ` · ${item.startAt ? new Date(item.startAt).toLocaleDateString() : "…"} – ${item.endAt ? new Date(item.endAt).toLocaleDateString() : "…"}` : ""}</span>
                </div>
                <form action={deleteFeaturedAction}>
                  <input type="hidden" name="id" value={item.id} />
                  <button type="submit" className="btn btn--sm btn--warn">Remove</button>
                </form>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
