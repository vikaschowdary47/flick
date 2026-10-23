import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeleteAccountHandler } from './handler.ts';
const uid = '10000000-0000-4000-8000-000000000001';
const other = '10000000-0000-4000-8000-000000000002';
function fixture(options = {}) {
  const calls = [];
  const objects = new Set(options.objects ?? [`${uid}/file.pdf`, `${uid}/thumbs/thumb.jpg`, `${other}/private.pdf`]);
  let failRemove = options.failRemove ?? false;
  let failDelete = options.failDelete ?? false;
  const deps = {
    verifyUser: async (token) => { calls.push(['verify', token]); return token === 'valid' ? { id: uid } : null; },
    beginDeletion: async (id) => { calls.push(['begin', id]); },
    list: async (prefix) => {
      const result = new Map();
      for (const path of [...objects].sort()) {
        if (!path.startsWith(`${prefix}/`)) continue;
        const remainder = path.slice(prefix.length + 1);
        const [name, child] = remainder.split('/');
        result.set(name, { name, id: child ? null : path });
      }
      return [...result.values()].slice(0, 100);
    },
    remove: async (paths) => {
      calls.push(['remove', paths]);
      if (failRemove) { failRemove = false; throw new Error('Storage unavailable'); }
      for (const path of paths) objects.delete(path);
    },
    deleteUser: async (id) => { if (failDelete) { failDelete = false; throw new Error('Auth unavailable'); } calls.push(['delete', id]); },
    revokeApple: async () => options.appleRevoked ?? true,
  };
  return { handle: createDeleteAccountHandler(deps), calls, objects };
}
const request = (body = { confirmation: 'DELETE' }, token = 'valid', method = 'POST') => new Request('https://local/delete-account', {
  method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  ...(method === 'POST' ? { body: JSON.stringify(body) } : {}),
});
test('rejects missing/invalid JWT before any cleanup', async () => {
  for (const token of ['', 'expired', 'forged']) {
    const f = fixture();
    assert.equal((await f.handle(request(undefined, token))).status, 401);
    assert.equal(f.calls.some(([name]) => name === 'begin'), false);
  }
});
test('requires exact typed confirmation', async () => {
  const f = fixture();
  assert.equal((await f.handle(request({ confirmation: 'delete' }))).status, 400);
  assert.equal(f.calls.some(([name]) => name === 'begin'), false);
});
test('ignores a supplied user ID and removes only caller files, including nested thumbnails', async () => {
  const f = fixture();
  const response = await f.handle(request({ confirmation: 'DELETE', user_id: other }));
  assert.equal(response.status, 200);
  assert.deepEqual([...f.objects], [`${other}/private.pdf`]);
  assert.deepEqual(f.calls[1], ['begin', uid]);
  assert.deepEqual(f.calls.at(-1), ['delete', uid]);
});
test('paginates without skipping shifted rows', async () => {
  const f = fixture({ objects: Array.from({ length: 1205 }, (_, i) => `${uid}/thumbs/${i}.jpg`) });
  assert.equal((await f.handle(request())).status, 200);
  assert.equal(f.objects.size, 0);
  assert.ok(f.calls.filter(([name]) => name === 'remove').length > 10);
});
test('storage failure preserves auth user and retry resumes cleanup', async () => {
  const f = fixture({ failRemove: true });
  assert.equal((await f.handle(request())).status, 503);
  assert.equal(f.calls.some(([name]) => name === 'delete'), false);
  assert.equal((await f.handle(request())).status, 200);
  assert.deepEqual([...f.objects], [`${other}/private.pdf`]);
});
test('allows deletion with a manual Apple revocation notice when no token is available', async () => {
  const f = fixture({ appleRevoked: false });
  assert.deepEqual(await (await f.handle(request())).json(), { deleted: true, appleRevocationRequired: true });
});
test('rejects unexpected methods and supports CORS preflight without cleanup', async () => {
  const f = fixture();
  assert.equal((await f.handle(request(undefined, 'valid', 'GET'))).status, 405);
  assert.equal((await f.handle(request(undefined, 'valid', 'OPTIONS'))).status, 204);
  assert.equal(f.calls.length, 0);
});
test('rejects malformed JSON and unsafe storage entries without deleting user', async () => {
  const f = fixture({ objects: [`${uid}/../escape`] });
  assert.equal((await f.handle(new Request('https://local', { method: 'POST', headers: { Authorization: 'Bearer valid' }, body: '{' }))).status, 400);
  assert.equal((await f.handle(request())).status, 503);
  assert.equal(f.calls.some(([name]) => name === 'delete'), false);
});

test('Auth deletion failure reports failure and can retry after storage is already empty', async () => {
  const f = fixture({ failDelete: true });
  assert.equal((await f.handle(request())).status, 503);
  assert.equal(f.calls.some(([name]) => name === 'delete'), false);
  assert.deepEqual([...f.objects], [`${other}/private.pdf`]);
  assert.equal((await f.handle(request())).status, 200);
  assert.deepEqual(f.calls.at(-1), ['delete', uid]);
});
