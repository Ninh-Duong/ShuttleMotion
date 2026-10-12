import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { createLogger } from './logs.mjs';
import { assertNodeVersion, readManifests } from '../scripts/environment.mjs';

const files = {
  '/': ['../frontend/index.html', 'text/html; charset=utf-8'],
  '/site.css': ['../frontend/site.css', 'text/css; charset=utf-8'],
  '/logs.js': ['../frontend/logs.js', 'text/javascript; charset=utf-8'],
  '/dev/logs': ['../frontend/dev-logs.html', 'text/html; charset=utf-8']
};

export async function startServer({ dev = false, host = dev ? '127.0.0.1' : process.env.HOST || '0.0.0.0', port = Number(process.env.PORT || 3000), logger = createLogger({ dev }), setupEvents = [] } = {}) {
  assertNodeVersion();
  readManifests(fileURLToPath(new URL('../', import.meta.url)));
  if (dev && host !== '127.0.0.1' && host !== '::1' && host !== 'localhost') {
    throw new Error('The development logs page requires a loopback host.');
  }
  for (const message of setupEvents) logger.write('info', 'dependency.check', { message });
  const server = createServer(async (req, res) => {
    const started = performance.now();
    const pathname = (req.url || '/').split('?')[0];
    const route = pathname in files || pathname === '/api/health' || pathname === '/__dev/logs' ? pathname : '[unmatched]';
    res.on('finish', () => {
      if (pathname !== '/__dev/logs') logger.write(res.statusCode >= 500 ? 'error' : 'info', 'http.request', {
        method: req.method, route, status: res.statusCode, durationMs: Math.round(performance.now() - started)
      });
    });
    try {
      if (req.method !== 'GET') {
        res.writeHead(405, { Allow: 'GET' }); res.end(); return;
      }
      if (pathname === '/api/health') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end(JSON.stringify({ status: 'ok' })); return;
      }
      if (pathname === '/__dev/logs') {
        if (!dev) { res.writeHead(404); res.end(); return; }
        const query = new URL(req.url, 'http://localhost').searchParams;
        const body = JSON.stringify(logger.recent({ level: query.get('level') || '', search: query.get('search') || '' }));
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end(body); return;
      }
      const file = files[pathname];
      if (!file || (!dev && (pathname === '/dev/logs' || pathname === '/logs.js'))) {
        res.writeHead(404); res.end(); return;
      }
      const body = await readFile(new URL(file[0], import.meta.url));
      res.writeHead(200, { 'Content-Type': file[1], 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      res.end(body);
    } catch (error) {
      logger.write('error', 'server.error', { message: error.code || 'Unexpected server failure' });
      if (!res.headersSent) res.writeHead(500);
      res.end('Internal server error');
    }
  });
  await new Promise((resolveListen, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => { server.off('error', reject); resolveListen(); });
  });
  logger.write('info', 'server.start', { message: `Listening on http://${host}:${server.address().port}` });
  return server;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  startServer().catch(error => { console.error(`Startup failed: ${error.message}`); process.exitCode = 1; });
}
