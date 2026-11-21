
export async function listRsvps(since) {
  const token = await accessToken();
  const project = encodeURIComponent(process.env.FIREBASE_PROJECT_ID);
  const endpoint = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents:runQuery`;
  const structuredQuery = {
    from: [{ collectionId: 'rsvps' }],
    orderBy: [{ field: { fieldPath: 'receivedAt' }, direction: 'ASCENDING' }],
    limit: 1000
  };
  if (since) {
    structuredQuery.where = {
      fieldFilter: { field: { fieldPath: 'receivedAt' }, op: 'GREATER_THAN', value: { timestampValue: since } }
    };
  }
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredQuery }),
    signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) throw new Error('Firebase read failed');
  const rows = await response.json();
  return rows.filter(row => row.document).map(({ document }) => {
    const f = document.fields || {};
    return {
      id: document.name.split('/').pop(),
      name: f.name?.stringValue || '',
      attendance: f.attendance?.stringValue || 'note',
      guests: Number(f.guests?.integerValue || 0),
      message: f.message?.stringValue || '',
      receivedAt: f.receivedAt?.timestampValue || ''
    };
  });
}
