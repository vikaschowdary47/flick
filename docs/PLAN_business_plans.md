# Plan F5 — Personal vs business, per-seat billing

**Size: L** · Plan only, nothing built. No payment code is part of this plan.

## Goal
Two kinds of account: **Personal** (today's free plan, plus a later Pro upgrade) and **Business** (a team that pays per seat, with an admin).

## User flow
- **Personal:** unchanged; later Pro raises limits (more pins, storage, longer retention). Upgrade UI stays hidden until `feature_flags.payments` is on.
- **Business:**
  1. An admin creates a workspace ("Acme"), picks the number of seats, and pays.
  2. They invite teammates by email; each accepts and their account joins the workspace.
  3. The admin sees seats used, members, storage, and can remove members, set retention (e.g. 7 days instead of 24 hours), and turn features on or off (clips, guest receive, public links).
  4. Members' files stay **private to each member** by default. Team sharing (send to a teammate) is a separate feature that builds on F1.
  5. Billing: per seat per month; adding a seat prorates; removing one frees it at period end.

## Data model
- `workspaces`: `id`, `name`, `owner_id`, `plan` (references `plan_limits`), `seats`, `billing_customer_id`, `billing_status`, `created_at`.
- `workspace_members`: `workspace_id`, `user_id`, `role` (`admin` | `member`), `joined_at`.
- `workspace_invites`: `workspace_id`, `email`, `token`, `expires_at`.
- `plan_limits` gets rows like `pro`, `business`, plus columns for retention hours and feature switches.
- `profiles.plan` stays the source for personal plans; for members, limits come from the workspace's plan. `flick_limits_for(user)` checks the workspace first, then the profile.
- Expiry: per-workspace retention means the expiry job reads each file owner's retention instead of a flat 24 hours.

## Cost / risk
- **Payments:** Stripe (web checkout and customer portal) for Business. Apple and Google require in-app purchase for digital upgrades bought *in* the iOS/Android apps; Business is usually bought on the web, which avoids that. Personal Pro inside the iOS app would need StoreKit. Legal, tax and receipts add work.
- **Security:** admin controls must be enforced in RLS and functions, not only the UI.
- Retention changes touch expiry, which is sensitive (see F4).

## Size
L: three tables, admin web pages (or admin screens), invites, a billing integration and webhooks, limits per workspace, retention in expiry.

## Open questions
1. Per-seat price, and is there a minimum seat count?
2. Can a person be in a workspace and keep a personal account, or do they switch?
3. Which retention options for Business (24h / 7d / 30d)?
4. Should admins see members' file *names* (audit) or only usage numbers? (Recommendation: usage only.)
5. Web-only purchase for Business at launch?
