// 플레이어 말(로우폴리 캐릭터) — data/characters.json 의 색·장신구로 조립한다.
// 동작: idle(대기) · hop(이동) · joy(기쁨) · sad(좌절) · win(승리)
import * as THREE from 'three';

const mat = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.65, metalness: 0, flatShading: true, ...opts });
const INK = 0x0d2144;

function accessory(acc, c) {
  const g = new THREE.Group();
  if (acc === 'explorer') {
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.05, 16), mat(0xa9864b));
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.26, 12), mat(0xc9a66b));
    top.position.y = 0.14;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.345, 0.345, 0.06, 12), mat(0x6b4f2a));
    band.position.y = 0.05;
    g.add(brim, top, band);
    g.position.y = 0.3;
  } else if (acc === 'cap') {
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.38, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x2e7bc4));
    const bill = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.04, 0.3), mat(0x1f5fb8));
    bill.position.set(0, 0.02, -0.38); // 거꾸로 쓴 모자 (뒤쪽)
    g.add(dome, bill);
    g.position.y = 0.1;
  } else if (acc === 'glasses') {
    [-0.13, 0.13].forEach((x) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.02, 6, 14), mat(INK));
      ring.position.set(x, 0, 0.33);
      g.add(ring);
    });
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.02), mat(INK));
    bridge.position.z = 0.34;
    g.add(bridge);
    g.position.y = 0.02;
  } else if (acc === 'headband') {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.05, 6, 20), mat(0xffffff));
    band.rotation.x = Math.PI / 2;
    g.add(band);
    g.position.y = 0.16;
  } else if (acc === 'beret') {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.4, 14, 8), mat(0xc8372d));
    b.scale.set(1, 0.32, 1);
    b.position.set(0.06, 0.26, 0);
    b.rotation.z = -0.2;
    g.add(b);
  } else if (acc === 'antenna') {
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.3, 6), mat(INK));
    stick.position.y = 0.45;
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), mat(0xf2c14e, { emissive: 0xf2c14e, emissiveIntensity: 0.6 }));
    ball.position.y = 0.62;
    g.add(stick, ball);
    g.userData.glow = ball;
  }
  return g;
}

export function createAvatar(c) {
  const root = new THREE.Group(); // 위치·회전 (게임이 조작)
  const rig = new THREE.Group(); // 애니메이션 (점프·찌그러짐)
  root.add(rig);
  const robot = c.acc === 'antenna';

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.28, 4, 10), mat(c.body));
  body.position.y = 0.42;
  const head = new THREE.Group();
  head.position.y = 1.02;
  const skull = robot
    ? new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.56, 0.58), mat(c.skin, { metalness: 0.3 }))
    : new THREE.Mesh(new THREE.SphereGeometry(0.36, 16, 12), mat(c.skin));
  head.add(skull);
  if (!robot) {
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.375, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), mat(c.hair));
    hair.rotation.x = -0.55;
    hair.position.set(0, 0.02, -0.04);
    head.add(hair);
  }
  const eyeM = robot ? mat(0x5be0ff, { emissive: 0x5be0ff, emissiveIntensity: 0.8 }) : mat(INK);
  const eyes = [-0.12, 0.12].map((x) => {
    const e = robot ? new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.08, 0.02), eyeM) : new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), eyeM);
    e.position.set(x, 0.02, robot ? 0.3 : 0.33);
    head.add(e);
    return e;
  });
  if (!robot) {
    [-0.2, 0.2].forEach((x) => {
      const ch = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), mat(0xff9db0, { transparent: true, opacity: 0.7 }));
      ch.position.set(x, -0.08, 0.3);
      ch.scale.z = 0.4;
      head.add(ch);
    });
  }
  const acc = accessory(c.acc, c);
  head.add(acc);

  const arms = [-1, 1].map((s) => {
    const a = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), mat(c.body));
    a.position.set(0.32 * s, 0.5, 0.02);
    rig.add(a);
    return a;
  });
  const feet = [-1, 1].map((s) => {
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), mat(INK));
    f.scale.set(1, 0.6, 1.3);
    f.position.set(0.13 * s, 0.05, 0.04);
    rig.add(f);
    return f;
  });
  rig.add(body, head);
  rig.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });

  // 바닥 그림자 원 (그림자가 꺼진 기기에서도 위치감)
  const blob = new THREE.Mesh(new THREE.CircleGeometry(0.42, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.02;
  root.add(blob);

  let anim = 'idle';
  let t = 0;
  let blinkT = 2;

  function setAnim(name) { anim = name; t = 0; }

  function update(dt) {
    t += dt;
    blinkT -= dt;
    const blink = blinkT < 0.12 && !robot;
    eyes.forEach((e) => { e.scale.y = blink ? 0.15 : 1; });
    if (blinkT < 0) blinkT = 2 + Math.random() * 3;
    if (acc.userData.glow) acc.userData.glow.material.emissiveIntensity = 0.4 + 0.4 * Math.sin(t * 6);

    // 기본 자세
    rig.position.y = 0;
    rig.rotation.set(0, 0, 0);
    rig.scale.set(1, 1, 1);
    head.rotation.set(0, 0, 0);
    arms.forEach((a, i) => { a.position.y = 0.5; a.position.x = (i ? 1 : -1) * 0.32; });

    if (anim === 'idle') {
      rig.position.y = Math.abs(Math.sin(t * 2.2)) * 0.04;
      head.rotation.z = Math.sin(t * 1.3) * 0.06;
      arms.forEach((a, i) => { a.position.y = 0.5 + Math.sin(t * 2.2 + i * Math.PI) * 0.03; });
    } else if (anim === 'hop') {
      // 위치는 게임이 옮기고, 여기서는 찌그러짐·팔만
      const k = Math.sin(Math.min(1, t / 0.32) * Math.PI);
      rig.scale.set(1 - k * 0.06, 1 + k * 0.1, 1 - k * 0.06);
      arms.forEach((a) => { a.position.y = 0.5 + k * 0.18; });
    } else if (anim === 'joy') {
      const p = (t % 0.6) / 0.6;
      rig.position.y = Math.sin(p * Math.PI) * 0.55;
      rig.rotation.y = t < 1.2 ? (t / 1.2) * Math.PI * 2 : 0;
      arms.forEach((a, i) => { a.position.y = 0.95; a.position.x = (i ? 1 : -1) * 0.42; });
    } else if (anim === 'sad') {
      head.rotation.x = 0.45;
      rig.scale.set(1.04, 0.9, 1.04);
      rig.rotation.z = Math.sin(t * 2) * 0.05;
      arms.forEach((a) => { a.position.y = 0.36; });
    } else if (anim === 'win') {
      rig.position.y = Math.abs(Math.sin(t * 4)) * 0.45;
      rig.rotation.y = t * 3;
      arms.forEach((a, i) => { a.position.y = 0.95 + Math.sin(t * 10 + i * Math.PI) * 0.08; a.position.x = (i ? 1 : -1) * 0.45; });
    }
  }

  return { root, setAnim, update, get anim() { return anim; } };
}
