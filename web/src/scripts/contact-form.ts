const form = document.querySelector<HTMLFormElement>('form.nb-form');
const status = document.querySelector<HTMLParagraphElement>('.nb-status');

const API_BASE = import.meta.env.PUBLIC_API_BASE_URL ?? '';

if (form && status) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    const data = new FormData(form);

    // Honeypot — if filled, silently succeed
    if ((data.get('website') || '').toString().trim() !== '') {
      status.dataset.state = 'ok';
      status.textContent = 'Thank you — your message is on its way.';
      form.reset();
      return;
    }

    const payload = {
      name: (data.get('name') || '').toString().trim(),
      email: (data.get('email') || '').toString().trim(),
      subject: (data.get('subject') || '').toString().trim(),
      message: (data.get('message') || '').toString().trim(),
    };

    if (!payload.name || !payload.email || !payload.message) {
      status.dataset.state = 'err';
      status.textContent = 'Name, email, and message are required.';
      return;
    }

    if (submit) submit.disabled = true;
    status.dataset.state = '';
    status.textContent = 'Sending…';

    try {
      const res = await fetch(`${API_BASE}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      status.dataset.state = 'ok';
      status.textContent = 'Thank you — your message is on its way.';
      form.reset();
    } catch (err) {
      status.dataset.state = 'err';
      status.textContent = 'Could not send. Email hello@studio.com instead.';
    } finally {
      if (submit) submit.disabled = false;
    }
  });
}
