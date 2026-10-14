const express = require('express');
const crypto = require('node:crypto');
const store = require('../store');
const { sanitize, sanitizeHeaders } = require('../services/sanitize');
const { fingerprint } = require('../services/diff');
const { executeReplay } = require('../services/replay');
const { enqueueReplay } = require('../queue');
const router = express.Router();
const hashKey = key => crypto.createHash('sha256').update(key).digest('hex');

async function requireApiKey(req, res, next) {
  const key = req.get('X-API-Key');
  if (!key) return res.status(401).json({ error: 'Missing X-API-Key header.' });
  const project = await store.getProjectByHash(hashKey(key));
  if (!project) return res.status(401).json({ error: 'Invalid API key.' });
  req.project = project; next();
}
function asyncRoute(fn) { return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next); }

router.post('/projects', asyncRoute(async (req, res) => {
  const supplied = req.get('X-Admin-Token') || req.body.adminToken;
  if (!process.env.ADMIN_TOKEN || supplied !== process.env.ADMIN_TOKEN) return res.status(401).json({ error: 'Invalid admin token.' });
  const name = String(req.body.name || '').trim().slice(0, 100);
  if (!name) return res.status(400).json({ error: 'Project name is required.' });
  const apiKey = `rb_${crypto.randomBytes(24).toString('hex')}`;
  const project = await store.createProject(name, hashKey(apiKey));
  res.status(201).json({ project: { id: String(project._id), name: project.name }, apiKey, warning: 'Copy this key now. It is only shown once.' });
}));
router.get('/projects/me', requireApiKey, (req, res) => res.json({ id: String(req.project._id), name: req.project.name }));
router.post('/ingest', requireApiKey, asyncRoute(async (req, res) => {
  const b = req.body || {};
  const method = String(b.method || '').toUpperCase();
  const path = String(b.path || '');
  if (!/^(GET|POST|PUT|PATCH|DELETE|HEAD)$/.test(method)) return res.status(400).json({ error: 'Unsupported HTTP method.' });
  if (!path.startsWith('/') || path.length > 2048) return res.status(400).json({ error: 'path must start with / and be under 2048 characters.' });
  const maxBytes = Number(process.env.MAX_CAPTURE_BYTES || 100000);
  if (Buffer.byteLength(JSON.stringify(b)) > maxBytes) return res.status(413).json({ error: `Capture exceeds ${maxBytes} bytes.` });
  const requestBody = sanitize(b.requestBody ?? null);
  const responseBody = sanitize(b.responseBody ?? null);
  const safe = { projectId: String(req.project._id), method, path, query: sanitize(b.query || {}), requestHeaders: sanitizeHeaders(b.requestHeaders || {}), requestBody, responseStatus: Math.max(100, Math.min(599, Number(b.responseStatus) || 200)), responseHeaders: sanitizeHeaders(b.responseHeaders || {}), responseBody, appVersion: String(b.appVersion || 'unknown').slice(0, 100) };
  safe.fingerprint = fingerprint({ method, path, query: safe.query, requestBody });
  const capture = await store.addCapture(safe);
  res.status(201).json({ id: String(capture._id), fingerprint: capture.fingerprint, redacted: true });
}));
router.get('/captures', requireApiKey, asyncRoute(async (req, res) => {
  res.json(await store.listCaptures(String(req.project._id), req.query));
}));
router.get('/captures/:id/regression', requireApiKey, asyncRoute(async (req, res) => {
  const capture = await store.getCapture(String(req.project._id), req.params.id);
  if (!capture) return res.status(404).json({ error: 'Capture not found.' });
  const history = await store.capturesByFingerprint(String(req.project._id), capture.fingerprint);
  const baseline = history[0];
  let firstChanged = null;
  for (const item of history.slice(1)) {
    const changed = item.responseStatus !== baseline.responseStatus || JSON.stringify(item.responseBody) !== JSON.stringify(baseline.responseBody);
    if (changed) { firstChanged = item; break; }
  }
  res.json({ fingerprint: capture.fingerprint, versions: history.map(h => ({ id: String(h._id), version: h.appVersion, status: h.responseStatus, createdAt: h.createdAt })), baselineVersion: baseline?.appVersion || null, firstChangedVersion: firstChanged?.appVersion || null, message: firstChanged ? `Behaviour first changed in ${firstChanged.appVersion}.` : 'No change detected against the earliest recorded response.' });
}));
router.get('/captures/:id', requireApiKey, asyncRoute(async (req, res) => {
  const capture = await store.getCapture(String(req.project._id), req.params.id);
  if (!capture) return res.status(404).json({ error: 'Capture not found.' });
  res.json(capture);
}));
router.post('/captures/:id/replay', requireApiKey, asyncRoute(async (req, res) => {
  const capture = await store.getCapture(String(req.project._id), req.params.id);
  if (!capture) return res.status(404).json({ error: 'Capture not found.' });
  const targetUrl = String(req.body.targetUrl || 'http://localhost:9000');
  const replay = await store.createReplay({ projectId: String(req.project._id), captureId: String(capture._id), target: targetUrl, originalStatus: capture.responseStatus, status: 'queued' });
  const jobData = { projectId: String(req.project._id), replayId: String(replay._id), captureId: String(capture._id), targetUrl, headerOverrides: req.body.headerOverrides || {} };
  try {
    const queued = await enqueueReplay(jobData);
    if (queued) return res.status(202).json({ replayId: String(replay._id), status: 'queued', message: 'Replay added to Redis queue.' });
    const result = await executeReplay({ projectId: jobData.projectId, replayId: jobData.replayId, capture, targetUrl, headerOverrides: jobData.headerOverrides });
    return res.status(200).json(result);
  } catch (error) {
    await store.updateReplay(String(replay._id), { status: 'failed', error: error.message, finishedAt: new Date() });
    return res.status(500).json({ error: 'Could not start replay.', detail: error.message });
  }
}));
router.get('/replays', requireApiKey, asyncRoute(async (req, res) => res.json(await store.listReplays(String(req.project._id)))));
router.get('/replays/:id', requireApiKey, asyncRoute(async (req, res) => {
  const replay = await store.getReplay(String(req.project._id), req.params.id);
  if (!replay) return res.status(404).json({ error: 'Replay not found.' });
  res.json(replay);
}));
router.get('/stats', requireApiKey, asyncRoute(async (req, res) => res.json(await store.stats(String(req.project._id)))));
module.exports = router;
