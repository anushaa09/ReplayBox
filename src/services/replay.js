const store = require('../store');
const { responseDiff } = require('./diff');
const { sanitize, sanitizeHeaders } = require('./sanitize');

function validateTarget(targetUrl) {
  let parsed;
  try { parsed = new URL(targetUrl); } catch { throw new Error('Target must be a valid URL.'); }
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Only HTTP and HTTPS targets are allowed.');
  const allowed = (process.env.REPLAY_ALLOWED_HOSTS || 'localhost,127.0.0.1').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  if (!allowed.includes(parsed.hostname.toLowerCase())) throw new Error(`Target host "${parsed.hostname}" is not allowed. Update REPLAY_ALLOWED_HOSTS for your local test host.`);
  if (parsed.username || parsed.password) throw new Error('Credentials in target URLs are not allowed.');
  return parsed;
}
async function executeReplay({ projectId, replayId, capture, targetUrl, headerOverrides = {} }) {
  const started = Date.now();
  try {
    const base = validateTarget(targetUrl);
    const path = capture.path.startsWith('/') ? capture.path : `/${capture.path}`;
    const url = new URL(path, base);
    for (const [key, value] of Object.entries(capture.query || {})) if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
    const headers = {};
    for (const [key, value] of Object.entries(capture.requestHeaders || {})) {
      if (/^(authorization|cookie|set-cookie|proxy-authorization|x-api-key|host|content-length)$/i.test(key)) continue;
      if (value !== '[REDACTED]') headers[key] = String(value);
    }
    for (const [key, value] of Object.entries(headerOverrides)) {
      if (/^(host|content-length|cookie|set-cookie)$/i.test(key)) continue;
      headers[key] = String(value);
    }
    let body;
    if (!['GET', 'HEAD'].includes(capture.method.toUpperCase()) && capture.requestBody !== undefined && capture.requestBody !== null) {
      body = JSON.stringify(capture.requestBody); if (!Object.keys(headers).some(k => k.toLowerCase() === 'content-type')) headers['content-type'] = 'application/json';
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    let response;
    try { response = await fetch(url, { method: capture.method.toUpperCase(), headers, body, redirect: 'error', signal: controller.signal }); }
    finally { clearTimeout(timeout); }
    const raw = await response.text();
    let responseBody;
    try { responseBody = raw ? JSON.parse(raw) : null; } catch { responseBody = raw; }
    responseBody = sanitize(responseBody);
    const diff = responseDiff(capture.responseStatus, capture.responseBody, response.status, responseBody);
    return await store.updateReplay(replayId, { status: 'completed', target: `${base.origin}`, originalStatus: capture.responseStatus, replayStatus: response.status, diff, durationMs: Date.now() - started, responseBody, responseHeaders: sanitizeHeaders(Object.fromEntries(response.headers.entries())), finishedAt: new Date() });
  } catch (error) {
    return await store.updateReplay(replayId, { status: 'failed', target: targetUrl, originalStatus: capture.responseStatus, durationMs: Date.now() - started, error: error.name === 'AbortError' ? 'Target request timed out after 8 seconds.' : error.message, diff: [], finishedAt: new Date() });
  }
}
module.exports = { executeReplay, validateTarget };
