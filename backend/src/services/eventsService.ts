import { supabaseAdmin } from '../config/supabase.js';
import { supabaseEnabled } from '../config/env.js';

export type EventRow = {
  id: string;
  name: string;
  where_text: string | null;
  city: string | null;
  country: string | null;
  starts_at: string;
  ends_at: string | null;
  url: string | null;
  status: string;
  notes: string | null;
};

export async function listUpcomingEvents(): Promise<EventRow[]> {
  if (!supabaseEnabled) return [];
  const { data, error } = await supabaseAdmin()
    .from('events')
    .select('*')
    .gte('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true })
    .limit(20);
  if (error) throw new Error(`supabase_query_failed: ${error.message}`);
  return data as EventRow[];
}
