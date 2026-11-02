// 3D 보드 — 출발 → 목적지 일방향 여정 (data/board.json), 지역 4곳, 칸마다 유형 건물과 간판
import * as THREE from 'three';
import { TYPES } from '../quiz/constants.js';
import { signSprite, bannerSprite, iconSprite, numberTexture } from './textures.js';

const SP = 2.6; // 칸 간격
const AMP = 3.4; // 길이 좌우로 굽이치는 폭
export const pathX = (i) => AMP * Math.sin(i * 0.36);
export const cellPosition = (i) => new THREE.Vector3(pathX(i), 0, -i * SP);

const m = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, flatShading: true, ...o });
function rng(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}
const shade = (hex, k) => {
  const c = new THREE.Color(hex);
  c.offsetHSL(0, 0, k);
  return c;
};

function tree(r, color = 0x3f9a4a) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.5, 6), m(0x8a5a35));
  trunk.position.y = 0.25;
  const h = 0.9 + r() * 0.8;
  const crown = new THREE.Mesh(new THREE.ConeGeometry(0.45 + r() * 0.2, h, 7), m(color));
  crown.position.y = 0.5 + h / 2;
  const crown2 = new THREE.Mesh(new THREE.ConeGeometry(0.35, h * 0.7, 7), m(shade(color, 0.06)));
  crown2.position.y = 0.5 + h * 0.85;
  g.add(trunk, crown, crown2);
  return g;
}

function building(region, type, side) {
  const g = new THREE.Group();
  const id = region.id;
  if (id === 'village') {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.1, 1.3), m(0xfff3dc));
    wall.position.y = 0.55;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.2, 0.8, 4), m([0xd9534f, 0xf2a01e, 0x4fa65b, 0x2e7bc4][type % 4]));
    roof.position.y = 1.5;
    roof.rotation.y = Math.PI / 4;
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.55, 0.05), m(0x8a5a35));
    door.position.set(0, 0.3, 0.66);
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.05), m(0x9fd8ff, { emissive: 0x335577, emissiveIntensity: 0.3 }));
    win.position.set(0.45, 0.65, 0.66);
    g.add(wall, roof, door, win);
  } else if (id === 'city') {
    const h = 2.2 + (type % 3) * 0.5;
    const tower = new THREE.Mesh(new THREE.BoxGeometry(1.3, h, 1.2), m([0x5b7fa8, 0x3f6d9e, 0x7c95b5, 0x4b6f96][type % 4]));
    tower.position.y = h / 2;
    g.add(tower);
    for (let y = 0.5; y < h - 0.3; y += 0.45) {
      [-0.32, 0.32].forEach((x) => {
        const w = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.25, 0.04), m(0xfff1b8, { emissive: 0xffd36b, emissiveIntensity: 0.35 }));
        w.position.set(x, y, 0.61);
        g.add(w);
      });
    }
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 5), m(0x333333));
    ant.position.y = h + 0.3;
    g.add(ant);
  } else if (id === 'canyon') {
    const shop = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.0, 1.3), m(0xb8875a));
    shop.position.y = 0.5;
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.12, 1.5), m(0x6e3b1e));
    roof.position.y = 1.08;
    roof.rotation.z = 0.12;
    const saw = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.06, 12), m(0xd8dde4, { metalness: 0.6, roughness: 0.3 }));
    saw.rotation.x = Math.PI / 2;
    saw.position.set(0.5, 1.4, 0.2);
    saw.userData.spin = true;
    g.add(shop, roof, saw);
  } else {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 2.0, 8), m(0xe6dcf2));
    t.position.y = 1.0;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.75, 1.0, 8), m(0x7a3fa8));
    cone.position.y = 2.5;
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.28), m(0xc9a84c, { side: THREE.DoubleSide }));
    flag.position.set(0.22, 3.25, 0);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.6, 4), m(0x333333));
    pole.position.y = 3.2;
    g.add(t, cone, flag, pole);
  }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.rotation.y = side > 0 ? -0.35 : 0.35;
  return g;
}

