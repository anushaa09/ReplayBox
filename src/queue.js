const { Queue } = require('bullmq');
let queue;
function connectionFromUrl(value) {
  const u = new URL(value);
  return { host: u.hostname, port: Number(u.port || 6379), username: u.username || undefined, password: u.password || undefined, db: Number(u.pathname.slice(1) || 0), maxRetriesPerRequest: null, ...(u.protocol === 'rediss:' ? { tls: {} } : {}) };
}
function getQueue() {
  if (!process.env.REDIS_URL) return null;
  if (!queue) queue = new Queue('replay-jobs', { connection: connectionFromUrl(process.env.REDIS_URL) });
  return queue;
}
async function enqueueReplay(data) {
  const q = getQueue();
  if (!q) return false;
  await q.add('replay', data, { jobId: data.replayId, attempts: 2, backoff: { type: 'exponential', delay: 500 }, removeOnComplete: 1000, removeOnFail: 1000 });
  return true;
}
async function closeQueue() { if (queue) await queue.close(); }
module.exports = { enqueueReplay, closeQueue };
