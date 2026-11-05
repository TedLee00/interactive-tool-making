// 귀여운 동물 친구들 — 동물의 숲 주민처럼 두 발로 서는 2등신 (큰 머리 · 작은 몸 · 옷 · 볼터치)
// 마을을 돌아다니고, 미니게임 성공 · 점수 돌파 때 펫이 되어 내 말 옆 칸을 따라 걷는다
import * as THREE from 'three';
import { brightToon } from './brightMat.js';

const toon = (c) => brightToon(c);
const basic = (c) => new THREE.MeshBasicMaterial({ color: c });
function m(geo, c, o = {}) {
  const x = new THREE.Mesh(geo, typeof c === 'object' ? c : toon(c));
  x.position.set(o.x || 0, o.y || 0, o.z || 0);
  x.scale.set(o.sx || 1, o.sy || 1, o.sz || 1);
  x.rotation.set(o.rx || 0, o.ry || 0, o.rz || 0);
  x.castShadow = true;
  return x;
}
const S = (r, w = 20, h = 14) => new THREE.SphereGeometry(r, w, h);
const CONE = (r, h) => new THREE.ConeGeometry(r, h, 14);
const CYL = (a, b, h) => new THREE.CylinderGeometry(a, b, h, 14);

// body: 털색 · belly: 배/주둥이 색 · ear: 귀 안쪽 · shirt: 옷 · type: 생김새
export const ANIMALS = {
  rabbit: { name: '토끼', emoji: '🐰', body: '#FFFFFF', belly: '#FFF4F8', ear: '#FFB8CC', shirt: '#FF8FB1', type: 'rabbit' },
  cat: { name: '고양이', emoji: '🐱', body: '#FFB35C', belly: '#FFF1DC', ear: '#FF8F3A', shirt: '#6FC3F0', type: 'cat' },
  puppy: { name: '강아지', emoji: '🐶', body: '#E8C48A', belly: '#FFF4E0', ear: '#8A5A35', shirt: '#E0453A', type: 'dog' },
  bear: { name: '아기곰', emoji: '🐻', body: '#B07A4F', belly: '#E8C9A0', ear: '#8A5A35', shirt: '#FFD43B', type: 'bear' },
  chick: { name: '병아리', emoji: '🐥', body: '#FFE066', belly: '#FFF3A8', ear: '#FFA94D', shirt: '#7ED07A', type: 'bird' },
  pig: { name: '아기돼지', emoji: '🐷', body: '#FFC2D1', belly: '#FFE3EA', ear: '#FF8FA8', shirt: '#8E7CF0', type: 'pig' },
  koala: { name: '코알라', emoji: '🐨', body: '#A9B0BC', belly: '#E8EBF0', ear: '#FFFFFF', shirt: '#4FB477', type: 'koala' },
  squirrel: { name: '다람쥐', emoji: '🐿️', body: '#E0894A', belly: '#FFE6C8', ear: '#B9612C', shirt: '#2E9BDA', type: 'squirrel' },
  frog: { name: '개구리', emoji: '🐸', body: '#7ED07A', belly: '#E6F8C8', ear: '#7ED07A', shirt: '#FFD43B', type: 'frog' },
  penguin: { name: '펭귄', emoji: '🐧', body: '#3A4A6B', belly: '#FFFFFF', ear: '#FFB347', shirt: '#E0453A', type: 'penguin' },
  hamster: { name: '햄스터', emoji: '🐹', body: '#F2C58A', belly: '#FFF6E8', ear: '#FFB8A0', shirt: '#FF9EC4', type: 'hamster' },
  sheep: { name: '아기양', emoji: '🐑', body: '#FFFFFF', belly: '#F3E3D3', ear: '#F3E3D3', shirt: '#7BA7D9', face: '#F3E3D3', type: 'sheep' },
  elephant: { name: '아기코끼리', emoji: '🐘', body: '#B8C4E8', belly: '#DDE4F8', ear: '#FFC2D1', shirt: '#FF8F3A', type: 'elephant' },
  duck: { name: '오리', emoji: '🦆', body: '#FFFFFF', belly: '#FFFFFF', ear: '#FFA94D', shirt: '#2E7BC4', type: 'duck' },
  fox: { name: '아기여우', emoji: '🦊', body: '#FF8A3D', belly: '#FFFFFF', ear: '#2B2350', shirt: '#28A064', type: 'fox' },
  panda: { name: '판다', emoji: '🐼', body: '#FFFFFF', belly: '#FFFFFF', ear: '#2B2B33', shirt: '#E21E8C', type: 'panda' },
  owl: { name: '부엉이', emoji: '🦉', body: '#A9845C', belly: '#F2DDBB', ear: '#7A5A3A', shirt: '#4F7CC4', type: 'owl' },
  deer: { name: '아기사슴', emoji: '🦌', body: '#D9A06A', belly: '#FFF1DC', ear: '#B97A45', shirt: '#B79CFF', type: 'deer' },
};
export const ANIMAL_KINDS = Object.keys(ANIMALS);

