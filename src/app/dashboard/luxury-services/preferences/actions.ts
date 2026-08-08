"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAccount } from "@/lib/guard";
import { savePreferences } from "@/lib/luxury/preferences";

const S = (fd: FormData, k: string) => String(fd.get(k) || "").trim();

export async function savePreferencesAction(formData: FormData): Promise<void> {
  const account = await requireAccount("/dashboard/luxury-services/preferences");
  await savePreferences(account.id, {
    hotel: { minStar: S(formData, "h_minStar"), brands: S(formData, "h_brands"), room: S(formData, "h_room"), budget: S(formData, "h_budget"), smoking: S(formData, "h_smoking"), bed: S(formData, "h_bed"), accessibility: S(formData, "h_accessibility") },
    flight: { airlines: S(formData, "f_airlines"), seat: S(formData, "f_seat"), cabin: S(formData, "f_cabin"), airports: S(formData, "f_airports"), tsa: S(formData, "f_tsa"), meal: S(formData, "f_meal") },
    restaurant: { minRating: S(formData, "r_minRating"), cuisines: S(formData, "r_cuisines"), dietary: S(formData, "r_dietary"), radius: S(formData, "r_radius") },
    rentalCar: { vehicleType: S(formData, "c_vehicleType"), companies: S(formData, "c_companies") },
    vacationHome: { property: S(formData, "v_property") },
    payment: { methods: S(formData, "p_methods") },
  });
  revalidatePath("/dashboard/luxury-services/preferences");
  redirect("/dashboard/luxury-services/preferences?saved=1");
}
