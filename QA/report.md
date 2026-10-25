# eqlShare QA report

**Run date:** 2026-10-25  
**Scope:** desktop, mobile, website, Supabase integration, links, and repeatable QA artifacts  
**Application changes during this QA run:** none. The desktop account-button CSS change visible in the working tree was made before this QA request in the preceding UI task.

## Results

| Area | Result | Evidence |
|---|---|---|
| Desktop lint and TypeScript | Passed | `cd flick-desktop && npm test` |
| Desktop production build | Passed | `cd flick-desktop && npm run build` |
| Desktop native behavior tests | Passed, 11/11 | `npm run test:windows` |
| Mobile TypeScript | Passed | `cd flick-mobile && npx tsc --noEmit` |
| Website lint | Passed | `cd site && npm run lint` |
| Website production build | Passed with warnings | `cd site && npm run build` |
| Website routes | Passed, HTTP 200 | `/`, `/privacy`, `/terms`, `/robots.txt`, `/sitemap.xml`, `/d/qa-missing-share` |
| Website visual smoke | Passed | Landing page loaded in integrated browser; empty waitlist submission showed validation feedback |
| Supabase API suite | Passed, 5; skipped, 15 | `node --test tests/api/supabase-api.test.mjs` |
| Supabase authenticated/destructive tests | Blocked | No disposable `QA_TEST_EMAIL` / `QA_TEST_PASSWORD` supplied |
| iOS exact requested devices | Blocked | iPhone SE and iPhone 16 Pro Max unavailable; installed runtimes expose newer devices |
| Android | Blocked | `adb` is not installed |
| Maestro | Blocked | Maestro executable is not installed |
| Playwright CLI | Blocked | Playwright executable/package is not installed; browser smoke used the integrated browser instead |
| Supabase local stack | Blocked | Docker daemon is not running |
| Supabase Edge Function Deno tests | Blocked | `deno` is not installed |

## Bugs

| # | Severity (Critical/High/Med/Low) | Platform | Screen/flow | Steps to reproduce | Expected | Actual | Screenshot path |
|---:|---|---|---|---|---|---|---|
| 1 | High | Backend / desktop / mobile | Email signup | Submit a new email/password signup while Supabase emits the supplied Auth log with request ID `01a173d1-2f98-727e-a3a9-27fcca4804b6` | Signup completes or returns a prompt error quickly | `POST /signup` waits `10000686500` ns and returns `504 request_timeout`; Auth reports `context deadline exceeded` while requesting confirmation | N/A — source evidence is the supplied Auth log |
| 2 | Med | Desktop compact popover | Header account control | Open the compact desktop popover at the supplied screenshot size | User icon is a circular, square touch target | The account button was rendered with the logo’s fixed `130px` width and appeared as a stretched ellipse, overlapping the header layout | N/A — supplied screenshot; prior CSS correction is present in the working tree |
| 3 | Low | Website build/deployment | Next.js project configuration | Run `cd site && npm run build` from the repository root | Next should identify one unambiguous workspace root | Next warns that it inferred the root from the root lockfile while also finding `site/package-lock.json`; this can make tracing/deployment behavior ambiguous | N/A — build warning only |
| 4 | High | Backend / desktop / mobile | Sharing-limit waitlist | Reach the share-link limit and choose the waitlist action | The waitlist accepts the `sharing` limit | The supplied schema constraint allows only `pins`, `storage`, and `devices`; the insert will fail with a check-constraint error | N/A — schema audit |
| 5 | Critical | Backend / account deletion | Delete account with dependent rows | Delete an account that owns files, clips, devices, profiles, waitlist or share links | Auth user and dependent data are removed | The supplied foreign keys omit the cascade/set-null actions required by the deletion function; `auth.admin.deleteUser()` can fail and return 503 after Storage cleanup | N/A — schema audit |

## API and backend matrix

The safe suite verified the project configuration, Auth health, offline failure behavior, expired-token rejection, and static coverage of both apps’ Supabase calls. Live authenticated and destructive cases were not run without a disposable account.

| Capability | Test status | Reason |
|---|---|---|
| Password sign-in/session retrieval | Blocked | Requires `QA_TEST_EMAIL` and `QA_TEST_PASSWORD` |
| Google session callback | Blocked | Provider/browser callback required |
| Apple session callback | Blocked | Apple provider/device required |
| Upload/download/delete | Blocked | Requires authenticated disposable account and mutation opt-in |
| Delete from storage and database | Blocked | Requires mutation opt-in |
| Wrong-user delete protection | Blocked | Requires two disposable accounts |
| 24-hour expiry | Blocked | Requires seeded expired rows or scheduled function execution |
| Shared drops and sender-only revoke/delete | Blocked | Requires seeded share links and Edge Function |
| 500 MB storage limit | Blocked | Requires controlled test data; per-file schema limit is 50 MB |
| Three-pin limit | Blocked | Requires authenticated seeded files |
| Device-count limit | Blocked | Requires multiple registered test devices |
| Clips sync and delete | Blocked | Requires authenticated realtime clients |
| `feature_flags.clipboard` and `payments` on/off | Blocked | Requires authenticated realtime clients and controlled flag rows |
| No network / expired session / invalid inputs | Partial | Offline and expired-token checks passed; UI/provider-specific cases blocked |

## Link coverage

The inventory is in [coverage-map.md](./coverage-map.md). The following links resolved during this run:

- `https://eqlshare.com` and `https://www.eqlshare.com` redirected/resolved to the live website with HTTP 200.
- Local landing, privacy, terms, robots, sitemap and share-route paths returned HTTP 200.
- `mailto:hello@eqlshare.com` and internal privacy/terms links are present in the rendered landing-page accessibility tree.
- Desktop OAuth callback `flick://auth-callback` and widget targets `flick://file/<id>` / `flick://clip/<id>` were statically confirmed but not opened in a native runtime.

## Mobile and native coverage blockers

The source inventory and repeatable flows were added, but native execution could not be completed in this environment:

- Xcode 27.1 is installed, but the requested iPhone SE and iPhone 16 Pro Max simulator profiles are unavailable. Available runtimes contain newer iPhone models.
- Android SDK/ADB is unavailable.
- Maestro is unavailable.
- No shared computer-use page was available for Electron interaction or native screenshots.
- No disposable test account was supplied, so email confirmation, OAuth, upload mutations, cross-device sync and account deletion were not exercised.

## Repeatable artifacts

- [coverage-map.md](./coverage-map.md)
- [README.md](./README.md)
- [supabase-api.test.mjs](../tests/api/supabase-api.test.mjs)
- [auth-and-home.yaml](./maestro/auth-and-home.yaml)
- [home-flows.yaml](./maestro/home-flows.yaml)
- [site.spec.ts](./playwright/site.spec.ts)
- [schema-audit.md](./schema-audit.md)

## Top five fixes/checks first

1. Investigate the Supabase `/signup` 504 using the supplied request ID, database locks/health, and the `auth.users` profile trigger.
2. Run the authenticated mutation suite with two disposable accounts to validate ownership, limits, expiry, share links and account deletion.
3. Install/configure Android SDK, Maestro, and the requested iOS simulator profiles, then replay the mobile flows.
4. Run native cross-device tests for upload, delete and Clips realtime propagation.
5. Resolve the website workspace-root warning by making the intended Next.js tracing root explicit.
