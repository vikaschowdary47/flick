# eqlShare QA artifacts

`coverage-map.md` is the frozen inventory for the QA run. The API suite is in `../tests/api/supabase-api.test.mjs` and uses Node's built-in test runner.

## API test commands

Run the safe checks:

```sh
node --test tests/api/supabase-api.test.mjs
```

For live authenticated reads, provide a disposable test account:

```sh
QA_TEST_EMAIL=qa@example.test \
QA_TEST_PASSWORD='...' \
node --test tests/api/supabase-api.test.mjs
```

Destructive tests require both a disposable account and `QA_ALLOW_DESTRUCTIVE=true`. They are intentionally gated so a normal QA run cannot delete production data.

## Mobile UI tests

The Maestro flows under `QA/maestro/` cover the logged-out sign-in surface, the authenticated home surface, upload entry points, Clips, settings, and back navigation. They require a configured Maestro installation and a seeded test account.

## Website UI tests

The Playwright spec under `QA/playwright/` covers the landing page, legal links, waitlist form, and share route. It expects the site to be running at `http://localhost:3000` and a Playwright runner to be installed by the invoking environment.

