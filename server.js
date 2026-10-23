import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 5173);
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.jpeg':'image/jpeg','.jpg':'image/jpeg','.png':'image/png','.mp4':'video/mp4','.svg':'image/svg+xml','.ico':'image/x-icon'};

function resolveFile(urlPath) {
  const clean = urlPath.split('?')[0];

  // Serve the main document.
  if (clean === '/' || clean === '/index.html') {
    return path.join(__dirname, 'index.html');
  }

  // Backward-compatible aliases for deployments/index pages requesting
  // these files from the site root instead of /src/.
  if (clean === '/main.js') return path.join(__dirname, 'src', 'main.js');
  if (clean === '/style.css') return path.join(__dirname, 'src', 'style.css');

  // Static assets live in public/assets.
  if (clean.startsWith('/assets/')) {
    return path.join(__dirname, 'public', clean.slice(1));
  }

  // Source files and other project-root files.
  return path.join(__dirname, clean.slice(1));
}

const server = http.createServer((req, res) => {
  let urlPath;
  try { urlPath = decodeURIComponent((req.url || '/').split('?')[0]); }
  catch { res.writeHead(400); return res.end('Bad request'); }

  const filePath = path.normalize(resolveFile(urlPath));
  if (!filePath.startsWith(__dirname)) { res.writeHead(403); return res.end('Forbidden'); }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) { res.writeHead(404); return res.end('Not found'); }
    const ext = path.extname(filePath).toLowerCase();
    const type = mime[ext] || 'application/octet-stream';
    const headers = {'Content-Type': type, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache'};
    const range = req.headers.range;

    if (range && ext === '.mp4') {
      const match = range.match(/bytes=(\d+)-(\d*)/);
      if (match) {
        const start = Number(match[1]);
        const end = match[2] ? Math.min(Number(match[2]), stat.size - 1) : stat.size - 1;
        if (start <= end && start < stat.size) {
          headers['Content-Range'] = `bytes ${start}-${end}/${stat.size}`;
          headers['Content-Length'] = end - start + 1;
          res.writeHead(206, headers);
          return fs.createReadStream(filePath, {start, end}).pipe(res);
        }
      }
    }

    headers['Content-Length'] = stat.size;
    res.writeHead(200, headers);
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(port, '0.0.0.0', () => console.log(`Smart Traffic Controller running on http://localhost:${port}`));
