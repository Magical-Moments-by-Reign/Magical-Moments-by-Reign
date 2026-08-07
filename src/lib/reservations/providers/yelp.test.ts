import { test } from "node:test";
import assert from "node:assert/strict";
import { mapBusiness, mapDetails, mapHours, priceParam, YelpProvider } from "./yelp";
import { restaurantProvider, restaurantDiscoveryConfigured } from "./index";

const SAMPLE = {
  id: "the-grey-savannah",
  name: "The Grey",
  image_url: "https://cdn.yelp/grey.jpg",
  is_closed: false,
  url: "https://www.yelp.com/biz/the-grey-savannah",
  review_count: 1200,
  categories: [{ alias: "southern", title: "Southern" }, { alias: "newamerican", title: "American (New)" }],
  rating: 4.5,
  coordinates: { latitude: 32.08, longitude: -81.09 },
  price: "$$$",
  location: { display_address: ["109 Martin Luther King Jr Blvd", "Savannah, GA 31401"] },
  display_phone: "(912) 662-5999",
  phone: "+19126625999",
  distance: 1800.5,
};

test("mapBusiness maps only real fields from a Yelp business", () => {
  const b = mapBusiness(SAMPLE);
  assert.equal(b.id, "the-grey-savannah");
  assert.equal(b.name, "The Grey");
  assert.equal(b.priceLevel, "$$$");
  assert.equal(b.rating, 4.5);
  assert.equal(b.reviewCount, 1200);
  assert.deepEqual(b.categories, ["Southern", "American (New)"]);
  assert.equal(b.address, "109 Martin Luther King Jr Blvd, Savannah, GA 31401");
  assert.equal(b.phone, "(912) 662-5999");
  assert.equal(b.providerUrl, "https://www.yelp.com/biz/the-grey-savannah");
  assert.equal(b.distanceMeters, 1800.5);
});

test("mapBusiness never invents missing fields", () => {
  const b = mapBusiness({ id: "x", name: "Nameless Cafe" });
  assert.equal(b.priceLevel, undefined, "no price → undefined, never a made-up $");
  assert.equal(b.rating, undefined, "no rating → undefined, never fabricated");
  assert.deepEqual(b.categories, []);
  assert.equal(b.address, undefined);
});

test("mapHours converts Yelp open blocks to readable weekly hours", () => {
  const hours = mapHours({ hours: [{ open: [{ day: 0, start: "1100", end: "2200" }, { day: 4, start: "1100", end: "2300" }] }] });
  assert.deepEqual(hours, [
    { day: "Monday", start: "1100", end: "2200" },
    { day: "Friday", start: "1100", end: "2300" },
  ]);
  assert.deepEqual(mapHours({}), [], "no hours → empty, never guessed");
});

test("mapDetails carries photos + coordinates when present", () => {
  const d = mapDetails({ ...SAMPLE, photos: ["a.jpg", "b.jpg"] });
  assert.deepEqual(d.photos, ["a.jpg", "b.jpg"]);
  assert.equal(d.latitude, 32.08);
  assert.equal(d.longitude, -81.09);
});

test("priceParam formats Yelp price levels and drops out-of-range", () => {
  assert.equal(priceParam([1, 2, 3]), "1,2,3");
  assert.equal(priceParam([2, 5, 0]), "2");
  assert.equal(priceParam([]), undefined);
  assert.equal(priceParam(undefined), undefined);
});

test("provider gates on the server-side key (no key → not configured, no calls)", () => {
  const had = process.env.YELP_API_KEY;
  const had2 = process.env.YELP_FUSION_API_KEY;
  delete process.env.YELP_API_KEY;
  delete process.env.YELP_FUSION_API_KEY;
  try {
    assert.equal(YelpProvider.isConfigured(), false);
    assert.equal(restaurantProvider(), null);
    assert.equal(restaurantDiscoveryConfigured(), false);
  } finally {
    if (had !== undefined) process.env.YELP_API_KEY = had;
    if (had2 !== undefined) process.env.YELP_FUSION_API_KEY = had2;
  }
});

test("configured provider is exposed through the registry", () => {
  const had = process.env.YELP_API_KEY;
  process.env.YELP_API_KEY = "test-key-not-real";
  try {
    assert.equal(restaurantDiscoveryConfigured(), true);
    assert.equal(restaurantProvider()?.name, "Yelp");
    assert.equal(restaurantProvider()?.attribution, "Powered by Yelp");
  } finally {
    if (had === undefined) delete process.env.YELP_API_KEY; else process.env.YELP_API_KEY = had;
  }
});
