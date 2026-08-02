// ── Auth service (façade) ───────────────────────────────────────
// A thin re-export layer so callers can keep importing from "@/lib/auth-service"
// while the implementation lives in focused modules. Split for maintainability
// (each file owns one concern); behavior is unchanged.
//
//   auth-register.ts     — registration (recover-before-duplicate)
//   auth-login.ts        — credential + status check
//   auth-verification.ts — email verification tokens
//   auth-password.ts     — reset + change password
//   auth-invitations.ts  — family invitations
//   auth-guardian.ts     — parent/guardian approval
//   auth-shared.ts       — shared internals (BASE_URL, accountByEmail)
//   (session cookies live in auth-session.ts; durable throttling in rate-limit.ts)
//
// SERVER ONLY.

export { registerAccount, PUBLIC_SIGNUP_ROLES, type RegisterInput, type RegisterResult } from "@/lib/auth-register";
export { attemptLogin, type LoginAttempt } from "@/lib/auth-login";
export { issueEmailVerification, verifyEmailToken, resendVerification, type VerifyEmailResult } from "@/lib/auth-verification";
export { startPasswordReset, completePasswordReset, changePassword, type ResetResult, type ChangePasswordResult } from "@/lib/auth-password";
export {
  createInvitation, getInvitationByToken, declineInvitationByToken, acceptInvitationByToken, type AcceptInviteOutcome,
} from "@/lib/auth-invitations";
export {
  requestGuardianApproval, getGuardianApprovalByToken, decideGuardianApproval, type GuardianDecisionOutcome,
} from "@/lib/auth-guardian";
