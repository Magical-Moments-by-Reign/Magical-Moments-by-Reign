import { test } from "node:test";
import assert from "node:assert/strict";
import { isUrlWithinDomains } from "./trusted-sources";

test("isUrlWithinDomains: exact domain matches", () => {
  assert.equal(isUrlWithinDomains("https://nba.com/team/x/roster", ["nba.com"]), true);
});

test("isUrlWithinDomains: subdomain matches", () => {
  assert.equal(isUrlWithinDomains("https://www.nba.com/team/x/roster", ["nba.com"]), true);
});

test("isUrlWithinDomains: a different domain that merely contains the string does not match", () => {
  assert.equal(isUrlWithinDomains("https://notnba.com/team/x/roster", ["nba.com"]), false);
  assert.equal(isUrlWithinDomains("https://nba.com.evil.example/roster", ["nba.com"]), false);
});

test("isUrlWithinDomains: an unrelated domain never matches", () => {
  assert.equal(isUrlWithinDomains("https://reddit.com/r/nba", ["nba.com"]), false);
});

test("isUrlWithinDomains: a malformed URL never throws, just returns false", () => {
  assert.equal(isUrlWithinDomains("not-a-url", ["nba.com"]), false);
});
