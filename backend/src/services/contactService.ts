import { supabaseAdmin } from '../config/supabase.js';
import { supabaseEnabled } from '../config/env.js';
import type { ContactPayload } from '../schemas/contact.schema.js';
import { sendContactNotification } from './emailService.js';

export async function saveContact(
  payload: ContactPayload,
  meta: { ip?: string; userAgent?: string },
): Promise<{ id: string | null }> {
  if (!supabaseEnabled) {
    console.log('[contact] Supabase disabled — would have saved:', { ...payload, ...meta });
    return { id: null };
  }
  const { data, error } = await supabaseAdmin()
    .from('contact_submissions')
    .insert({
      name: payload.name,
      email: payload.email,
      subject: payload.subject || null,
      message: payload.message,
      ip: meta.ip ?? null,
      user_agent: meta.userAgent ?? null,
    })
    .select('id')
    .single();
  if (error) throw new Error(`supabase_insert_failed: ${error.message}`);
  return { id: data?.id ?? null };
}

export async function handleContact(
  payload: ContactPayload,
  meta: { ip?: string; userAgent?: string },
): Promise<{ id: string | null }> {
  const result = await saveContact(payload, meta);
  // Fire-and-forget email — we don't want a Resend hiccup to bounce the submitter
  void sendContactNotification(payload).catch((err) => console.error('[email] send failed:', err));
  return result;
}
