// 3D 캐릭터 · 펫 전용 밝은 툰 재질: 그림자도 밝게(3단 부드러운 음영) + 살짝 자체 발광 + 채도 조금 UP → 컬러풀하고 귀엽게
import * as THREE from 'three';

let grad = null;
function gradient() {
  if (grad) return grad;
  const d = new Uint8Array([168, 168, 168, 255, 220, 220, 220, 255, 255, 255, 255, 255]); // 어두운 면도 66% 밝기
  grad = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat);
  grad.minFilter = THREE.NearestFilter; grad.magFilter = THREE.NearestFilter; grad.generateMipmaps = false; grad.needsUpdate = true;
  return grad;
}
const cache = new Map();
export function brightToon(c) {
  const key = String(c);
  if (cache.has(key)) return cache.get(key);
  const col = new THREE.Color(c);
  const hsl = {}; col.getHSL(hsl);
  // 흰색·검정은 그대로, 나머지는 채도·밝기를 살짝 올림
  if (hsl.s > 0.05 && hsl.l > 0.08 && hsl.l < 0.95) col.setHSL(hsl.h, Math.min(1, hsl.s * 1.18 + 0.04), Math.min(0.9, hsl.l * 1.08 + 0.03));
  const m = new THREE.MeshToonMaterial({ color: col, gradientMap: gradient(), emissive: col.clone(), emissiveIntensity: hsl.l < 0.12 ? 0.08 : 0.22 });
  cache.set(key, m);
  return m;
}
