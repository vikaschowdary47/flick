import { createRemoteJWKSet, importPKCS8, jwtVerify, SignJWT } from 'npm:jose@6';
import type { DeletionUser } from './handler.ts';
const jwks = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));

// Return false when no Apple token is available; deletion must still proceed.
// Never log authorization codes, provider tokens, private keys or client secrets.
export async function revokeApple(user: DeletionUser, body: Record<string, unknown>): Promise<boolean> {
  const identity = user.identities?.find((value) => value.provider === 'apple');
  if (!identity) return true;
  const code = typeof body.appleAuthorizationCode === 'string' ? body.appleAuthorizationCode : null;
  const refresh = typeof body.appleRefreshToken === 'string' ? body.appleRefreshToken : null;
  if (!code && !refresh) return false;
  const teamId = Deno.env.get('APPLE_TEAM_ID');
  const keyId = Deno.env.get('APPLE_KEY_ID');
  const privateKey = Deno.env.get('APPLE_PRIVATE_KEY')?.replace(/\\n/g, '\n');
  const clientId = code ? Deno.env.get('APPLE_IOS_CLIENT_ID') : Deno.env.get('APPLE_SERVICES_ID');
  if (!teamId || !keyId || !privateKey || !clientId) return false;
  const expectedSubject = identity.identity_data?.sub;
  if (typeof expectedSubject !== 'string') return false;
  const key = await importPKCS8(privateKey, 'ES256');
  const secret = await new SignJWT({}).setProtectedHeader({ alg: 'ES256', kid: keyId })
    .setIssuer(teamId).setSubject(clientId).setAudience('https://appleid.apple.com')
    .setIssuedAt().setExpirationTime('5m').sign(key);
  const params = new URLSearchParams({ client_id: clientId, client_secret: secret,
    grant_type: code ? 'authorization_code' : 'refresh_token' });
  params.set(code ? 'code' : 'refresh_token', code ?? refresh!);
  const exchange = await fetch('https://appleid.apple.com/auth/token', { method: 'POST', body: params });
  if (!exchange.ok) return false; // Expired/previously-used token: show manual revocation instructions.
  const data = await exchange.json();
  if (typeof data.id_token !== 'string') return false;
  const { payload } = await jwtVerify(data.id_token, jwks, { issuer: 'https://appleid.apple.com', audience: clientId });
  if (payload.sub !== expectedSubject) return false; // Never revoke another Apple account.
  const token = data.refresh_token ?? refresh ?? data.access_token;
  if (typeof token !== 'string') return false;
  const result = await fetch('https://appleid.apple.com/auth/revoke', {
    method: 'POST', body: new URLSearchParams({ client_id: clientId, client_secret: secret, token,
      token_type_hint: data.refresh_token || refresh ? 'refresh_token' : 'access_token' }),
  });
  return result.ok;
}
