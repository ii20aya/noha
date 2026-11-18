import { createSign } from 'node:crypto';

let cachedToken;
let expiresAt = 0;

export function firestoreConfigured() {
  return Boolean(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY);
}

async function accessToken() {
  if (cachedToken && Date.now() < expiresAt) return cachedToken;
  const now = Math.floor(Date.now() / 1000);
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const payload = encode({ alg: 'RS256', typ: 'JWT' }) + '.' + encode({
    iss: process.env.FIREBASE_CLIENT_EMAIL,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  });
  const signer = createSign('RSA-SHA256');
  signer.update(payload);
  const signature = signer.sign(process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'), 'base64url');
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: payload + '.' + signature }),
    signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) throw new Error('Firebase authentication failed');
  const token = await response.json();
  if (!token.access_token) throw new Error('Firebase token missing');
  cachedToken = token.access_token;
  expiresAt = Date.now() + (Number(token.expires_in || 3600) - 120) * 1000;
  return cachedToken;
}

export async function saveRsvp(data) {
  const token = await accessToken();
  const project = encodeURIComponent(process.env.FIREBASE_PROJECT_ID);
  const endpoint = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/rsvps?documentId=${encodeURIComponent(data.id)}`;
  const fields = {
    name: { stringValue: data.name.trim() },
    attendance: { stringValue: data.attendance },
    guests: { integerValue: String(data.guests) },
    message: { stringValue: data.message.trim() },
    receivedAt: { timestampValue: new Date().toISOString() }
  };
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
    signal: AbortSignal.timeout(8000)
  });
  // Retries keep the first submission and its original timestamp.
  if (response.status === 409) return;
  if (!response.ok) throw new Error('Firebase write failed');
}
