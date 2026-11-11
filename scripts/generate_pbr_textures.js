const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const TEXTURES_DIR = path.join(__dirname, '../apps/web/public/textures');
if (!fs.existsSync(TEXTURES_DIR)) {
  fs.mkdirSync(TEXTURES_DIR, { recursive: true });
}

// 1. Generate Leather Normal Map & Roughness Map (1024x1024)
async function generateLeatherTextures() {
  const size = 1024;
  const normalBuf = Buffer.alloc(size * size * 3);
  const roughBuf = Buffer.alloc(size * size);

  // Voronoi-like cellular pebble noise with micro-wrinkle perturbation
  const numSeeds = 320;
  const seeds = [];
  for (let i = 0; i < numSeeds; i++) {
    seeds.push({
      x: Math.random() * size,
      y: Math.random() * size,
      weight: 0.8 + Math.random() * 0.4
    });
  }

  // Precompute height field
  const heightField = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let d1 = 999999;
      let d2 = 999999;
      
      // Tile-aware distance checking
      for (let s = 0; s < numSeeds; s++) {
        const seed = seeds[s];
        let dx = Math.abs(x - seed.x);
        if (dx > size / 2) dx = size - dx;
        let dy = Math.abs(y - seed.y);
        if (dy > size / 2) dy = size - dy;
        const d = (dx * dx + dy * dy) * seed.weight;
        if (d < d1) {
          d2 = d1;
          d1 = d;
        } else if (d < d2) {
          d2 = d;
        }
      }
      
      const f1 = Math.sqrt(d1);
      const f2 = Math.sqrt(d2);
      // Cellular boundary: f2 - f1
      const cellEdge = Math.max(0, Math.min(1, (f2 - f1) / 14));
      // Dome curvature inside cell
      const dome = Math.sin(Math.min(1, cellEdge) * Math.PI * 0.5);
      
      // Micro-grain noise
      const micro = ((Math.sin(x * 0.45) * Math.cos(y * 0.45) + Math.sin(x * 0.9 + y * 0.7)) * 0.5 + 0.5) * 0.08;
      
      heightField[y * size + x] = dome * 0.85 + micro;
    }
  }

  // Compute normals from height field
  for (let y = 0; y < size; y++) {
    const ym1 = (y - 1 + size) % size;
    const yp1 = (y + 1) % size;
    for (let x = 0; x < size; x++) {
      const xm1 = (x - 1 + size) % size;
      const xp1 = (x + 1) % size;

      const dzdx = (heightField[y * size + xp1] - heightField[y * size + xm1]) * 2.2;
      const dzdy = (heightField[yp1 * size + x] - heightField[ym1 * size + x]) * 2.2;

      // Normal vector (-dzdx, -dzdy, 1) normalized
      const mag = Math.sqrt(dzdx * dzdx + dzdy * dzdy + 1.0);
      const nx = -dzdx / mag;
      const ny = -dzdy / mag;
      const nz = 1.0 / mag;

      const idx3 = (y * size + x) * 3;
      normalBuf[idx3 + 0] = Math.round((nx * 0.5 + 0.5) * 255);
      normalBuf[idx3 + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      normalBuf[idx3 + 2] = Math.round((nz * 0.5 + 0.5) * 255);

      // Roughness: grooves are slightly smoother or rougher, dome has tactile finish
      const h = heightField[y * size + x];
      roughBuf[y * size + x] = Math.round(180 + (1 - h) * 45);
    }
  }

  await sharp(normalBuf, { raw: { width: size, height: size, channels: 3 } })
    .png()
    .toFile(path.join(TEXTURES_DIR, 'leather_normal.png'));

  await sharp(roughBuf, { raw: { width: size, height: size, channels: 1 } })
    .png()
    .toFile(path.join(TEXTURES_DIR, 'leather_roughness.png'));

  console.log('✓ Generated leather_normal.png & leather_roughness.png');
}

