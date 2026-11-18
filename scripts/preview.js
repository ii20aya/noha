import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import handler from '../api/rsvp.js';

const types = { html: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8', js: 'text/javascript; charset=utf-8', jpg: 'image/jpeg', png: 'image/png', svg: 'image/svg+xml', mp4: 'audio/mp4', mp3: 'audio/mpeg', ogg: 'audio/ogg', webm: 'video/webm', webp: 'image/webp' };

createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname === '/api/rsvp') {
    res.status = status => { res.statusCode = status; return res; };
    res.json = body => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(body));
    };
    if (req.method === 'POST') {
      let body = '';
      for await (const chunk of req) {
        body += chunk;
        if (body.length > 8192) return res.status(413).json({ ok: false });
      }
      try { req.body = JSON.parse(body); } catch { return res.status(400).json({ ok: false }); }
    }
    return handler(req, res);
  }
  const asset = pathname === '/' ? '/index.html' : pathname;
  if (!/^\/(?:index\.html|(?:src|assets)\/[\w./-]+)$/.test(asset) || asset.includes('..')) {
    res.writeHead(404).end();
    return;
  }
  try {
    const data = await readFile('dist' + asset);
    res.setHeader('Content-Type', types[asset.split('.').at(-1)] || 'application/octet-stream');
    res.end(data);
  } catch {
    res.writeHead(404).end();
  }
}).listen(4173, '127.0.0.1', () => console.log('Invitation preview: http://localhost:4173'));




