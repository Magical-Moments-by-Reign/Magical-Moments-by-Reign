import { requireAccount } from "@/lib/guard";
import { prisma } from "@/lib/db";
import { unreadCount } from "@/lib/notify";
import { readOwnerVoiceConfig } from "@/lib/voice/owner-config";
import DashboardChrome from "@/components/dashboard/DashboardChrome";
import ConciergeChat from "@/components/concierge/ConciergeChat";
import MagicalAssistant from "@/components/assistant/MagicalAssistant";
import GuidedTour from "@/components/assistant/GuidedTour";
import VoiceBootstrap from "@/components/assistant/VoiceBootstrap";

export const dynamic = "force-dynamic";

// Server-side enforcement for the whole dashboard, plus the shared chrome
// (sidebar/topbar/mobile drawer), the member's named Magical Assistant, the
// Concierge (launched from the sidebar/handoff — no separate FAB), and the
// first-time guided tour.
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const account = await requireAccount("/dashboard");

  // Core dashboard data uses columns that have long existed in production.
  // Each call degrades to a safe default so the dashboard always renders.
  const [unread, row, ownerVoice] = await Promise.all([
    unreadCount(account.id).catch(() => 0),
    prisma.account.findUnique({ where: { id: account.id }, select: { staffRoles: true, tourCompletedAt: true } }).catch(() => null),
    readOwnerVoiceConfig().catch(() => null),
  ]);
  let isOwner = false;
  try { isOwner = (JSON.parse(row?.staffRoles || "[]") as unknown[]).includes("owner"); } catch { isOwner = false; }

  const initial = (account.firstName?.[0] ?? "M").toUpperCase();
  const autoOffer = !row?.tourCompletedAt;

  // `voicePrefs` is a newer, additive column. If the production database hasn't
  // been migrated yet, selecting it would throw — so fetch it in isolation and
  // fall back to defaults. The dashboard (and voices, via localStorage) still work.
  let memberVoicePrefs = "{}";
  try {
    const v = await prisma.account.findUnique({ where: { id: account.id }, select: { voicePrefs: true } });
    if (v?.voicePrefs) memberVoicePrefs = v.voicePrefs;
  } catch { memberVoicePrefs = "{}"; }

  return (
    <>
      <VoiceBootstrap
        memberPrefs={memberVoicePrefs}
        ownerJourney={ownerVoice?.defaultJourney || "journey-warm"}
        ownerConcierge={ownerVoice?.defaultConcierge || "concierge-hotel"}
      />
      <DashboardChrome initial={initial} unread={unread} isOwner={isOwner}>
        {children}
      </DashboardChrome>
      <MagicalAssistant assistantName={account.assistantName} firstName={account.firstName} />
      <ConciergeChat hideLauncher />
      <GuidedTour autoOffer={autoOffer} assistantName={account.assistantName} firstName={account.firstName} />
    </>
  );
}
