
require('dotenv').config();

const dns = require('node:dns');
dns.setServers(['8.8.8.8']);

const mongoose = require('mongoose');
const crypto = require('node:crypto');

const store = require('../src/store');

async function main() {
  let projectId;
  let apiKeyHash;

  try {
    await store.connectStore();

    const suffix = crypto.randomUUID();
    apiKeyHash = crypto
      .createHash('sha256')
      .update(suffix)
      .digest('hex');

    // 1. Create and retrieve a temporary project.
    const project = await store.createProject(
      `MongoDB integration test ${suffix}`,
      apiKeyHash
    );

    projectId = String(project._id);

    const foundProject = await store.getProjectByHash(apiKeyHash);
    if (!foundProject) throw new Error('Project retrieval failed');

    console.log('PASS: project create and retrieve');

    // 2. Create and retrieve a capture.
    const capture = await store.addCapture({
      projectId,
      fingerprint: crypto.randomUUID(),
      method: 'GET',
      path: '/mongodb-smoke-test',
      query: {},
      requestHeaders: {},
      requestBody: null,
      responseStatus: 200,
      responseHeaders: {},
      responseBody: { success: true },
      appVersion: 'integration-test'
    });

    const foundCapture = await store.getCapture(
      projectId,
      String(capture._id)
    );

    const listedCaptures = await store.listCaptures(projectId);

    if (!foundCapture || listedCaptures.length === 0) {
      throw new Error('Capture persistence failed');
    }

    console.log('PASS: capture create, retrieve and list');

    // 3. Create, update and retrieve a replay.
    const replay = await store.createReplay({
      projectId,
      captureId: String(capture._id),
      target: 'http://localhost:9000',
      originalStatus: 500
    });

    const updatedReplay = await store.updateReplay(
      String(replay._id),
      {
        status: 'completed',
        replayStatus: 200,
        diff: [],
        finishedAt: new Date()
      }
    );

    const foundReplay = await store.getReplay(
      projectId,
      String(replay._id)
    );

    const listedReplays = await store.listReplays(projectId);

    if (
      !updatedReplay ||
      !foundReplay ||
      foundReplay.status !== 'completed' ||
      listedReplays.length === 0
    ) {
      throw new Error('Replay persistence failed');
    }

    console.log('PASS: replay create, update, retrieve and list');

    // 4. Verify statistics.
    const result = await store.stats(projectId);

    if (result.totalCaptures < 1 || result.totalReplays < 1) {
      throw new Error('Statistics verification failed');
    }

    console.log('PASS: project statistics');
    console.log('\nAll MongoDB integration checks passed.');
  } catch (error) {
    console.error('\nMongoDB integration test failed:', error.message);
    process.exitCode = 1;
  } finally {
    // Remove only this test's records.
    try {
      if (projectId && mongoose.connection.readyState === 1) {
        await mongoose.connection.collection('captures')
          .deleteMany({ projectId });
        await mongoose.connection.collection('replays')
          .deleteMany({ projectId });
      }

      if (apiKeyHash && mongoose.connection.readyState === 1) {
        await mongoose.connection.collection('projects')
          .deleteOne({ apiKeyHash });
      }
    } catch (cleanupError) {
      console.error('Test cleanup failed:', cleanupError.message);
      process.exitCode = 1;
    }

    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

main();
