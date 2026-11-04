// 귀여운 동물 친구들 (직접 만든 단순한 3D 모양) — 마을을 돌아다니고, 미니게임에 성공하면 펫이 되어 따라온다
import * as THREE from 'three';

const toon = (c) => new THREE.MeshToonMaterial({ color: c });
const ball = (r, c, sx = 1, sy = 1, sz = 1) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 14), toon(c)); m.scale.set(sx, sy, sz); m.castShadow = true; return m; };
const cone = (r, h, c) => { const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 12), toon(c)); m.castShadow = true; return m; };

export const ANIMALS = {
  rabbit: { name: '토끼', emoji: '🐰', body: 0xffffff, ear: 0xffc0d0 },
  cat: { name: '고양이', emoji: '🐱', body: 0xffb35c, ear: 0xff8f3a },
  puppy: { name: '강아지', emoji: '🐶', body: 0xe8c48a, ear: 0x8a5a35 },
  bear: { name: '아기곰', emoji: '🐻', body: 0xb07a4f, ear: 0x8a5a35 },
  chick: { name: '병아리', emoji: '🐥', body: 0xffe066, ear: 0xffa94d },
  pig: { name: '아기돼지', emoji: '🐷', body: 0xffb7c5, ear: 0xff8fa8 },
};
export const ANIMAL_KINDS = Object.keys(ANIMALS);

/** @returns THREE.Group (발이 y=0), userData.anim 으로 통통 움직임 */
export function makeAnimal(kind, scale = 1) {
  const A = ANIMALS[kind] || ANIMALS.rabbit;
  const g = new THREE.Group();
  const body = new THREE.Group();
  g.add(body);
  const torso = ball(0.22, A.body, 1, 0.9, 1.05); torso.position.y = 0.22; body.add(torso);
  const head = new THREE.Group(); head.position.set(0, 0.5, 0.06); body.add(head);
  head.add(ball(0.2, A.body));
  // 얼굴: 까만 눈 · 볼터치 · 작은 코
  [-1, 1].forEach((s) => {
    const eye = ball(0.028, 0x2b2350); eye.position.set(s * 0.075, 0.02, 0.18); head.add(eye);
    const shine = ball(0.009, 0xffffff); shine.position.set(s * 0.075 + 0.01, 0.035, 0.205); head.add(shine);
    const blush = ball(0.035, 0xff8fa8, 1, 0.6, 0.4); blush.position.set(s * 0.12, -0.05, 0.15); head.add(blush);
  });
  if (kind === 'chick') { const beak = cone(0.04, 0.08, 0xffa94d); beak.rotation.x = Math.PI / 2; beak.position.set(0, -0.03, 0.2); head.add(beak); }
  else if (kind === 'pig') { const sn = ball(0.06, 0xff8fa8, 1.2, 0.85, 0.5); sn.position.set(0, -0.04, 0.19); head.add(sn); }
  else { const nose = ball(0.022, kind === 'puppy' || kind === 'bear' ? 0x2b2350 : 0xff6f91); nose.position.set(0, -0.02, 0.2); head.add(nose); }
  // 귀
  if (kind === 'rabbit') [-1, 1].forEach((s) => { const e = ball(0.06, A.body, 0.7, 2.6, 0.5); e.position.set(s * 0.08, 0.27, -0.02); e.rotation.z = -s * 0.15; head.add(e); const ei = ball(0.035, A.ear, 0.6, 2.2, 0.3); ei.position.set(s * 0.08, 0.27, 0.01); ei.rotation.z = -s * 0.15; head.add(ei); });
  else if (kind === 'cat') [-1, 1].forEach((s) => { const e = cone(0.07, 0.13, A.ear); e.position.set(s * 0.12, 0.17, 0); e.rotation.z = -s * 0.3; head.add(e); });
  else if (kind === 'puppy') [-1, 1].forEach((s) => { const e = ball(0.07, A.ear, 0.6, 1.4, 0.5); e.position.set(s * 0.19, 0.02, 0); e.rotation.z = s * 0.3; head.add(e); });
  else if (kind === 'bear' || kind === 'pig') [-1, 1].forEach((s) => { const e = ball(0.06, A.ear); e.position.set(s * 0.13, 0.16, -0.02); head.add(e); });
  else if (kind === 'chick') { const tuft = cone(0.03, 0.09, A.ear); tuft.position.set(0, 0.22, 0); head.add(tuft); }
  // 발 · 꼬리
  [-1, 1].forEach((s) => { const f = ball(0.06, A.body, 1, 0.6, 1.2); f.position.set(s * 0.1, 0.04, 0.05); body.add(f); });
  const tail = kind === 'rabbit' ? ball(0.07, 0xffffff) : kind === 'cat' ? ball(0.04, A.ear, 0.8, 0.8, 3) : ball(0.05, A.ear);
  tail.position.set(0, 0.25, -0.22); if (kind === 'cat') { tail.position.y = 0.32; tail.rotation.x = 0.8; }
  body.add(tail);
  g.scale.setScalar(scale);
  g.userData = { kind, body, head, phase: Math.random() * 6, hop: kind === 'rabbit' || kind === 'chick' };
  return g;
}

/** 매 프레임: 걷는 중이면 통통 튀고, 서 있으면 고개만 갸웃 */
export function animateAnimal(a, t, moving) {
  const u = a.userData;
  const k = t * (u.hop ? 9 : 7) + u.phase;
  u.body.position.y = moving ? Math.abs(Math.sin(k)) * (u.hop ? 0.14 : 0.06) : Math.abs(Math.sin(t * 2 + u.phase)) * 0.015;
  u.body.rotation.z = moving && !u.hop ? Math.sin(k) * 0.12 : 0;
  u.head.rotation.z = Math.sin(t * 1.3 + u.phase) * 0.15;
}
