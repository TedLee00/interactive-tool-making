// 플레이어 말 = 진짜 3D 캐릭터 인형 (chibi.js) — 받침 없이 바닥에 바로 선다
// 동작: idle(대기) · hop(한 칸: 왼발·오른발 번갈아 한 발로 콩! 마지막 칸만 두 발 착지) · joy · sad · win · wave
import * as THREE from 'three';
import { makeChibi } from './chibi.js';

const HEIGHT = 1.55;

export function createAvatar(c, { height = HEIGHT } = {}) {
  const root = new THREE.Group(); // 위치 · 진행 방향 (게임이 조작)
  const rig = new THREE.Group(); // 점프·찌그러짐
  root.add(rig);
  const turn = new THREE.Group(); // 서 있을 때는 카메라 쪽으로 몸을 돌림
  rig.add(turn);
  const M = makeChibi(c.id, c.color);
  const k = height / 1.45;
  M.group.scale.setScalar(k);
  turn.add(M.group);

  let anim = 'idle';
  let t = 0;
  let opt = {};
  const camPos = new THREE.Vector3();
  const tmp = new THREE.Vector3();

  function setAnim(name, o = {}) { anim = name; t = 0; opt = o; }

  const lerp = (a, b, u) => a + (b - a) * u;
  function pose({ lL = 0, lR = 0, aL = 0, aR = 0, aLz = 0, aRz = 0, hd = 0, lean = 0, bob = 0, sq = 1 }) {
    M.legL.rotation.x = lL; M.legR.rotation.x = lR;
    M.armL.rotation.x = aL; M.armR.rotation.x = aR;
    M.armL.rotation.z = -0.18 - aLz; M.armR.rotation.z = 0.18 + aRz;
    M.head.rotation.z = hd;
    M.group.rotation.x = lean;
    M.group.position.y = bob;
    rig.scale.set(1 + (1 - sq) * 0.6, sq, 1 + (1 - sq) * 0.6);
  }

  /** @param camera 있으면 서 있을 때 그쪽을 본다 */
  function update(dt, camera) {
    t += dt;
    rig.position.y = 0;
    rig.rotation.set(0, 0, 0);
    M.group.rotation.y = 0;
    // 몸 방향: 이동 중에는 진행 방향, 멈추면 카메라 쪽으로 부드럽게
    if (camera && anim !== 'hop') {
      camera.getWorldPosition(camPos);
      root.getWorldPosition(tmp);
      let want = Math.atan2(camPos.x - tmp.x, camPos.z - tmp.z) - root.rotation.y;
      want = Math.atan2(Math.sin(want), Math.cos(want));
      let d = want - turn.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d));
      turn.rotation.y += d * Math.min(1, dt * 6);
    } else if (anim === 'hop') turn.rotation.y += (0 - turn.rotation.y) * Math.min(1, dt * 14);

    if (anim === 'idle') {
      const s = Math.sin(t * 2.4);
      pose({ aL: s * 0.08, aR: -s * 0.08, hd: Math.sin(t * 1.3) * 0.08, sq: 1 + s * 0.015 });
    } else if (anim === 'hop') {
      // 한 칸 = 0.42초: 웅크림(0~16%) → 한 발로 차고 날아감 → 앞발로 착지(80%) → 무릎 콩
      const p = Math.min(1, t / 0.42);
      const L = opt.foot !== 'R'; const s = L ? 1 : -1; // 앞으로 내딛는 다리: L 이면 왼발
      const both = !!opt.last;
      if (p < 0.16) {
        const u = p / 0.16;
        pose({ lL: both ? 0.15 * u : (L ? -0.15 : 0.2) * u, lR: both ? 0.15 * u : (L ? 0.2 : -0.15) * u, aL: 0.4 * u * s, aR: -0.4 * u * s, sq: 1 - 0.12 * u, bob: -0.03 * u, lean: 0.08 * u });
      } else if (p < 0.8) {
        const u = (p - 0.16) / 0.64; const w = Math.sin(u * Math.PI);
        if (both) pose({ lL: -0.35 * w, lR: -0.35 * w, aL: -2.3 * w, aR: -2.3 * w, aLz: 0.3 * w, aRz: 0.3 * w, lean: 0.1, sq: 1 + 0.06 * w, hd: 0 });
        else {
          // 앞다리는 쭉 앞으로, 뒷다리는 뒤로 차올림 · 팔은 반대로 크게 흔들기
          const fwd = lerp(-0.2, -0.75, Math.min(1, u * 1.6)); const back = lerp(0.3, 0.9, w);
          pose({ lL: L ? fwd : back, lR: L ? back : fwd, aL: (L ? 0.9 : -0.9) * w, aR: (L ? -0.9 : 0.9) * w, lean: 0.18 * w, sq: 1 + 0.05 * w, hd: s * 0.08 * w });
        }
      } else {
        const u = (p - 0.8) / 0.2; const w = Math.sin(u * Math.PI);
        if (both) pose({ lL: 0.12 * w, lR: 0.12 * w, aL: -0.4 * (1 - u), aR: -0.4 * (1 - u), aLz: 0.4 * w, aRz: 0.4 * w, sq: 1 - 0.14 * w, bob: -0.03 * w });
        else pose({ lL: L ? -0.3 * (1 - u) : 0.35 * (1 - u), lR: L ? 0.35 * (1 - u) : -0.3 * (1 - u), aL: 0.4 * s * (1 - u), aR: -0.4 * s * (1 - u), sq: 1 - 0.08 * w, lean: 0.1 * (1 - u) });
      }
    } else if (anim === 'joy') {
      const p = (t % 0.55) / 0.55; const w = Math.sin(p * Math.PI);
      rig.position.y = w * 0.55;
      pose({ aL: -2.6, aR: -2.6, aLz: 0.35, aRz: 0.35, lL: -0.3 * w, lR: 0.3 * w, hd: Math.sin(t * 8) * 0.12, sq: 1 + 0.06 * w });
      M.group.rotation.y = t < 1.1 ? (t / 1.1) * Math.PI * 2 : 0;
    } else if (anim === 'sad') {
      pose({ aL: 0.15, aR: 0.15, aLz: -0.1, aRz: -0.1, hd: Math.sin(t * 2) * 0.05, lean: 0.25, sq: 0.94 });
      M.head.rotation.x = 0.35;
    } else if (anim === 'win') {
      const w = Math.abs(Math.sin(t * 4));
      rig.position.y = w * 0.5;
      pose({ aL: -2.7, aR: -2.7, aLz: 0.3 + w * 0.3, aRz: 0.3 + w * 0.3, lL: -0.4 * w, lR: -0.4 * w, sq: 1 + 0.05 * w });
      M.group.rotation.y = t * 3.2;
    } else if (anim === 'wave') {
      pose({ aR: -2.5, aRz: 0.4 + Math.sin(t * 6) * 0.35, aL: 0.05, hd: Math.sin(t * 3) * 0.1, sq: 1 + Math.sin(t * 3) * 0.015 });
    }
    if (anim !== 'sad') M.head.rotation.x = anim === 'hop' ? 0 : -0.2; // 위에서 보는 카메라에 얼굴이 잘 보이게 살짝 들기
  }

  return { root, setAnim, update, get anim() { return anim; } };
}
