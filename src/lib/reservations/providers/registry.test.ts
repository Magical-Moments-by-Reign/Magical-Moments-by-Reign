import { test } from "node:test";
import assert from "node:assert/strict";
import { searchRestaurants, getProviderByName, providerForId } from "./index";
import type { RestaurantProvider, RestaurantSearchResult, RestaurantSummary } from "./types";

function biz(provider: string, id: string): RestaurantSummary {
  return { provider, id, name: `${provider}-${id}`, categories: [] };
}
function result(provider: string, n: number): RestaurantSearchResult {
  return { provider, attribution: `Powered by ${provider}`, total: n, businesses: Array.from({ length: n }, (_, i) => biz(provider, String(i))) };
}
function fake(slug: string, opts: { configured?: boolean; res: RestaurantSearchResult | null; onSearch?: () => void }): RestaurantProvider {
  return {
    slug, name: slug, attribution: `Powered by ${slug}`,
    isConfigured: () => opts.configured ?? true,
    async search() { opts.onSearch?.(); return opts.res; },
    async details() { return null; },
  };
}

test("Google results win and Yelp is never consulted", async () => {
  let yelpCalled = false;
  const google = fake("google", { res: result("google", 3) });
  const yelp = fake("yelp", { res: result("yelp", 5), onSearch: () => { yelpCalled = true; } });
  const r = await searchRestaurants({ location: "x" }, [google, yelp]);
  assert.equal(r?.provider, "google");
  assert.equal(yelpCalled, false, "no fallback when Google returns results");
});

test("Google error (null) → automatic Yelp fallback", async () => {
  const google = fake("google", { res: null }); // error / unavailable / quota
  const yelp = fake("yelp", { res: result("yelp", 2) });
  const r = await searchRestaurants({ location: "x" }, [google, yelp]);
  assert.equal(r?.provider, "yelp");
  assert.equal(r?.businesses.length, 2);
});

test("Google reachable-but-empty → Yelp fallback", async () => {
  const google = fake("google", { res: result("google", 0) });
  const yelp = fake("yelp", { res: result("yelp", 4) });
  const r = await searchRestaurants({ location: "x" }, [google, yelp]);
  assert.equal(r?.provider, "yelp");
});

test("both empty → honest empty result (not a spurious error)", async () => {
  const google = fake("google", { res: result("google", 0) });
  const yelp = fake("yelp", { res: result("yelp", 0) });
  const r = await searchRestaurants({ location: "x" }, [google, yelp]);
  assert.ok(r, "returns a result object");
  assert.equal(r?.businesses.length, 0);
});

test("both unreachable → null", async () => {
  const google = fake("google", { res: null });
  const yelp = fake("yelp", { res: null });
  const r = await searchRestaurants({ location: "x" }, [google, yelp]);
  assert.equal(r, null);
});

test("unconfigured providers are skipped in the fallback chain", async () => {
  let googleCalled = false;
  const google = fake("google", { configured: false, res: result("google", 3), onSearch: () => { googleCalled = true; } });
  const yelp = fake("yelp", { res: result("yelp", 1) });
  const r = await searchRestaurants({ location: "x" }, [google, yelp]);
  assert.equal(googleCalled, false, "unconfigured Google is never called");
  assert.equal(r?.provider, "yelp");
});

test("provider identity resolves by slug or name; routing is strict", () => {
  const g = process.env.GOOGLE_PLACES_API_KEY, y = process.env.YELP_API_KEY;
  process.env.GOOGLE_PLACES_API_KEY = "g"; process.env.YELP_API_KEY = "yk";
  try {
    assert.equal(getProviderByName("google")?.slug, "google");
    assert.equal(getProviderByName("Yelp")?.slug, "yelp");
    assert.equal(providerForId("yelp")?.slug, "yelp", "a Yelp id routes to Yelp, never Google");
    assert.equal(providerForId("google")?.slug, "google");
  } finally {
    if (g === undefined) delete process.env.GOOGLE_PLACES_API_KEY; else process.env.GOOGLE_PLACES_API_KEY = g;
    if (y === undefined) delete process.env.YELP_API_KEY; else process.env.YELP_API_KEY = y;
  }
});

test("a named-but-unconfigured provider resolves to null — never swapped for another", () => {
  const g = process.env.GOOGLE_PLACES_API_KEY, y = process.env.YELP_API_KEY;
  process.env.GOOGLE_PLACES_API_KEY = "g"; delete process.env.YELP_API_KEY;
  try {
    // Yelp not configured → a Yelp id must NOT be routed through Google.
    assert.equal(providerForId("yelp"), null);
  } finally {
    if (g === undefined) delete process.env.GOOGLE_PLACES_API_KEY; else process.env.GOOGLE_PLACES_API_KEY = g;
    if (y === undefined) delete process.env.YELP_API_KEY; else process.env.YELP_API_KEY = y;
  }
});