// 2. Generate Archival Paper Texture (1024x1024)
async function generatePaperTexture() {
  const size = 1024;
  const paperBuf = Buffer.alloc(size * size * 3);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Warm ivory baseline (#F7F4EE: R=247, G=244, B=238)
      // Cotton rag fiber noise
      const n1 = Math.sin(x * 0.22 + y * 0.15) * Math.cos(x * 0.12 - y * 0.28);
      const n2 = Math.sin(x * 0.85) * Math.sin(y * 0.95);
      const fiber = (n1 * 0.6 + n2 * 0.4) * 5;
      
      const r = Math.max(235, Math.min(252, Math.round(247 + fiber)));
      const g = Math.max(232, Math.min(250, Math.round(244 + fiber)));
      const b = Math.max(226, Math.min(245, Math.round(238 + fiber)));

      const idx = (y * size + x) * 3;
      paperBuf[idx + 0] = r;
      paperBuf[idx + 1] = g;
      paperBuf[idx + 2] = b;
    }
  }

  await sharp(paperBuf, { raw: { width: size, height: size, channels: 3 } })
    .png()
    .toFile(path.join(TEXTURES_DIR, 'paper_texture.png'));

  console.log('✓ Generated paper_texture.png');
}

// 3. Generate Fore-Edge Page Block Texture (512x512)
async function generatePageEdgesTexture() {
  const width = 512;
  const height = 512;
  const edgeBuf = Buffer.alloc(width * height * 3);

  for (let y = 0; y < height; y++) {
    // Stratified page layers: alternating paper sheets with fine shadow lines
    const sheetPeriod = 3;
    const sheetPos = y % sheetPeriod;
    const isGutterLine = sheetPos === 0;
    
    // Slight aging gradient toward corners
    const edgeAging = Math.sin((y / height) * Math.PI) * 4;

    for (let x = 0; x < width; x++) {
      const grain = (Math.sin(x * 0.35) + Math.cos(x * 0.8)) * 2;
      let r = 244 - edgeAging + grain;
      let g = 239 - edgeAging + grain;
      let b = 230 - edgeAging * 1.5 + grain;

      if (isGutterLine) {
        // Deep shadow line between leaves
        r -= 28;
        g -= 28;
        b -= 26;
      }

      const idx = (y * width + x) * 3;
      edgeBuf[idx + 0] = Math.max(160, Math.min(255, Math.round(r)));
      edgeBuf[idx + 1] = Math.max(155, Math.min(255, Math.round(g)));
      edgeBuf[idx + 2] = Math.max(145, Math.min(255, Math.round(b)));
    }
  }

  await sharp(edgeBuf, { raw: { width, height, channels: 3 } })
    .png()
    .toFile(path.join(TEXTURES_DIR, 'page_edges.png'));

  console.log('✓ Generated page_edges.png');
}

// 4. Generate Silk Ribbon Texture (512x512)
async function generateRibbonTexture() {
  const size = 512;
  const ribbonBuf = Buffer.alloc(size * size * 3);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Soft Sage base (#849483: R=132, G=148, B=131)
      // Diagonal satin weave (herringbone pattern)
      const diag = (x + y) % 8 < 4 ? 12 : -12;
      const longitudinalShine = Math.sin((x / size) * Math.PI) * 18;

      const r = Math.max(90, Math.min(200, Math.round(132 + diag + longitudinalShine)));
      const g = Math.max(105, Math.min(215, Math.round(148 + diag + longitudinalShine)));
      const b = Math.max(90, Math.min(200, Math.round(131 + diag + longitudinalShine)));

      const idx = (y * size + x) * 3;
      ribbonBuf[idx + 0] = r;
      ribbonBuf[idx + 1] = g;
      ribbonBuf[idx + 2] = b;
    }
  }

  await sharp(ribbonBuf, { raw: { width: size, height: size, channels: 3 } })
    .png()
    .toFile(path.join(TEXTURES_DIR, 'ribbon_texture.png'));

  console.log('✓ Generated ribbon_texture.png');
}

async function main() {
  await generateLeatherTextures();
  await generatePaperTexture();
  await generatePageEdgesTexture();
  await generateRibbonTexture();
  console.log('All PBR textures generated successfully in', TEXTURES_DIR);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