function castle() {
  const g = new THREE.Group();
  const wallM = m(0xe9e2f4);
  const wall = new THREE.Mesh(new THREE.BoxGeometry(7, 2.2, 1), wallM);
  wall.position.y = 1.1;
  g.add(wall);
  for (let x = -3.2; x <= 3.2; x += 0.8) {
    const cr = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.4, 1), wallM);
    cr.position.set(x, 2.4, 0);
    g.add(cr);
  }
  [-3.6, 3.6, -1.6, 1.6].forEach((x, i) => {
    const h = i < 2 ? 4 : 5.2;
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.85, h, 10), wallM);
    t.position.set(x, h / 2, i < 2 ? 0 : -1.2);
    const c = new THREE.Mesh(new THREE.ConeGeometry(1.0, 1.5, 10), m(0x7a3fa8));
    c.position.set(x, h + 0.75, t.position.z);
    const f = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.35), m(0xc9a84c, { side: THREE.DoubleSide }));
    f.position.set(x + 0.3, h + 1.8, t.position.z);
    g.add(t, c, f);
  });
  const keep = new THREE.Mesh(new THREE.BoxGeometry(2.4, 4.4, 2), wallM);
  keep.position.set(0, 2.2, -1.6);
  const keepRoof = new THREE.Mesh(new THREE.ConeGeometry(1.8, 1.8, 4), m(0x5d2c86));
  keepRoof.position.set(0, 5.3, -1.6);
  keepRoof.rotation.y = Math.PI / 4;
  const gate = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.6, 0.1), m(0x6b4f2a));
  gate.position.set(0, 0.8, 0.52);
  g.add(keep, keepRoof, gate);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

function arch(color, w = 2.6) {
  const g = new THREE.Group();
  [-1, 1].forEach((s) => {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 2.2, 8), m(color));
    p.position.set((s * w) / 2, 1.1, 0);
    p.castShadow = true;
    g.add(p);
  });
  const top = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.22, 0.25), m(color));
  top.position.y = 2.25;
  g.add(top);
  return g;
}

