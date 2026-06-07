import { Resend } from 'resend';
import { env, emailEnabled } from '../config/env.js';
import type { ContactPayload } from '../schemas/contact.schema.js';

let _resend: Resend | null = null;
function client(): Resend {
  if (!_resend) _resend = new Resend(env.RESEND_API_KEY!);
  return _resend;
}

export async function sendContactNotification(payload: ContactPayload): Promise<void> {
  if (!emailEnabled) {
    console.log('[email] disabled — would have sent:', payload);
    return;
  }
  const html = `
    <p><strong>From:</strong> ${escapeHtml(payload.name)} &lt;${escapeHtml(payload.email)}&gt;</p>
    ${payload.subject ? `<p><strong>Subject:</strong> ${escapeHtml(payload.subject)}</p>` : ''}
    <hr/>
    <pre style="white-space:pre-wrap;font-family:Georgia,serif;">${escapeHtml(payload.message)}</pre>
  `;
  await client().emails.send({
    from: env.CONTACT_FROM,
    to: env.CONTACT_NOTIFY_TO,
    replyTo: payload.email,
    subject: `[Dash Creatives] ${payload.subject || 'New message'} — ${payload.name}`,
    html,
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
