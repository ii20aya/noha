import { createHash, timingSafeEqual } from 'node:crypto';
import { firestoreConfigured, listRsvps } from '../scripts/firestore.js';

const digest = value => createHash('sha256').update(String(value)).digest();

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false });
  }
  const password = process.env.ADMIN_PASSWORD;
  if (!password || !firestoreConfigured()) return res.status(503).json({ ok: false });

  const given = (req.headers.authorization || '').replace(/^Bearer /, '');
  if (!timingSafeEqual(digest(given), digest(password))) return res.status(401).json({ ok: false });

  const since = typeof req.query?.since === 'string' && /^\d{4}-\d\d-\d\dT[\d:.]+Z$/.test(req.query.since)
    ? req.query.since
    : undefined;
  try {
    return res.status(200).json({ ok: true, items: await listRsvps(since) });
  } catch {
    return res.status(502).json({ ok: false });
  }
}
