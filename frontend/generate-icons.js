/**
 * Generates icon-192.png and icon-512.png for ArtistStage PWA.
 * No external dependencies — uses only Node built-ins (zlib).
 * Design: #09090B background, pink (#FF007A) microphone.
 */
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

function crc32(buf) {
  const table = (() => {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[i] = c;
    }
    return t;
  })();
  let crc = 0xffffffff;
  for (const byte of buf) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function makePNG(size) {
  const bg = { r: 0x09, g: 0x09, b: 0x0b };
  const pink = { r: 0xff, g: 0x00, b: 0x7a };

  // Draw pixels: dark bg + pink microphone shape
  const pixels = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({ ...bg }))
  );

  const cx = size / 2;

  // Mic body: rounded rectangle
  const mw = Math.round(size * 0.22); // half-width
  const mh = Math.round(size * 0.30); // half-height
  const mt = Math.round(size * 0.14); // top
  const mb = Math.round(size * 0.55); // bottom

  for (let y = mt; y <= mb; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - (mt + mh * 0.5);
      // Rounded rect: ellipse cap on top/bottom, rectangle in middle
      const inBody =
        Math.abs(dx) <= mw &&
        (y >= mt + mw && y <= mb - mw
          ? true
          : (dx * dx + Math.pow(y - (y < (mt + mb) / 2 ? mt + mw : mb - mw), 2)) <=
            mw * mw);
      if (inBody) pixels[y][x] = { ...pink };
    }
  }

  // Mic arc: semicircle below body
  const arcCY = Math.round(size * 0.55);
  const arcR = Math.round(size * 0.28);
  const stroke = Math.max(2, Math.round(size * 0.045));
  for (let y = arcCY - arcR; y <= arcCY; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx, dy = y - arcCY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist >= arcR - stroke && dist <= arcR + stroke && dy <= 0) {
        pixels[y][x] = { ...pink };
      }
    }
  }

  // Stem
  const stemTop = arcCY;
  const stemBot = Math.round(size * 0.82);
  const stemW = Math.max(1, Math.round(size * 0.04));
  for (let y = stemTop; y <= stemBot; y++) {
    for (let x = Math.round(cx - stemW); x <= Math.round(cx + stemW); x++) {
      pixels[y][x] = { ...pink };
    }
  }

  // Base
  const baseW = Math.round(size * 0.22);
  const baseH = Math.max(1, Math.round(size * 0.04));
  for (let y = stemBot; y <= stemBot + baseH; y++) {
    for (let x = Math.round(cx - baseW); x <= Math.round(cx + baseW); x++) {
      if (x >= 0 && x < size && y >= 0 && y < size) pixels[y][x] = { ...pink };
    }
  }

  // Encode raw pixel rows (filter byte 0 = None per row)
  const rawRows = pixels.map(row => {
    const buf = Buffer.alloc(1 + size * 3);
    buf[0] = 0; // filter: None
    row.forEach(({ r, g, b }, i) => {
      buf[1 + i * 3] = r;
      buf[2 + i * 3] = g;
      buf[3 + i * 3] = b;
    });
    return buf;
  });
  const rawData = Buffer.concat(rawRows);
  const compressed = zlib.deflateSync(rawData, { level: 9 });

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const outDir = path.join(__dirname, 'public');
[192, 512].forEach(size => {
  const png = makePNG(size);
  const file = path.join(outDir, `icon-${size}.png`);
  fs.writeFileSync(file, png);
  console.log(`✓ ${file} (${png.length} bytes)`);
});
