// 3D 보드 — 출발 → 목적지 일방향 여정 (data/board.json), 지역 4곳, 칸마다 유형 건물과 간판
// 동화책 분위기: 툰 셰이딩 + 파스텔 색 + 둥근 나무·버섯·무지개·반짝이
import * as THREE from 'three';
import { TYPES } from '../quiz/constants.js';
import { signSprite, bannerSprite, iconSprite, numberTexture, logoSprite, skyTexture } from './textures.js';
import { createAvatar } from './avatar.js';

const SP = 2.6; // 칸 간격
const AMP = 3.4; // 길이 좌우로 굽이치는 폭
export const pathX = (i) => AMP * Math.sin(i * 0.36);
export const cellPosition = (i) => new THREE.Vector3(pathX(i), 0, -i * SP);

// 툰(만화) 음영 3단계
const GRAD = (() => {
  const d = new Uint8Array([150, 210, 255]);
  const t = new THREE.DataTexture(d, 3, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
})();
const m = (color, o = {}) => new THREE.MeshToonMaterial({ color, gradientMap: GRAD, ...o });

function rng(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}
const shade = (hex, k) => {
  const c = new THREE.Color(hex);
  c.offsetHSL(0, 0, k);
  return c;
};
const shadowAll = (g) => g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

/* ---------- 소품 ---------- */
function lollipopTree(r, colors = [0x7ed07a, 0x9be07a, 0x6cc48a]) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.7, 8), m(0xb07a4f));
  trunk.position.y = 0.35;
  const s = 0.55 + r() * 0.35;
  const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 1), m(colors[Math.floor(r() * colors.length)]));
  crown.position.y = 0.7 + s * 0.8;
  g.add(trunk, crown);
  if (r() < 0.4) {
    const c2 = new THREE.Mesh(new THREE.IcosahedronGeometry(s * 0.6, 1), m(shade(crown.material.color.getHex(), 0.06)));
    c2.position.set(s * 0.5, 0.7 + s * 1.3, 0.1);
    g.add(c2);
  }
  return g;
}
function blossomTree(r) { return lollipopTree(r, [0xffb7d5, 0xffc9e3, 0xffd6a5]); }
function mushroom(r) {
  const g = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.3, 10), m(0xfff6e8));
  stem.position.y = 0.15;
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), m(r() < 0.5 ? 0xff6f6f : 0xff9ecb));
  cap.position.y = 0.28;
  g.add(stem, cap);
  for (let k = 0; k < 4; k++) {
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 4), m(0xffffff));
    const a = k * 1.6 + r();
    dot.position.set(Math.cos(a) * 0.16, 0.44, Math.sin(a) * 0.16);
    g.add(dot);
  }
  g.scale.setScalar(0.9 + r() * 0.8);
  return g;
}
function flowers(r) {
  const g = new THREE.Group();
  const cols = [0xff8fb8, 0xffe066, 0xffffff, 0xb79cff, 0x8fd3ff];
  for (let k = 0; k < 5; k++) {
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), m(cols[Math.floor(r() * cols.length)]));
    f.position.set((r() - 0.5) * 0.7, 0.12, (r() - 0.5) * 0.7);
    g.add(f);
  }
  return g;
}
function storyHouse(r, tall = false) {
  const g = new THREE.Group();
  const h = tall ? 1.6 + r() * 1.6 : 1.0;
  const wallCols = [0xfff1d6, 0xffe0ec, 0xe2f4ff, 0xe8ffe0, 0xf3e6ff, 0xfff6b8];
  const roofCols = [0xff7b8a, 0x7ab8ff, 0xffb347, 0x9b7bff, 0x5fcf9a];
  const w = 0.9 + r() * 0.5;
  const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), m(wallCols[Math.floor(r() * wallCols.length)]));
  wall.position.y = h / 2;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(w * 0.85, 0.9, 4), m(roofCols[Math.floor(r() * roofCols.length)]));
  roof.position.y = h + 0.45;
  roof.rotation.y = Math.PI / 4;
  g.add(wall, roof);
  for (let y = 0.45; y < h - 0.2; y += 0.5) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.26, 0.03), m(0xfff3a8, { emissive: 0xffd36b, emissiveIntensity: 0.4 }));
    win.position.set(0, y, w / 2 + 0.01);
    g.add(win);
  }
  return g;
}
function rockPillar(r) {
  const g = new THREE.Group();
  const h = 1 + r() * 2.4;
  const rad = 0.6 + r() * 0.7;
  const col = [0xffb98a, 0xffa58f, 0xffcf99, 0xf59b7a][Math.floor(r() * 4)];
  const body = new THREE.Mesh(new THREE.CylinderGeometry(rad * 0.85, rad, h, 9), m(col));
  body.position.y = h / 2;
  const top = new THREE.Mesh(new THREE.SphereGeometry(rad * 0.85, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), m(shade(col, 0.06)));
  top.position.y = h;
  const stripe = new THREE.Mesh(new THREE.CylinderGeometry(rad * 0.93, rad * 0.95, 0.12, 9), m(shade(col, -0.08)));
  stripe.position.y = h * 0.45;
  g.add(body, top, stripe);
  return g;
}
function crystal(r, col) {
  const g = new THREE.Group();
  for (let k = 0; k < 3; k++) {
    const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.18 + r() * 0.2, 0), m(col, { emissive: col, emissiveIntensity: 0.35 }));
    c.scale.y = 2;
    c.position.set((r() - 0.5) * 0.5, 0.35, (r() - 0.5) * 0.5);
    c.rotation.z = (r() - 0.5) * 0.6;
    g.add(c);
  }
  return g;
}

