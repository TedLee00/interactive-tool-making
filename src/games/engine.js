import { submitScore, rankTableHTML } from '../rank/rank.js';
// 미니게임 공통 엔진 — 전체 화면 오버레이 · 캔버스(세로 화면) · 입력 · 파티클 · 결과/보상
import { bgm, callout, comboCallout, snackURL, SNACKS } from '../fx/fx.js';
import { sfx } from '../quiz/sound.js';
import './games.css';

const BASE = import.meta.env.BASE_URL;
const imgCache = new Map();
export function loadImage(url) {
  if (!imgCache.has(url)) {
    imgCache.set(url, new Promise((res) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = () => res(null);
      im.src = url;
    }));
  }
  return imgCache.get(url);
}
export const asset = (p) => `${BASE}assets/${p}`;

export const rand = (a, b) => a + Math.random() * (b - a);
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
/** 주머니 뽑기: 목록을 섞어 하나씩 꺼내고, 다 꺼내면 다시 섞기 (같은 것이 연달아 · 자주 나오지 않게). avoid(x)가 true면 건너뜀 */
const BAGS = new Map();
export function bagPick(key, arr, avoid) {
  if (!arr?.length) return undefined;
  let b = BAGS.get(key);
  if (!b || !b.items.length || b.src !== arr) {
    let items = arr.slice(); for (let i = items.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [items[i], items[j]] = [items[j], items[i]]; }
    if (b && items.length > 1 && items[items.length - 1] === b.last) items = [items[items.length - 1], ...items.slice(0, -1)]; // 직전에 나온 것은 바로 다시 안 나오게
    b = { src: arr, items, last: b?.last }; BAGS.set(key, b);
  }
  let k = b.items.length - 1;
  if (avoid) { for (let i = b.items.length - 1; i >= 0; i--) if (!avoid(b.items[i])) { k = i; break; } }
  const [x] = b.items.splice(k, 1); b.last = x; return x;
}
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export function shuffle(a) {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}

export function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
/** 말풍선형 글자 꼬리표 */
export function tag(g, text, x, y, { bg = '#fff', fg = '#2B2350', border = '#2B2350', size = 14, pad = 6 } = {}) {
  g.font = `400 ${size}px Jua, 'Noto Sans KR', sans-serif`;
  const w = g.measureText(text).width + pad * 2;
  const h = size + pad * 1.4;
  roundRect(g, x - w / 2, y - h / 2, w, h, h / 2);
  g.fillStyle = bg; g.fill();
  g.lineWidth = 2.5; g.strokeStyle = border; g.stroke();
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, x, y + 1);
  return w;
}

/** 🎮 미니게임 도전 · 연습장: 상품(과자 쿠폰) 없이 점수 · 순위만 */
let NO_PRIZE = false;
export function setNoPrize(v) { NO_PRIZE = !!v; }

/**
 * @param opt { id, title, subtitle, howto: string[], music, setup(ctx) → {update(dt), draw(g), result()} }
 * @returns Promise<{score, cleared, coins, snack, detail}>
 */
