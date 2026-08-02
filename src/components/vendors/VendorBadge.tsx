// A reusable vendor recognition badge chip (drops onto vendor cards & profiles
// once live vendors exist). Presentational; the tier is resolved server-side by
// src/lib/vendor-badges.ts (awardedBadge). The title gives a hover tooltip of
// what the badge means.
import { badgeDef, type BadgeTier } from "@/lib/vendor-badges";

export default function VendorBadge({ tier, size = "md" }: { tier: BadgeTier; size?: "sm" | "md" }) {
  const b = badgeDef(tier);
  return (
    <span className={`vm-badge vm-badge--${tier} vm-badge--${size}`} title={b.meaning} data-tier={tier}>
      <span className="vm-badge__icon" aria-hidden="true">{b.icon}</span>
      <span className="vm-badge__label">{b.label}</span>
    </span>
  );
}
