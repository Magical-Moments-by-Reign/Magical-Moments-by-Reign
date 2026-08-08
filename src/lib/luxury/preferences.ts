// ── My Luxury Preferences (SERVER ONLY) ─────────────────────────
//
// A member's persistent travel/dining preferences, entered once and applied
// to every Luxury Services search unless they change it for that trip.
// Ownership-scoped by accountId; each category stored as a JSON TEXT column
// per the repo's serialize convention.

import { prisma } from "@/lib/db";

export interface HotelPrefs { minStar?: string; brands?: string; room?: string; budget?: string; smoking?: string; bed?: string; accessibility?: string }
export interface FlightPrefs { airlines?: string; seat?: string; cabin?: string; airports?: string; tsa?: string; meal?: string }
export interface RestaurantPrefs { minRating?: string; cuisines?: string; dietary?: string; radius?: string }
export interface RentalCarPrefs { vehicleType?: string; companies?: string }
export interface VacationHomePrefs { property?: string }
export interface PaymentPrefs { methods?: string }

export interface LuxuryPrefs {
  hotel: HotelPrefs;
  flight: FlightPrefs;
  restaurant: RestaurantPrefs;
  rentalCar: RentalCarPrefs;
  vacationHome: VacationHomePrefs;
  payment: PaymentPrefs;
  hasAny: boolean; // whether the member has saved anything at all
}

const EMPTY: Omit<LuxuryPrefs, "hasAny"> = { hotel: {}, flight: {}, restaurant: {}, rentalCar: {}, vacationHome: {}, payment: {} };

function parse<T>(raw: string | null | undefined): T {
  try { return (JSON.parse(raw || "{}") as T); } catch { return ({} as T); }
}

function anyValue(obj: Record<string, unknown>): boolean {
  return Object.values(obj).some((v) => typeof v === "string" && v.trim().length > 0);
}

/** The member's saved preferences (empty objects when none saved). */
export async function getPreferences(accountId: string): Promise<LuxuryPrefs> {
  const row = await prisma.luxuryPreferences.findUnique({ where: { accountId } });
  if (!row) return { ...EMPTY, hasAny: false };
  const prefs = {
    hotel: parse<HotelPrefs>(row.hotel),
    flight: parse<FlightPrefs>(row.flight),
    restaurant: parse<RestaurantPrefs>(row.restaurant),
    rentalCar: parse<RentalCarPrefs>(row.rentalCar),
    vacationHome: parse<VacationHomePrefs>(row.vacationHome),
    payment: parse<PaymentPrefs>(row.payment),
  };
  const hasAny = Object.values(prefs).some((c) => anyValue(c as Record<string, unknown>));
  return { ...prefs, hasAny };
}

export interface SavePrefsInput {
  hotel: HotelPrefs; flight: FlightPrefs; restaurant: RestaurantPrefs;
  rentalCar: RentalCarPrefs; vacationHome: VacationHomePrefs; payment: PaymentPrefs;
}

/** Upsert all preference categories for a member. */
export async function savePreferences(accountId: string, input: SavePrefsInput): Promise<void> {
  const data = {
    hotel: JSON.stringify(input.hotel ?? {}),
    flight: JSON.stringify(input.flight ?? {}),
    restaurant: JSON.stringify(input.restaurant ?? {}),
    rentalCar: JSON.stringify(input.rentalCar ?? {}),
    vacationHome: JSON.stringify(input.vacationHome ?? {}),
    payment: JSON.stringify(input.payment ?? {}),
  };
  await prisma.luxuryPreferences.upsert({
    where: { accountId },
    create: { accountId, ...data },
    update: data,
  });
}
