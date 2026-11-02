// 캔버스로 만든 글자·아이콘 텍스처 (간판, 칸 번호, 특수 칸 아이콘)
import * as THREE from 'three';

const FONT = "'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif";

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function tex(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** 건물 간판: 지역 색 테두리 + 유형 이름 */
export function signSprite(text, sub, color) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 176;
  const x = c.getContext('2d');
  roundRect(x, 8, 8, 496, 160, 34);
  x.fillStyle = '#0D2144'; x.fill();
  x.lineWidth = 10; x.strokeStyle = color; x.stroke();
  x.fillStyle = '#C9A84C';
  x.font = `800 34px ${FONT}`;
  x.textAlign = 'center';
  x.fillText(sub, 256, 62);
  x.fillStyle = '#fff';
  x.font = `900 ${text.length > 7 ? 54 : 62}px ${FONT}`;
  x.fillText(text, 256, 132);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(c), transparent: true, depthWrite: false }));
  s.scale.set(2.3, 0.79, 1);
  s.renderOrder = 2;
  return s;
}

/** 큰 배너 (출발·지역 이름 등) */
export function bannerSprite(text, color = '#C9A84C', w = 3.6) {
  const c = document.createElement('canvas');
  c.width = 640; c.height = 160;
  const x = c.getContext('2d');
  roundRect(x, 6, 6, 628, 148, 40);
  x.fillStyle = color; x.fill();
  x.lineWidth = 8; x.strokeStyle = '#0D2144'; x.stroke();
  x.fillStyle = '#0D2144';
  x.font = `900 72px ${FONT}`;
  x.textAlign = 'center';
  x.fillText(text, 320, 106);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(c), transparent: true, depthWrite: false }));
  s.scale.set(w, w / 4, 1);
  return s;
}

/** 특수 칸 아이콘 (이모지 대신 그린 아이콘 → 어느 기기에서나 같게) */
export function iconSprite(kind) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const x = c.getContext('2d');
  const bg = { snack: '#F2A01E', gate: '#2E7BC4', trap: '#D2463B', portal: '#7A3FA8', bonus: '#1E9B5B', goal: '#C9A84C', start: '#C9A84C' }[kind] || '#0D2144';
  x.beginPath(); x.arc(128, 128, 118, 0, Math.PI * 2);
  x.fillStyle = bg; x.fill();
  x.lineWidth = 14; x.strokeStyle = '#fff'; x.stroke();
  x.fillStyle = '#fff'; x.strokeStyle = '#fff'; x.lineWidth = 16; x.lineCap = 'round'; x.lineJoin = 'round';
  if (kind === 'snack') { // 선물 상자
    x.fillRect(64, 112, 128, 88); x.fillRect(52, 84, 152, 32);
    x.fillStyle = bg; x.fillRect(120, 84, 16, 116);
    x.strokeStyle = '#fff'; x.beginPath(); x.moveTo(128, 82); x.quadraticCurveTo(92, 40, 82, 76); x.moveTo(128, 82); x.quadraticCurveTo(164, 40, 174, 76); x.stroke();
  } else if (kind === 'gate') { // 게임패드
    roundRect(x, 50, 92, 156, 84, 40); x.fill();
    x.fillStyle = bg; x.fillRect(82, 126, 40, 14); x.fillRect(95, 113, 14, 40);
    x.beginPath(); x.arc(162, 122, 9, 0, 7); x.arc(180, 142, 9, 0, 7); x.fill();
  } else if (kind === 'trap') { // 느낌표
    x.beginPath(); x.moveTo(128, 60); x.lineTo(128, 150); x.stroke();
    x.beginPath(); x.arc(128, 188, 12, 0, 7); x.fill();
  } else if (kind === 'portal') { // 소용돌이
    x.beginPath();
    for (let a = 0; a < 14; a += 0.2) { const r = 6 + a * 6.5; x.lineTo(128 + Math.cos(a) * r, 128 + Math.sin(a) * r); }
    x.lineWidth = 12; x.stroke();
  } else if (kind === 'bonus') { // 주사위
    roundRect(x, 64, 64, 128, 128, 22); x.fill();
    x.fillStyle = bg; [[96, 96], [160, 96], [128, 128], [96, 160], [160, 160]].forEach(([a, b]) => { x.beginPath(); x.arc(a, b, 12, 0, 7); x.fill(); });
  } else if (kind === 'goal') { // 트로피
    x.beginPath(); x.moveTo(78, 60); x.lineTo(178, 60); x.quadraticCurveTo(178, 150, 128, 150); x.quadraticCurveTo(78, 150, 78, 60); x.fill();
    x.fillRect(116, 148, 24, 30); x.fillRect(86, 176, 84, 20);
  }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(c), transparent: true, depthWrite: false }));
  s.scale.set(0.9, 0.9, 1);
  return s;
}

/** 칸 윗면 번호 */
export function numberTexture(n, fg = '#0D2144') {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = fg;
  x.font = `900 64px ${FONT}`;
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(String(n), 64, 70);
  return tex(c);
}

/** 주사위 면 (점) */
export function diceFace(n) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = '#FFFDF6'; x.fillRect(0, 0, 256, 256);
  x.lineWidth = 16; x.strokeStyle = '#C9A84C'; roundRect(x, 10, 10, 236, 236, 40); x.stroke();
  const P = { 1: [[128, 128]], 2: [[72, 72], [184, 184]], 3: [[68, 68], [128, 128], [188, 188]], 4: [[72, 72], [184, 72], [72, 184], [184, 184]], 5: [[68, 68], [188, 68], [128, 128], [68, 188], [188, 188]], 6: [[72, 64], [184, 64], [72, 128], [184, 128], [72, 192], [184, 192]] };
  x.fillStyle = n === 1 ? '#C8372D' : '#0D2144';
  P[n].forEach(([a, b]) => { x.beginPath(); x.arc(a, b, n === 1 ? 34 : 24, 0, Math.PI * 2); x.fill(); });
  return tex(c);
}
