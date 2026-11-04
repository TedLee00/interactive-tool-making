// 캔버스로 만든 글자·아이콘 텍스처 (간판, 칸 번호, 특수 칸 아이콘)
import * as THREE from 'three';

const FONT = "'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif";
const FONT_CUTE = "'Jua', 'Noto Sans KR', sans-serif";

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

/** 건물 간판: 크림색 동화책 팻말 + 지역 색 리본 */
export function signSprite(text, sub, color) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 200;
  const x = c.getContext('2d');
  x.shadowColor = 'rgba(80,50,120,.25)'; x.shadowBlur = 14; x.shadowOffsetY = 6;
  roundRect(x, 14, 30, 484, 150, 44);
  x.fillStyle = '#FFFBF0'; x.fill();
  x.shadowColor = 'transparent';
  x.lineWidth = 9; x.strokeStyle = color; x.stroke();
  // 리본
  roundRect(x, 166, 8, 180, 50, 25);
  x.fillStyle = color; x.fill();
  x.fillStyle = '#fff';
  x.font = `700 30px ${FONT_CUTE}`;
  x.textAlign = 'center';
  x.fillText(sub, 256, 44);
  x.fillStyle = '#2B2350';
  x.font = `400 ${text.length > 7 ? 60 : 68}px ${FONT_CUTE}`;
  x.fillText(text, 256, 140);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(c), transparent: true, depthWrite: false }));
  s.scale.set(2.3, 0.9, 1);
  s.renderOrder = 2;
  return s;
}

/** TED 로고 배지 — 선생님 얼굴 + "TED와 함께하는" + "품사 원정대" */
export function logoSprite(w = 1.1) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 300;
  const x = c.getContext('2d');
  const t = tex(c);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
  s.scale.set(w, (w * 300) / 256, 1);
  const draw = (im) => {
    x.clearRect(0, 0, 256, 300);
    x.beginPath(); x.arc(128, 132, 122, 0, Math.PI * 2);
    const g = x.createLinearGradient(0, 10, 0, 254); g.addColorStop(0, '#3A2F6B'); g.addColorStop(1, '#2B2350');
    x.fillStyle = g; x.fill();
    x.lineWidth = 10; x.strokeStyle = '#FFD43B'; x.stroke();
    if (im) {
      // 선생님 얼굴: 그림 위쪽(머리)만 잘라서
      const side = Math.min(im.width, im.height * 0.42);
      x.save(); x.beginPath(); x.arc(128, 104, 64, 0, Math.PI * 2); x.fillStyle = '#FFF4D6'; x.fill(); x.clip();
      x.drawImage(im, (im.width - side) / 2, 0, side, side, 128 - 60, 104 - 58, 120, 120);
      x.restore();
      x.lineWidth = 5; x.strokeStyle = '#fff'; x.beginPath(); x.arc(128, 104, 64, 0, Math.PI * 2); x.stroke();
    }
    x.textAlign = 'center';
    x.font = `400 60px ${FONT_CUTE}`;
    x.lineWidth = 8; x.strokeStyle = '#2B2350'; x.strokeText('TED', 128, 214);
    x.fillStyle = '#FFD43B'; x.fillText('TED', 128, 214);
    x.font = `400 26px ${FONT_CUTE}`; x.fillStyle = '#fff'; x.fillText('와 함께하는', 128, 244);
    // 아래 리본: 품사 원정대
    x.fillStyle = '#E21E8C'; x.beginPath(); x.roundRect(30, 254, 196, 40, 14); x.fill();
    x.lineWidth = 4; x.strokeStyle = '#fff'; x.stroke();
    x.font = `400 26px ${FONT_CUTE}`; x.fillStyle = '#fff'; x.fillText('품사 원정대', 128, 283);
    t.needsUpdate = true;
  };
  draw(null);
  const im = new Image();
  im.onload = () => draw(im);
  im.src = `${import.meta.env.BASE_URL}assets/characters/ted.svg`;
  return s;
}

/** 파스텔 하늘 그라데이션 */
export function skyTexture() {
  const c = document.createElement('canvas');
  c.width = 4; c.height = 256;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#7EC8FF');
  g.addColorStop(0.55, '#BFE6FF');
  g.addColorStop(1, '#FFE3F0');
  x.fillStyle = g; x.fillRect(0, 0, 4, 256);
  return tex(c);
}

/** 큰 배너 (출발·지역 이름 등) */
export function bannerSprite(text, color = '#C9A84C', w = 3.6) {
  const c = document.createElement('canvas');
  c.width = 640; c.height = 160;
  const x = c.getContext('2d');
  roundRect(x, 6, 6, 628, 148, 40);
  x.fillStyle = color; x.fill();
  x.lineWidth = 8; x.strokeStyle = '#ffffff'; x.stroke();
  x.fillStyle = '#2B2350';
  x.font = `400 76px ${FONT_CUTE}`;
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
  const bg = { arcade: '#E21E8C', snack: '#F2A01E', gate: '#2E7BC4', trap: '#D2463B', portal: '#7A3FA8', bonus: '#1E9B5B', goal: '#C9A84C', start: '#C9A84C' }[kind] || '#0D2144';
  x.beginPath(); x.arc(128, 128, 118, 0, Math.PI * 2);
  x.fillStyle = bg; x.fill();
  x.lineWidth = 14; x.strokeStyle = '#fff'; x.stroke();
  x.fillStyle = '#fff'; x.strokeStyle = '#fff'; x.lineWidth = 16; x.lineCap = 'round'; x.lineJoin = 'round';
  if (kind === 'snack') { // 선물 상자
    x.fillRect(64, 112, 128, 88); x.fillRect(52, 84, 152, 32);
    x.fillStyle = bg; x.fillRect(120, 84, 16, 116);
    x.strokeStyle = '#fff'; x.beginPath(); x.moveTo(128, 82); x.quadraticCurveTo(92, 40, 82, 76); x.moveTo(128, 82); x.quadraticCurveTo(164, 40, 174, 76); x.stroke();
  } else if (kind === 'gate' || kind === 'arcade') { // 게임패드
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
  x.font = `400 66px ${FONT_CUTE}`;
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