/* ---------- 유형 건물 ---------- */
function building(region, type, side) {
  const g = new THREE.Group();
  const id = region.id;
  const r = rng(type * 97 + 13);
  if (id === 'village') {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.1, 1.3), m(0xfff3dc));
    wall.position.y = 0.55;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.2, 0.95, 4), m([0xff7b8a, 0xffb347, 0x6fcf8a, 0x7ab8ff][type % 4]));
    roof.position.y = 1.55;
    roof.rotation.y = Math.PI / 4;
    const door = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 12, 1, false, 0, Math.PI), m(0xb07a4f));
    door.rotation.x = Math.PI / 2;
    door.position.set(0, 0.3, 0.66);
    const doorBox = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.05), m(0xb07a4f));
    doorBox.position.set(0, 0.15, 0.66);
    const win = new THREE.Mesh(new THREE.CircleGeometry(0.16, 16), m(0xfff3a8, { emissive: 0xffd36b, emissiveIntensity: 0.4 }));
    win.position.set(0.48, 0.7, 0.66);
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 0.2), m(0xd98b6a));
    chimney.position.set(0.4, 1.7, -0.2);
    g.add(wall, roof, door, doorBox, win, chimney);
    const fl = flowers(r); fl.position.set(-0.6, 0, 0.8); g.add(fl);
  } else if (id === 'city') {
    const h = 2.0 + (type % 3) * 0.4;
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.7, h, 10), m([0xe2f4ff, 0xffe0ec, 0xfff1d6, 0xf3e6ff][type % 4]));
    tower.position.y = h / 2;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.85, 1.1, 10), m([0x7ab8ff, 0xff7b8a, 0xffb347, 0x9b7bff][type % 4]));
    roof.position.y = h + 0.55;
    const clock = new THREE.Mesh(new THREE.CircleGeometry(0.3, 20), m(0xffffff));
    clock.position.set(0, h - 0.45, 0.66);
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.01), m(0x0d2144));
    hand.position.set(0, h - 0.38, 0.67);
    hand.userData.spin2 = true;
    g.add(tower, roof, clock, hand);
    for (let y = 0.5; y < h - 0.8; y += 0.5) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.28, 0.04), m(0xfff3a8, { emissive: 0xffd36b, emissiveIntensity: 0.4 }));
      w.position.set(0, y, 0.68);
      g.add(w);
    }
  } else if (id === 'canyon') {
    const shop = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.0, 1.3), m(0xffe3c2));
    shop.position.y = 0.5;
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 1.7, 12, 1, false, 0, Math.PI), m(0xff8f70));
    roof.rotation.z = Math.PI / 2;
    roof.position.y = 1.0;
    const saw = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.06, 14), m(0xe6ecf5, { emissive: 0x99aacc, emissiveIntensity: 0.2 }));
    saw.rotation.x = Math.PI / 2;
    saw.position.set(0.55, 1.75, 0.2);
    saw.userData.spin = true;
    const cr = crystal(r, 0x8fe3ff); cr.position.set(-0.8, 0, 0.6);
    g.add(shop, roof, saw, cr);
  } else {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 2.0, 12), m(0xffeef6));
    t.position.y = 1.0;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.78, 1.2, 12), m(0xb79cff));
    cone.position.y = 2.6;
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), m(0xffd36b, { emissive: 0xffc94a, emissiveIntensity: 0.5 }));
    tip.position.y = 3.25;
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, 0.05), m(0xc9a84c));
    door.position.set(0, 0.3, 0.62);
    g.add(t, cone, tip, door);
  }
  shadowAll(g);
  g.rotation.y = side > 0 ? -0.35 : 0.35;
  return g;
}

