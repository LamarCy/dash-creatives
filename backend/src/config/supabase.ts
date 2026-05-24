import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env, supabaseEnabled } from './env.js';

let _client: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (!supabaseEnabled) {
    throw new Error('Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }
  if (!_client) {
    _client = createClient(env.SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _client;
}