/** @returns THREE.Group (발이 y=0, 앞이 +z) — userData 에 관절 (몸 · 머리 · 팔 · 다리) */
export function makeAnimal(kind, scale = 1) {
  const A = ANIMALS[kind] || ANIMALS.rabbit;
  const T = A.type;
  const g = new THREE.Group();
  const body = new THREE.Group(); g.add(body);
  const ink = '#2B2350';
  // ---- 다리 · 발 (짧고 통통) ----
  const legs = [-1, 1].map((s) => {
    const p = new THREE.Group(); p.position.set(s * 0.075, 0.14, 0);
    const footC = T === 'bird' || T === 'duck' || T === 'penguin' ? A.ear : T === 'panda' ? '#2B2B33' : A.body;
    p.add(m(CYL(0.045, 0.05, 0.1), T === 'bird' || T === 'duck' || T === 'penguin' ? A.ear : A.body, { y: -0.05 }));
    p.add(m(S(0.06), footC, { y: -0.11, z: 0.025, sx: 1, sy: 0.6, sz: 1.3 }));
    body.add(p); return p;
  });
  // ---- 몸통 + 옷 ----
  const torso = m(S(0.15, 18, 14), A.shirt, { y: 0.24, sy: 1.05, sz: 0.9 });
  body.add(torso);
  body.add(m(CYL(0.11, 0.15, 0.04), A.shirt, { y: 0.31, sz: 0.9 })); // 옷깃 쪽
  body.add(m(S(0.045, 10, 8), '#FFFFFF', { y: 0.27, z: 0.13, sz: 0.4 })); // 단추
  if (T === 'penguin' || T === 'duck') body.add(m(S(0.11, 14, 10), A.belly, { y: 0.22, z: 0.06, sz: 0.6 }));
  // ---- 팔 (몽당) ----
  const arms = [-1, 1].map((s) => {
    const p = new THREE.Group(); p.position.set(s * 0.14, 0.31, 0); p.rotation.z = s * 0.5;
    const wing = T === 'bird' || T === 'duck' || T === 'penguin' || T === 'owl';
    p.add(m(S(0.05, 12, 10), wing ? A.body : A.shirt, { y: -0.04, sy: wing ? 1.8 : 1.2, sz: wing ? 0.5 : 1 }));
    if (!wing) p.add(m(S(0.04, 10, 8), T === 'panda' ? '#2B2B33' : A.body, { y: -0.1 }));
    body.add(p); return p;
  });
  // ---- 꼬리 ----
  const tail = new THREE.Group(); tail.position.set(0, 0.2, -0.14); body.add(tail);
  if (T === 'rabbit' || T === 'sheep' || T === 'koala' || T === 'hamster' || T === 'bear' || T === 'panda') tail.add(m(S(0.05), T === 'panda' ? '#2B2B33' : A.body));
  else if (T === 'cat') tail.add(m(CYL(0.025, 0.03, 0.22), A.body, { y: 0.1, z: -0.03, rx: -0.5 }));
  else if (T === 'dog') tail.add(m(S(0.04), A.body, { y: 0.05, sy: 1.8, rx: -0.6 }));
  else if (T === 'pig') tail.add(m(new THREE.TorusGeometry(0.03, 0.01, 6, 12), A.ear, { ry: Math.PI / 2 }));
  else if (T === 'squirrel') tail.add(m(S(0.11, 14, 10), A.body, { y: 0.16, z: -0.06, sy: 1.8, sx: 0.8, rx: 0.3 }));
  else if (T === 'fox') { tail.add(m(S(0.08, 14, 10), A.body, { y: 0.03, z: -0.08, sy: 0.9, sz: 1.8, rx: -0.4 })); tail.add(m(S(0.045), '#FFFFFF', { y: -0.01, z: -0.22 })); }
  else if (T === 'deer') tail.add(m(S(0.035), '#FFFFFF'));
  // ---- 머리 (아주 크게) ----
  const head = new THREE.Group(); head.position.y = 0.36; body.add(head);
  const HR = 0.21; const hy = HR * 0.95;
  const faceC = A.face || A.body;
  head.add(m(S(HR, 26, 20), faceC, { y: hy, sx: T === 'hamster' ? 1.12 : 1, sy: T === 'frog' ? 0.82 : 1 }));
  if (T === 'sheep') { for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; head.add(m(S(0.075, 12, 9), A.body, { x: Math.cos(a) * 0.17, y: hy + 0.1 + (k % 2) * 0.03, z: Math.sin(a) * 0.15 - 0.04 })); } head.add(m(S(0.09, 12, 9), A.body, { y: hy + 0.19 })); }
  // 얼굴: 반짝이는 큰 눈 · 볼터치 · 입
  const eyeY = T === 'frog' ? hy + 0.15 : hy + 0.02;
  const eyeX = T === 'frog' ? 0.1 : 0.075;
  [-1, 1].forEach((s) => {
    if (T === 'frog') head.add(m(S(0.065, 14, 10), A.body, { x: s * eyeX, y: eyeY - 0.01, z: 0.08 }));
    if (T === 'owl') head.add(m(S(0.065, 14, 10), A.belly, { x: s * 0.075, y: eyeY, z: HR * 0.78, sz: 0.4 }));
    if (T === 'panda') head.add(m(S(0.055, 12, 10), '#2B2B33', { x: s * 0.08, y: eyeY - 0.005, z: HR * 0.82, sz: 0.4, sy: 1.25, rz: s * -0.4 }));
    const ez = T === 'frog' ? 0.14 : HR * 0.9;
    head.add(m(S(0.032, 14, 10), basic('#1B1430'), { x: s * eyeX, y: eyeY, z: ez, sy: 1.3, sz: 0.6 }));
    head.add(m(S(0.011, 8, 6), basic('#FFFFFF'), { x: s * eyeX + 0.01, y: eyeY + 0.016, z: ez + 0.018 }));
    head.add(m(S(0.032, 10, 8), new THREE.MeshBasicMaterial({ color: '#FF8FA8', transparent: true, opacity: 0.6 }), { x: s * 0.125, y: hy - 0.045, z: HR * 0.8, sz: 0.35, sy: 0.6 }));
  });
  // 주둥이 · 부리 · 코
  if (T === 'bird' || T === 'owl') head.add(m(CONE(0.03, 0.07), '#FFA94D', { y: hy - 0.03, z: HR * 0.98, rx: Math.PI / 2 }));
  else if (T === 'duck' || T === 'penguin') head.add(m(S(0.05, 12, 8), '#FFA94D', { y: hy - 0.035, z: HR * 0.92, sx: 1.3, sy: 0.45, sz: 1.1 }));
  else if (T === 'pig') { head.add(m(CYL(0.05, 0.05, 0.04), A.ear, { y: hy - 0.03, z: HR * 0.96, rx: Math.PI / 2, sx: 1.2 })); [-1, 1].forEach((s) => head.add(m(S(0.01, 6, 5), basic('#C2335A'), { x: s * 0.018, y: hy - 0.03, z: HR + 0.02 }))); }
  else if (T === 'elephant') head.add(m(CYL(0.035, 0.045, 0.16), A.body, { y: hy - 0.08, z: HR * 0.92, rx: 0.5 }));
  else if (T === 'frog') { const sm = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.008, 6, 16, Math.PI), basic('#1B1430')); sm.position.set(0, hy + 0.02, HR * 0.8); sm.rotation.set(0.3, 0, Math.PI); head.add(sm); }
  else {
    const snout = T === 'dog' || T === 'bear' || T === 'fox' || T === 'deer' || T === 'koala';
    if (snout) head.add(m(S(0.065, 14, 10), T === 'koala' ? A.body : A.belly, { y: hy - 0.04, z: HR * 0.86, sx: 1.15, sy: 0.75, sz: 0.7 }));
    head.add(m(S(T === 'koala' ? 0.04 : 0.02, 10, 8), T === 'koala' || T === 'dog' || T === 'bear' || T === 'fox' || T === 'deer' ? '#2B2350' : '#FF6F91', { y: hy - (snout ? 0.02 : 0.025), z: HR * (snout ? 1.12 : 0.98), sy: T === 'koala' ? 1.3 : 1 }));
  }
  if (T !== 'frog' && T !== 'duck' && T !== 'penguin' && T !== 'bird' && T !== 'owl') { const sm = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.006, 6, 12, Math.PI), basic('#1B1430')); sm.position.set(0, hy - 0.07, HR * (['dog', 'bear', 'fox', 'deer', 'koala'].includes(T) ? 0.98 : 0.93)); sm.rotation.set(0.2, 0, Math.PI); head.add(sm); }
  // 귀 · 뿔 · 깃털
  const pair = (fn) => [-1, 1].forEach(fn);
  if (T === 'rabbit') pair((s) => { head.add(m(S(0.045, 12, 10), A.body, { x: s * 0.07, y: hy + 0.26, z: -0.02, sy: 2.6, sz: 0.6, rz: -s * 0.12 })); head.add(m(S(0.026, 10, 8), A.ear, { x: s * 0.07, y: hy + 0.26, z: 0.005, sy: 2.4, sz: 0.3, rz: -s * 0.12 })); });
  else if (T === 'cat' || T === 'fox') pair((s) => { head.add(m(CONE(0.06, 0.12), A.body, { x: s * 0.12, y: hy + 0.17, rz: -s * 0.3 })); head.add(m(CONE(0.035, 0.07), T === 'fox' ? '#2B2350' : A.ear, { x: s * 0.12, y: hy + 0.17, z: 0.02, rz: -s * 0.3 })); });
  else if (T === 'dog') pair((s) => head.add(m(S(0.06, 12, 10), A.ear, { x: s * 0.19, y: hy + 0.01, sx: 0.55, sy: 1.5, sz: 0.6, rz: s * 0.35 })));
  else if (T === 'bear' || T === 'hamster') pair((s) => { head.add(m(S(0.055), A.body, { x: s * 0.14, y: hy + 0.15, z: -0.02 })); head.add(m(S(0.03), A.ear, { x: s * 0.14, y: hy + 0.15, z: 0.02, sz: 0.5 })); });
  else if (T === 'panda') pair((s) => head.add(m(S(0.055), '#2B2B33', { x: s * 0.14, y: hy + 0.15, z: -0.02 })));
  else if (T === 'pig') pair((s) => head.add(m(CONE(0.05, 0.08), A.ear, { x: s * 0.12, y: hy + 0.17, z: 0.03, rz: -s * 0.4, rx: 0.4 })));
  else if (T === 'koala') pair((s) => { head.add(m(S(0.08, 14, 10), A.body, { x: s * 0.19, y: hy + 0.1, sz: 0.5 })); head.add(m(S(0.05, 12, 8), A.ear, { x: s * 0.19, y: hy + 0.1, z: 0.02, sz: 0.3 })); });
  else if (T === 'squirrel' || T === 'deer') pair((s) => head.add(m(S(0.04, 10, 8), A.body, { x: s * 0.13, y: hy + 0.17, sy: 1.6, sz: 0.6, rz: -s * 0.3 })));
  else if (T === 'elephant') pair((s) => { head.add(m(S(0.11, 14, 10), A.body, { x: s * 0.2, y: hy + 0.02, z: -0.03, sx: 0.3, sy: 1.1 })); head.add(m(S(0.08, 12, 8), A.ear, { x: s * 0.215, y: hy + 0.02, z: -0.01, sx: 0.2, sy: 1 })); });
  else if (T === 'sheep') pair((s) => head.add(m(S(0.04, 10, 8), A.ear, { x: s * 0.2, y: hy + 0.02, sx: 1.7, sy: 0.6, rz: s * 0.4 })));
  else if (T === 'owl') pair((s) => head.add(m(CONE(0.035, 0.08), A.ear, { x: s * 0.12, y: hy + 0.19, rz: -s * 0.25 })));
  else if (T === 'bird') head.add(m(CONE(0.025, 0.08), A.ear, { y: hy + HR + 0.02 }));
  else if (T === 'duck') head.add(m(S(0.03, 10, 8), '#FFE066', { y: hy + HR + 0.01, sy: 1.6 }));
  if (T === 'deer') pair((s) => { const b = new THREE.Group(); b.position.set(s * 0.06, hy + 0.19, -0.02); b.rotation.z = -s * 0.25; b.add(m(CYL(0.012, 0.016, 0.12), '#8A5A35', { y: 0.06 })); b.add(m(CYL(0.01, 0.012, 0.06), '#8A5A35', { x: s * 0.03, y: 0.08, rz: -s * 0.8 })); head.add(b); });
  if (T === 'squirrel') head.add(m(S(0.05, 10, 8), A.belly, { y: hy - 0.06, z: HR * 0.85, sx: 1.6, sy: 0.7, sz: 0.5 }));
  // 소품: 머리 위 작은 리본·잎사귀 (몇몇만)
  if (kind === 'rabbit' || kind === 'hamster' || kind === 'pig') pair((s) => head.add(m(CONE(0.03, 0.05), '#FF6F91', { x: s * 0.03 + 0.08, y: hy + 0.18, z: 0.06, rz: s * Math.PI / 2 })));
  if (kind === 'frog') head.add(m(S(0.035, 10, 8), '#4FB477', { y: hy + 0.2, z: 0.02, sx: 1.6, sy: 0.4, rz: 0.4 }));
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  g.scale.setScalar(scale * 1.25);
  g.userData = { kind, body, head, legs, arms, tail, phase: Math.random() * 6, hop: ['rabbit', 'bird', 'frog', 'squirrel', 'hamster'].includes(T) };
  return g;
}

