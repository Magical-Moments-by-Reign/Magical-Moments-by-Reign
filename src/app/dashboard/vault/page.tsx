import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "@/components/site/SiteNav";
import { getFamilyBundle, expiringSoon, MEMBER_KINDS, DOC_CATEGORIES, ACCESS_LEVELS } from "@/lib/family";
import { getExperienceType } from "@/lib/experience-types";
import {
  renameFamilyAction, saveMemberAction, deleteMemberAction,
  addDocumentAction, deleteDocumentAction, addContactAction, deleteContactAction,
} from "./actions";
import "./vault.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Family Vault", robots: { index: false } };

const KIND_LABEL: Record<string, string> = Object.fromEntries(MEMBER_KINDS.map((k) => [k.id, k.label]));
const ACCESS_LABEL: Record<string, string> = Object.fromEntries(ACCESS_LEVELS.map((a) => [a.id, a.label]));
const kindEmoji: Record<string, string> = { parent: "👤", child: "🧒", grandparent: "👵", guardian: "🛡", pet: "🐾" };

function fmt(d?: Date | null) {
  return d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";
}

export default async function VaultPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const { edit } = await searchParams;
  const { family, members, documents, contacts, journeys } = await getFamilyBundle();
  const editing = edit ? members.find((m) => m.id === edit) : undefined;
  const expiring = expiringSoon(documents, new Date());
  const emergencyMembers = members.filter((m) => m.allergies || m.medications || m.conditions || m.bloodType || m.emergencyPhone);

  return (
    <div className="fv">
      <SiteNav />
      <header className="fv-header">
        <div className="container">
          <Link href="/dashboard" className="fv-back">← Back to your studio</Link>
          <span className="eyebrow" style={{ color: "var(--gold-soft)" }}>The Family Vault</span>
          <h1>{family.name}</h1>
          <p>The secure heart of your family — profiles, emergency info, documents, and the people you trust. Every journey connects here.</p>
          <form action={renameFamilyAction} className="fv-rename">
            <input name="name" defaultValue={family.name} aria-label="Family name" />
            <button type="submit" className="fv-linkbtn">Rename</button>
          </form>
        </div>
      </header>

      <main className="container fv-main">
        {/* Overview */}
        <div className="fv-stats">
          <div className="fv-stat"><b>{members.length}</b><span>Members</span></div>
          <div className="fv-stat"><b>{documents.length}</b><span>Documents</span></div>
          <div className="fv-stat"><b>{contacts.length}</b><span>Trusted contacts</span></div>
          <div className="fv-stat"><b>{journeys.length}</b><span>Journeys</span></div>
        </div>

        {expiring.length > 0 && (
          <div className="fv-banner">⏰ {expiring.length} document{expiring.length > 1 ? "s" : ""} expiring within 90 days: {expiring.map((d) => d.title).join(", ")}.</div>
        )}

        {/* Emergency Center */}
        <section className="fv-section fv-emergency">
          <h2>🚨 Emergency Center</h2>
          {emergencyMembers.length === 0 ? (
            <p className="fv-muted">Add medical or emergency details to a family member and a quick-access card appears here.</p>
          ) : (
            <div className="fv-emgrid">
              {emergencyMembers.map((m) => (
                <div className="fv-emcard" key={m.id}>
                  <div className="fv-emcard__name">{kindEmoji[m.kind]} {m.preferredName || m.name}</div>
                  {m.bloodType && <p><span>Blood type</span> {m.bloodType}</p>}
                  {m.allergies && <p><span>Allergies</span> {m.allergies}</p>}
                  {m.medications && <p><span>Medications</span> {m.medications}</p>}
                  {m.conditions && <p><span>Conditions</span> {m.conditions}</p>}
                  {(m.doctor || m.hospital) && <p><span>Care</span> {[m.doctor, m.hospital].filter(Boolean).join(" · ")}</p>}
                  {m.emergencyPhone && <p><span>Emergency</span> {m.emergencyName ? `${m.emergencyName} · ` : ""}{m.emergencyPhone}</p>}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Family profiles */}
        <section className="fv-section">
          <h2>❤️ Family Profiles</h2>
          <div className="fv-members">
            {members.map((m) => (
              <article className="fv-member" key={m.id}>
                <div className="fv-member__top">
                  <span className="fv-member__emoji" aria-hidden="true">{kindEmoji[m.kind] ?? "👤"}</span>
                  <div>
                    <div className="fv-member__name">{m.name}</div>
                    <div className="fv-member__kind">{KIND_LABEL[m.kind] ?? m.kind}{m.birthday ? ` · ${m.birthday}` : ""}</div>
                  </div>
                </div>
                {m.insuranceProvider && <p className="fv-member__row"><span>Insurance</span> {m.insuranceProvider}{m.insurancePolicy ? ` · ${m.insurancePolicy}` : ""}</p>}
                {m.notes && <p className="fv-member__notes">{m.notes}</p>}
                <div className="fv-member__actions">
                  <Link href={`/dashboard/vault?edit=${m.id}#member-form`} className="fv-linkbtn">Edit</Link>
                  <form action={deleteMemberAction}><input type="hidden" name="id" value={m.id} /><button className="fv-linkbtn fv-linkbtn--danger" type="submit">Remove</button></form>
                </div>
              </article>
            ))}
          </div>

          {/* Add / edit member */}
          <details className="fv-form" id="member-form" open={Boolean(editing)}>
            <summary>{editing ? `Edit ${editing.name}` : "＋ Add a family member"}</summary>
            <form action={saveMemberAction} className="fv-grid">
              {editing && <input type="hidden" name="id" value={editing.id} />}
              <label><span>Role</span>
                <select name="kind" defaultValue={editing?.kind ?? "parent"}>
                  {MEMBER_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
                </select>
              </label>
              <label><span>Name *</span><input name="name" defaultValue={editing?.name ?? ""} required /></label>
              <label><span>Preferred name</span><input name="preferredName" defaultValue={editing?.preferredName ?? ""} /></label>
              <label><span>Birthday</span><input name="birthday" placeholder="e.g. Mar 3, 2015" defaultValue={editing?.birthday ?? ""} /></label>
              <label><span>Blood type</span><input name="bloodType" defaultValue={editing?.bloodType ?? ""} /></label>
              <label><span>Allergies</span><input name="allergies" defaultValue={editing?.allergies ?? ""} /></label>
              <label><span>Medications</span><input name="medications" defaultValue={editing?.medications ?? ""} /></label>
              <label><span>Conditions</span><input name="conditions" defaultValue={editing?.conditions ?? ""} /></label>
              <label><span>Doctor</span><input name="doctor" defaultValue={editing?.doctor ?? ""} /></label>
              <label><span>Preferred hospital</span><input name="hospital" defaultValue={editing?.hospital ?? ""} /></label>
              <label><span>Insurance provider</span><input name="insuranceProvider" defaultValue={editing?.insuranceProvider ?? ""} /></label>
              <label><span>Policy number</span><input name="insurancePolicy" defaultValue={editing?.insurancePolicy ?? ""} /></label>
              <label><span>Emergency contact</span><input name="emergencyName" defaultValue={editing?.emergencyName ?? ""} /></label>
              <label><span>Emergency phone</span><input name="emergencyPhone" defaultValue={editing?.emergencyPhone ?? ""} /></label>
              <label className="fv-grid__full"><span>Notes</span><textarea name="notes" rows={2} defaultValue={editing?.notes ?? ""} /></label>
              <div className="fv-grid__full fv-formactions">
                <button type="submit" className="btn-gold">{editing ? "Save changes" : "Add member"}</button>
                {editing && <Link href="/dashboard/vault#member-form" className="fv-linkbtn">Cancel</Link>}
              </div>
            </form>
          </details>
        </section>

        {/* Document library */}
        <section className="fv-section">
          <h2>📄 Document Library</h2>
          {documents.length > 0 && (
            <div className="fv-docs">
              {documents.map((d) => (
                <div className="fv-doc" key={d.id}>
                  <div className="fv-doc__main">
                    <span className="fv-doc__cat">{d.category}</span>
                    <b>{d.title}</b>
                    {d.expiresAt && <span className="fv-doc__exp">Expires {fmt(d.expiresAt)}</span>}
                    {d.notes && <p className="fv-doc__notes">{d.notes}</p>}
                  </div>
                  <div className="fv-doc__actions">
                    {d.url && <a className="fv-linkbtn" href={d.url} target="_blank" rel="noreferrer">Open</a>}
                    <form action={deleteDocumentAction}><input type="hidden" name="id" value={d.id} /><button className="fv-linkbtn fv-linkbtn--danger" type="submit">Remove</button></form>
                  </div>
                </div>
              ))}
            </div>
          )}
          <details className="fv-form">
            <summary>＋ Add a document</summary>
            <form action={addDocumentAction} className="fv-grid">
              <label><span>Category</span>
                <select name="category" defaultValue="Other">{DOC_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select>
              </label>
              <label><span>Title *</span><input name="title" required placeholder="e.g. Olivia's Birth Certificate" /></label>
              <label><span>Link / file URL</span><input name="url" placeholder="https://…" /></label>
              <label><span>Expires (optional)</span><input name="expiresAt" type="date" /></label>
              <label className="fv-grid__full"><span>Notes</span><input name="notes" /></label>
              <div className="fv-grid__full"><button type="submit" className="btn-gold">Add document</button></div>
            </form>
          </details>
          <p className="fv-fine">Secure file uploads use the same protected storage as media (enable Supabase Storage). You can also store a link for now.</p>
        </section>

        {/* Trusted contacts */}
        <section className="fv-section">
          <h2>☎ Trusted Contacts</h2>
          {contacts.length > 0 && (
            <div className="fv-contacts">
              {contacts.map((c) => (
                <div className="fv-contact" key={c.id}>
                  <div>
                    <b>{c.name}</b> {c.relationship && <span className="fv-muted">· {c.relationship}</span>}
                    <div className="fv-contact__meta">{[c.phone, c.email].filter(Boolean).join(" · ")}</div>
                    <span className="fv-contact__access">{ACCESS_LABEL[c.accessLevel] ?? c.accessLevel}</span>
                  </div>
                  <form action={deleteContactAction}><input type="hidden" name="id" value={c.id} /><button className="fv-linkbtn fv-linkbtn--danger" type="submit">Remove</button></form>
                </div>
              ))}
            </div>
          )}
          <details className="fv-form">
            <summary>＋ Add a trusted contact</summary>
            <form action={addContactAction} className="fv-grid">
              <label><span>Name *</span><input name="name" required /></label>
              <label><span>Relationship</span><input name="relationship" placeholder="Grandmother, attorney…" /></label>
              <label><span>Phone</span><input name="phone" /></label>
              <label><span>Email</span><input name="email" type="email" /></label>
              <label><span>Access level</span>
                <select name="accessLevel" defaultValue="emergency">{ACCESS_LEVELS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}</select>
              </label>
              <div className="fv-grid__full"><button type="submit" className="btn-gold">Add contact</button></div>
            </form>
          </details>
        </section>

        {/* Connected journeys */}
        <section className="fv-section">
          <h2>🗂 Connected Journeys</h2>
          {journeys.length === 0 ? (
            <p className="fv-muted">New journeys you create will automatically connect to your Family Vault.</p>
          ) : (
            <div className="fv-journeys">
              {journeys.map((j) => {
                const t = getExperienceType(j.type);
                return <Link key={j.slug} href={`/${j.slug}`} className="fv-journey">{t?.emoji ?? "✦"} {j.title}</Link>;
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
