import { test } from "node:test";
import assert from "node:assert/strict";
import { mapPlace, mapPlaceDetails, priceLevelToDollars, toCategories, photoProxyUrl, prettifyType, GooglePlacesProvider } from "./google-places";
import { restaurantProvider } from "./index";

const PLACE = {
  id: "ChIJ_the_grey",
  displayName: { text: "The Grey", languageCode: "en" },
  formattedAddress: "109 Martin Luther King Jr Blvd, Savannah, GA 31401, USA",
  rating: 4.6,
  userRatingCount: 2100,
  priceLevel: "PRICE_LEVEL_EXPENSIVE",
  types: ["fine_dining_restaurant", "restaurant", "food", "point_of_interest"],
  primaryTypeDisplayName: { text: "Southern Restaurant" },
  photos: [{ name: "places/ChIJ_the_grey/photos/AbC123" }, { name: "places/ChIJ_the_grey/photos/DeF456" }],
  location: { latitude: 32.08, longitude: -81.09 },
  businessStatus: "OPERATIONAL",
  nationalPhoneNumber: "(912) 662-5999",
  websiteUri: "https://thegreysavannah.com",
  googleMapsUri: "https://maps.google.com/?cid=123",
  regularOpeningHours: { weekdayDescriptions: ["Monday: Closed", "Tuesday: 5:00 – 10:00 PM"] },
};

test("priceLevelToDollars maps Google enums; never guesses when absent", () => {
  assert.equal(priceLevelToDollars("PRICE_LEVEL_INEXPENSIVE"), "$");
  assert.equal(priceLevelToDollars("PRICE_LEVEL_VERY_EXPENSIVE"), "$$$$");
  assert.equal(priceLevelToDollars("PRICE_LEVEL_UNSPECIFIED"), undefined);
  assert.equal(priceLevelToDollars(undefined), undefined);
});

test("toCategories prefers the primary display name, else prettifies types", () => {
  assert.deepEqual(toCategories(PLACE), ["Southern Restaurant"]);
  const noPrimary = { types: ["italian_restaurant", "restaurant", "food"] };
  assert.deepEqual(toCategories(noPrimary), ["Italian"]);
  assert.equal(prettifyType("mexican_restaurant"), "Mexican");
});

test("photoProxyUrl points at OUR keyless proxy — never a Google URL with a key", () => {
  const u = photoProxyUrl("places/x/photos/y", 800);
  assert.ok(u.startsWith("/api/luxury/place-photo?name="));
  assert.ok(!u.includes("key="), "no API key ever appears in a client photo URL");
  assert.ok(!u.includes("googleapis"), "never a direct Google URL");
});

test("mapPlace maps only real fields and proxies the photo", () => {
  const b = mapPlace(PLACE);
  assert.equal(b.id, "ChIJ_the_grey");
  assert.equal(b.name, "The Grey");
  assert.equal(b.priceLevel, "$$$");
  assert.equal(b.rating, 4.6);
  assert.equal(b.reviewCount, 2100);
  assert.deepEqual(b.categories, ["Southern Restaurant"]);
  assert.ok(b.imageUrl?.startsWith("/api/luxury/place-photo?name="));
  assert.equal(b.isClosed, false);
  assert.equal(b.distanceMeters, undefined, "no user coords → no fabricated distance");
});

test("mapPlace never invents missing data", () => {
  const b = mapPlace({ id: "x", displayName: { text: "Plain" } });
  assert.equal(b.priceLevel, undefined);
  assert.equal(b.rating, undefined);
  assert.equal(b.imageUrl, undefined, "no photos → no image, never a placeholder passed off as real");
  assert.deepEqual(b.categories, []);
});

test("mapPlaceDetails carries proxied photos, readable hours, website, coordinates", () => {
  const d = mapPlaceDetails(PLACE);
  assert.equal(d.photos.length, 2);
  assert.ok(d.photos.every((p) => p.startsWith("/api/luxury/place-photo?name=")));
  assert.deepEqual(d.hoursText, ["Monday: Closed", "Tuesday: 5:00 – 10:00 PM"]);
  assert.equal(d.website, "https://thegreysavannah.com");
  assert.equal(d.latitude, 32.08);
});

test("Google Places is the PRIMARY provider when its key is present", () => {
  const g = process.env.GOOGLE_PLACES_API_KEY, y = process.env.YELP_API_KEY;
  process.env.GOOGLE_PLACES_API_KEY = "g-key";
  process.env.YELP_API_KEY = "y-key";
  try {
    assert.equal(GooglePlacesProvider.isConfigured(), true);
    assert.equal(restaurantProvider()?.name, "Google", "Google wins over Yelp when both are configured");
  } finally {
    if (g === undefined) delete process.env.GOOGLE_PLACES_API_KEY; else process.env.GOOGLE_PLACES_API_KEY = g;
    if (y === undefined) delete process.env.YELP_API_KEY; else process.env.YELP_API_KEY = y;
  }
});

test("Yelp remains the fallback when only Yelp is configured", () => {
  const g = process.env.GOOGLE_PLACES_API_KEY, y = process.env.YELP_API_KEY;
  delete process.env.GOOGLE_PLACES_API_KEY;
  process.env.YELP_API_KEY = "y-key";
  try {
    assert.equal(restaurantProvider()?.name, "Yelp");
  } finally {
    if (g === undefined) delete process.env.GOOGLE_PLACES_API_KEY; else process.env.GOOGLE_PLACES_API_KEY = g;
    if (y === undefined) delete process.env.YELP_API_KEY; else process.env.YELP_API_KEY = y;
  }
});
