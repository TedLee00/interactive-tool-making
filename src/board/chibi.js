// 진짜 3D 캐릭터 (도형으로 만든 귀여운 2등신 인형) — 캐릭터마다 피부·머리·모자·옷·신발 색과 모양을 그대로
// 관절: legL / legR (엉덩이) · armL / armR (어깨) · head (목) — avatar.js 가 이걸 움직여 걷고·뛰고·만세를 한다
import * as THREE from 'three';

const toon = (c) => new THREE.MeshToonMaterial({ color: new THREE.Color(c) });
function mesh(geo, color, { x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0 } = {}) {
  const m = new THREE.Mesh(geo, typeof color === 'string' || typeof color === 'number' ? toon(color) : color);
  m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.set(rx, ry, rz);
  m.castShadow = true;
  return m;
}
const S = (r, w = 20, h = 14) => new THREE.SphereGeometry(r, w, h);
const CYL = (r1, r2, h, n = 14) => new THREE.CylinderGeometry(r1, r2, h, n);

// 캐릭터별 모양 (legacy 댄서 설정과 같은 색) + 그림에만 있던 캐릭터들
const CFG = {
  bboy: { skin: '#5A3824', hair: 'buzz', hairCol: '#120c08', hat: 'snapB', hatCol: '#E0453A', hatCol2: '#1B2F4E', top: 'tee', topCol: '#28A064', print: '#FFD43B', botCol: '#1B2F4E', shoe: '#fff', chain: true },
  perm: { skin: '#F3CBA5', hair: 'perm', hairCol: '#141010', top: 'crop', topCol: '#E21E8C', botCol: '#2E7D5B', shoe: '#fff', hoops: true },
  blond: { skin: '#FFE2CC', hair: 'curly', hairCol: '#F4C64E', hat: 'bucket', hatCol: '#2E9BDA', top: 'tank', topCol: '#FFD43B', botCol: '#4F7CC4', shoe: '#E21E8C' },
  disco: { skin: '#8D5A3B', hair: 'afro', hairCol: '#24170f', top: 'jacket', topCol: '#F2C14E', topCol2: '#E21E8C', botCol: '#FFFFFF', shoe: '#F2C14E', chain: true, glasses: 'round' },
  braids: { skin: '#6B4226', hair: 'braids', hairCol: '#1a120c', top: 'hoodie', topCol: '#2E9BDA', botCol: '#222831', shoe: '#fff', phones: '#E21E8C' },
  popper: { skin: '#E8B98F', hair: 'mohawk', hairCol: '#E21E8C', top: 'track', topCol: '#1B2F4E', topCol2: '#fff', botCol: '#1B2F4E', shoe: '#fff', glasses: 'shades' },
  latina: { skin: '#C68B59', hair: 'pony', hairCol: '#2b1a10', hat: 'bandana', hatCol: '#E0453A', top: 'overalls', topCol: '#FFFFFF', botCol: '#4F7CC4', shoe: '#fff', hoops: true },
  bun: { skin: '#FFE2CC', hair: 'bun', hairCol: '#C2482B', hat: 'headband', hatCol: '#28A064', top: 'crop', topCol: '#28A064', botCol: '#7BA7D9', shoe: '#fff' },
  daejang: { skin: '#FFDCC0', hair: 'tuft', hairCol: '#14110F', top: 'tee', topCol: '#2F5DB8', print: '#fff', botCol: '#1B2F4E', shoe: '#fff', tongue: true },
  mukeon: { skin: '#FFE3CC', hair: 'short', hairCol: '#C8955A', top: 'jacket', topCol: '#FFFFFF', topCol2: '#1B2F4E', botCol: '#4F7CC4', shoe: '#fff', mask: '#A9B0B9' },
  yeosin: { skin: '#FFE3CC', hair: 'long', hairCol: '#4A2A1A', top: 'dress', topCol: '#FF8FB1', botCol: '#FFE3CC', shoe: '#E21E8C', glasses: 'round', halo: true },
  ted: { skin: '#FFE0C2', hair: 'spiky', hairCol: '#2B2724', top: 'shirt', topCol: '#FFFFFF', tie: '#24346B', botCol: '#1E1E25', shoe: '#0B0B0E', glasses: 'square', noBlush: true },
};

