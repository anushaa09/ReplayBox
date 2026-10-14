const mongoose = require('mongoose');
const crypto = require('node:crypto');

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  apiKeyHash: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now }
}, { versionKey: false });
const captureSchema = new mongoose.Schema({
  projectId: { type: String, index: true, required: true },
  fingerprint: { type: String, index: true, required: true },
  method: String, path: String, query: mongoose.Schema.Types.Mixed,
  requestHeaders: mongoose.Schema.Types.Mixed, requestBody: mongoose.Schema.Types.Mixed,
  responseStatus: Number, responseHeaders: mongoose.Schema.Types.Mixed,
  responseBody: mongoose.Schema.Types.Mixed, appVersion: String,
  createdAt: { type: Date, default: Date.now }
}, { versionKey: false });
const replaySchema = new mongoose.Schema({
  projectId: String, captureId: String, status: String, target: String,
  originalStatus: Number, replayStatus: Number, diff: [mongoose.Schema.Types.Mixed],
  durationMs: Number, error: String, createdAt: { type: Date, default: Date.now }, finishedAt: Date
}, { versionKey: false });
const Project = mongoose.models.Project || mongoose.model('Project', projectSchema);
const Capture = mongoose.models.Capture || mongoose.model('Capture', captureSchema);
const Replay = mongoose.models.Replay || mongoose.model('Replay', replaySchema);

const memory = { projects: [], captures: [], replays: [] };
const useMongo = () => mongoose.connection.readyState === 1;
const id = () => crypto.randomUUID();
const plain = (doc) => doc && typeof doc.toObject === 'function' ? doc.toObject() : doc;

async function connectStore() {
  if (process.env.MONGODB_URI) {
    try { await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 4000 }); console.log('Connected to MongoDB'); }
    catch (error) { console.error('MongoDB connection failed:', error.message); throw error; }
  } else console.log('Using in-memory storage (data resets when the server stops).');
}
async function createProject(name, apiKeyHash) {
  const doc = { _id: id(), name, apiKeyHash, createdAt: new Date() };
  if (useMongo()) return plain(await Project.create({ name, apiKeyHash }));
  memory.projects.push(doc); return doc;
}
async function getProjectByHash(hash) {
  if (useMongo()) return plain(await Project.findOne({ apiKeyHash: hash }).lean());
  return memory.projects.find(p => p.apiKeyHash === hash) || null;
}
async function addCapture(data) {
  const doc = { _id: id(), ...data, createdAt: data.createdAt || new Date() };
  if (useMongo()) return plain(await Capture.create(data));
  memory.captures.push(doc); return doc;
}
async function getCapture(projectId, captureId) {
  if (useMongo()) return plain(await Capture.findOne({ _id: captureId, projectId }).lean());
  return memory.captures.find(c => c._id === captureId && c.projectId === projectId) || null;
}
async function listCaptures(projectId, filters = {}) {
  if (useMongo()) {
    const query = { projectId };
    if (filters.method) query.method = filters.method.toUpperCase();
    if (filters.status_gte) query.responseStatus = { $gte: Number(filters.status_gte) };
    if (filters.path_contains) query.path = { $regex: filters.path_contains.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    return (await Capture.find(query).sort({ createdAt: -1 }).skip(Number(filters.offset) || 0).limit(Math.min(Number(filters.limit) || 100, 200)).lean()).map(plain);
  }
  return memory.captures.filter(c => c.projectId === projectId && (!filters.method || c.method === filters.method.toUpperCase()) && (!filters.status_gte || c.responseStatus >= Number(filters.status_gte)) && (!filters.path_contains || c.path.toLowerCase().includes(filters.path_contains.toLowerCase()))).sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt)).slice(Number(filters.offset)||0, (Number(filters.offset)||0) + Math.min(Number(filters.limit)||100,200));
}
async function capturesByFingerprint(projectId, fingerprint) {
  if (useMongo()) return (await Capture.find({ projectId, fingerprint }).sort({ createdAt: 1 }).lean()).map(plain);
  return memory.captures.filter(c => c.projectId === projectId && c.fingerprint === fingerprint).sort((a,b) => new Date(a.createdAt)-new Date(b.createdAt));
}
async function createReplay(data) {
  if (useMongo()) {
    const doc = {
      status: 'queued',
      createdAt: new Date(),
      ...data
    };
    return plain(await Replay.create(doc));
  }

  const doc = {
    _id: id(),
    status: 'queued',
    createdAt: new Date(),
    ...data
  };

  memory.replays.push(doc);
  return doc;
}
async function updateReplay(replayId, patch) {
  if (useMongo()) return plain(await Replay.findByIdAndUpdate(replayId, { $set: patch }, { new: true }).lean());
  const item = memory.replays.find(r => r._id === replayId); if (!item) return null; Object.assign(item, patch); return item;
}
async function getReplay(projectId, replayId) {
  if (useMongo()) return plain(await Replay.findOne({ _id: replayId, projectId }).lean());
  return memory.replays.find(r => r._id === replayId && r.projectId === projectId) || null;
}
async function listReplays(projectId) {
  if (useMongo()) return (await Replay.find({ projectId }).sort({ createdAt: -1 }).limit(100).lean()).map(plain);
  return memory.replays.filter(r => r.projectId === projectId).sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt)).slice(0,100);
}
async function stats(projectId) {
  const [captures, replays] = await Promise.all([listCaptures(projectId, { limit: 200 }), listReplays(projectId)]);
  return { totalCaptures: captures.length, failedRequests: captures.filter(c => c.responseStatus >= 500).length, totalReplays: replays.length, changedReplays: replays.filter(r => r.status === 'completed' && r.diff?.length).length };
}
module.exports = { connectStore, createProject, getProjectByHash, addCapture, getCapture, listCaptures, capturesByFingerprint, createReplay, updateReplay, getReplay, listReplays, stats, id };
