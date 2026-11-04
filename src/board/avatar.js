// 플레이어 말 = 통통한 입체 피규어 (캐릭터 그림 + 볼록한 빛 음영 + 두께 + 금색 받침)
// 그림은 public/assets/characters/<id>.svg — 관절(팔·다리·머리)이 있는 캐릭터는 점프·만세 포즈 그림을 따로 만들어 바꿔 낀다.
// 동작: idle(대기) · hop(이동: 웅크림 → 점프 자세 → 착지 찌그러짐) · joy(기쁨) · sad(좌절) · win(승리) · wave
import * as THREE from 'three';
import { loadChar, loadPoses, puffyNormal } from './charart.js';

const HEIGHT = 1.55; // 피규어 높이 (월드 단위)
const LAYERS = 6; // 두께 (뒤쪽으로 겹친 조각 수)
const DEPTH = 0.075;

function texOf(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function createAvatar(c, { height = HEIGHT, base = true } = {}) {
  const root = new THREE.Group(); // 위치 (게임이 조작)
  const rig = new THREE.Group(); // 점프·찌그러짐
  const face = new THREE.Group(); // 카메라 쪽으로 돌기
  root.add(rig);
  rig.add(face);
  const body = new THREE.Group(); // 앞뒤 기울기
  face.add(body);

  // 앞면: 그림 + 볼록 노멀맵 (빛을 받아 둥글게 보임) + 자체 발광으로 색은 선명하게
  const mat = new THREE.MeshStandardMaterial({ transparent: true, alphaTest: 0.08, side: THREE.FrontSide, roughness: 0.42, metalness: 0, emissive: 0xffffff, emissiveIntensity: 0.62 });
  const card = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  card.visible = false;
  body.add(card);
  // 두께: 같은 실루엣을 뒤로 여러 장 (가장자리가 진한 색 → 아크릴 피규어처럼)
  const edgeMat = new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, color: 0xb9add6, toneMapped: false });
  const edges = [];
  for (let k = 1; k <= LAYERS; k++) {
    const e = new THREE.Mesh(card.geometry, edgeMat);
    e.position.z = -(DEPTH * k) / LAYERS;
    e.visible = false;
    body.add(e);
    edges.push(e);
  }
  // 그림자용 (투명 부분은 그림자 없음)
  const depthMat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, alphaTest: 0.5 });
  card.customDepthMaterial = depthMat;
  card.castShadow = true;

  const SK = {}; // 포즈별 {map, normal}
  let curPose = null;
  function usePose(name) {
    const p = SK[name] || SK.idle;
    if (!p || curPose === p) return;
    curPose = p;
    mat.map = p.map; mat.emissiveMap = p.map; mat.normalMap = p.normal;
    edgeMat.map = p.map; depthMat.map = p.map;
    mat.needsUpdate = true; edgeMat.needsUpdate = true; depthMat.needsUpdate = true;
  }
  let hh = height;
  function setSize(canvas, k = 1) {
    const aspect = canvas.width / canvas.height;
    hh = height * k;
    card.scale.set(hh * aspect, hh, 1);
    edges.forEach((e) => e.scale.copy(card.scale));
    body.position.y = 0.06;
    card.position.y = hh / 2 - (k - 1) * 0.04;
    edges.forEach((e) => { e.position.y = card.position.y; });
  }
  const addPose = (name, canvas) => {
    const normal = new THREE.CanvasTexture(puffyNormal(canvas));
    SK[name] = { map: texOf(canvas), normal };
  };

  (async () => {
    let poses = null;
    try { poses = await loadPoses(c.id); } catch { poses = null; }
    if (poses) {
      Object.entries(poses).forEach(([k, cv]) => addPose(k, cv));
      setSize(poses.idle, poses.k * 0.92);
    } else {
      const a = await loadChar(c.id);
      addPose('idle', a.sticker);
      setSize(a.sticker);
    }
    mat.normalScale = new THREE.Vector2(1.6, 1.6);
    usePose('idle');
    card.visible = true;
    edges.forEach((e) => { e.visible = true; });
  })().catch(() => {});

  if (base) {
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.4, 0.12, 24), new THREE.MeshToonMaterial({ color: 0xe8c665 }));
    plinth.position.y = 0.06;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.37, 0.03, 8, 28), new THREE.MeshToonMaterial({ color: new THREE.Color(c.color || '#C9A84C') }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.12;
    plinth.castShadow = true;
    rig.add(plinth, ring);
  }
  const blob = new THREE.Mesh(new THREE.CircleGeometry(0.46, 24), new THREE.MeshBasicMaterial({ color: 0x3a2a55, transparent: true, opacity: 0.18, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.02;
  root.add(blob);

  // 착지 먼지 (작은 흰 구름 퐁퐁)
  const puffs = [];
  const puffGeo = new THREE.SphereGeometry(0.09, 10, 8);
  function dust() {
    const p0 = root.position;
    for (let k = 0; k < 6; k++) {
      const m = new THREE.Mesh(puffGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false }));
      const a = (k / 6) * Math.PI * 2;
      m.position.set(p0.x + Math.cos(a) * 0.3, 0.32, p0.z + Math.sin(a) * 0.3);
      m.userData = { vx: Math.cos(a) * 1.3, vz: Math.sin(a) * 1.3, life: 0.45 };
      root.parent?.add(m);
      puffs.push(m);
    }
  }

  let anim = 'idle';
  let t = 0;
  let landed = false;
  const camPos = new THREE.Vector3();

  function setAnim(name) { anim = name; t = 0; landed = false; }

  /** @param camera 있으면 그쪽으로 그림을 돌린다 (피규어가 항상 정면) */
  function update(dt, camera) {
    t += dt;
    if (camera) {
      camera.getWorldPosition(camPos);
      const p = root.getWorldPosition(new THREE.Vector3());
      face.rotation.y = Math.atan2(camPos.x - p.x, camPos.z - p.z) - root.rotation.y;
    }
    rig.position.y = 0;
    rig.rotation.set(0, 0, 0);
    rig.scale.set(1, 1, 1);
    body.rotation.set(0, 0, 0);
    mat.color.setScalar(1);
    mat.emissiveIntensity = 0.62;
    blob.scale.setScalar(1);
    let pose = 'idle';

    if (anim === 'idle') {
      rig.scale.y = 1 + Math.sin(t * 2.4) * 0.025; // 숨쉬기
      body.rotation.z = Math.sin(t * 1.3) * 0.035;
    } else if (anim === 'hop') {
      // 한 칸 점프 = 0.42초: 웅크림(0~.07) → 쭉 뻗으며 점프 자세 → 착지 자세 → 착지 찌그러짐
      const T = 0.42;
      const p = Math.min(1, t / T);
      if (p < 0.16) { const k = p / 0.16; rig.scale.set(1 + k * 0.12, 1 - k * 0.2, 1); }
      else if (p < 0.8) {
        const k = (p - 0.16) / 0.64;
        pose = k < 0.72 ? 'jump' : 'land';
        rig.scale.set(1 - Math.sin(k * Math.PI) * 0.06, 1 + Math.sin(k * Math.PI) * 0.12, 1);
        body.rotation.z = Math.sin(k * Math.PI * 2) * 0.12; // 공중에서 몸을 살랑
        body.rotation.x = -Math.sin(k * Math.PI) * 0.18; // 앞으로 살짝 숙여 나아감
      } else {
        const k = (p - 0.8) / 0.2;
        if (!landed) { landed = true; dust(); }
        rig.scale.set(1 + Math.sin(k * Math.PI) * 0.16, 1 - Math.sin(k * Math.PI) * 0.18, 1);
      }
    } else if (anim === 'joy') {
      const p = (t % 0.55) / 0.55;
      pose = 'cheer';
      rig.position.y = Math.sin(p * Math.PI) * 0.6;
      body.rotation.y = t < 1.1 ? (t / 1.1) * Math.PI * 2 : 0;
      blob.scale.setScalar(1 - Math.sin(p * Math.PI) * 0.3);
    } else if (anim === 'sad') {
      body.rotation.x = -0.32;
      rig.scale.set(1.03, 0.92, 1);
      body.rotation.z = Math.sin(t * 2) * 0.04;
      mat.color.setScalar(0.78);
      mat.emissiveIntensity = 0.42;
    } else if (anim === 'win') {
      pose = Math.sin(t * 4) > 0 ? 'cheer' : 'jump';
      rig.position.y = Math.abs(Math.sin(t * 4)) * 0.5;
      body.rotation.y = t * 3.2;
      blob.scale.setScalar(1 - Math.abs(Math.sin(t * 4)) * 0.3);
    } else if (anim === 'wave') {
      body.rotation.z = Math.sin(t * 3) * 0.08;
      rig.position.y = Math.abs(Math.sin(t * 3)) * 0.08;
      if (Math.sin(t * 1.5) > 0.6) pose = 'cheer';
    }
    usePose(pose);
    // 먼지
    for (let i = puffs.length - 1; i >= 0; i--) {
      const m = puffs[i]; const u = m.userData;
      u.life -= dt;
      m.position.x += u.vx * dt; m.position.z += u.vz * dt; m.position.y += dt * 0.5;
      m.scale.setScalar(1 + (0.45 - u.life) * 3);
      m.material.opacity = Math.max(0, u.life / 0.45) * 0.85;
      if (u.life <= 0) { m.parent?.remove(m); m.material.dispose(); puffs.splice(i, 1); }
    }
  }

  return { root, setAnim, update, get anim() { return anim; } };
}
