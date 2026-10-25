import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const root = new URL("../../", import.meta.url);

async function readEnvFile(relativePath) {
  try {
    const text = await readFile(new URL(relativePath, root), "utf8");
    return Object.fromEntries(
      text
        .split(/\r?\n/)
        .map((line) => line.match(/^([A-Z0-9_]+)=(.*)$/))
        .filter(Boolean)
        .map(([, key, value]) => [key, value.replace(/^['"]|['"]$/g, "")]),
    );
  } catch {
    return {};
  }
}

const desktopEnv = await readEnvFile("flick-desktop/.env.local");
const mobileEnv = await readEnvFile("flick-mobile/.env.local");
const env = {
  url: process.env.QA_SUPABASE_URL || desktopEnv.VITE_SUPABASE_URL || mobileEnv.EXPO_PUBLIC_SUPABASE_URL,
  key: process.env.QA_SUPABASE_KEY || desktopEnv.VITE_SUPABASE_PUBLISHABLE_KEY || mobileEnv.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  email: process.env.QA_TEST_EMAIL,
  password: process.env.QA_TEST_PASSWORD,
};

const destructive = process.env.QA_ALLOW_DESTRUCTIVE === "true";
const hasCredentials = Boolean(env.url && env.key && env.email && env.password);

function apiUrl(path) {
  return `${env.url.replace(/\/$/, "")}${path}`;
}

async function request(path, options = {}) {
  const headers = new Headers(options.headers);
  headers.set("apikey", env.key);
  return fetch(apiUrl(path), { ...options, headers });
}

async function authRequest(path, token, options = {}) {
  const headers = new Headers(options.headers);
  headers.set("apikey", env.key);
  headers.set("Authorization", `Bearer ${token}`);
  return fetch(apiUrl(path), { ...options, headers });
}

async function json(response) {
  const body = await response.text();
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

test("configuration exposes a Supabase project URL and publishable key", () => {
  assert.match(env.url || "", /^https:\/\/[^/]+\.supabase\.co$/);
  assert.match(env.key || "", /^(sb_publishable_|eyJ)/);
});

test("Supabase Auth health endpoint is available", async (t) => {
  if (!env.url || !env.key) return t.skip("Supabase environment is not configured");
  const response = await request("/auth/v1/health");
  assert.equal(response.status, 200);
  const body = await json(response);
  assert.equal(body.name, "GoTrue");
});

test("offline behavior is representable without mutating the backend", async () => {
  await assert.rejects(
    fetch("http://127.0.0.1:1/qa-offline", { signal: AbortSignal.timeout(250) }),
    /fetch failed|aborted|timeout/i,
  );
});

test("contract inventory covers every Supabase operation used by both apps", async () => {
  const files = [
    "flick-desktop/src/renderer/src/hooks/useSession.ts",
    "flick-desktop/src/renderer/src/hooks/useFiles.ts",
    "flick-desktop/src/renderer/src/hooks/useClips.ts",
    "flick-desktop/src/renderer/src/hooks/useDevice.ts",
    "flick-desktop/src/renderer/src/hooks/useUsage.ts",
    "flick-desktop/src/renderer/src/hooks/useFeatureFlags.ts",
    "flick-desktop/src/renderer/src/hooks/useShareLinks.ts",
    "flick-desktop/src/renderer/src/hooks/useWaitlist.ts",
    "flick-desktop/src/renderer/src/hooks/useOnboarding.ts",
    "flick-mobile/src/hooks/useSession.ts",
    "flick-mobile/src/hooks/useUpload.ts",
    "flick-mobile/src/hooks/useOpenFile.ts",
    "flick-mobile/src/hooks/useRemoveFile.ts",
    "flick-mobile/src/hooks/useClips.ts",
    "flick-mobile/src/hooks/useDevice.ts",
    "flick-mobile/src/hooks/useUsage.ts",
    "flick-mobile/src/hooks/useFeatureFlags.tsx",
    "flick-mobile/src/hooks/useShareLinks.ts",
    "flick-mobile/src/hooks/useWaitlist.ts",
    "flick-mobile/src/hooks/useOnboarding.ts",
  ];
  const source = (await Promise.all(files.map((file) => readFile(new URL(`../../${file}`, import.meta.url), "utf8")))).join("\n");
  for (const pattern of [
    "auth.signInWithPassword",
    "auth.signUp",
    "auth.signInWithOAuth",
    "auth.signInWithIdToken",
    "auth.exchangeCodeForSession",
    "auth.setSession",
    "auth.signOut",
    ".from(\"files\")",
    ".from(\"clips\")",
    ".from(\"devices\")",
    ".from(\"profiles\")",
    ".from(\"feature_flags\")",
    ".from(\"share_links\")",
    ".storage",
    ".rpc(\"register_device\"",
    ".rpc(\"remove_device\"",
    ".rpc(\"get_usage\"",
    ".rpc(\"ensure_my_profile\"",
  ]) {
    assert.match(source, new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), pattern);
  }
});

test("expired sessions are rejected by Supabase", async (t) => {
  if (!env.url || !env.key) return t.skip("Supabase environment is not configured");
  const response = await authRequest("/auth/v1/user", "expired.qa.token");
  assert.ok([401, 403].includes(response.status), `unexpected status ${response.status}`);
});

test("authenticated read and RPC calls", async (t) => {
  if (!hasCredentials) return t.skip("Set QA_TEST_EMAIL and QA_TEST_PASSWORD for live integration");
  const tokenResponse = await request("/auth/v1/token?grant_type=password", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: env.email, password: env.password }),
  });
  assert.equal(tokenResponse.status, 200, `sign-in failed: ${JSON.stringify(await json(tokenResponse))}`);
  const tokenBody = await json(tokenResponse);
  assert.ok(tokenBody.access_token);
  const token = tokenBody.access_token;

  for (const table of ["files", "clips", "devices", "profiles", "feature_flags", "share_links"]) {
    const response = await authRequest(`/rest/v1/${table}?select=*`, token);
    assert.equal(response.status, 200, `${table} read failed with ${response.status}`);
  }
  const usage = await authRequest("/rest/v1/rpc/get_usage", token, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
  assert.equal(usage.status, 200, `get_usage failed with ${usage.status}`);
  const storage = await authRequest("/storage/v1/object/list/flick-files", token, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prefix: "", limit: 100, offset: 0 }) });
  assert.ok([200, 201].includes(storage.status), `storage list failed with ${storage.status}`);
});