export function openGame(opt) {
  return new Promise((resolve) => {
    const ov = document.createElement('div');
    ov.className = `mg-ov mg-${opt.id}`;
    ov.innerHTML = `
      <div class="mg-top"><span class="mg-title">${opt.title}</span><span class="mg-hud" id="mgHud"></span><button class="mg-x" id="mgX" aria-label="나가기">✕</button></div>
      <div class="mg-stage" id="mgStage"><canvas id="mgCv"></canvas><div class="mg-layer" id="mgLayer"></div></div>
      <div class="mg-ctrl" id="mgCtrl"></div>
      <div class="mg-intro" id="mgIntro"><div class="mg-card">
        <div class="kicker">MINI GAME</div><h2>${opt.title}</h2><p class="sub">${opt.subtitle || ''}</p>
        <ol>${opt.howto.map((h) => `<li>${h}</li>`).join('')}</ol>
        <button class="primary big" id="mgGo">시작! ▶</button></div></div>`;
    document.body.appendChild(ov);
    const stage = ov.querySelector('#mgStage');
    const cv = ov.querySelector('#mgCv');
    const g = cv.getContext('2d');
    const hudEl = ov.querySelector('#mgHud');
    const layer = ov.querySelector('#mgLayer');
    const ctrl = ov.querySelector('#mgCtrl');
    let W = 360;
    let H = 600;
    let scale = 1;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    function fit() {
      const r = stage.getBoundingClientRect();
      scale = r.width / W;
      H = Math.round(r.height / scale);
      cv.width = Math.round(r.width * dpr);
      cv.height = Math.round(r.height * dpr);
      cv.style.width = `${r.width}px`;
      cv.style.height = `${r.height}px`;
      ctx.W = W; ctx.H = H; ctx.scale = scale;
    }

    // ---- 입력 ----
    const input = { down: false, x: 0, y: 0, keys: {}, taps: [] };
    const toLocal = (e) => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale }; };
    cv.addEventListener('pointerdown', (e) => { const p = toLocal(e); input.down = true; input.x = p.x; input.y = p.y; input.taps.push(p); input.id = e.pointerId; });
    cv.addEventListener('pointermove', (e) => { if (!input.down) return; const p = toLocal(e); input.x = p.x; input.y = p.y; });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((n) => cv.addEventListener(n, () => { input.down = false; }));
    const kd = (e) => { input.keys[e.key] = e.type === 'keydown'; if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault(); };
    document.addEventListener('keydown', kd);
    document.addEventListener('keyup', kd);

    /** 꾹 누르는 버튼 */
    function button(label, cls, { onDown, onUp } = {}) {
      const b = document.createElement('button');
      b.className = `mg-btn ${cls || ''}`;
      b.innerHTML = label;
      const on = (e) => { e.preventDefault(); b.classList.add('on'); onDown?.(); };
      const off = () => { if (b.classList.contains('on')) { b.classList.remove('on'); onUp?.(); } };
      b.addEventListener('pointerdown', on);
      ['pointerup', 'pointerleave', 'pointercancel'].forEach((n) => b.addEventListener(n, off));
      ctrl.appendChild(b);
      return b;
    }

    // ---- 효과 ----
    const fx = [];
    let shakeT = 0;
    let shakeA = 0;
    function burst(x, y, n = 14, colors = ['#FFD43B', '#FF9ECB', '#8FD8FF', '#fff'], speed = 160) {
      for (let k = 0; k < n; k++) {
        const a = Math.random() * Math.PI * 2;
        const v = speed * (0.4 + Math.random());
        fx.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.7, max: 0.7, c: colors[k % colors.length], r: 2 + Math.random() * 3 });
      }
    }
    function floatText(text, x, y, color = '#2B2350', size = 20) { fx.push({ text, x, y, vy: -50, life: 1, max: 1, c: color, size }); }
    function shake(a = 6, t = 0.25) { shakeA = a; shakeT = t; }

    const ctx = {
      g, W, H, input, button, burst, floatText, shake, layer, ctrl,
      hud: (html) => { hudEl.innerHTML = html; },
      callout,
      comboCallout,
      sfx,
      time: 0,
      ended: false,
      end: null,
    };

    let game = null;
    let raf = 0;
    let last = 0;
    let running = false;

    function frame(now) {
      const dt = Math.min(0.04, (now - last) / 1000 || 0);
      last = now;
      if (running && game) {
        ctx.time += dt;
        game.update(dt);
        input.taps.length = 0;
      }
      for (let k = fx.length - 1; k >= 0; k--) {
        const p = fx[k];
        p.life -= dt;
        if (p.vx !== undefined) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 260 * dt; } else p.y += p.vy * dt;
        if (p.life <= 0) fx.splice(k, 1);
      }
      if (shakeT > 0) shakeT -= dt;
      g.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
      if (shakeT > 0) g.translate((Math.random() - 0.5) * shakeA, (Math.random() - 0.5) * shakeA);
      g.clearRect(-20, -20, W + 40, H + 40);
      game?.draw(g);
      fx.forEach((p) => {
        g.globalAlpha = Math.max(0, p.life / p.max);
        if (p.text) {
          g.font = `400 ${p.size}px Jua, 'Noto Sans KR', sans-serif`;
          g.textAlign = 'center'; g.textBaseline = 'middle';
          g.lineWidth = 4; g.strokeStyle = '#fff'; g.strokeText(p.text, p.x, p.y);
          g.fillStyle = p.c; g.fillText(p.text, p.x, p.y);
        } else {
          g.fillStyle = p.c;
          g.beginPath(); g.arc(p.x, p.y, p.r, 0, Math.PI * 2); g.fill();
        }
      });
      g.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    }

    function cleanup() {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', kd);
      document.removeEventListener('keyup', kd);
      window.removeEventListener('resize', fit);
      ov.remove();
    }

    ctx.end = (res) => {
      if (ctx.ended) return;
      ctx.ended = true;
      running = false;
      setTimeout(() => showResult(res), 700);
    };

    function showResult(res) {
      const r = { score: 0, cleared: false, coins: 0, snack: null, lines: [], ...res };
      if (NO_PRIZE) { r.snack = null; r.snacks = []; }
      const card = document.createElement('div');
      card.className = 'mg-intro';
      card.innerHTML = `<div class="mg-card result ${r.cleared ? 'win' : ''}">
        <div class="kicker">${r.cleared ? 'CLEAR!' : 'GAME OVER'}</div>
        <h2>${r.headline || (r.cleared ? '대성공!' : '아쉬워요!')}</h2>
        <div class="mg-score">${r.score}<small>점</small></div>
        ${r.lines.map((l) => `<p class="ln">${l}</p>`).join('')}
        <div class="mg-reward">${NO_PRIZE ? '<span class="co">🏆 순위 도전 · 상품 없음</span>' : `<span class="co">🪙 코인 <b>+${r.coins}</b></span>`}${(r.snacks?.length ? r.snacks : r.snack ? [r.snack] : []).map((k) => `<span class="sn"><img src="${snackURL(k)}" alt="">${SNACKS[k].short} 쿠폰!</span>`).join('')}</div>
        <div id="mgRank"><p class="rk-wait">🏆 명예의 전당 기록 중…</p></div>
        <button class="primary big" id="mgOk">계속 ▶</button></div>`;
      ov.appendChild(card);
      // 점수 기록 + 순위표 (1·2·3등 메달)
      submitScore(opt.id, r.score).then((R) => { const el = card.querySelector('#mgRank'); if (el) el.innerHTML = rankTableHTML(opt.id, R); }).catch(() => { const el = card.querySelector('#mgRank'); if (el) el.innerHTML = ''; });
      sfx(r.cleared ? 'perfect' : 'end');
      if (r.cleared) callout(r.score >= (r.legendAt || Infinity) ? 'legend' : 'wow', r.headline); // 야르는 아껴서 (연속 정답 때만)
      card.querySelector('#mgOk').onclick = () => { cleanup(); resolve(r); };
    }

    ov.querySelector('#mgX').onclick = () => {
      if (!confirm('미니게임을 그만둘까요? (보상 없음)')) return;
      cleanup();
      resolve({ score: 0, cleared: false, coins: 0, snack: null, quit: true });
    };

    requestAnimationFrame(() => {
      fit();
      window.addEventListener('resize', fit);
      Promise.resolve(opt.setup(ctx)).then((gm) => {
        fit();
        game = gm;
        raf = requestAnimationFrame((t) => { last = t; frame(t); });
      });
    });

    ov.querySelector('#mgGo').onclick = async () => {
      ov.querySelector('#mgIntro').remove();
      if (opt.music) bgm(opt.music);
      const cd = document.createElement('div');
      cd.className = 'mg-count';
      layer.appendChild(cd);
      for (const n of ['3', '2', '1', 'GO!']) {
        cd.textContent = n;
        cd.classList.remove('bump'); void cd.offsetWidth; cd.classList.add('bump');
        sfx(n === 'GO!' ? 'reveal' : 'tap');
        await new Promise((r) => setTimeout(r, n === 'GO!' ? 500 : 700));
      }
      cd.remove();
      running = true;
      game?.start?.();
    };
  });
}

/** 캐릭터 그림(스티커)을 캔버스로 */
export async function charSprite(id) {
  const { loadChar } = await import('../board/charart.js');
  try { return (await loadChar(id)).sticker; } catch { return null; }
}
