require('dotenv').config();
const baseUrl = process.env.REPLAYBOX_URL || 'http://localhost:8000';
const apiKey = process.argv.find((a, i, all) => all[i - 1] === '--api-key') || process.env.REPLAYBOX_API_KEY;
if (!apiKey) { console.error('Usage: npm run seed -- --api-key rb_YOUR_KEY'); process.exit(1); }
const headers = { 'content-type': 'application/json', 'X-API-Key': apiKey };
async function main() {
  const sharedOrder = { orderId: 'ord_demo_2001', subtotal: 120 };
  const examples = [
    { method: 'GET', path: '/users/150', responseStatus: 200, responseBody: { id: 150, name: 'Demo User', tier: 'global' }, requestBody: null, version: 'v1.0' },
    { method: 'GET', path: '/users/150', responseStatus: 500, responseBody: { error: 'profile service crashed', userId: 150 }, requestBody: null, version: 'v1.1' },
    ...Array.from({ length: 5 }, (_, i) => ({ method: 'POST', path: '/payments', requestBody: { transactionId: `txn_demo_${1000 + i}`, amount: 1000 + i * 250, currency: 'INR' }, responseStatus: 200, responseBody: { transactionId: `txn_demo_${1000 + i}`, status: 'SUCCESS', amount: 1000 + i * 250, fee: Number(((1000 + i * 250) * 0.015).toFixed(2)), currency: 'INR' }, version: 'v1.0' })),
    ...Array.from({ length: 3 }, (_, i) => ({ method: 'POST', path: '/payments', requestBody: { transactionId: `txn_failed_${i}`, amount: 2000 + i * 100, currency: 'INR' }, responseStatus: i === 1 ? 503 : 402, responseBody: { transactionId: `txn_failed_${i}`, status: 'FAILED', error: i === 1 ? 'payment provider unavailable' : 'insufficient funds' }, version: 'v1.0' })),
    { method: 'POST', path: '/orders', requestBody: sharedOrder, responseStatus: 200, responseBody: { subtotal: 120, tax: 21.6, total: 141.6 }, version: 'v1.0' },
    { method: 'POST', path: '/orders', requestBody: sharedOrder, responseStatus: 200, responseBody: { subtotal: 120, tax: 21.12, total: 141.12 }, version: 'v1.1' }
  ];
  for (const item of examples) {
    const payload = { method: item.method, path: item.path, query: {}, requestHeaders: { 'content-type': 'application/json' }, requestBody: item.requestBody, responseStatus: item.responseStatus, responseHeaders: { 'content-type': 'application/json' }, responseBody: item.responseBody, appVersion: item.version };
    const response = await fetch(`${baseUrl}/api/ingest`, { method: 'POST', headers, body: JSON.stringify(payload) });
    const result = await response.json();
    if (!response.ok) throw new Error(`${response.status}: ${JSON.stringify(result)}`);
    console.log(`Recorded ${item.method} ${item.path} (${item.version}) -> ${result.id}`);
    await new Promise(resolve => setTimeout(resolve, 25));
  }
  console.log(`Seeded ${examples.length} demo captures.`);
}
main().catch(err => { console.error(err.message); process.exit(1); });
