require('dotenv').config();
const { Worker } = require('bullmq');
const store = require('./store');
const { executeReplay } = require('./services/replay');
const connectionFromUrl = value => {
  const u = new URL(value);
  return { host: u.hostname, port: Number(u.port || 6379), username: u.username || undefined, password: u.password || undefined, db: Number(u.pathname.slice(1) || 0), maxRetriesPerRequest: null, ...(u.protocol === 'rediss:' ? { tls: {} } : {}) };
};
async function main() {
  if (!process.env.REDIS_URL) throw new Error('REDIS_URL is required to run the worker.');
  await store.connectStore();
  const worker = new Worker('replay-jobs', async job => {
    const capture = await store.getCapture(job.data.projectId, job.data.captureId);
    if (!capture) { await store.updateReplay(job.data.replayId, { status: 'failed', error: 'Capture not found.', finishedAt: new Date() }); return; }
    return executeReplay({ ...job.data, capture });
  }, { connection: connectionFromUrl(process.env.REDIS_URL), concurrency: 5 });
  worker.on('failed', (job, err) => console.error(`Replay job ${job?.id} failed:`, err.message));
  console.log('ReplayBox worker listening for jobs.');
}
main().catch(err => { console.error(err); process.exit(1); });
