import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(__dirname, '..', 'dist');
const index = path.join(dist, 'index.html');

if (!fs.existsSync(index)) {
  console.error('❌ dist/index.html missing — run vite build first');
  process.exit(1);
}

fs.copyFileSync(index, path.join(dist, '404.html'));

/** مسارات SPA — تعمل حتى بدون _redirects على Netlify */
const spaPaths = ['design', 'login'];
for (const segment of spaPaths) {
  const dir = path.join(dist, segment);
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(index, path.join(dir, 'index.html'));
}

const redirects = path.join(dist, '_redirects');
if (!fs.existsSync(redirects)) {
  fs.writeFileSync(redirects, '/*    /index.html   200\n', 'utf8');
}

console.log('SPA fallbacks: 404.html, design/index.html, login/index.html, _redirects');
