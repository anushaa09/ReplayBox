const test = require('node:test');
const assert = require('node:assert/strict');
const { sanitize, sanitizeHeaders } = require('../src/services/sanitize');
const { compareValues, responseDiff, fingerprint } = require('../src/services/diff');
const { validateTarget } = require('../src/services/replay');

test('sanitizer redacts secret fields and email addresses', () => {
  const result = sanitize({ password: 'letmein', email: 'person@example.com', nested: { access_token: 'abc' }, amount: 120 });
  assert.equal(result.password, '[REDACTED]');
  assert.equal(result.email, '[REDACTED_EMAIL]');
  assert.equal(result.nested.access_token, '[REDACTED]');
  assert.equal(result.amount, 120);
});
test('sanitizer redacts sensitive headers', () => {
  const result = sanitizeHeaders({ Authorization: 'Bearer abc', 'content-type': 'application/json' });
  assert.equal(result.authorization, '[REDACTED]');
  assert.equal(result['content-type'], 'application/json');
});
test('JSON diff identifies changed and added values', () => {
  const diff = compareValues({ total: 141.6 }, { total: 141.12, status: 'SUCCESS' });
  assert.deepEqual(diff.map(x => [x.path, x.type]), [['$.status', 'added'], ['$.total', 'changed']]);
});
test('response diff includes HTTP status changes', () => {
  const diff = responseDiff(500, { error: 'failed' }, 200, { status: 'ok' });
  assert.equal(diff[0].path, '$.status');
  assert.equal(diff[0].before, 500);
  assert.equal(diff[0].after, 200);
});
test('fingerprints are stable for object key ordering', () => {
  const a = fingerprint({ method: 'post', path: '/payments', requestBody: { amount: 10, currency: 'INR' } });
  const b = fingerprint({ method: 'POST', path: '/payments', requestBody: { currency: 'INR', amount: 10 } });
  assert.equal(a, b);
});
test('replay target rejects unapproved hosts', () => {
  process.env.REPLAY_ALLOWED_HOSTS = 'localhost,127.0.0.1';
  assert.throws(() => validateTarget('http://example.com'), /not allowed/);
  assert.equal(validateTarget('http://localhost:9000').hostname, 'localhost');
});
