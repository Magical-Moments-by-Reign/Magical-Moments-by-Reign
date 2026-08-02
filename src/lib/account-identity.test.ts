// Unit tests for the Customer Identity domain library.
// Run: npm test  (node --import tsx --test)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeEmail, canonicalEmail, normalizePhone, normalizeName, addressKey,
  maskEmail, maskPhone, missingRequiredFields, purchasingEnabled,
  matchSignals, scoreMatch, findProbableMatches, exactMatch,
  recoveryDecision, canPerform, allowedActions, isUnresolved, planMerge,
  adminDecision, ADMIN_ACTIONS, ACCOUNT_STATUSES,
  REVIEW_THRESHOLD, STRONG_THRESHOLD,
  type IdentitySnapshot, type AddressInput,
} from "./account-identity.ts";

const addr: AddressInput = { line1: "123 Main Street", line2: "Apt 4", city: "Dallas", state: "TX", postal: "75201", country: "US" };
const addrAlt: AddressInput = { line1: "123 Main St.", city: "dallas", state: "tx", postal: "75201-1234", country: "us" };

const base: IdentitySnapshot = {
  accountId: "acct_1", firstName: "Tabitha", lastName: "Turner",
  email: "tabitha@email.com", phone: "214-555-4821", address: addr, dateOfBirth: "1990-05-01",
};

// ── Normalization ──────────────────────────────────────────────
test("normalizeEmail lowercases and trims", () => {
  assert.equal(normalizeEmail("  Tabitha@Email.COM "), "tabitha@email.com");
});
test("canonicalEmail collapses gmail dots and +tags", () => {
  assert.equal(canonicalEmail("Ta.bi.tha+promo@Gmail.com"), "tabitha@gmail.com");
  assert.equal(canonicalEmail("tabitha+x@googlemail.com"), "tabitha@gmail.com");
});
test("canonicalEmail keeps non-gmail local structure but strips +tag", () => {
  assert.equal(canonicalEmail("first.last+news@work.com"), "first.last@work.com");
});
test("normalizePhone strips +1 and formatting", () => {
  assert.equal(normalizePhone("+1 (214) 555-4821"), "2145554821");
  assert.equal(normalizePhone("214.555.4821"), "2145554821");
});
test("normalizeName strips punctuation, accents, case", () => {
  assert.equal(normalizeName(" Tabítha ", "O'Turner!"), "tabitha oturner");
});
test("addressKey folds abbreviations and postal to 5", () => {
  assert.equal(addressKey(addr).split("|")[0], addressKey(addrAlt).split("|")[0]);
  assert.ok(addressKey(addrAlt).includes("75201"));
  assert.ok(!addressKey(addrAlt).includes("75201-1234"));
});

// ── Masking ────────────────────────────────────────────────────
test("maskEmail hides the local part", () => {
  const m = maskEmail("tabitha@email.com");
  assert.ok(m.startsWith("t••••@"));
  assert.ok(!m.includes("abitha"));
});
test("maskPhone reveals only the last four", () => {
  assert.equal(maskPhone("214-555-4821"), "•••-•••-4821");
  assert.equal(maskPhone("12"), "•••-•••-••••");
});

// ── Required fields & verification gates ───────────────────────
test("missingRequiredFields flags empties", () => {
  const missing = missingRequiredFields({ firstName: "T" });
  assert.ok(missing.includes("Legal last name"));
  assert.ok(missing.includes("Email address"));
  assert.ok(missing.includes("Agreement to Terms of Service & Privacy Policy"));
});
test("missingRequiredFields empty when complete", () => {
  assert.equal(missingRequiredFields({
    firstName: "T", lastName: "Turner", email: "t@e.com", phone: "2145554821", address: addr, acceptedTerms: true,
  }).length, 0);
});
test("purchasing needs both email AND phone verified", () => {
  assert.equal(purchasingEnabled({ emailVerified: true, phoneVerified: false }), false);
  assert.equal(purchasingEnabled({ emailVerified: false, phoneVerified: true }), false);
  assert.equal(purchasingEnabled({ emailVerified: true, phoneVerified: true }), true);
});

