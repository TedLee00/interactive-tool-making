// 3D 주사위 — 손가락으로 위로 쓸어 올려 던지면 물리 엔진(cannon-es)이 실제로 굴린다.
// 나오는 눈은 미리 정하지 않는다: 멈췄을 때 위를 보는 면이 결과.
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { diceFace } from './textures.js';

// BoxGeometry 재질 순서: +x, -x, +y, -y, +z, -z  (마주 보는 면의 합 = 7)
const FACE_VALUES = [3, 4, 1, 6, 2, 5];
const NORMALS = [
  new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 1, 0),
  new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1),
];
const SIZE = 0.8;

export function createDice(scene) {
  const mats = FACE_VALUES.map((v) => new THREE.MeshStandardMaterial({ map: diceFace(v), roughness: 0.4, transparent: true }));
  const die = new THREE.Mesh(new THREE.BoxGeometry(SIZE, SIZE, SIZE), mats);
  die.castShadow = true;
  die.visible = false;
  scene.add(die);

  // ---- 물리 세계 ----
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -30, 0) });
  world.allowSleep = false;
  world.solver.iterations = 14;
  const dieMat = new CANNON.Material('die');
  const floorMat = new CANNON.Material('floor');
  world.addContactMaterial(new CANNON.ContactMaterial(dieMat, floorMat, { friction: 0.3, restitution: 0.5 }));
  world.addContactMaterial(new CANNON.ContactMaterial(dieMat, dieMat, { friction: 0.3, restitution: 0.3 }));
  const floor = new CANNON.Body({ mass: 0, material: floorMat, shape: new CANNON.Plane() });
  floor.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  world.addBody(floor);
  const walls = [];
  for (let k = 0; k < 4; k++) {
    const w = new CANNON.Body({ mass: 0, material: floorMat, shape: new CANNON.Box(new CANNON.Vec3(7, 8, 0.3)) });
    walls.push(w);
    world.addBody(w);
  }
  // 마을 물체(집·나무) 충돌 상자: 던질 때 주변 것만 넣는다
  let obstacles = [];
  const obsBodies = [];
  function placeObstacles(C) {
    obsBodies.splice(0).forEach((b) => world.removeBody(b));
    obstacles.filter((o) => Math.hypot(o.center.x - C.x, o.center.z - C.z) < 9).slice(0, 24).forEach((o) => {
      const b = new CANNON.Body({ mass: 0, material: floorMat, shape: new CANNON.Box(new CANNON.Vec3(o.size.x / 2 * 0.8, o.size.y / 2, o.size.z / 2 * 0.8)) });
      b.position.set(o.center.x, o.center.y, o.center.z);
      world.addBody(b);
      obsBodies.push(b);
    });
  }
  const body = new CANNON.Body({ mass: 1, material: dieMat, shape: new CANNON.Box(new CANNON.Vec3(SIZE / 2, SIZE / 2, SIZE / 2)), linearDamping: 0.1, angularDamping: 0.12 });
  world.addBody(body);

  let state = 'hidden'; // hidden · ready · rolling
  let holdPos = new THREE.Vector3();
  let idleT = 0;

  /** 던질 준비: 내 말 앞(카메라 쪽)에 주사위를 띄워 둔다 */
  function ready(anchor, towardCam) {
    holdPos = anchor.clone().add(towardCam.clone().multiplyScalar(1.6)).setY(1.1);
    die.position.copy(holdPos);
    die.quaternion.setFromEuler(new THREE.Euler(0.5, 0.7, 0.2));
    die.scale.setScalar(1);
    mats.forEach((m) => { m.opacity = 1; });
    die.visible = true;
    state = 'ready';
    idleT = 0;
  }

  function update(dt) {
    if (state === 'ready') {
      idleT += dt;
      die.position.y = holdPos.y + Math.sin(idleT * 3) * 0.08;
      die.rotation.y += dt * 0.8;
      // 반짝반짝: "나를 쓸어 올려!" 하고 빛나며 살짝 커졌다 작아졌다
      const glow = 0.5 + 0.5 * Math.sin(idleT * 6);
      die.scale.setScalar(1.15 + glow * 0.1);
      mats.forEach((m) => { m.emissive.setRGB(1, 0.85, 0.3); m.emissiveIntensity = 0.15 + glow * 0.35; });
    } else if (mats[0].emissiveIntensity > 0) {
      mats.forEach((m) => { m.emissiveIntensity = 0; });
    }
  }

  function topValue() {
    const q = new THREE.Quaternion(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w);
    let best = 0;
    let bestDot = -2;
    NORMALS.forEach((n, i) => {
      const d = n.clone().applyQuaternion(q).y;
      if (d > bestDot) { bestDot = d; best = i; }
    });
    return FACE_VALUES[best];
  }

  /**
   * 던지기
   * @param power    0~1 (쓸어 올린 속도)
   * @param lateral  -1~1 (왼쪽·오른쪽으로 비튼 정도)
   * @param forward  던지는 방향 (카메라 → 앞, 수평 단위벡터)
   * @param onBounce 바닥에 부딪힐 때마다 (효과음)
   * @returns Promise<눈(1~6)>
   */
  function roll({ power, lateral = 0, forward, onBounce }) {
    return new Promise((resolve) => {
      state = 'rolling';
      die.scale.setScalar(1);
      mats.forEach((m) => { m.emissiveIntensity = 0; });
      const f = forward.clone().setY(0).normalize();
      const right = new THREE.Vector3(-f.z, 0, f.x);
      const start = die.position.clone();
      // 울타리: 착지 예상 지점 주변 상자
      // 보이지 않는 울타리: 뒤(출발점 1.6 뒤) · 앞(9 앞) · 좌우(4.5) — 주사위가 화면 밖으로 사라지지 않게
      const C = start.clone().add(f.clone().multiplyScalar(3.7));
      placeObstacles(C);
      const place = (w, d, side, rotY) => {
        const at = C.clone().add(f.clone().multiplyScalar(d)).add(right.clone().multiplyScalar(side));
        w.position.set(at.x, 4, at.z); w.quaternion.setFromEuler(0, rotY, 0);
      };
      place(walls[0], 5.3, 0, Math.atan2(f.x, f.z));
      place(walls[1], -5.3, 0, Math.atan2(f.x, f.z));
      place(walls[2], 0, 4.5, Math.atan2(right.x, right.z));
      place(walls[3], 0, -4.5, Math.atan2(right.x, right.z));

      body.position.set(start.x, start.y, start.z);
      body.quaternion.set(die.quaternion.x, die.quaternion.y, die.quaternion.z, die.quaternion.w);
      // 위로 툭! 높이 떴다가 떨어지며 튕긴다 (세게 쓸수록 더 높고 멀리)
      const sp = 3 + power * 5;
      const v = f.clone().multiplyScalar(sp).add(right.clone().multiplyScalar(lateral * 4.5)).setY(9 + power * 7);
      body.velocity.set(v.x, v.y, v.z);
      // 회전: 던지는 방향으로 앞구르기 + 손목 비틀기 + 약간의 무작위
      const spin = 14 + power * 24;
      const ax = right.clone().multiplyScalar(-spin).add(new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(spin * 0.6));
      ax.y += lateral * spin * 0.8;
      body.angularVelocity.set(ax.x, ax.y, ax.z);
      body.wakeUp();

      let still = 0;
      let t = 0;
      let last = performance.now();
      let lastVy = 0;
      const step = (now) => {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        t += dt;
        world.step(1 / 120, dt, 10);
        die.position.set(body.position.x, body.position.y, body.position.z);
        die.quaternion.set(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w);
        if (lastVy < -1.2 && body.velocity.y > 0.2 && body.position.y < SIZE) onBounce?.();
        lastVy = body.velocity.y;
        const calm = body.velocity.length() < 0.12 && body.angularVelocity.length() < 0.15;
        still = calm ? still + dt : 0;
        if (still > 0.35 || t > 8) {
          state = 'done';
          resolve(topValue());
          return;
        }
        requestAnimationFrame(step);
      };
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
        else { die.visible = false; die.scale.setScalar(1); state = 'hidden'; resolve(); }
      };
      requestAnimationFrame(step);
    });
  }

  return { ready, update, roll, hide, mesh: die, setObstacles: (o) => { obstacles = o || []; }, topValue, get state() { return state; } };
}
