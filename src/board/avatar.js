// 플레이어 말 = 보드게임 "스탠디" (캐릭터 그림 스티커 + 금색 받침)
// 그림은 public/assets/characters/<id>.svg — 나중에 AI 일러스트로 바꿔도 코드는 그대로.
// 동작: idle(대기) · hop(이동) · joy(기쁨) · sad(좌절) · win(승리)
import * as THREE from 'three';
import { loadChar } from './charart.js';

const HEIGHT = 1.55; // 스탠디 높이 (월드 단위)

export function createAvatar(c, { height = HEIGHT, base = true } = {}) {
  const root = new THREE.Group(); // 위치 (게임이 조작)
  const rig = new THREE.Group(); // 점프·찌그러짐
  const face = new THREE.Group(); // 카메라 쪽으로 돌기
  root.add(rig);
  rig.add(face);

  const mat = new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.08, side: THREE.DoubleSide, toneMapped: false });
  const card = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  card.visible = false;
  face.add(card);
  // 그림자용 (투명 부분은 그림자 없음)
  const depthMat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, alphaTest: 0.5 });
  card.customDepthMaterial = depthMat;
  card.castShadow = true;

  loadChar(c.id).then((a) => {
    const tex = new THREE.CanvasTexture(a.sticker);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    mat.map = tex;
    depthMat.map = tex;
    mat.needsUpdate = true;
    depthMat.needsUpdate = true;
    const aspect = a.sticker.width / a.sticker.height;
    card.scale.set(height * aspect, height, 1);
    card.position.y = height / 2 + 0.06;
    card.visible = true;
  });

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

  let anim = 'idle';
  let t = 0;
  const camPos = new THREE.Vector3();

  function setAnim(name) { anim = name; t = 0; }

  /** @param camera 있으면 그쪽으로 그림을 돌린다 (스탠디가 항상 정면) */
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
    card.rotation.set(0, 0, 0);
    mat.color.setScalar(1);
    blob.scale.setScalar(1);

    if (anim === 'idle') {
      rig.scale.y = 1 + Math.sin(t * 2.4) * 0.025; // 숨쉬기
      card.rotation.z = Math.sin(t * 1.3) * 0.035;
    } else if (anim === 'hop') {
      const k = Math.sin(Math.min(1, t / 0.32) * Math.PI);
      rig.scale.set(1 - k * 0.08, 1 + k * 0.12, 1);
      card.rotation.z = Math.sin(t * 18) * 0.06;
    } else if (anim === 'joy') {
      const p = (t % 0.55) / 0.55;
      rig.position.y = Math.sin(p * Math.PI) * 0.6;
      card.rotation.y = t < 1.1 ? (t / 1.1) * Math.PI * 2 : 0;
      blob.scale.setScalar(1 - Math.sin(p * Math.PI) * 0.3);
    } else if (anim === 'sad') {
      card.rotation.x = -0.32;
      rig.scale.set(1.03, 0.92, 1);
      card.rotation.z = Math.sin(t * 2) * 0.04;
      mat.color.setScalar(0.78);
    } else if (anim === 'win') {
      rig.position.y = Math.abs(Math.sin(t * 4)) * 0.5;
      card.rotation.y = t * 3.2;
      blob.scale.setScalar(1 - Math.abs(Math.sin(t * 4)) * 0.3);
    } else if (anim === 'wave') {
      card.rotation.z = Math.sin(t * 3) * 0.08;
      rig.position.y = Math.abs(Math.sin(t * 3)) * 0.08;
    }
  }

  return { root, setAnim, update, get anim() { return anim; } };
}
