'use strict';
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const files = new Map([['/', ['index.html', 'text/html; charset=utf-8']], ['/index.html', ['index.html', 'text/html; charset=utf-8']], ['/app.js', ['app.js', 'text/javascript; charset=utf-8']], ['/engine.js', ['engine.js', 'text/javascript; charset=utf-8']], ['/style.css', ['style.css', 'text/css; charset=utf-8']], ['/icon.svg', ['icon.svg', 'image/svg+xml']]]);
const port = Number(process.env.PORT || 4317);
const server = http.createServer((req, res) => {
  const entry = files.get(req.url?.split('?')[0]);
  if (!entry || !['GET', 'HEAD'].includes(req.method)) { res.writeHead(404); res.end('Not found'); return; }
  res.writeHead(200, { 'Content-Type': entry[1], 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' });
  if (req.method === 'HEAD') res.end(); else fs.createReadStream(path.join(root, entry[0])).pipe(res);
});
server.listen(port, '127.0.0.1', () => console.log(`Guildkit: http://127.0.0.1:${port}`));
server.on('error', () => { console.error('Could not start local preview. Choose an available PORT.'); process.exitCode = 1; });
