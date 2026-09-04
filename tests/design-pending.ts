/*
  The conversion worklist.

  Every entry is a file that still carries something the redesign retires. A
  task converts its files and DELETES their lines from this list; the sweeps in
  tests/design-system.test.ts then hold those files to the new rules forever.

  This exists because the alternative — asserting globally from the first task —
  leaves the suite red for ten tasks, which contradicts the "the full suite must
  stay green" constraint and makes every intermediate review unreadable. A
  shrinking allowlist keeps the suite green at every commit and still fails
  loudly the moment an already-converted file regresses.

  This file exports data only. Its assertions live in
  tests/design-system.test.ts, because vitest only collects tests/**\/*.test.ts.
*/
export const PENDING: Record<string, string[]> = {
  card: [
    "app/admin/claims/claim-row.tsx",
    "app/admin/page.tsx",
    "app/admin/verifications/verification-row.tsx",
    "app/experiences/[id]/engagement.tsx",
    "app/experiences/[id]/owner-actions.tsx",
    "app/experiences/[id]/page.tsx",
    "app/experiences/new/new-experience-form.tsx",
    "app/forgot-password/forgot-form.tsx",
    "app/garage/loading.tsx",
    "app/join/shop/shop-signup-form.tsx",
    "app/mechanics/[id]/page.tsx",
    /*
      Not the Sheet conversion — the sweep's \bCard\b regex cannot tell this
      component import from the word "Card" in "Card details.", genuine copy
      in the privacy policy's payments section that must stay verbatim. The
      page itself no longer imports or renders the Card component.
    */
    "app/profile/[username]/page.tsx",
    "app/register/register-form.tsx",
    "app/reset-password/reset-form.tsx",
    "app/review/listing-row.tsx",
    "app/review/page.tsx",
    "app/settings/security/change-password.tsx",
    "app/settings/security/delete-account.tsx",
    "app/settings/security/mfa-panel.tsx",
    "app/setup-2fa/page.tsx",
    "app/shops/[id]/location-editor.tsx",
    "app/shops/[id]/price-editor.tsx",
    "app/shops/[id]/subscription-panel.tsx",
    "app/shops/add/add-shop-form.tsx",
    "app/shops/claim/claim-form.tsx",
    "app/vehicle/[id]/page.tsx",
    "components/experience-card.tsx",
  ],
  glass: [
    "app/discover.tsx",
    "components/anchored-menu.tsx",
    "components/area-picker.tsx",
    "components/document-viewer.tsx",
    "components/mechanic-map.tsx",
  ],
  retiredUtilities: [
    "app/discover.tsx",
    "app/garage/add-vehicle-sheet.tsx",
    "components/area-picker.tsx",
    "components/document-viewer.tsx",
    "components/job-card.tsx",
    "components/session-guard.tsx",
  ],
  deletedPrimitives: [
    "app/admin/claims/page.tsx",
    "app/admin/page.tsx",
    "app/admin/verifications/page.tsx",
    "app/experiences/[id]/page.tsx",
    "app/experiences/new/page.tsx",
    "app/mechanics/[id]/page.tsx",
    "app/profile/[username]/page.tsx",
    "app/review/page.tsx",
    "app/settings/security/page.tsx",
    "app/setup-2fa/page.tsx",
    "app/shops/[id]/page.tsx",
    "app/vehicle/[id]/page.tsx",
    "components/experience-card.tsx",
  ],
  deletedUtilities: [
    "app/discover.tsx",
    "app/garage/page.tsx",
    "app/not-found.tsx",
    "app/shops/[id]/subscription-panel.tsx",
    "components/job-card.tsx",
  ],
  layoutTransitions: [
    "app/discover.tsx",
  ],
  stampInk: [
    "components/job-card.tsx",
  ],
};
