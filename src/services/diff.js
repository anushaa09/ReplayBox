function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k => [k, stable(value[k])]));
  return value;
}
function compareValues(before, after, path = '$', out = []) {
  if (before === undefined) { out.push({ path, type: 'added', before: null, after }); return out; }
  if (after === undefined) { out.push({ path, type: 'removed', before, after: null }); return out; }
  const beforeObject = before !== null && typeof before === 'object';
  const afterObject = after !== null && typeof after === 'object';
  if (beforeObject !== afterObject || (before !== null && after !== null && Array.isArray(before) !== Array.isArray(after))) {
    out.push({ path, type: 'type_changed', before, after }); return out;
  }
  if (beforeObject && afterObject) {
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    for (const key of [...keys].sort()) compareValues(before[key], after[key], Array.isArray(before) ? `${path}[${key}]` : `${path}.${key}`, out);
    return out;
  }
  if (before !== after) out.push({ path, type: 'changed', before, after });
  return out;
}
function responseDiff(originalStatus, originalBody, replayStatus, replayBody) {
  const changes = [];
  if (originalStatus !== replayStatus) changes.push({ path: '$.status', type: 'changed', before: originalStatus, after: replayStatus });
  compareValues(stable(originalBody), stable(replayBody), '$', changes);
  return changes;
}
function fingerprint({ method, path, query = {}, requestBody = null }) {
  const crypto = require('node:crypto');
  const canonical = v => v && typeof v === 'object' ? (Array.isArray(v) ? v.map(canonical) : Object.fromEntries(Object.keys(v).sort().map(k => [k, canonical(v[k])]))) : v;
  return crypto.createHash('sha256').update(JSON.stringify({ method: method.toUpperCase(), path, query: canonical(query), requestBody: canonical(requestBody) })).digest('hex');
}
module.exports = { compareValues, responseDiff, fingerprint };