function castle() {
  const g = new THREE.Group();
  const wallM = m(0xffe6f2);
  const wall = new THREE.Mesh(new THREE.BoxGeometry(7, 2.2, 1), wallM);
  wall.position.y = 1.1;
  g.add(wall);
  for (let x = -3.2; x <= 3.2; x += 0.8) {
    const cr = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.4, 1), wallM);
    cr.position.set(x, 2.4, 0);
    g.add(cr);
  }
  const roofCols = [0xb79cff, 0x8fc8ff, 0xff9ecb, 0xb79cff];
  [-3.6, 3.6, -1.6, 1.6].forEach((x, i) => {
    const h = i < 2 ? 4 : 5.4;
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.85, h, 14), wallM);
    t.position.set(x, h / 2, i < 2 ? 0 : -1.2);
    const c = new THREE.Mesh(new THREE.ConeGeometry(1.0, 1.8, 14), m(roofCols[i]));
    c.position.set(x, h + 0.9, t.position.z);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), m(0xffd36b, { emissive: 0xffc94a, emissiveIntensity: 0.6 }));
    tip.position.set(x, h + 1.9, t.position.z);
    const f = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.35), m(0xffd36b, { side: THREE.DoubleSide }));
    f.position.set(x + 0.3, h + 2.15, t.position.z);
    f.userData.flag = true;
    for (let y = 1; y < h - 0.6; y += 1.1) {
      const w = new THREE.Mesh(new THREE.CircleGeometry(0.16, 14), m(0xfff3a8, { emissive: 0xffd36b, emissiveIntensity: 0.5 }));
      w.position.set(x, y, t.position.z + 0.84);
      g.add(w);
    }
    g.add(t, c, tip, f);
  });
  const keep = new THREE.Mesh(new THREE.BoxGeometry(2.4, 4.6, 2), wallM);
  keep.position.set(0, 2.3, -1.6);
  const keepRoof = new THREE.Mesh(new THREE.ConeGeometry(1.9, 2.0, 4), m(0x9b7bff));
  keepRoof.position.set(0, 5.6, -1.6);
  keepRoof.rotation.y = Math.PI / 4;
  const gate = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.1, 16, 1, false, 0, Math.PI), m(0xc9a84c));
  gate.rotation.x = Math.PI / 2;
  gate.position.set(0, 1.0, 0.52);
  const gateBox = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.0, 0.1), m(0xc9a84c));
  gateBox.position.set(0, 0.5, 0.52);
  g.add(keep, keepRoof, gate, gateBox);
  shadowAll(g);
  return g;
}

