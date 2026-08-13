import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function jpegSize(buf) {
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = buf[i + 1];
    if (marker === 0xc0 || marker === 0xc2 || marker === 0xc1) {
      return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    }
    const len = buf.readUInt16BE(i + 2);
    i += 2 + len;
  }
  return null;
}

for (let i = 1; i <= 9; i++) {
  const f = path.join(__dirname, '..', 'public/netcard/templates-data', `template${i}.js`);
  const code = fs.readFileSync(f, 'utf8');
  const m = code.match(/window\.__tplChunk\s*=\s*"([^"]+)"/);
  if (!m) {
    console.log(`template${i} no match`);
    continue;
  }
  const b64 = m[1].replace(/^data:image\/[^;]+;base64,/, '');
  const full = Buffer.from(b64, 'base64');
  const size = jpegSize(full);
  console.log(`template${i}`, size ? `${size.w}x${size.h}` : 'unknown');
}
