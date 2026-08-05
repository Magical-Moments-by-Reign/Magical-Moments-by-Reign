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

  const [unread, row, ownerVoice] = await Promise.all([
    unreadCount(account.id).catch(() => 0),
    prisma.account.findUnique({ where: { id: account.id }, select: { staffRoles: true, tourCompletedAt: true, voicePrefs: true } }),
    readOwnerVoiceConfig().catch(() => null),
  ]);
  let isOwner = false;
  try { isOwner = (JSON.parse(row?.staffRoles || "[]") as unknown[]).includes("owner"); } catch { isOwner = false; }

  const initial = (account.firstName?.[0] ?? "M").toUpperCase();
  const autoOffer = !row?.tourCompletedAt;

  return (
    <>
      <VoiceBootstrap
        memberPrefs={row?.voicePrefs || "{}"}
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