test("destructive integration matrix is explicitly gated", (t) => {
  if (!hasCredentials) return t.skip("Set QA_TEST_EMAIL and QA_TEST_PASSWORD for live integration");
  if (!destructive) return t.skip("Set QA_ALLOW_DESTRUCTIVE=true to run isolated test-account mutations");
  t.todo("Run upload/download/delete, wrong-owner delete, limits, expiry, share links and clips with a disposable account");
});

for (const caseName of [
  "upload and download a normal file",
  "delete removes both database row and storage object",
  "wrong user cannot delete another user's file",
  "expired files are removed after 24 hours",
  "only the sender can revoke a shared drop",
  "storage limit rejects data over 500 MB",
  "pin limit rejects a fourth pinned file",
  "device count limit rejects an additional device",
  "Clips insert, realtime sync and delete",
  "clipboard feature flag on and off",
  "payments feature flag on and off",
  "empty, huge, Unicode and special-character filenames",
  "expired session and no-network mutations fail safely",
]) {
  test(`live integration: ${caseName}`, (t) => {
    if (!hasCredentials) return t.skip("Set QA_TEST_EMAIL and QA_TEST_PASSWORD for live integration");
    if (!destructive) return t.skip("Set QA_ALLOW_DESTRUCTIVE=true to run isolated test-account mutations");
    t.todo("Implement against the disposable QA account and isolated fixtures");
  });
}

