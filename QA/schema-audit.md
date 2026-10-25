# Supabase schema audit

Compared the supplied schema export with the repository migrations and the code paths that use the tables. This audit is read-only; no database or application code was changed.

## Confirmed mismatch 1: sharing waitlist constraint

The supplied schema has:

```sql
CHECK (limit_hit = ANY (ARRAY['pins', 'storage', 'devices']))
```

The application defines `LimitKind` as `pins | storage | devices | sharing`, and both desktop and mobile call `waitlist.upsert()` with the selected limit. The share-link migration explicitly changes the constraint to include `sharing` at [20261029120000_share_links.sql](../supabase/migrations/20261029120000_share_links.sql:21).

### Impact

When a share-link limit is reached, the Pro waitlist action will fail with a database check-constraint error if the exported constraint is the live one.

### Verify

```sql
select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.waitlist'::regclass
  and conname = 'waitlist_limit_hit_check';
```

Expected definition includes `sharing`.

## Confirmed mismatch 2: missing delete actions on user-owned foreign keys

The supplied schema shows these references without delete actions:

```sql
public.files.user_id       references auth.users(id)
public.waitlist.user_id    references auth.users(id)
public.devices.user_id     references auth.users(id)
public.profiles.user_id    references auth.users(id)
public.clips.user_id       references auth.users(id)
public.share_links.owner_id references auth.users(id)
public.share_links.file_id references public.files(id)
```

The migrations define these relationships with `on delete cascade`, and `files.device_id` with `on delete set null`. The account-deletion function then calls `auth.admin.deleteUser()` after cleaning Storage and explicitly assumes those cascades at [handler.ts](../supabase/functions/delete-account/handler.ts:60).

### Impact

Account deletion can return a 503 after the Storage cleanup because the Auth user delete is rejected by dependent rows. A partial cleanup marker can remain in `account_deletions`, leaving the account blocked from uploads until retry.

### Verify

```sql
select
  conrelid::regclass as table_name,
  conname,
  pg_get_constraintdef(oid) as definition
from pg_constraint
where conname in (
  'files_user_id_fkey', 'files_device_id_fkey', 'waitlist_user_id_fkey',
  'devices_user_id_fkey', 'profiles_user_id_fkey', 'clips_user_id_fkey',
  'share_links_owner_id_fkey', 'share_links_file_id_fkey',
  'share_link_rate_limits_id_hash_fkey'
)
order by table_name, conname;
```

Expected user-owned rows use `ON DELETE CASCADE`; `files.device_id` uses `ON DELETE SET NULL`; share-link rate limits cascade from `share_links`.

## Signup timeout investigation

The supplied Auth log reports `POST /signup` timing out after 10 seconds. The migration adds an `AFTER INSERT` trigger on `auth.users` that inserts `public.profiles` at [20261022120000_plan_limits.sql](../supabase/migrations/20261022120000_plan_limits.sql:48). This is the first database-side operation to inspect during signup.

Run these checks in the Supabase SQL editor using a privileged role:

```sql
select tgname, tgenabled, pg_get_triggerdef(oid)
from pg_trigger
where tgrelid = 'auth.users'::regclass
  and not tgisinternal;

select count(*) as plans, bool_or(plan = 'free') as has_free_plan
from public.plan_limits;

select pid, usename, state, wait_event_type, wait_event, query_start, query
from pg_stat_activity
where datname = current_database()
order by query_start nulls last;
```

The trigger should exist, `plan_limits` should contain `free`, and there should be no long-running or blocked transaction touching `auth.users` or `public.profiles`.

## Size-limit clarification

The `files.size` check of `52428800` is a **50 MiB per-file limit**. The 500 MB limit is implemented as aggregate user storage in `files_enforce_limits()` using `524288000`. This is consistent with the current app constants and is only a bug if the product requirement means 500 MB per individual file.

