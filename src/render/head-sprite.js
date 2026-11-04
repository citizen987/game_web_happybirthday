// Loads the head photo and bakes two small pixel-art sprites (facing right/left):
// progressive halving downscale for quality, hard alpha and a 1px dark outline.
export class HeadSprite {
  constructor(url, config) {
    this.config = config;
    this.width = config.INNER_W + 2;
    this.innerH = Math.round(config.INNER_W * config.SRC.h / config.SRC.w);
    this.right = null;
    this.left = null;
    this.image = null; // original photo, reused for the share card
    const img = new Image();
    img.onload = () => {
      this.image = img;
      this.bake(img);
    };
    img.onerror = () => console.error(`Head sprite could not be loaded from "${url}"`);
    img.src = url;
  }

  get ready() {
    return this.right !== null;
  }

  bake(img) {
    const { SRC, INNER_W } = this.config;
    let cur = document.createElement('canvas');
    cur.width = SRC.w;
    cur.height = SRC.h;
    cur.getContext('2d').drawImage(img, SRC.x, SRC.y, SRC.w, SRC.h, 0, 0, SRC.w, SRC.h);
    let cw = cur.width;
    let ch = cur.height;
    while (cw / 2 > INNER_W) {
      const nw = Math.round(cw / 2);
      const nh = Math.round(ch / 2);
      const next = document.createElement('canvas');
      next.width = nw;
      next.height = nh;
      const nc = next.getContext('2d');
      nc.imageSmoothingEnabled = true;
      nc.imageSmoothingQuality = 'high';
      nc.drawImage(cur, 0, 0, nw, nh);
      cur = next;
      cw = nw;
      ch = nh;
    }
    const out = document.createElement('canvas');
    out.width = this.width;
    out.height = this.innerH + 2;
    const oc = out.getContext('2d');
    oc.imageSmoothingEnabled = true;
    oc.imageSmoothingQuality = 'high';
    oc.drawImage(cur, 1, 1, INNER_W, this.innerH);
    outlineAndHardenAlpha(oc, out.width, out.height);

    const flipped = document.createElement('canvas');
    flipped.width = out.width;
    flipped.height = out.height;
    const fc = flipped.getContext('2d');
    fc.scale(-1, 1);
    fc.drawImage(out, -out.width, 0);
    this.right = out;
    this.left = flipped;
  }
}

function outlineAndHardenAlpha(ctx, W, H) {
  let data;
  try {
    data = ctx.getImageData(0, 0, W, H);
  } catch {
    // Tainted canvas (page opened via file://): keep the soft-edged sprite.
    console.warn('Head sprite outline skipped: serve the game over HTTP for the pixel-art edge');
    return;
  }
  const px = data.data;
  const solid = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) solid[i] = px[i * 4 + 3] > 110 ? 1 : 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (solid[i]) {
        px[i * 4 + 3] = 255;
        continue;
      }
      const edge = (x > 0 && solid[i - 1]) || (x < W - 1 && solid[i + 1]) ||
                   (y > 0 && solid[i - W]) || (y < H - 1 && solid[i + W]);
      if (edge) {
        px[i * 4] = 26; px[i * 4 + 1] = 16; px[i * 4 + 2] = 48; px[i * 4 + 3] = 255;
      } else {
        px[i * 4 + 3] = 0;
      }
    }
  }
  ctx.putImageData(data, 0, 0);
}
