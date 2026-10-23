import { exportJWK, exportPKCS8, generateKeyPair, SignJWT } from 'npm:jose@6';
import { revokeApple } from './apple.ts';
const { publicKey, privateKey } = await generateKeyPair('ES256', { extractable: true });
const jwk = await exportJWK(publicKey);
const pem = await exportPKCS8(privateKey);
const user = { id: '10000000-0000-4000-8000-000000000001', identities: [{ provider: 'apple', identity_data: { sub: 'apple-user-one' } }] };
function assert(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
async function run(subject: string, work: (revocations: URLSearchParams[]) => Promise<void>) {
  const settings = { APPLE_TEAM_ID: 'TESTTEAM', APPLE_KEY_ID: 'TESTKEY', APPLE_PRIVATE_KEY: pem, APPLE_IOS_CLIENT_ID: 'dev.flickit.app', APPLE_SERVICES_ID: 'dev.flickit.web' };
  const old = Object.fromEntries(Object.keys(settings).map((key) => [key, Deno.env.get(key)]));
  for (const [key, value] of Object.entries(settings)) Deno.env.set(key, value);
  const fetchBefore = globalThis.fetch;
  const revocations: URLSearchParams[] = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith('/auth/keys')) return Response.json({ keys: [{ ...jwk, kid: 'TESTAPPLE', alg: 'ES256', use: 'sig' }] });
    if (url.endsWith('/auth/token')) {
      const client = new URLSearchParams(String(init?.body)).get('client_id')!;
      const idToken = await new SignJWT({}).setProtectedHeader({ alg: 'ES256', kid: 'TESTAPPLE' })
        .setIssuer('https://appleid.apple.com').setAudience(client).setSubject(subject).setIssuedAt().setExpirationTime('5m').sign(privateKey);
      return Response.json({ id_token: idToken, refresh_token: 'test-refresh-token' });
    }
    if (url.endsWith('/auth/revoke')) { revocations.push(new URLSearchParams(String(init?.body))); return new Response('', { status: 200 }); }
    throw new Error('Unexpected network request in test');
  };
  try { await work(revocations); } finally {
    globalThis.fetch = fetchBefore;
    for (const [key, value] of Object.entries(old)) { if (value === undefined) Deno.env.delete(key); else Deno.env.set(key, value); }
  }
}
Deno.test('native Apple authorization code is exchanged and matching identity is revoked', async () => {
  await run('apple-user-one', async (calls) => {
    assert(await revokeApple(user, { appleAuthorizationCode: 'test-code' }), 'Revocation failed');
    assert(calls.length === 1, 'Expected one revocation');
    assert(calls[0].get('client_id') === 'dev.flickit.app', 'Native client mismatch');
    assert(calls[0].get('token_type_hint') === 'refresh_token', 'Wrong token hint');
  });
});
Deno.test('browser Apple refresh token uses the Services ID', async () => {
  await run('apple-user-one', async (calls) => {
    assert(await revokeApple(user, { appleRefreshToken: 'test-refresh' }), 'Revocation failed');
    assert(calls[0].get('client_id') === 'dev.flickit.web', 'Services ID mismatch');
  });
});
Deno.test('a token for another Apple identity is never revoked', async () => {
  await run('different-apple-user', async (calls) => {
    assert(!await revokeApple(user, { appleAuthorizationCode: 'test-code' }), 'Accepted mismatched Apple identity');
    assert(calls.length === 0, 'Revoked another identity');
  });
});
Deno.test('missing Apple tokens yield manual instructions; non-Apple users need no revocation', async () => {
  assert(!await revokeApple(user, {}), 'Expected manual revocation');
  assert(await revokeApple({ id: user.id }, {}), 'Non-Apple account incorrectly blocked');
});
