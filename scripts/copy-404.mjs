import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const index = path.join(__dirname, '..', 'dist', 'index.html');
const notFound = path.join(__dirname, '..', 'dist', '404.html');
fs.copyFileSync(index, notFound);
console.log('Copied index.html → 404.html (GitHub Pages SPA)');
