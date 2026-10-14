const dns = require('node:dns');
dns.setServers(['8.8.8.8']);
require('dotenv').config();
const app = require('./app');
const { connectStore } = require('./store');
const { closeQueue } = require('./queue');
const port = Number(process.env.PORT || 8000);
connectStore().then(() => {
  const server = app.listen(port, () => console.log(`ReplayBox running at http://localhost:${port}`));
  const shutdown = async () => { server.close(); await closeQueue(); process.exit(0); };
  process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
}).catch(error => { console.error('Startup failed:', error.message); process.exit(1); });