/** 매 프레임: 걸으면 다리·팔을 흔들며 통통, 서 있으면 숨쉬기·고개 갸웃 · 꼬리 살랑 */
export function animateAnimal(a, t, moving) {
  const u = a.userData;
  const k = t * (u.hop ? 11 : 9) + u.phase;
  if (moving) {
    u.body.position.y = Math.abs(Math.sin(k)) * (u.hop ? 0.07 : 0.035);
    u.legs[0].rotation.x = Math.sin(k) * 0.7; u.legs[1].rotation.x = -Math.sin(k) * 0.7;
    u.arms[0].rotation.x = -Math.sin(k) * 0.8; u.arms[1].rotation.x = Math.sin(k) * 0.8;
    u.body.rotation.z = u.hop ? 0 : Math.sin(k) * 0.08;
  } else {
    u.body.position.y = Math.abs(Math.sin(t * 2 + u.phase)) * 0.01;
    u.legs.forEach((l) => { l.rotation.x *= 0.8; });
    u.arms[0].rotation.x = Math.sin(t * 1.6 + u.phase) * 0.15; u.arms[1].rotation.x = -Math.sin(t * 1.6 + u.phase) * 0.15;
    u.body.rotation.z = 0;
  }
  u.head.rotation.z = Math.sin(t * 1.3 + u.phase) * 0.14;
  u.tail.rotation.y = Math.sin(t * 6 + u.phase) * 0.4;
}
