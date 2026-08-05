import type { Metadata } from "next";
import Link from "next/link";
import { requireAccount } from "@/lib/guard";
import { prisma } from "@/lib/db";
import { isPaidMember } from "@/lib/membership-access";
import { cloudConfigured } from "@/lib/voice/catalog";
import { readOwnerVoiceConfig } from "@/lib/voice/owner-config";
import VoiceStudio from "./VoiceStudio";
import OwnerVoiceDefaults from "./OwnerVoiceDefaults";
import "../settings.css";
import "./voice.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Voice Settings", robots: { index: false } };

export default async function VoicePage() {
  const account = await requireAccount("/dashboard/settings/voice");
  const detail = await prisma.account.findUnique({
    where: { id: account.id },
    select: { staffRoles: true },
  }).catch(() => null);

  let owner = false;
  try { owner = (JSON.parse(detail?.staffRoles || "[]") as unknown[]).includes("owner"); } catch { owner = false; }

  // `voicePrefs` is a newer, additive column — fetch it in isolation so an
  // un-migrated production database still renders the Voice Studio.
  let voicePrefs = "{}";
  try {
    const v = await prisma.account.findUnique({ where: { id: account.id }, select: { voicePrefs: true } });
    if (v?.voicePrefs) voicePrefs = v.voicePrefs;
  } catch { voicePrefs = "{}"; }

  const cloudReady = cloudConfigured();
  const paidMember = isPaidMember(account.membershipTier);
  const ownerConfig = owner ? await readOwnerVoiceConfig().catch(() => null) : null;

  return (
    <>
      <div className="pg-head">
        <span className="pg-eyebrow">Your assistant</span>
        <h1 className="pg-title">Voice Settings</h1>
        <p className="pg-sub">Choose how {account.assistantName} and your Concierge sound. Preview any voice before you keep it — your choice follows you across devices.</p>
        <p style={{ marginTop: ".4rem" }}><Link href="/dashboard/settings" className="btn btn--sm btn--ghost">← Back to Account &amp; Settings</Link></p>
      </div>

      <VoiceStudio
        assistantName={account.assistantName}
        firstName={account.firstName}
        profileVoicePrefs={voicePrefs}
        cloudReady={cloudReady}
        paidMember={paidMember}
      />

      {owner && ownerConfig && <OwnerVoiceDefaults config={ownerConfig} />}
    </>
  );
}