// ── Exact match ────────────────────────────────────────────────
test("exactMatch on canonical email", () => {
  assert.equal(exactMatch({ ...base, email: "TABITHA@email.com" }, base), true);
});
test("exactMatch on phone", () => {
  assert.equal(exactMatch({ ...base, email: "new@x.com", phone: "+12145554821" }, base), true);
});
test("exactMatch false for unrelated", () => {
  assert.equal(exactMatch({ ...base, accountId: "x", email: "a@a.com", phone: "999-999-9999", squareCustomerId: undefined }, { ...base, squareCustomerId: undefined }), false);
});

// ── Weighted duplicate detection ───────────────────────────────
test("alt-email + same phone scores strong", () => {
  const r = scoreMatch({ firstName: "Tabitha", lastName: "Turner", email: "tabitha.t@work.com", phone: "+1 214.555.4821", address: addrAlt }, base);
  assert.equal(r.tier, "strong");
  assert.ok(r.score >= STRONG_THRESHOLD);
});
test("shared address ALONE never matches", () => {
  const roommate: IdentitySnapshot = { firstName: "Marcus", lastName: "Lee", email: "marcus@other.com", phone: "469-555-0000", address: addr };
  const r = scoreMatch(roommate, base);
  assert.equal(r.tier, "none");
  assert.equal(r.score, 0);
});
test("name + address is a review-tier probable match, not strong", () => {
  const relative: IdentitySnapshot = { firstName: "Tabitha", lastName: "Turner", email: "different@x.com", phone: "469-555-1111", address: addr };
  const r = scoreMatch(relative, base);
  assert.equal(r.tier, "review");
  assert.ok(r.score >= REVIEW_THRESHOLD && r.score < STRONG_THRESHOLD);
});
test("previous-email overlap surfaces a balance-dodger", () => {
  const dodger: IdentitySnapshot = { firstName: "Different", lastName: "Name", email: "brandnew@x.com", phone: "999-999-9999", previousEmails: ["tabitha@email.com"] };
  assert.notEqual(scoreMatch(dodger, base).tier, "none");
});
test("matchSignals never emits a zero-weight address-only signal as a match reason", () => {
  const roommate: IdentitySnapshot = { firstName: "Marcus", lastName: "Lee", email: "m@x.com", phone: "469-555-0000", address: addr };
  assert.equal(matchSignals(roommate, base).length, 0);
});
test("findProbableMatches ranks best-first and filters none", () => {
  const roommate: IdentitySnapshot = { firstName: "Marcus", lastName: "Lee", email: "m@x.com", phone: "469-555-0000", address: addr };
  const strong: IdentitySnapshot = { ...base, accountId: "acct_1" };
  const out = findProbableMatches({ firstName: "Tabitha", lastName: "Turner", email: "tabitha.t@work.com", phone: "2145554821" }, [roommate, strong]);
  assert.equal(out.length, 1);
  assert.equal(out[0].candidate.accountId, "acct_1");
});

// ── Recovery decisions ─────────────────────────────────────────
test("recoveryDecision → recover on a match, exposing only masked contact", () => {
  const matches = findProbableMatches({ firstName: "Tabitha", lastName: "Turner", email: "tabitha.t@work.com", phone: "2145554821" }, [base]);
  const d = recoveryDecision(matches);
  assert.equal(d.action, "recover");
  assert.ok(d.match);
  assert.ok(d.match!.maskedEmail.includes("•"));
  assert.ok(d.match!.maskedPhone.endsWith("4821"));
  assert.ok(d.options.length > 0);
  // never leak the full email
  assert.ok(!JSON.stringify(d).includes("tabitha@email.com"));
});
test("recoveryDecision → create when there is no match", () => {
  const d = recoveryDecision([]);
  assert.equal(d.action, "create");
  assert.equal(d.match, null);
});

