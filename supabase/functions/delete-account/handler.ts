// Kept separate from Deno wiring so authorization and cleanup can be tested locally.
export type DeletionUser = { id: string; identities?: { provider: string; identity_data?: Record<string, unknown> }[] };
export type StorageEntry = { name: string; id: string | null };
export type Dependencies = {
  verifyUser: (token: string) => Promise<DeletionUser | null>;
  beginDeletion: (userId: string) => Promise<void>;
  list: (prefix: string) => Promise<StorageEntry[]>;
  remove: (paths: string[]) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  revokeApple: (user: DeletionUser, body: Record<string, unknown>) => Promise<boolean>;
};
const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });

export function createDeleteAccountHandler(deps: Dependencies) {
  return async (request: Request): Promise<Response> => {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
    const match = /^Bearer\s+(\S+)$/i.exec(request.headers.get('Authorization') ?? '');
    if (!match) return json({ error: 'Sign in again before deleting your account.' }, 401);
    let user: DeletionUser | null;
    try { user = await deps.verifyUser(match[1]); } catch { user = null; }
    if (!user || !/^[0-9a-f-]{36}$/i.test(user.id)) return json({ error: 'Sign in again before deleting your account.' }, 401);
    let body: Record<string, unknown>;
    try {
      const value: unknown = await request.json();
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Bad body');
      body = value as Record<string, unknown>;
    } catch { return json({ error: 'Invalid request' }, 400); }
    if (body.confirmation !== 'DELETE') return json({ error: 'Type DELETE to confirm.' }, 400);
    // Never accept a target user ID from the body.
    try {
      await deps.beginDeletion(user.id);
      let batches = 0;
      const emptyPrefix = async (prefix: string, depth = 0): Promise<void> => {
        if (depth > 20) throw new Error('Storage nesting limit');
        for (;;) {
          if (++batches > 500) throw new Error('Cleanup batch limit; retry to continue');
          const entries = await deps.list(prefix);
          if (!entries.length) return;
          const paths: string[] = [];
          for (const entry of entries) {
            if (!entry.name || entry.name.includes('/') || entry.name === '.' || entry.name === '..') throw new Error('Invalid storage entry');
            const path = `${prefix}/${entry.name}`;
            if (entry.id === null) await emptyPrefix(path, depth + 1);
            else paths.push(path);
          }
          if (paths.length) await deps.remove(paths);
          // Always start at offset 0: deleting a page shifts the remaining objects.
        }
      };
      await emptyPrefix(user.id);
      const appleRevoked = await deps.revokeApple(user, body);
      // files, clips, devices, profiles, waitlist and share_links all reference
      // auth.users with ON DELETE CASCADE; link rate limits cascade from links.
      await deps.deleteUser(user.id);
      return json({ deleted: true, appleRevocationRequired: !appleRevoked });
    } catch {
      // Marker stays in place; retries continue cleanup without orphaning storage.
      return json({ error: "Couldn't finish deleting your account. Please retry; uploads are paused until cleanup finishes." }, 503);
    }
  };
}
