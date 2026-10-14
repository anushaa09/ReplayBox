/**
 * Optional Express capture middleware for a service you own.
 * Install after express.json() so req.body is available.
 * Capture delivery is fire-and-forget; failures never break the user's request.
 */
function replayBoxExpress({ endpoint, apiKey, appVersion = 'dev', sampleRate = 1, timeoutMs = 1200 } = {}) {
  if (!endpoint || !apiKey) throw new Error('ReplayBox middleware requires endpoint and apiKey.');
  const ingestUrl = new URL('/api/ingest', endpoint).toString();
  return function replayBoxCapture(req, res, next) {
    if (Math.random() > Math.max(0, Math.min(1, sampleRate))) return next();
    const startedAt = Date.now();
    const requestHeaders = { ...req.headers };
    const requestBody = req.body ?? null;
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);
    let capturedBody = null;
    let recorded = false;
    const save = () => {
      if (recorded) return;
      recorded = true;
      const payload = {
        method: req.method,
        path: req.path,
        query: req.query,
        requestHeaders,
        requestBody,
        responseStatus: res.statusCode,
        responseHeaders: res.getHeaders(),
        responseBody: capturedBody,
        appVersion,
        durationMs: Date.now() - startedAt
      };
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      fetch(ingestUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'X-API-Key': apiKey },
        body: JSON.stringify(payload),
        signal: controller.signal
      }).catch(() => {}).finally(() => clearTimeout(timer));
    };
    res.json = function (body) { capturedBody = body; return originalJson(body); };
    res.send = function (body) {
      if (capturedBody === null && body !== undefined) {
        if (typeof body === 'string') { try { capturedBody = JSON.parse(body); } catch { capturedBody = body; } }
        else capturedBody = body;
      }
      return originalSend(body);
    };
    res.once('finish', save);
    next();
  };
}
module.exports = { replayBoxExpress };