// ── Account-status permission matrix ───────────────────────────
test("ACTIVE allows financing and paid-in-full", () => {
  assert.equal(canPerform("ACTIVE", "financed_purchase"), true);
  assert.equal(canPerform("ACTIVE", "paid_in_full_purchase"), true);
});
test("PAST_DUE blocks financing but keeps memories & payment open", () => {
  assert.equal(canPerform("PAST_DUE", "financed_purchase"), false);
  assert.equal(canPerform("PAST_DUE", "login"), true);
  assert.equal(canPerform("PAST_DUE", "view_library"), true);
  assert.equal(canPerform("PAST_DUE", "view_purchases"), true);
  assert.equal(canPerform("PAST_DUE", "make_payment"), true);
  assert.equal(canPerform("PAST_DUE", "payment_portal"), true);
});
test("PAYMENT_PLAN_ACTIVE blocks opening a second plan", () => {
  assert.equal(canPerform("PAYMENT_PLAN_ACTIVE", "new_installment_plan"), false);
  assert.equal(canPerform("PAYMENT_PLAN_ACTIVE", "pay_later_application"), false);
  assert.equal(canPerform("PAYMENT_PLAN_ACTIVE", "financed_purchase"), false);
});
test("gift credits cannot bypass an unresolved balance", () => {
  assert.equal(canPerform("PURCHASE_RESTRICTED", "apply_gift_credit"), false);
  assert.equal(canPerform("PAST_DUE", "apply_gift_credit"), false);
});
test("unpaid-purchase transfer is blocked when unresolved", () => {
  assert.equal(canPerform("PAST_DUE", "transfer_unpaid_purchase"), false);
});
test("paid-in-full while past-due is an admin-configurable rule", () => {
  assert.equal(canPerform("PAST_DUE", "paid_in_full_purchase"), false);
  assert.equal(canPerform("PAST_DUE", "paid_in_full_purchase", { allowPaidInFullWhilePastDue: true }), true);
});
test("chargeback/restricted states block all new purchases regardless of admin rule", () => {
  assert.equal(canPerform("CHARGEBACK_REVIEW", "paid_in_full_purchase", { allowPaidInFullWhilePastDue: true }), false);
  assert.equal(canPerform("PURCHASE_RESTRICTED", "paid_in_full_purchase", { allowPaidInFullWhilePastDue: true }), false);
});
test("CLOSED blocks purchasing but preserves access to memories", () => {
  assert.equal(canPerform("CLOSED", "paid_in_full_purchase"), false);
  assert.equal(canPerform("CLOSED", "view_library"), true);
  assert.equal(canPerform("CLOSED", "view_purchases"), true);
});
test("isUnresolved classifies balance states", () => {
  assert.equal(isUnresolved("PAST_DUE"), true);
  assert.equal(isUnresolved("PURCHASE_RESTRICTED"), true);
  assert.equal(isUnresolved("ACTIVE"), false);
  assert.equal(isUnresolved("PAYMENT_PLAN_ACTIVE"), false);
});
test("allowedActions reflects the matrix", () => {
  assert.ok(allowedActions("ACTIVE").includes("financed_purchase"));
  assert.ok(!allowedActions("PAST_DUE").includes("financed_purchase"));
  assert.ok(allowedActions("PAST_DUE").includes("make_payment"));
});
test("ten canonical statuses are defined", () => {
  assert.equal(ACCOUNT_STATUSES.length, 10);
});

// ── Merge planning ─────────────────────────────────────────────
test("planMerge preserves balances/history and prevents reuse", () => {
  const p = planMerge("acct_1", "acct_2");
  assert.equal(p.primaryId, "acct_1");
  assert.equal(p.duplicateId, "acct_2");
  assert.equal(p.reusePrevented, true);
  assert.ok(p.preserved.some((x) => x.toLowerCase().includes("balances")));
  assert.ok(p.blocked.some((x) => x.toLowerCase().includes("verification")));
  assert.ok(p.moves.some((x) => x.toLowerCase().includes("library")));
});

// ── Admin decisions ────────────────────────────────────────────
test("every admin action is authorized & audited", () => {
  for (const a of ADMIN_ACTIONS) {
    const d = adminDecision(a.id);
    assert.equal(d.requiresAuthorization, true);
    assert.equal(d.auditRequired, true);
  }
});
test("merge & confirm-same require identity verification", () => {
  assert.equal(adminDecision("merge").requiresVerification, true);
  assert.equal(adminDecision("confirm_same").requiresVerification, true);
  assert.equal(adminDecision("merge").resolvesReviewTo, "merged");
});
test("confirm-different clears the flag without verification", () => {
  assert.equal(adminDecision("confirm_different").requiresVerification, false);
  assert.equal(adminDecision("confirm_different").resolvesReviewTo, "different_people");
});
test("escalate makes no automated decision", () => {
  const d = adminDecision("escalate");
  assert.equal(d.resolvesReviewTo, null);
});