export function buildWorld(scene, board) {
  const { regions, cells } = board;
  const N = cells.length;
  const r = rng(20261102);
  const animated = []; // {obj, kind}
  const sparkles = [];
  const tiles = [];
  const signs = [];

  // 하늘·안개·조명
  scene.background = new THREE.Color(0xbfe3ff);
  scene.fog = new THREE.Fog(0xbfe3ff, 22, 70);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8fae7a, 1.1));
  const sun = new THREE.DirectionalLight(0xfff4dc, 1.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 50 });
  sun.shadow.bias = -0.0008;
  scene.add(sun, sun.target);

  // 지역별 땅
  const ranges = regions.map((_, k) => {
    const idx = cells.filter((c) => c.region === k).map((c) => c.i);
    return [Math.min(...idx), Math.max(...idx)];
  });
  const base = new THREE.Mesh(new THREE.PlaneGeometry(200, 260), m(0x9ccf86));
  base.rotation.x = -Math.PI / 2;
  base.position.set(0, -0.05, -N * SP / 2);
  base.receiveShadow = true;
  scene.add(base);
  regions.forEach((reg, k) => {
    const [a, b] = ranges[k];
    const z0 = -a * SP + (k === 0 ? 14 : 0);
    const z1 = -b * SP - (k === regions.length - 1 ? 18 : 0);
    const g = new THREE.Mesh(new THREE.PlaneGeometry(60, z0 - z1), m(reg.ground));
    g.rotation.x = -Math.PI / 2;
    g.position.set(0, -0.02, (z0 + z1) / 2);
    g.receiveShadow = true;
    scene.add(g);
  });

  // 길 (칸과 칸을 잇는 흙길)
  const roadM = m(0xf1dfb8);
  for (let i = 0; i < N - 1; i++) {
    const p = cellPosition(i);
    const q = cellPosition(i + 1);
    const len = p.distanceTo(q);
    const seg = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, len), roadM);
    seg.position.copy(p).lerp(q, 0.5);
    seg.position.y = 0.03;
    seg.lookAt(q.x, 0.03, q.z);
    seg.receiveShadow = true;
    scene.add(seg);
  }

  // 지역 경계의 강과 다리 (미니게임 게이트 칸)
  cells.filter((c) => c.kind === 'gate').forEach((c) => {
    const p = cellPosition(c.i);
    const river = new THREE.Mesh(new THREE.PlaneGeometry(80, 2.4), m(0x4fb3e8, { roughness: 0.2, metalness: 0.1 }));
    river.rotation.x = -Math.PI / 2;
    river.position.set(0, 0.0, p.z);
    scene.add(river);
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.2, 3.2), m(0xa8743f));
    bridge.position.set(p.x, 0.08, p.z);
    bridge.receiveShadow = true;
    scene.add(bridge);
    [-1, 1].forEach((s) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 3.2), m(0x7a5230));
      rail.position.set(p.x + s * 1.25, 0.35, p.z);
      scene.add(rail);
    });
  });

  // 칸
  cells.forEach((c) => {
    const reg = regions[c.region];
    const p = cellPosition(c.i);
    const special = c.kind !== 'quiz';
    const col = { start: 0xc9a84c, goal: 0xc9a84c, snack: 0xf2a01e, gate: 0x2e7bc4, trap: 0xd2463b, portal: 0x7a3fa8, bonus: 0x1e9b5b }[c.kind] ?? shade(reg.color, 0.12);
    const tile = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.05, 0.3, 10), m(col, { flatShading: true }));
    tile.position.set(p.x, 0.15, p.z);
    tile.castShadow = true;
    tile.receiveShadow = true;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.97, 0.05, 6, 24), m(0xffffff));
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.15;
    tile.add(rim);
    const top = new THREE.Mesh(new THREE.CircleGeometry(0.5, 20), new THREE.MeshBasicMaterial({ map: numberTexture(c.i, special ? '#ffffff' : '#0D2144'), transparent: true }));
    top.rotation.x = -Math.PI / 2;
    top.position.y = 0.16;
    tile.add(top);
    scene.add(tile);
    tiles.push(tile);

    if (c.kind === 'quiz') {
      const side = c.i % 2 ? 1 : -1;
      const b = building(reg, c.type, side);
      b.position.set(p.x + side * 3.0, 0, p.z - 0.3);
      scene.add(b);
      const sign = signSprite(TYPES[c.type].short, `유형 ${c.type} · ${reg.name}`, reg.color);
      const h = { village: 2.4, city: 3.6, canyon: 2.4, castle: 3.9 }[reg.id];
      sign.position.set(b.position.x, h, b.position.z + 0.4);
      scene.add(sign);
      signs.push({ s: sign, far: true });
      tile.userData.building = b;
      b.traverse((o) => { if (o.userData.spin) animated.push({ obj: o, kind: 'spin' }); });
    } else if (c.kind !== 'start') {
      const ic = iconSprite(c.kind);
      ic.position.set(p.x, 1.5, p.z);
      ic.userData.baseY = 1.5;
      ic.userData.phase = c.i;
      scene.add(ic);
      animated.push({ obj: ic, kind: 'bob' });
    }
    if (c.kind === 'start') {
      const a = arch(0xc9a84c);
      a.position.set(p.x, 0, p.z - 0.2);
      scene.add(a);
      const bn = bannerSprite('출발 START', '#C9A84C', 2.2);
      bn.position.set(p.x, 2.75, p.z - 0.2);
      scene.add(bn);
      signs.push({ s: bn });
    }
    if (c.kind === 'gate') {
      const a = arch(0x2e7bc4, 2.4);
      a.position.set(p.x, 0.15, p.z);
      scene.add(a);
      const bn = bannerSprite('미니게임', '#5BC0EB', 2.6);
      bn.position.set(p.x, 2.75, p.z);
      scene.add(bn);
      signs.push({ s: bn });
    }
  });

  // 지역 입구 배너
  regions.forEach((reg, k) => {
    if (k === 0) return; // 첫 지역은 화면 위 표시로 충분
    const first = ranges[k][0] + 1;
    const p = cellPosition(first);
    const side = first % 2 ? -1 : 1;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.4, 6), m(0x6b4f2a));
    post.position.set(p.x + side * 2.6, 1.2, p.z + 1.2);
    scene.add(post);
    const bn = bannerSprite(reg.name, reg.color === '#7A3FA8' ? '#C9A2E8' : shade(reg.color, 0.25).getStyle(), 2.8);
    bn.position.set(post.position.x, 2.6, post.position.z);
    scene.add(bn);
    signs.push({ s: bn });
  });

  // 목적지 성
  const goal = cellPosition(N - 1);
  const cs = castle();
  cs.position.set(goal.x, 0, goal.z - 4.2);
  scene.add(cs);

  // 소품 (길과 건물은 피해서)
  const occupied = [];
  cells.forEach((c) => {
    const p = cellPosition(c.i);
    occupied.push([p.x, p.z, 2.6]);
    if (c.kind === 'quiz') occupied.push([p.x + (c.i % 2 ? 1 : -1) * 3.0, p.z, 2.0]);
  });
  occupied.push([goal.x, goal.z - 4.2, 5]);
  const free = (x, z) => occupied.every(([a, b, rad]) => (x - a) ** 2 + (z - b) ** 2 > rad * rad) && Math.abs(x - pathX(-z / SP)) > 2.2;
  regions.forEach((reg, k) => {
    const [a, b] = ranges[k];
    const count = { village: 70, city: 46, canyon: 44, castle: 40 }[reg.id];
    for (let n = 0; n < count; n++) {
      const z = -(a + r() * (b - a + 1)) * SP + 2;
      const x = (r() * 2 - 1) * 16;
      if (!free(x, z)) continue;
      let o;
      if (reg.id === 'village') o = r() < 0.85 ? tree(r) : (() => { const f = new THREE.Mesh(new THREE.SphereGeometry(0.25, 6, 4), m([0xff7aa8, 0xffd43b, 0xffffff][n % 3])); f.position.y = 0.2; const g = new THREE.Group(); g.add(f); return g; })();
      else if (reg.id === 'city') {
        const h = 1 + r() * 3.5;
        o = new THREE.Mesh(new THREE.BoxGeometry(1 + r(), h, 1 + r()), m([0xa9bdd6, 0x8ea7c4, 0xc7d5e6, 0x7790b0][n % 4]));
        o.position.y = h / 2;
        if (r() < 0.3) { o = tree(r, 0x4f9a6a); }
      } else if (reg.id === 'canyon') {
        if (r() < 0.5 && Math.abs(x - pathX(-z / SP)) > 5.5) {
          const h = 1 + r() * 3;
          o = new THREE.Mesh(new THREE.CylinderGeometry(0.8 + r(), 1.2 + r(), h, 6), m([0xc96f3b, 0xb85c2c, 0xd98a52][n % 3]));
          o.position.y = h / 2;
        } else {
          o = new THREE.Mesh(new THREE.DodecahedronGeometry(0.4 + r() * 0.5, 0), m(0xa0603a));
          o.position.y = 0.3;
        }
      } else {
        o = r() < 0.5 ? tree(r, 0x6a5aa8) : new THREE.Mesh(new THREE.OctahedronGeometry(0.35 + r() * 0.3, 0), m(0xd7b8ff, { emissive: 0x7a3fa8, emissiveIntensity: 0.25 }));
        if (o.isMesh) o.position.y = 0.6;
      }
      const g = o.isGroup ? o : new THREE.Group().add(o);
      g.position.set(x, 0, z);
      g.rotation.y = r() * Math.PI;
      g.traverse((q) => { if (q.isMesh) { q.castShadow = true; q.receiveShadow = true; } });
      scene.add(g);
    }
  });

  // 구름
  for (let n = 0; n < 14; n++) {
    const c = new THREE.Group();
    for (let k = 0; k < 4; k++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.8 + r() * 0.7, 8, 6), m(0xffffff, { roughness: 1 }));
      s.position.set(k * 0.9, r() * 0.4, r() * 0.5);
      c.add(s);
    }
    c.position.set((r() * 2 - 1) * 24, 9 + r() * 4, -r() * N * SP);
    scene.add(c);
    animated.push({ obj: c, kind: 'cloud' });
  }

  /** 도착 칸 반짝임 */
  function sparkle(i) {
    const p = cellPosition(i);
    const tile = tiles[i];
    tile.material.emissive = new THREE.Color(0xffd36b);
    const b = tile.userData.building;
    for (let k = 0; k < 14; k++) {
      const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.09, 0), new THREE.MeshBasicMaterial({ color: k % 2 ? 0xffd36b : 0xffffff, transparent: true }));
      const a = (k / 14) * Math.PI * 2;
      s.position.set(p.x + Math.cos(a) * 0.9, 0.4, p.z + Math.sin(a) * 0.9);
      s.userData = { a, life: 1.1, vy: 1.4 + Math.random() };
      scene.add(s);
      sparkles.push(s);
    }
    sparkles.push({ isPulse: true, tile, b, life: 1.1 });
  }

  /** 멀리 있는 간판은 흐리게 (화면이 복잡하지 않게) */
  function focus(target) {
    signs.forEach(({ s: sg, far }) => {
      const dz = sg.position.z - target.z; // + 이면 캐릭터보다 카메라 쪽
      let o = 1;
      if (!target.isTitle) {
        if (far) { const d = Math.abs(dz); o = d < 9 ? 1 : d > 16 ? 0 : 1 - (d - 9) / 7; }
        if (dz > 3) o = 0; // 이미 지나온 간판 (카메라 바로 앞이라 화면을 가림)
        else if (dz > -0.6 && Math.abs(sg.position.x - target.x) < 3.6) o = Math.min(o, 0.12); // 캐릭터를 가리면 흐리게
      }
      sg.material.opacity += (o - sg.material.opacity) * 0.15;
      sg.visible = sg.material.opacity > 0.02;
    });
  }

  function update(dt, t) {
    animated.forEach(({ obj, kind }) => {
      if (kind === 'bob') obj.position.y = obj.userData.baseY + Math.sin(t * 2 + obj.userData.phase) * 0.12;
      else if (kind === 'spin') obj.rotation.y += dt * 2.5;
      else if (kind === 'cloud') { obj.position.x += dt * 0.3; if (obj.position.x > 30) obj.position.x = -30; }
    });
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

  return { N, cellPosition, direction, sparkle, update, focus, sun, tiles };
}