/** @returns {{ group: THREE.Group, legL, legR, armL, armR, head, torso }} 발바닥이 y=0, 앞이 +z */
export function makeChibi(id, fallbackColor = '#4F7CC4') {
  const c = CFG[id] || { skin: '#FFE2CC', hair: 'short', hairCol: '#3A2316', top: 'tee', topCol: fallbackColor, botCol: '#1B2F4E', shoe: '#fff' };
  const g = new THREE.Group();
  const ink = '#2B2350';
  // ---- 다리 (엉덩이 관절) ----
  const leg = (s) => {
    const p = new THREE.Group(); p.position.set(s * 0.095, 0.4, 0);
    const pants = c.top === 'dress' ? c.skin : c.botCol;
    p.add(mesh(CYL(0.072, 0.066, 0.3), pants, { y: -0.15 }));
    if (c.top === 'dress') p.add(mesh(CYL(0.07, 0.07, 0.06), '#fff', { y: -0.27 })); // 양말
    const shoe = mesh(S(0.1), c.shoe, { y: -0.335, z: 0.035, sx: 0.85, sy: 0.55, sz: 1.25 });
    p.add(shoe);
    p.add(mesh(S(0.1), c.shoe === '#fff' ? '#D9D4E6' : ink, { y: -0.37, z: 0.035, sx: 0.88, sy: 0.18, sz: 1.3 })); // 밑창
    g.add(p); return p;
  };
  const legL = leg(-1); const legR = leg(1);
  // ---- 몸통 ----
  const torso = new THREE.Group(); torso.position.y = 0.4; g.add(torso);
  const body = c.top === 'dress' ? mesh(CYL(0.15, 0.27, 0.4, 18), c.topCol, { y: 0.2 }) : mesh(new THREE.CapsuleGeometry(0.17, 0.18, 6, 16), c.topCol, { y: 0.22, sz: 0.86 });
  torso.add(body);
  if (c.top !== 'dress') torso.add(mesh(CYL(0.175, 0.18, 0.1, 16), c.botCol, { y: 0.04, sz: 0.86 })); // 허리 · 바지 윗단
  if (c.top === 'overalls') { torso.add(mesh(new THREE.BoxGeometry(0.2, 0.17, 0.05), c.botCol, { y: 0.16, z: 0.13 })); [-1, 1].forEach((s) => torso.add(mesh(new THREE.BoxGeometry(0.035, 0.2, 0.03), c.botCol, { x: s * 0.075, y: 0.3, z: 0.13, rz: s * 0.15 }))); }
  if (c.top === 'jacket' || c.top === 'track') { torso.add(mesh(new THREE.BoxGeometry(0.08, 0.3, 0.04), c.topCol2 || '#fff', { y: 0.22, z: 0.145 })); }
  if (c.top === 'hoodie') torso.add(mesh(new THREE.TorusGeometry(0.13, 0.04, 8, 18), c.topCol, { y: 0.4, z: -0.04, rx: Math.PI / 2 }));
  if (c.top === 'crop') torso.add(mesh(CYL(0.165, 0.165, 0.06, 16), c.skin, { y: 0.1, sz: 0.86 }));
  if (c.print) torso.add(mesh(new THREE.CircleGeometry(0.06, 16), new THREE.MeshBasicMaterial({ color: c.print }), { y: 0.24, z: 0.152 }));
  if (c.top === 'shirt') { // Ted: 흰 셔츠 + 남색 넥타이 + 깃 + 벨트
    torso.add(mesh(new THREE.BoxGeometry(0.05, 0.22, 0.03), c.tie, { y: 0.24, z: 0.15 }));
    torso.add(mesh(new THREE.ConeGeometry(0.035, 0.06, 4), c.tie, { y: 0.11, z: 0.15, rx: Math.PI }));
    [-1, 1].forEach((s) => torso.add(mesh(new THREE.BoxGeometry(0.08, 0.04, 0.04), '#F2EEE8', { x: s * 0.05, y: 0.38, z: 0.12, rz: s * 0.5 })));
    torso.add(mesh(CYL(0.178, 0.178, 0.03, 16), '#2B2B33', { y: 0.08, sz: 0.88 }));
  }
  if (c.chain) torso.add(mesh(new THREE.TorusGeometry(0.1, 0.015, 6, 20), '#FFD43B', { y: 0.34, z: 0.06, rx: 1.2 }));
  // ---- 팔 (어깨 관절) ----
  const arm = (s) => {
    const p = new THREE.Group(); p.position.set(s * 0.2, 0.75, 0); p.rotation.z = s * 0.18;
    const sleeve = c.top === 'tank' || c.top === 'crop' ? c.skin : c.top === 'dress' ? c.skin : c.topCol;
    p.add(mesh(CYL(0.055, 0.05, 0.26), sleeve, { y: -0.12 }));
    p.add(mesh(S(0.065), c.skin, { y: -0.27 }));
    g.add(p); return p;
  };
  const armL = arm(-1); const armR = arm(1);
  // ---- 머리 (목 관절) ----
  const head = new THREE.Group(); head.position.y = 0.86; g.add(head);
  const HR = 0.3;
  head.add(mesh(S(HR, 28, 20), c.skin, { y: HR * 0.92 }));
  const hy = HR * 0.92;
  [-1, 1].forEach((s) => head.add(mesh(S(0.06), c.skin, { x: s * HR * 0.98, y: hy, sx: 0.5 }))); // 귀
  // 얼굴: 반짝이는 눈 · 웃는 입 · 볼
  const black = new THREE.MeshBasicMaterial({ color: '#1B1430' });
  [-1, 1].forEach((s) => {
    head.add(mesh(S(0.042, 14, 10), black, { x: s * 0.105, y: hy + 0.02, z: HR * 0.9, sy: 1.25, sz: 0.6 }));
    head.add(mesh(S(0.013, 8, 6), new THREE.MeshBasicMaterial({ color: '#fff' }), { x: s * 0.105 + 0.012, y: hy + 0.04, z: HR * 0.93 }));
    if (!c.noBlush) head.add(mesh(S(0.04, 12, 8), new THREE.MeshBasicMaterial({ color: '#FF9EB5', transparent: true, opacity: 0.55 }), { x: s * 0.17, y: hy - 0.06, z: HR * 0.82, sz: 0.4, sy: 0.6 }));
  });
  if (c.mask) head.add(mesh(new THREE.BoxGeometry(0.22, 0.08, 0.06), c.mask, { y: hy - 0.1, z: HR * 0.86, rx: -0.2 }));
  else {
    const smile = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.012, 6, 16, Math.PI), black);
    smile.position.set(0, hy - 0.075, HR * 0.94); smile.rotation.set(0.25, 0, Math.PI); head.add(smile);
    if (c.tongue) head.add(mesh(S(0.025), '#FF7AA8', { y: hy - 0.12, z: HR * 0.92, sz: 0.5 }));
  }
  if (c.glasses) {
    const fr = c.glasses === 'shades' ? '#1B1430' : '#14110F';
    [-1, 1].forEach((s) => {
      const ring = c.glasses === 'square' ? mesh(new THREE.TorusGeometry(0.058, 0.012, 4, 4), fr, { x: s * 0.105, y: hy + 0.02, z: HR * 0.95, rz: Math.PI / 4, sx: 1.3 })
        : mesh(new THREE.TorusGeometry(0.055, 0.011, 8, 18), fr, { x: s * 0.105, y: hy + 0.02, z: HR * 0.95 });
      head.add(ring);
      if (c.glasses === 'shades') head.add(mesh(new THREE.CircleGeometry(0.055, 14), fr, { x: s * 0.105, y: hy + 0.02, z: HR * 0.955 }));
    });
    head.add(mesh(CYL(0.008, 0.008, 0.06, 6), fr, { y: hy + 0.03, z: HR * 0.96, rz: Math.PI / 2 }));
  }
  // 머리카락
  const hc = c.hairCol;
  const cap = (k = 1.06, cut = 0.55, tilt = -0.35) => mesh(new THREE.SphereGeometry(HR * k, 26, 16, 0, Math.PI * 2, 0, Math.PI * cut), hc, { y: hy, rx: tilt });
  const H = c.hair;
  if (H === 'buzz' || H === 'short' || H === 'tuft') head.add(cap(1.05, 0.5));
  if (H === 'tuft') { const t = mesh(new THREE.TorusGeometry(0.06, 0.018, 6, 12, Math.PI * 1.4), hc, { y: hy + HR + 0.06, z: 0.02, ry: Math.PI / 2 }); head.add(t); }
  if (H === 'spiky') { head.add(cap(1.05, 0.5)); for (let k = 0; k < 9; k++) { const a = (k / 9) * Math.PI * 2; head.add(mesh(new THREE.ConeGeometry(0.06, 0.14, 6), hc, { x: Math.cos(a) * 0.16, y: hy + HR * 0.86, z: Math.sin(a) * 0.16 - 0.03, rx: Math.sin(a) * 0.6, rz: -Math.cos(a) * 0.6 })); } head.add(mesh(new THREE.ConeGeometry(0.07, 0.16, 6), hc, { y: hy + HR + 0.04 })); }
  if (H === 'perm' || H === 'afro' || H === 'curly') {
    const n = H === 'afro' ? 16 : 13; const R0 = H === 'afro' ? 0.3 : 0.27; const br = H === 'afro' ? 0.12 : 0.1;
    head.add(cap(1.07, 0.55));
    for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2; const up = k % 2 ? 0.1 : 0.2; head.add(mesh(S(br, 12, 9), hc, { x: Math.cos(a) * R0, y: hy + up + (Math.sin(a) < 0 ? 0.05 : 0), z: Math.sin(a) * R0 - 0.04 })); }
    head.add(mesh(S(br * 1.3, 12, 9), hc, { y: hy + HR * 0.95 }));
  }
  if (H === 'mohawk') { head.add(cap(1.02, 0.45)); for (let k = -3; k <= 3; k++) head.add(mesh(new THREE.ConeGeometry(0.045, 0.2, 6), hc, { y: hy + Math.cos(k * 0.3) * HR + 0.08, z: Math.sin(k * 0.3) * HR, rx: k * 0.3 })); }
  if (H === 'pony') { head.add(cap(1.06, 0.55)); head.add(mesh(S(0.1, 12, 9), hc, { y: hy + 0.05, z: -HR - 0.04, sy: 1.6 })); }
  if (H === 'braids') { head.add(cap(1.06, 0.58)); [-1, 1].forEach((s) => { for (let k = 0; k < 4; k++) head.add(mesh(S(0.045, 10, 8), hc, { x: s * 0.22, y: hy - 0.05 - k * 0.07, z: -0.12 })); }); }
  if (H === 'bun') { head.add(cap(1.06, 0.55)); head.add(mesh(S(0.11, 14, 10), hc, { y: hy + HR + 0.06, z: -0.03 })); }
  if (H === 'long') { head.add(cap(1.07, 0.58)); head.add(mesh(CYL(0.26, 0.3, 0.42, 18, 1), hc, { y: hy - 0.18, z: -0.1, sz: 0.7 })); [-1, 1].forEach((s) => head.add(mesh(CYL(0.06, 0.08, 0.34), hc, { x: s * 0.27, y: hy - 0.14, z: 0.04 }))); }
  // 모자 · 소품
  if (c.hat === 'snapB') { head.add(mesh(new THREE.SphereGeometry(HR * 1.09, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.36), c.hatCol, { y: hy + 0.05, rx: -0.55 })); head.add(mesh(CYL(0.16, 0.16, 0.025, 18), c.hatCol2 || ink, { y: hy + 0.06, z: -0.3, rx: 0.5, sz: 1.2 })); } // 거꾸로 쓴 모자
  if (c.hat === 'bucket') { head.add(mesh(CYL(0.25, 0.3, 0.16, 20), c.hatCol, { y: hy + 0.24 })); head.add(mesh(CYL(0.42, 0.42, 0.025, 22), c.hatCol, { y: hy + 0.15 })); }
  if (c.hat === 'bandana' || c.hat === 'headband') head.add(mesh(new THREE.TorusGeometry(HR * 0.99, 0.028, 8, 28), c.hatCol, { y: hy + 0.1, z: -0.02, rx: Math.PI / 2 + 0.35 }));
  if (c.hoops) [-1, 1].forEach((s) => head.add(mesh(new THREE.TorusGeometry(0.04, 0.008, 6, 14), '#FFD43B', { x: s * HR * 0.98, y: hy - 0.08, ry: Math.PI / 2 })));
  if (c.phones) { head.add(mesh(new THREE.TorusGeometry(HR * 1.08, 0.022, 6, 24, Math.PI), c.phones, { y: hy, rz: 0 })); [-1, 1].forEach((s) => head.add(mesh(CYL(0.07, 0.07, 0.06, 14), c.phones, { x: s * HR * 1.04, y: hy, rz: Math.PI / 2 }))); }
  if (c.halo) head.add(mesh(new THREE.TorusGeometry(0.17, 0.022, 8, 24), new THREE.MeshBasicMaterial({ color: '#FFD43B' }), { y: hy + HR + 0.14, rx: Math.PI / 2 }));
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { group: g, legL, legR, armL, armR, head, torso };
}