function rainbow() {
  const g = new THREE.Group();
  const cols = [0xff8a8a, 0xffb36b, 0xffe36b, 0x8fe08a, 0x8fc8ff, 0xb79cff];
  cols.forEach((c, k) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(9 - k * 0.55, 0.28, 8, 64, Math.PI), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.55, depthWrite: false, fog: false }));
    g.add(ring);
  });
  return g;
}

function arch(color, w = 2.6) {
  const g = new THREE.Group();
  [-1, 1].forEach((s) => {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 2.2, 10), m(color));
    p.position.set((s * w) / 2, 1.1, 0);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), m(0xffd36b, { emissive: 0xffc94a, emissiveIntensity: 0.4 }));
    ball.position.set((s * w) / 2, 2.4, 0);
    g.add(p, ball);
  });
  const top = new THREE.Mesh(new THREE.TorusGeometry(w / 2, 0.1, 8, 24, Math.PI), m(color));
  top.position.y = 2.2;
  g.add(top);
  shadowAll(g);
  return g;
}

/* ---------- 월드 ---------- */
export function buildWorld(scene, board, guide) {
  const { regions, cells } = board;
  const N = cells.length;
  const before = new Set(scene.children);
  const r = rng(20261102);
  const animated = [];
  const sparkles = [];
  const tiles = [];
  const signs = [];
  const npcs = [];

  // 하늘·안개·조명 (밝고 따뜻하게)
  scene.background = skyTexture();
  scene.fog = new THREE.Fog(0xfde8f2, 34, 90);
  scene.add(new THREE.HemisphereLight(0xfff8f0, 0xd8c8f0, 0.95));
  scene.add(new THREE.AmbientLight(0xffffff, 0.12));
  const sun = new THREE.DirectionalLight(0xfff1d6, 1.35);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 50 });
  sun.shadow.bias = -0.0008;
  scene.add(sun, sun.target);

  const ranges = regions.map((_, k) => {
    const idx = cells.filter((c) => c.region === k).map((c) => c.i);
    return [Math.min(...idx), Math.max(...idx)];
  });
  const base = new THREE.Mesh(new THREE.PlaneGeometry(220, 280), m(0xbfe8a0));
  base.rotation.x = -Math.PI / 2;
  base.position.set(0, -0.05, -N * SP / 2);
  base.receiveShadow = true;
  scene.add(base);
  regions.forEach((reg, k) => {
    const [a, b] = ranges[k];
    const z0 = -a * SP + (k === 0 ? 16 : 0);
    const z1 = -b * SP - (k === regions.length - 1 ? 22 : 0);
    const g = new THREE.Mesh(new THREE.PlaneGeometry(70, z0 - z1), m(reg.ground));
    g.rotation.x = -Math.PI / 2;
    g.position.set(0, -0.02, (z0 + z1) / 2);
    g.receiveShadow = true;
    scene.add(g);
  });

  // 길: 크림색 조약돌
  const stoneM = m(0xfff1d0);
  for (let i = 0; i < N - 1; i++) {
    const p = cellPosition(i);
    const q = cellPosition(i + 1);
    for (let k = 1; k <= 2; k++) {
      const s = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.08, 12), stoneM);
      s.position.copy(p).lerp(q, k / 3);
      s.position.y = 0.04;
      s.receiveShadow = true;
      scene.add(s);
    }
  }

  // 지역 경계: 강·다리 (미니게임 게이트)
  cells.filter((c) => c.kind === 'gate').forEach((c) => {
    const p = cellPosition(c.i);
    const river = new THREE.Mesh(new THREE.PlaneGeometry(90, 2.6), m(0x8fd8ff, { emissive: 0x4fb3e8, emissiveIntensity: 0.15 }));
    river.rotation.x = -Math.PI / 2;
    river.position.set(0, 0.0, p.z);
    scene.add(river);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.22, 3.4), m(0xe8b47e));
    deck.position.set(p.x, 0.1, p.z);
    deck.receiveShadow = true;
    scene.add(deck);
    [-1, 1].forEach((s2) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 3.4), m(0xb07a4f));
      rail.position.set(p.x + s2 * 1.25, 0.6, p.z);
      scene.add(rail);
      [-1.5, 0, 1.5].forEach((dz) => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.55, 8), m(0xb07a4f));
        post.position.set(p.x + s2 * 1.25, 0.37, p.z + dz);
        const ball = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), m(0xffd36b));
        ball.position.set(p.x + s2 * 1.25, 0.68, p.z + dz);
        scene.add(post, ball);
      });
    });
  });

  // 칸
  cells.forEach((c) => {
    const reg = regions[c.region];
    const p = cellPosition(c.i);
    const special = c.kind !== 'quiz';
    const col = { arcade: 0xff9ecb, start: 0xffd36b, goal: 0xffd36b, snack: 0xffb36b, gate: 0x8fc8ff, trap: 0xff8a8a, portal: 0xc9a2ff, bonus: 0x8fe08a }[c.kind] ?? shade(reg.color, 0.22);
    const tile = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.02, 0.32, 28), m(col));
    tile.position.set(p.x, 0.16, p.z);
    tile.castShadow = true;
    tile.receiveShadow = true;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.96, 0.06, 8, 36), m(0xffffff));
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.16;
    tile.add(rim);
    const top = new THREE.Mesh(new THREE.CircleGeometry(0.5, 24), new THREE.MeshBasicMaterial({ map: numberTexture(c.i, special ? '#ffffff' : '#0D2144'), transparent: true }));
    top.rotation.x = -Math.PI / 2;
    top.position.y = 0.17;
    tile.add(top);
    scene.add(tile);
    tiles.push(tile);

    if (c.kind === 'quiz') {
      const side = c.i % 2 ? 1 : -1;
      const b = building(reg, c.type, side);
      b.position.set(p.x + side * 3.0, 0, p.z - 0.3);
      scene.add(b);
      const sign = signSprite(TYPES[c.type].short, `유형 ${c.type}`, reg.color);
      const h = { village: 2.7, city: 4.1, canyon: 2.6, castle: 3.9 }[reg.id];
      sign.position.set(b.position.x, h, b.position.z + 0.4);
      scene.add(sign);
      signs.push({ s: sign, far: true });
      tile.userData.building = b;
      b.traverse((o) => {
        if (o.userData.spin) animated.push({ obj: o, kind: 'spin' });
        if (o.userData.spin2) animated.push({ obj: o, kind: 'clock' });
      });
    } else if (c.kind !== 'start') {
      const ic = iconSprite(c.kind);
      ic.position.set(p.x, 1.5, p.z);
      ic.userData.baseY = 1.5;
      ic.userData.phase = c.i;
      scene.add(ic);
      animated.push({ obj: ic, kind: 'bob' });
      signs.push({ s: ic, icon: true });
    }
    if (c.kind === 'start') {
      const a = arch(0xff9ecb);
      a.position.set(p.x, 0, p.z - 0.2);
      scene.add(a);
      const logo = logoSprite();
      logo.position.set(p.x, 3.3, p.z - 0.2);
      scene.add(logo);
      signs.push({ s: logo });
      const bn = bannerSprite('출발 START', '#FFD36B', 2.0);
      bn.position.set(p.x, 2.35, p.z - 0.15);
      scene.add(bn);
      signs.push({ s: bn });
    }
    if (c.kind === 'gate') {
      const a = arch(0x8fc8ff, 2.4);
      a.position.set(p.x, 0.16, p.z);
      scene.add(a);
      // 관문 위: 다음 마을 이름을 크게
      const next = regions[Math.min(regions.length - 1, c.region + 1)];
      const nm = bannerSprite(`${next.name} 관문`, shade(next.color, 0.35).getStyle(), 3.4);
      nm.position.set(p.x, 3.05, p.z);
      scene.add(nm);
      signs.push({ s: nm });
      const bn = bannerSprite('🎮 미니게임', '#BDE3FF', 1.8);
      bn.position.set(p.x, 2.35, p.z);
      scene.add(bn);
      signs.push({ s: bn });
    }
  });

  // 지역 입구 팻말
  regions.forEach((reg, k) => {
    if (k === 0) return;
    const first = ranges[k][0] + 1;
    const p = cellPosition(first);
    // 마을 입구문: 길 위에 큰 문 + 문 위에 마을 이름 간판
    const q = cellPosition(first - 1);
    const at = p.clone().lerp(q, 0.5);
    const g = new THREE.Group();
    const col = new THREE.Color(reg.color).getHex();
    const w = 3.6;
    [-1, 1].forEach((s2) => {
      const pil = new THREE.Mesh(new THREE.BoxGeometry(0.42, 2.9, 0.42), m(col));
      pil.position.set((s2 * w) / 2, 1.45, 0);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.55, 4), m(0xffd36b, { emissive: 0xffc94a, emissiveIntensity: 0.35 }));
      cap.position.set((s2 * w) / 2, 3.2, 0);
      cap.rotation.y = Math.PI / 4;
      g.add(pil, cap);
    });
    const beam = new THREE.Mesh(new THREE.BoxGeometry(w + 0.7, 0.42, 0.5), m(shade(reg.color, 0.15).getHex()));
    beam.position.y = 2.75;
    g.add(beam);
    shadowAll(g);
    g.position.set(at.x, 0, at.z);
    scene.add(g);
    const bn = bannerSprite(`${reg.name}`, shade(reg.color, 0.45).getStyle(), 5.2);
    bn.position.set(at.x, 4.1, at.z);
    scene.add(bn);
    signs.push({ s: bn });
    const sub = bannerSprite(`STAGE ${k + 1} · 어서 와요!`, '#FFFFFF', 2.4);
    sub.position.set(at.x, 3.15, at.z + 0.3);
    scene.add(sub);
    signs.push({ s: sub });
  });

  // 목적지: 성 + 무지개 + 로고
  const goal = cellPosition(N - 1);
  const cs = castle();
  cs.position.set(goal.x, 0, goal.z - 4.2);
  scene.add(cs);
  cs.traverse((o) => { if (o.userData.flag) animated.push({ obj: o, kind: 'flag' }); });
  const rb = rainbow();
  rb.position.set(goal.x, 0, goal.z - 9);
  scene.add(rb);
  const clogo = logoSprite(1.6);
  clogo.position.set(goal.x, 4.0, goal.z - 2.4);
  scene.add(clogo);

  // 안내 선생님 (출발점 옆, 성 앞)
  if (guide) {
    [[0, -1.9, 0.3], [N - 1, 1.9, 0.2]].forEach(([i, dx, dz]) => {
      const t = createAvatar(guide, { height: 1.75, base: true });
      const p = cellPosition(i);
      t.root.position.set(p.x + dx, 0, p.z + dz);
      t.setAnim('wave');
      scene.add(t.root);
      npcs.push(t);
    });
  }

  // 소품 (길과 건물은 피해서)
  const occupied = [];
  cells.forEach((c) => {
    const p = cellPosition(c.i);
    occupied.push([p.x, p.z, 2.6]);
    if (c.kind === 'quiz') occupied.push([p.x + (c.i % 2 ? 1 : -1) * 3.0, p.z, 2.0]);
  });
  occupied.push([goal.x, goal.z - 4.2, 5.5]);
  const free = (x, z, clear = 2.2) => occupied.every(([a, b, rad]) => (x - a) ** 2 + (z - b) ** 2 > rad * rad) && Math.abs(x - pathX(-z / SP)) > clear;
  regions.forEach((reg, k) => {
    const [a, b] = ranges[k];
    const count = { village: 90, city: 60, canyon: 60, castle: 55 }[reg.id];
    for (let n = 0; n < count; n++) {
      const z = -(a + r() * (b - a + 1)) * SP + 2;
      const x = (r() * 2 - 1) * 17;
      if (!free(x, z)) continue;
      const roll = r();
      let o;
      if (reg.id === 'village') o = roll < 0.45 ? lollipopTree(r) : roll < 0.65 ? blossomTree(r) : roll < 0.82 ? mushroom(r) : flowers(r);
      else if (reg.id === 'city') {
        if (roll < 0.45) { if (!free(x, z, 3.5)) continue; o = storyHouse(r, true); }
        else o = roll < 0.7 ? lollipopTree(r, [0x7ed0b0, 0x9be0c7]) : roll < 0.85 ? blossomTree(r) : flowers(r);
      } else if (reg.id === 'canyon') {
        if (roll < 0.45) { if (!free(x, z, 5.5)) continue; o = rockPillar(r); }
        else o = roll < 0.75 ? crystal(r, [0x8fe3ff, 0xff9ecb, 0xffe36b][n % 3]) : mushroom(r);
      } else {
        o = roll < 0.4 ? lollipopTree(r, [0xc9a2ff, 0xb79cff, 0xffb7d5]) : roll < 0.7 ? crystal(r, [0xd7b8ff, 0xffc9e3][n % 2]) : roll < 0.85 ? mushroom(r) : flowers(r);
      }
      o.position.set(x, 0, z);
      o.rotation.y = r() * Math.PI;
      shadowAll(o);
      scene.add(o);
    }
  });

  // 뭉게구름
  for (let n = 0; n < 18; n++) {
    const c = new THREE.Group();
    const cm = m(0xffffff);
    for (let k = 0; k < 5; k++) {
      const s = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7 + r() * 0.8, 1), cm);
      s.position.set(k * 0.8, Math.sin(k) * 0.35, r() * 0.5);
      c.add(s);
    }
    c.position.set((r() * 2 - 1) * 26, 9 + r() * 5, -r() * N * SP);
    scene.add(c);
    animated.push({ obj: c, kind: 'cloud' });
  }

  // 반짝이 (길 위를 떠다니는 빛가루)
  const G = 260;
  const gpos = new Float32Array(G * 3);
  const gcol = new Float32Array(G * 3);
  const pal = [new THREE.Color(0xffffff), new THREE.Color(0xffe36b), new THREE.Color(0xff9ecb), new THREE.Color(0x8fd8ff)];
  for (let k = 0; k < G; k++) {
    const i = r() * (N - 1);
    gpos[k * 3] = pathX(i) + (r() - 0.5) * 12;
    gpos[k * 3 + 1] = 0.5 + r() * 3;
    gpos[k * 3 + 2] = -i * SP;
    const cc = pal[k % pal.length];
    gcol.set([cc.r, cc.g, cc.b], k * 3);
  }
  const gg = new THREE.BufferGeometry();
  gg.setAttribute('position', new THREE.BufferAttribute(gpos, 3));
  gg.setAttribute('color', new THREE.BufferAttribute(gcol, 3));
  const glitter = new THREE.Points(gg, new THREE.PointsMaterial({ size: 0.13, vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false }));
  scene.add(glitter);

  /** 도착 칸 반짝임 */
  function sparkle(i) {
    const p = cellPosition(i);
    const tile = tiles[i];
    tile.material = tile.material.clone();
    tile.material.emissive = new THREE.Color(0xffd36b);
    const b = tile.userData.building;
    for (let k = 0; k < 16; k++) {
      const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.09, 0), new THREE.MeshBasicMaterial({ color: [0xffd36b, 0xffffff, 0xff9ecb][k % 3], transparent: true }));
      const a = (k / 16) * Math.PI * 2;
      s.position.set(p.x + Math.cos(a) * 0.9, 0.4, p.z + Math.sin(a) * 0.9);
      s.userData = { a, life: 1.1, vy: 1.4 + Math.random() };
      scene.add(s);
      sparkles.push(s);
    }
    sparkles.push({ isPulse: true, tile, b, life: 1.1 });
  }

  /** 멀리 있는 간판은 흐리게, 캐릭터를 가리는 간판은 투명하게 */
  function focus(target) {
    signs.forEach(({ s: sg, far, icon }) => {
      const dz = sg.position.z - target.z;
      let o = 1;
      if (icon) {
        o = !target.isTitle && Math.abs(dz) < 1.3 && Math.abs(sg.position.x - target.x) < 1.3 ? 0.15 : 1; // 내 말 위의 아이콘
      } else if (!target.isTitle) {
        if (far) { const d = Math.abs(dz); o = d < 9 ? 1 : d > 16 ? 0 : 1 - (d - 9) / 7; }
        if (dz > 3) o = 0;
        else if (dz > -0.6 && Math.abs(sg.position.x - target.x) < 3.6) o = Math.min(o, 0.12);
      }
      sg.material.opacity += (o - sg.material.opacity) * 0.15;
      sg.visible = sg.material.opacity > 0.02;
    });
  }

  function update(dt, t, camera) {
    animated.forEach(({ obj, kind }) => {
      if (kind === 'bob') obj.position.y = obj.userData.baseY + Math.sin(t * 2 + obj.userData.phase) * 0.12;
      else if (kind === 'spin') obj.rotation.y += dt * 2.5;
      else if (kind === 'clock') obj.rotation.z -= dt * 0.8;
      else if (kind === 'flag') obj.rotation.y = Math.sin(t * 3 + obj.position.x) * 0.4;
      else if (kind === 'cloud') { obj.position.x += dt * 0.3; if (obj.position.x > 32) obj.position.x = -32; }
    });
    const gp = glitter.geometry.attributes.position;
    for (let k = 0; k < G; k++) gp.array[k * 3 + 1] += Math.sin(t * 1.5 + k) * dt * 0.15;
    gp.needsUpdate = true;
    glitter.material.opacity = 0.6 + Math.sin(t * 3) * 0.25;
    npcs.forEach((n) => n.update(dt, camera));
    for (let k = sparkles.length - 1; k >= 0; k--) {
      const s = sparkles[k];
      if (s.isPulse) {
        s.life -= dt;
        const e = Math.max(0, s.life) / 1.1;
        s.tile.material.emissiveIntensity = e * 0.8;
        if (s.b) s.b.scale.setScalar(1 + Math.sin((1 - e) * Math.PI) * 0.12);
        if (s.life <= 0) sparkles.splice(k, 1);
        continue;
      }
      s.userData.life -= dt;
      s.position.y += s.userData.vy * dt;
      s.rotation.y += dt * 6;
      s.material.opacity = Math.max(0, s.userData.life / 1.1);
      if (s.userData.life <= 0) { scene.remove(s); sparkles.splice(k, 1); }
    }
  }

  function direction(i) {
    const a = cellPosition(Math.max(0, i - 1));
    const b = cellPosition(Math.min(N - 1, i + 1));
    return b.sub(a).normalize();
  }

  // 주사위가 부딪힐 수 있는 마을 물체들(집·나무·바위 등)의 상자 — 길 위(아치 등)는 제외
  const obstacles = [];
  scene.children.forEach((o) => {
    if (before.has(o) || o.isLight || o.isSprite) return;
    const bb = new THREE.Box3().setFromObject(o);
    if (bb.isEmpty()) return;
    const size = bb.getSize(new THREE.Vector3());
    const c = bb.getCenter(new THREE.Vector3());
    if (size.y < 0.7 || size.x > 7 || size.z > 7) return;
    const onPath = Math.abs(c.x - pathX(-c.z / SP)) < 1.9;
    if (onPath) return;
    obstacles.push({ center: c, size });
  });

  return { N, cellPosition, direction, sparkle, update, focus, sun, tiles, obstacles };
}
