// 3D 주사위 — 던져서 튀고 구르다가 정해진 눈이 위로 오며 멈춘다.
import * as THREE from 'three';
import { diceFace } from './textures.js';

// BoxGeometry 재질 순서: +x, -x, +y, -y, +z, -z  (마주 보는 면의 합 = 7)
const FACE_VALUES = [3, 4, 1, 6, 2, 5];
const NORMALS = [
  new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 1, 0),
  new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1),
];

export function createDice(scene) {
  const mats = FACE_VALUES.map((v) => new THREE.MeshStandardMaterial({ map: diceFace(v), roughness: 0.4, transparent: true }));
  const die = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), mats);
  die.castShadow = true;
  die.visible = false;
  scene.add(die);

  /** 이 눈이 위로 오는 회전 */
  function targetQuat(value) {
    const n = NORMALS[FACE_VALUES.indexOf(value)];
    const q = new THREE.Quaternion().setFromUnitVectors(n, new THREE.Vector3(0, 1, 0));
    const yaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.random() * Math.PI * 2);
    return yaw.multiply(q);
  }

  /**
   * @param value  나올 눈 (1~6)
   * @param from   던지는 위치
   * @param to     떨어지는 위치 (바닥)
   * @param onBounce 튈 때마다 호출 (효과음)
   */
  function roll(value, from, to, onBounce) {
    return new Promise((resolve) => {
      die.visible = true;
      mats.forEach((m) => { m.opacity = 1; });
      const qEnd = targetQuat(value);
      const axis = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
      const q0 = new THREE.Quaternion().setFromAxisAngle(axis, Math.random() * Math.PI * 2);
      const DUR = 1.6;
      const BOUNCES = [0, 0.42, 0.72, 0.9, 1];
      const H = [1.8, 0.7, 0.25, 0.08];
      const t0 = performance.now();
      let last = t0;
      let bounced = 0;
      const tmp = new THREE.Quaternion();
      const step = (now) => {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        const p = Math.min(1, (now - t0) / 1000 / DUR); // 실제 시간 기준 (느린 기기에서도 1.6초)
        // 위치: 던지는 곳 → 떨어지는 곳, 튀는 높이는 점점 작게
        const e = 1 - Math.pow(1 - p, 2);
        die.position.lerpVectors(from, to, e);
        let k = BOUNCES.findIndex((b, i) => p >= b && p < BOUNCES[i + 1]);
        if (k < 0) k = H.length - 1;
        const seg = (p - BOUNCES[k]) / (BOUNCES[k + 1] - BOUNCES[k]);
        const base = k === 0 ? from.y - to.y : 0;
        die.position.y = to.y + 0.4 + (k === 0 ? base * (1 - seg) + H[0] * Math.sin(seg * Math.PI) * 0.6 : H[k] * Math.sin(seg * Math.PI));
        if (k > bounced) { bounced = k; onBounce?.(k); }
        // 회전: 빠르게 구르다가 마지막 35%에서 정답 면으로 맞춘다
        const spin = (1 - p) * 26 * dt;
        die.quaternion.premultiply(tmp.setFromAxisAngle(axis, spin));
        if (p > 0.65) die.quaternion.slerp(qEnd, Math.min(1, 0.12 + ((p - 0.65) / 0.35) * 0.6));
        if (p < 1) requestAnimationFrame(step);
        else {
          die.quaternion.copy(qEnd);
          die.position.y = to.y + 0.4;
          resolve();
        }
      };
      die.position.copy(from);
      die.quaternion.copy(q0);
      requestAnimationFrame(step);
    });
  }

  function hide(ms = 400) {
    return new Promise((resolve) => {
      const t0 = performance.now();
      const step = (now) => {
        const p = Math.min(1, (now - t0) / ms);
        mats.forEach((m) => { m.opacity = 1 - p; });
        die.scale.setScalar(1 - p * 0.4);
        if (p < 1) requestAnimationFrame(step);
        else { die.visible = false; die.scale.setScalar(1); resolve(); }
      };
      requestAnimationFrame(step);
    });
  }

  return { roll, hide, mesh: die };
}
