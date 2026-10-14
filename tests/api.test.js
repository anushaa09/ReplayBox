process.env.ADMIN_TOKEN = 'test-admin-token';
process.env.MONGODB_URI = '';
process.env.REDIS_URL = '';
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');

test('project creation requires admin token and returns one-time API key', async () => {
  const denied = await request(app).post('/api/projects').set('X-Admin-Token', 'wrong').send({ name: 'Test' });
  assert.equal(denied.status, 401);
  const created = await request(app).post('/api/projects').set('X-Admin-Token', 'test-admin-token').send({ name: 'Payments Test' });
  assert.equal(created.status, 201);
  assert.match(created.body.apiKey, /^rb_/);
  const me = await request(app).get('/api/projects/me').set('X-API-Key', created.body.apiKey);
  assert.equal(me.status, 200);
  assert.equal(me.body.name, 'Payments Test');
});
test('ingest validates path and stores a sanitised capture', async () => {
  const created = await request(app).post('/api/projects').set('X-Admin-Token', 'test-admin-token').send({ name: 'Capture Test' });
  const key = created.body.apiKey;
  const invalid = await request(app).post('/api/ingest').set('X-API-Key', key).send({ method: 'POST', path: 'payments' });
  assert.equal(invalid.status, 400);
  const result = await request(app).post('/api/ingest').set('X-API-Key', key).send({ method: 'POST', path: '/payments', requestBody: { password: 'do-not-store', amount: 100 }, responseStatus: 200, responseBody: { status: 'SUCCESS' }, appVersion: 'v1.0' });
  assert.equal(result.status, 201);
  const list = await request(app).get('/api/captures').set('X-API-Key', key);
  assert.equal(list.status, 200);
  assert.equal(list.body[0].requestBody.password, '[REDACTED]');
});
