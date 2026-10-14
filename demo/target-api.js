require('dotenv').config();
const http = require('node:http');
const port = Number(process.env.PORT || 9000);
const bug = process.env.BUG === '1';
const version = process.env.APP_VERSION || (bug ? 'v1.1' : 'v1.0');
function send(res, status, body) { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); }
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (req.method === 'GET' && url.pathname === '/health') return send(res, 200, { status: 'ok', version });
  if (req.method === 'GET' && url.pathname === '/users/150') return bug ? send(res, 500, { error: 'profile service crashed', userId: 150 }) : send(res, 200, { id: 150, name: 'Demo User', tier: 'global' });
  if (req.method === 'POST' && url.pathname === '/payments') {
    let raw = ''; req.on('data', chunk => raw += chunk); req.on('end', () => {
      let body = {}; try { body = JSON.parse(raw || '{}'); } catch { return send(res, 400, { error: 'Invalid JSON' }); }
      const amount = Number(body.amount);
      if (!Number.isFinite(amount) || amount <= 0) return send(res, 400, { error: 'amount must be a positive number' });
      return send(res, 200, { transactionId: body.transactionId || 'txn_demo_1001', status: 'SUCCESS', amount, fee: bug ? Number((amount * 0.018).toFixed(2)) : Number((amount * 0.015).toFixed(2)), currency: body.currency || 'INR', version });
    }); return;
  }
  if (req.method === 'POST' && url.pathname === '/orders') {
    let raw = ''; req.on('data', chunk => raw += chunk); req.on('end', () => {
      let body = {}; try { body = JSON.parse(raw || '{}'); } catch { return send(res, 400, { error: 'Invalid JSON' }); }
      const subtotal = Number(body.subtotal ?? 120);
      const tax = Number((subtotal * (bug ? 0.176 : 0.18)).toFixed(2));
      return send(res, 200, { subtotal, tax, total: Number((subtotal + tax).toFixed(2)), version });
    }); return;
  }
  return send(res, 404, { error: 'Route not found', path: url.pathname, version });
});
server.listen(port, '0.0.0.0', () => console.log(`Demo target ${version} (${bug ? 'BUGGY' : 'healthy'}) listening on http://localhost:${port}`));
