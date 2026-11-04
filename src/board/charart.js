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
const svgText = new Map();
async function svgImage(id, pose = null) {
  if (!svgText.has(id)) svgText.set(id, fetch(charURL(id)).then((r) => r.text()));
  let txt = await svgText.get(id);
  if (pose) txt = applyPose(txt, pose);
  const clean = txt.replace(/<ellipse[^>]*fill="rgba\([^)]*\)"\s*\/>/, '');
  const vb = /viewBox="([^"]+)"/.exec(clean)[1].split(/\s+/).map(Number);
  const W = 720;
  const H = Math.round((W * vb[3]) / vb[2]);
  const sized = clean.replace('<svg ', `<svg width="${W}" height="${H}" `);
  return loadImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(sized));
}

/* ---- 포즈: 캐릭터 SVG의 관절 그룹(armL · foreL · legL · shinL · head …)을 돌려서 동작 그림을 만든다 ---- */
export const POSES = {
  // 점프: 두 팔 번쩍 V · 무릎 접고 다리 벌려 공중 자세
  jump: { armL: 150, armR: -150, foreL: 25, foreR: -25, legL: 24, legR: -24, shinL: -48, shinR: 48, head: -4 },
  // 착지 직전: 팔은 옆으로 균형, 다리는 살짝 벌림
  land: { armL: 70, armR: -70, foreL: 30, foreR: -30, legL: 10, legR: -10, shinL: -14, shinR: 14 },
  // 만세 (기쁠 때)
  cheer: { armL: 165, armR: -165, foreL: -25, foreR: 25, head: 6 },
};
function applyPose(txt, pose) {
  return txt.replace(/<g class="([^"]+)" style="transform-origin:([^"]+)"/g, (m, cls, org) => {
    const key = cls.replace(/^t([A-Z])/, (_, c) => c.toLowerCase()); // Ted: tArmL → armL
    const deg = pose[key];
    return deg ? `<g class="${cls}" style="transform-origin:${org};transform:rotate(${deg}deg)"` : m;
  });
}
const RIGGED = (txt) => /class="t?[aA]rmL"/.test(txt);

/** 같은 틀(여백 포함)로 여러 포즈 스티커를 만든다 — 바꿔 끼워도 크기·발 위치가 그대로 */
export async function loadPoses(id) {
  const txt = await (svgText.get(id) || (svgText.set(id, fetch(charURL(id)).then((r) => r.text())), svgText.get(id)));
  if (!RIGGED(txt)) return null;
  const base = await svgImage(id);
  const r = trimRect(base);
  const ex = Math.round(r.w * 0.22); const top = Math.round(r.h * 0.2);
  const rect = { x: r.x - ex, y: r.y - top, w: r.w + ex * 2, h: r.h + top + 6 };
  const crop = (img) => { const c = document.createElement('canvas'); c.width = rect.w; c.height = rect.h; c.getContext('2d').drawImage(img, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h); return sticker(c); };
  const out = { idle: crop(base) };
  Object.defineProperty(out, 'k', { value: rect.h / r.h, enumerable: false }); // 여백만큼 키워서 원래 크기로
  for (const k of Object.keys(POSES)) out[k] = crop(await svgImage(id, POSES[k]));
  return out;
}

function trimRect(img) {
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const x = c.getContext('2d');
  x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height).data;
  let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0;
  for (let y = 0; y < c.height; y++) for (let i = 0; i < c.width; i++) if (d[(y * c.width + i) * 4 + 3] > 8) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/** 스티커 알파로 '볼록한(퍼피)' 노멀맵 — 평면 그림이 통통한 입체 피규어처럼 빛을 받는다 */
export function puffyNormal(src, maxW = 180) {
  const k = Math.min(1, maxW / src.width);
  const w = Math.max(8, Math.round(src.width * k)); const h = Math.max(8, Math.round(src.height * k));
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d'); x.drawImage(src, 0, 0, w, h);
  const d = x.getImageData(0, 0, w, h);
  let a = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) a[i] = d.data[i * 4 + 3] / 255;
  const blur = (arr, r) => { // 가로·세로 상자 흐림
    const t = new Float32Array(w * h); const o = new Float32Array(w * h);
    for (let y = 0; y < h; y++) { let acc = 0; for (let i = -r; i <= r; i++) acc += arr[y * w + Math.min(w - 1, Math.max(0, i))]; for (let i = 0; i < w; i++) { t[y * w + i] = acc / (2 * r + 1); acc += arr[y * w + Math.min(w - 1, i + r + 1)] - arr[y * w + Math.max(0, i - r)]; } }
    for (let i = 0; i < w; i++) { let acc = 0; for (let y = -r; y <= r; y++) acc += t[Math.min(h - 1, Math.max(0, y)) * w + i]; for (let y = 0; y < h; y++) { o[y * w + i] = acc / (2 * r + 1); acc += t[Math.min(h - 1, y + r + 1) * w + i] - t[Math.max(0, y - r) * w + i]; } }
    return o;
  };
  const R = Math.max(2, Math.round(w / 30));
  a = blur(blur(blur(a, R), R), R);
  const S = 5.5;
  for (let y = 0; y < h; y++) for (let i = 0; i < w; i++) {
    const dx = (a[y * w + Math.min(w - 1, i + 1)] - a[y * w + Math.max(0, i - 1)]) * S;
    const dy = (a[Math.min(h - 1, y + 1) * w + i] - a[Math.max(0, y - 1) * w + i]) * S;
    const l = Math.hypot(dx, dy, 1); const j = (y * w + i) * 4;
    d.data[j] = ((-dx / l) * 0.5 + 0.5) * 255; d.data[j + 1] = ((dy / l) * 0.5 + 0.5) * 255; d.data[j + 2] = ((1 / l) * 0.5 + 0.5) * 255; d.data[j + 3] = 255;
  }
  x.putImageData(d, 0, 0);
  return c;
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
      const side = Math.min(full.width, Math.round(full.height * (id === 'ted' ? 0.56 : 0.42))); // Ted는 머리 전체 + 턱까지
      f.width = 256; f.height = 256;
      const fx = f.getContext('2d');
      const sx = (full.width - side) / 2;
      // 얼굴이 동그라미 안에 다 들어오게 조금 작게(여백) 그린다 — Ted는 머리 중심이 원 한가운데 오도록
      if (id === 'ted') fx.drawImage(full, sx, 0, side, side, 40, 42, 176, 176);
      else fx.drawImage(full, sx, 0, side, side, 34, 40, 188, 188);
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
