import { Buffer } from 'node:buffer';
// Run locally with credentials in environment variables. Never commit the output.
import { readFileSync } from 'node:fs';
import { createPrivateKey, sign } from 'node:crypto';
import process from 'node:process';
import console from 'node:console';
const { APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_SERVICES_ID, APPLE_PRIVATE_KEY_PATH } = process.env;
if (![APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_SERVICES_ID, APPLE_PRIVATE_KEY_PATH].every(Boolean)) {
  throw new Error('Set APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_SERVICES_ID and APPLE_PRIVATE_KEY_PATH');
}
const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const issued = Math.floor(Date.now() / 1000);
const input = `${encode({ alg: 'ES256', kid: APPLE_KEY_ID })}.${encode({ iss: APPLE_TEAM_ID, iat: issued, exp: issued + 180 * 86400, aud: 'https://appleid.apple.com', sub: APPLE_SERVICES_ID })}`;
const signature = sign('sha256', Buffer.from(input), { key: createPrivateKey(readFileSync(APPLE_PRIVATE_KEY_PATH)), dsaEncoding: 'ieee-p1363' });
console.log(`${input}.${signature.toString('base64url')}`);
