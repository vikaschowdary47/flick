// Deploy with --no-verify-jwt: this handler validates JWTs using Auth getUser.
// Supports Supabase asymmetric JWTs; never trusts a decoded, unverified subject.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { createDeleteAccountHandler } from './handler.ts';
import { revokeApple } from './apple.ts';
const url = Deno.env.get('SUPABASE_URL')!;
const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const admin = createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
Deno.serve(createDeleteAccountHandler({
  verifyUser: async (token) => {
    const { data, error } = await admin.auth.getUser(token);
    return error ? null : data.user;
  },
  beginDeletion: async (userId) => {
    const { error } = await admin.from('account_deletions').upsert({ user_id: userId }, { onConflict: 'user_id' });
    if (error) throw error;
  },
  list: async (prefix) => {
    const { data, error } = await admin.storage.from('flick-files').list(prefix, { limit: 100, offset: 0, sortBy: { column: 'name', order: 'asc' } });
    if (error) throw error;
    return data;
  },
  remove: async (paths) => {
    const { error } = await admin.storage.from('flick-files').remove(paths);
    if (error) throw error;
  },
  deleteUser: async (userId) => {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) throw error;
  },
  revokeApple,
}));
