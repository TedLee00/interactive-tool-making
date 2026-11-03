// 캐릭터 그림 불러오기: public/assets/characters/<id>.svg (같은 이름의 PNG/SVG로 바꾸면 교체됨)
// - 여백을 잘라 내고 (trim)
// - 3D 스탠디용 "스티커" 텍스처 (흰 테두리)와
// - 말풍선·카드용 얼굴 확대 그림을 만든다.

const BASE = import.meta.env.BASE_URL;
export const charURL = (id) => `${BASE}assets/characters/${id}.svg`;
const cache = new Map();

function loadImage(src) {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = src;
  });
}

/** SVG의 바닥 그림자(첫 rgba 타원)를 빼고 이미지로 */
async function svgImage(id) {
  const txt = await (await fetch(charURL(id))).text();
  const clean = txt.replace(/<ellipse[^>]*fill="rgba\([^)]*\)"\s*\/>/, '');
  const vb = /viewBox="([^"]+)"/.exec(clean)[1].split(/\s+/).map(Number);
  const W = 720;
  const H = Math.round((W * vb[3]) / vb[2]);
  const sized = clean.replace('<svg ', `<svg width="${W}" height="${H}" `);
  return loadImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(sized));
}

function trimCanvas(img) {
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const x = c.getContext('2d');
  x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height).data;
  let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0;
  for (let y = 0; y < c.height; y++) {
    for (let i = 0; i < c.width; i++) {
      if (d[(y * c.width + i) * 4 + 3] > 8) {
        if (i < x0) x0 = i; if (i > x1) x1 = i;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;
  const t = document.createElement('canvas');
  t.width = w; t.height = h;
  t.getContext('2d').drawImage(c, x0, y0, w, h, 0, 0, w, h);
  return t;
}

/** 흰 스티커 테두리 */
function sticker(src, pad = 16) {
  const c = document.createElement('canvas');
  c.width = src.width + pad * 2;
  c.height = src.height + pad * 2;
  const x = c.getContext('2d');
  const sil = document.createElement('canvas');
  sil.width = src.width; sil.height = src.height;
  const sx = sil.getContext('2d');
  sx.drawImage(src, 0, 0);
  sx.globalCompositeOperation = 'source-in';
  sx.fillStyle = '#ffffff';
  sx.fillRect(0, 0, sil.width, sil.height);
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 12) x.drawImage(sil, pad + Math.cos(a) * pad * 0.8, pad + Math.sin(a) * pad * 0.8);
  x.shadowColor = 'rgba(13,33,68,.25)';
  x.drawImage(src, pad, pad);
  return c;
}

/** @returns {Promise<{full: HTMLCanvasElement, sticker: HTMLCanvasElement, face: string}>} */
export function loadChar(id) {
  if (!cache.has(id)) {
    cache.set(id, (async () => {
      const img = await svgImage(id);
      const full = trimCanvas(img);
      const st = sticker(full);
      // 얼굴: 위쪽에서 가로폭 기준 정사각형
      const f = document.createElement('canvas');
      const side = Math.min(full.width, Math.round(full.height * 0.42));
      f.width = 256; f.height = 256;
      const fx = f.getContext('2d');
      const sx = (full.width - side) / 2;
      fx.drawImage(full, sx, 0, side, side, 0, 0, 256, 256);
      return { full, sticker: st, face: f.toDataURL('image/png') };
    })());
  }
  return cache.get(id);
}

/** <img data-face="id"> 를 얼굴 그림으로 채운다 */
export function fillFaces(root = document) {
  root.querySelectorAll('img[data-face]').forEach((im) => {
    loadChar(im.dataset.face).then((a) => { im.src = a.face; }).catch(() => {});
  });
}
