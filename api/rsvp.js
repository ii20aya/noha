import { wedding } from '../src/content.js';
import { firestoreConfigured, saveRsvp } from '../scripts/firestore.js';

export default async function handler(req, res) {
  const endpoint = process.env.RSVP_SCRIPT_URL;
  const secret = process.env.RSVP_SCRIPT_SECRET;
  const firebase = firestoreConfigured();
  const configured = firebase || Boolean(endpoint && secret);
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'GET') return res.status(200).json({ configured });
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok: false });
  }
  if (!configured) return res.status(503).json({ ok: false });

  const { id, name, attendance, guests, message } = req.body || {};
  if (typeof id !== 'string' || !/^[a-f0-9-]{36}$/i.test(id) ||
      typeof name !== 'string' || !name.trim() || name.length > 120 ||
      !['yes', 'no', 'note'].includes(attendance) ||
      !Number.isInteger(guests) || guests < 0 || guests > wedding.maxGuests ||
      (attendance !== 'yes' && guests !== 0) ||
      typeof message !== 'string' || message.length > 500 || (attendance === 'note' && !message.trim())) {
    return res.status(400).json({ ok: false });
  }

  try {
    if (firebase) {
      await saveRsvp({ id, name, attendance, guests, message });
      return res.status(200).json({ ok: true });
    }
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name, attendance, guests, message, secret }),
      signal: AbortSignal.timeout(9000)
    });
    if (!response.ok || !(await response.json()).ok) throw new Error('Sheet write failed');
    return res.status(200).json({ ok: true });
   } catch (error) {
    console.error('rsvp failed:', error.message);
    return res.status(502).json({ ok: false });
  }
}


