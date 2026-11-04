// 청크 사격장 — 지시된 품사가 적힌 과녁만 정확히 탭해서 맞힌다. 라운드마다 12초!
import { openGame, rand, pick, shuffle, clamp, roundRect, loadImage, asset } from './engine.js';
import data from '../../data/minigames.json';

// 5라운드 × 25초 — 라운드마다 품사가 바뀐다
const ROUNDS = [
  { target: '명사', pool: 'pos', sec: 25 },
  { target: '동사', pool: 'pos', sec: 25 },
  { target: '형용사', pool: 'pos', sec: 25 },
  { target: '부사', pool: 'pos', sec: 25 },
  { target: '부사구', pool: 'chunks', sec: 25 },
];
const PAUSE = 2.4; // 라운드 사이: 화면 가운데 큰 경고판이 깜빡이는 시간
const SNACK_NAME = { choco: '초코파이', cake: '오예스', cookie: '쿠키앤크림' };
const RING = ['#E0453A', '#fff', '#2E7BC4', '#fff', '#FFD43B'];

export function playShoot() {
  return openGame({
    id: 'shoot',
    title: '🎯 청크 사격장',
    subtitle: '지시된 품사 과녁만 탕! 탕! 정확하게 맞혀라',
    music: 'mgArena',
    howto: [
      '화면 위 <b>지시된 품사</b>의 과녁만 <b>정확히 탭</b>해서 쏘기',
      '라운드 <b>5개</b> × <b>25초</b>: 명사 → 동사 → 형용사 → 부사 → 부사구 (라운드마다 품사가 바뀌어요)',
      '틀린 과녁을 쏘면 <b>-1초</b> · 빈 곳을 쏘면 콤보가 끊겨요',
      '🍫 <b class="red">과자 과녁</b>이 가끔 아주 빠르게 지나가요! 맞는 품사면 과자 획득, <b class="red">틀리면 -300점 · -3초</b>',
      '과녁 품사가 바뀌면 화면 가운데에 <b>큰 경고판</b>이 떠요. 연속으로 맞히면 점수가 쑥쑥!',
    ],
    async setup(ctx) {
      const SNK = {};
      await Promise.all(Object.keys(SNACK_NAME).map(async (k) => { SNK[k] = await loadImage(asset(`snacks/${k}.svg`)).catch(() => null); }));
      // 과자 과녁은 초코파이 · 오예스 · 쿠키앤크림이 골고루 (주머니 뽑기)
      let snackBag = [];
      const nextSnack = () => { if (!snackBag.length) snackBag = shuffle(Object.keys(SNACK_NAME)); return snackBag.pop(); };
      const warn = document.createElement('div');
      warn.className = 'shoot-warn';
      ctx.layer.appendChild(warn);
      const S = { snacks: [], snackT: 4, round: -1, t: 0, left: 0, targets: [], spawnT: 0, score: 0, hits: 0, wrong: 0, combo: 0, best: 0, holes: [], gun: 0, aim: { x: 180, y: 300 }, finished: false, flash: 0 };
      const banner = document.createElement('div');
      banner.className = 'mg-mission shoot-ban';
      ctx.layer.appendChild(banner);

      const rows = () => [ctx.H * 0.29, ctx.H * 0.45, ctx.H * 0.61];
      const words = (R) => {
        if (R.pool === 'pos') return { good: data.pos[R.target], bad: Object.entries(data.pos).filter(([k]) => k !== R.target).flatMap(([, v]) => v) };
        return { good: data.chunks[R.target], bad: Object.entries(data.chunks).filter(([k]) => k !== R.target).flatMap(([, v]) => v) };
      };
      function nextRound() {
        S.round++;
        if (S.round >= ROUNDS.length) return finish();
        const R = ROUNDS[S.round];
        S.left = R.sec; S.targets = []; S.spawnT = 0; S.roundHits = 0; S.pause = PAUSE;
        banner.innerHTML = `<small>R${S.round + 1}/${ROUNDS.length}</small><b>「<span class="tg">${R.target}</span>」만!</b>`; // 맨 위 작은 띠 (크게는 가운데 경고판이 한 번 보여 줌)
        banner.classList.remove('pop'); void banner.offsetWidth; banner.classList.add('pop');
        // 화면 가운데: 주의 표지판처럼 크게 깜빡! (그동안 게임은 잠깐 멈춤)
        warn.innerHTML = `<div class="sw-in"><small>⚠ 과녁이 바뀌었어요 ⚠</small><b>「<span>${R.target}</span>」만</b><b>쏴라!</b>${R.pool === 'chunks' ? '<em>단어 하나가 아니라 덩어리(구·절)!</em>' : ''}</div>`;
        warn.classList.remove('on'); void warn.offsetWidth; warn.classList.add('on');
        ctx.sfx('reveal');
        S.snackT = rand(3, 6);
      }

      function spawn() {
        const R = ROUNDS[S.round];
        const W = words(R);
        const good = Math.random() < 0.45;
        const present = new Set(S.targets.map((t) => t.label));
        const label = pick((good ? W.good : W.bad).filter((w) => !present.has(w))) || pick(good ? W.good : W.bad);
        const r = R.pool === 'chunks' ? 36 : 31;
        const ry = rows();
        const lvl = Math.min(6, S.round * 1.5); // 라운드마다 조금씩 빨라짐
        const sp = 60 + lvl * 12;
        // 줄마다 방향 고정(겹치지 않게) · 입구가 비어 있는 줄에만 등장
        const free = [0, 1, 2].filter((row) => {
          const dir = row % 2 ? -1 : 1;
          const x0 = dir > 0 ? -40 : ctx.W + 40;
          return !S.targets.some((t) => t.alive && t.kind === 'slide' && t.row === row && Math.abs(t.x - x0) < r * 2 + 34);
        });
        if (free.length && Math.random() < 0.72) {
          const row = pick(free);
          const dir = row % 2 ? -1 : 1;
          S.targets.push({ kind: 'slide', row, label, good, x: dir > 0 ? -40 : ctx.W + 40, y: ry[row], vx: sp * dir, r, t: 0, alive: true });
          return;
        }
        const pops = S.targets.filter((t) => t.alive && t.kind === 'pop');
        let x = null;
        for (let k = 0; k < 10 && x === null; k++) {
          const c = rand(50, ctx.W - 50);
          if (pops.every((t) => Math.abs(t.x - c) > r * 2 + 16)) x = c;
        }
        if (x === null) return;
        S.targets.push({ kind: 'pop', label, good, x, y: ctx.H * 0.8, base: ctx.H * 0.8, up: 0, life: 2.4 - lvl * 0.12, r, t: 0, alive: true });
      }

      function shoot(p) {
        if (S.finished || S.round < 0) return;
        S.gun = 0.15; S.flash = 0.06; S.aim = p;
        ctx.sfx('bounce');
        const hit = [...S.targets].reverse().find((t) => t.alive && (t.x - p.x) ** 2 + (t.ty - p.y) ** 2 <= t.r * t.r);
        if (!hit) {
          S.holes.push({ x: p.x, y: p.y, life: 1.2 });
          if (S.combo > 0) ctx.floatText('빗나감!', p.x, p.y - 20, '#6B5F8A', 15);
          S.combo = 0;
          return;
        }
        hit.alive = false;
        if (hit.kind === 'snack') {
          if (hit.good) {
            S.hits++; S.combo++; S.best = Math.max(S.best, S.combo); S.score += 400; S.snacks.push(hit.snack);
            ctx.burst(hit.x, hit.ty, 30, ['#FFD43B', '#fff', '#E21E8C']);
            ctx.floatText(`🍫 ${SNACK_NAME[hit.snack]} GET! +400`, hit.x, hit.ty + 40, '#FFD43B', 20);
            ctx.callout('yar', `${SNACK_NAME[hit.snack]} 획득!`); ctx.sfx('perfect');
          } else {
            S.wrong++; S.combo = 0; S.left = Math.max(0, S.left - 3); S.score = Math.max(0, S.score - 300);
            ctx.shake(12, 0.4); ctx.sfx('no');
            ctx.floatText(`✘ ${hit.label}는 ${ROUNDS[S.round].target} 아님! -300 · -3초`, ctx.W / 2, hit.ty + 46, '#FF6B6B', 18);
          }
          return;
        }
        if (hit.good) {
          S.hits++; S.roundHits++; S.combo++; S.best = Math.max(S.best, S.combo);
          const pts = 100 + Math.min(10, S.combo) * 25;
          S.score += pts;
          ctx.burst(hit.x, hit.ty, 18, ['#FFD43B', '#fff', '#E0453A']);
          ctx.floatText(`+${pts}`, hit.x, hit.ty - 30, '#1E9B5B', 20);
          ctx.sfx('ok');
          if (S.combo % 5 === 0) ctx.callout('yar', `${S.combo} 콤보!`);
        } else {
          S.wrong++; S.combo = 0; S.left = Math.max(0, S.left - 1);
          S.score = Math.max(0, S.score - 50);
          ctx.shake(6); ctx.sfx('no');
          ctx.floatText(`✘ ${ROUNDS[S.round].target} 아님! -1초`, hit.x, hit.ty - 30, '#E0453A', 16);
        }
      }

      function finish() {
        if (S.finished) return;
        S.finished = true;
        // 과자 과녁을 맞혔으면 그 과자, 아니면 55발 이상 명중 시 오예스
        // 맞힌 과자 과녁은 모두 상품 (초코파이 · 오예스 · 쿠키앤크림)
        const snacks = S.snacks.slice();
        ctx.end({
          score: S.score, cleared: S.hits >= 20, coins: Math.min(30, Math.round(S.hits * 0.8)), snack: snacks[0] || null, snacks,
          headline: S.hits >= 35 ? '명사수 등장!' : S.hits >= 20 ? '사격 성공!' : '조금만 더 정확하게!', legendAt: 5500,
          lines: [`명중 <b>${S.hits}</b> · 잘못 쏜 과녁 ${S.wrong} · 🍫 과자 과녁 <b>${S.snacks.length}</b>개`, `최고 콤보 <b>${S.best}</b> · 20발 명중하면 성공 · 과자 과녁을 맞히면 그 과자가 상품!`],
        });
      }

      window.__SHOOT = () => S.targets; // 테스트용
      return {
        start() { nextRound(); },
        update(dt) {
          if (S.finished || S.round < 0) return;
          if (S.pause > 0) { S.pause -= dt; ctx.hud(`⏸ 준비! · 🎯 ${S.hits} · <b>${S.score}</b>`); return; }
          ctx.input.taps.forEach(shoot);
          S.t += dt;
          S.left -= dt;
          S.gun = Math.max(0, S.gun - dt);
          S.flash = Math.max(0, S.flash - dt);
          if (S.left <= 0) { ctx.floatText('TIME!', ctx.W / 2, ctx.H * 0.45, '#D9822B', 30); nextRound(); return; }
          // 🍫 과자 과녁: 가끔 아주 빠르게 지나간다 (정답이면 과자 획득, 오답이면 크게 감점)
          S.snackT -= dt;
          if (S.snackT <= 0) {
            S.snackT = rand(6, 9);
            const R = ROUNDS[S.round]; const Wd = words(R);
            const good = Math.random() < 0.5;
            const dir = Math.random() < 0.5 ? 1 : -1;
            S.targets.push({ kind: 'snack', snack: nextSnack(), label: pick(good ? Wd.good : Wd.bad), good, x: dir > 0 ? -50 : ctx.W + 50, y: ctx.H * 0.16 + 6, vx: dir * (230 + Math.min(6, S.round) * 18), r: R.pool === 'chunks' ? 34 : 30, t: 0, alive: true });
            ctx.floatText('🍫 과자 과녁이 온다!', ctx.W / 2, ctx.H * 0.12, '#FFD43B', 18);
          }
          S.spawnT -= dt;
          const alive = S.targets.filter((t) => t.alive).length;
          if (S.spawnT <= 0 && alive < 6) { spawn(); S.spawnT = Math.max(0.45, 0.78 - S.round * 0.08); }
          S.targets.forEach((t) => {
            t.t += dt;
            if (t.kind === 'snack') { t.x += t.vx * dt; t.ty = t.y + Math.sin(t.t * 9) * 4; if (t.x < -70 || t.x > ctx.W + 70) t.alive = false; }
            else if (t.kind === 'slide') { t.x += t.vx * dt; t.ty = t.y + Math.sin(t.t * 4) * 3; if (t.x < -60 || t.x > ctx.W + 60) t.alive = false; }
            else {
              t.life -= dt;
              t.up = t.life > 0.4 ? Math.min(1, t.up + dt * 4) : Math.max(0, t.up - dt * 4);
              t.ty = t.base - t.up * 70;
              if (t.life <= 0) t.alive = false;
            }
            if (t.alive === false && !t.gone) t.gone = true;
          });
          S.targets = S.targets.filter((t) => t.alive);
          S.holes.forEach((h) => { h.life -= dt; });
          S.holes = S.holes.filter((h) => h.life > 0);
          ctx.hud(`⏱ <b>${Math.max(0, Math.ceil(S.left))}</b>초 · 🎯 ${S.hits} · <b>${S.score}</b>${S.combo > 1 ? ` <i>🔥${S.combo}</i>` : ''}`);
        },
        draw(g) {
          const { W, H } = ctx;
          // 사격장 부스
          const bg = g.createLinearGradient(0, 0, 0, H);
          bg.addColorStop(0, '#2B2350'); bg.addColorStop(1, '#5A3E8A');
          g.fillStyle = bg; g.fillRect(0, 0, W, H);
          for (let x = 0; x < W; x += 40) { g.fillStyle = (x / 40) % 2 ? '#E0453A' : '#fff'; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 40, 0); g.lineTo(x + 20, 34); g.fill(); }
          for (let k = 0; k < 9; k++) { g.fillStyle = Math.floor(S.t * 4 + k) % 2 ? '#FFD43B' : '#FFF6B8'; g.beginPath(); g.arc(20 + k * (W - 40) / 8, 42, 4, 0, 7); g.fill(); }
          rows().forEach((y) => { roundRect(g, 0, y + 30, W, 12, 3); g.fillStyle = '#B07A4F'; g.fill(); g.fillStyle = '#8A5A35'; g.fillRect(0, y + 40, W, 4); });
          g.fillStyle = '#B07A4F'; g.fillRect(0, H * 0.8 + 26, W, H);
          // 과녁
          S.targets.forEach((t) => {
            const y = t.ty ?? t.y;
            if (t.kind === 'snack') {
              // 줄에 매달린 과자 + 반짝이는 테두리
              g.strokeStyle = '#FFD43B'; g.lineWidth = 2; g.beginPath(); g.moveTo(t.x + t.r * 0.7, y); g.lineTo(t.x + t.r + 18, y + 22); g.stroke();
              const im = SNK[t.snack]; if (im) g.drawImage(im, t.x + t.r - 6, y + 16, 62, 38);
              g.strokeStyle = `rgba(255,212,59,${0.5 + 0.5 * Math.sin(S.t * 18)})`; g.lineWidth = 5; g.beginPath(); g.arc(t.x, y, t.r + 6, 0, 7); g.stroke();
            }
            if (t.kind === 'pop') { g.fillStyle = '#6B4F2A'; g.fillRect(t.x - 4, y, 8, H * 0.8 + 30 - y); }
            else { g.fillStyle = '#6B4F2A'; g.fillRect(t.x - 3, y + t.r - 4, 6, 14); }
            RING.forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(t.x, y, t.r * (1 - i * 0.18), 0, 7); g.fill(); });
            g.lineWidth = 3; g.strokeStyle = '#2B2350'; g.beginPath(); g.arc(t.x, y, t.r, 0, 7); g.stroke();
            // 글자판
            g.font = `400 ${t.label.length > 9 ? 12 : 15}px Jua, 'Noto Sans KR', sans-serif`;
            const tw = Math.max(t.r * 1.6, g.measureText(t.label).width + 14);
            roundRect(g, t.x - tw / 2, y - 12, tw, 24, 12);
            g.fillStyle = '#FFFBF0'; g.fill(); g.lineWidth = 2.5; g.strokeStyle = '#2B2350'; g.stroke();
            g.fillStyle = '#2B2350'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t.label, t.x, y + 1);
          });
          // 과자 과녁 줄
          g.fillStyle = 'rgba(255,212,59,.25)'; g.fillRect(0, H * 0.16 + 6 - 1, W, 2);
          // 총알 자국
          S.holes.forEach((h) => { g.globalAlpha = Math.min(1, h.life); g.fillStyle = '#2B2350'; g.beginPath(); g.arc(h.x, h.y, 4, 0, 7); g.fill(); g.globalAlpha = 1; });
          // 조준선
          const a = S.aim;
          g.strokeStyle = 'rgba(255,212,59,.9)'; g.lineWidth = 2.5;
          g.beginPath(); g.arc(a.x, a.y, 14, 0, 7); g.moveTo(a.x - 22, a.y); g.lineTo(a.x - 8, a.y); g.moveTo(a.x + 8, a.y); g.lineTo(a.x + 22, a.y); g.moveTo(a.x, a.y - 22); g.lineTo(a.x, a.y - 8); g.moveTo(a.x, a.y + 8); g.lineTo(a.x, a.y + 22); g.stroke();
          // 뒷모습 사수 (날씬하고 귀여운 꼬마) — 소총 개머리판은 오른쪽 어깨, 왼손은 총 앞부분, 오른손 검지는 방아쇠
          {
            const rec = S.gun * 22;
            const ink = '#2B2350';
            const cx = W / 2 + clamp((a.x - W / 2) * 0.1, -22, 22);
            const hy = H - 62 + rec; // 머리 중심 (화면 아래로 더 내려 과녁을 가리지 않게)
            const by = H + 10 + rec;
            const shX = cx + 22; const shY = hy + 40; // 개머리판이 닿는 오른쪽 어깨
            const ang = clamp(Math.atan2(a.y - shY, a.x - shX), -Math.PI + 0.35, -0.35);
            const ux = Math.cos(ang); const uy = Math.sin(ang);
            const nx = -uy; const ny = ux;
            const GK = 0.66; // 총 길이를 짧게 (과녁 가림 방지)
            const at = (d, o = 0) => [shX + ux * d * GK + nx * o, shY + uy * d * GK + ny * o];
            const poly = (pts, fill, lw = 2.2) => { g.fillStyle = fill; g.beginPath(); g.moveTo(...pts[0]); pts.slice(1).forEach((q) => g.lineTo(...q)); g.closePath(); g.fill(); g.lineWidth = lw; g.strokeStyle = ink; g.stroke(); };
            const bar = (d0, d1, o0, o1, fill) => poly([at(d0, o0), at(d1, o0), at(d1, o1), at(d0, o1)], fill);
            g.lineCap = 'round'; g.lineJoin = 'round';
            // 몸 (날씬한 바람막이 점퍼) + 줄무늬 + 목
            g.fillStyle = '#F2C9A0'; g.fillRect(cx - 8, hy + 26, 16, 14);
            g.fillStyle = '#4FA3E8'; g.strokeStyle = ink; g.lineWidth = 2.5;
            g.beginPath(); g.moveTo(cx - 46, by); g.quadraticCurveTo(cx - 44, hy + 50, cx - 24, hy + 38); g.lineTo(cx + 24, hy + 38); g.quadraticCurveTo(cx + 44, hy + 50, cx + 46, by); g.closePath(); g.fill(); g.stroke();
            g.fillStyle = '#FFD43B'; g.fillRect(cx - 45, hy + 74, 90, 6);
            g.strokeStyle = 'rgba(43,35,80,.35)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx, hy + 40); g.lineTo(cx, by); g.stroke();
            // 가방끈
            g.strokeStyle = '#E0453A'; g.lineWidth = 6; g.beginPath(); g.moveTo(cx - 20, hy + 40); g.lineTo(cx - 24, by); g.moveTo(cx + 18, hy + 40); g.lineTo(cx + 20, by); g.stroke();
            const arm = (from, elbow, to) => {
              g.strokeStyle = ink; g.lineWidth = 14; g.beginPath(); g.moveTo(...from); g.lineTo(...elbow); g.lineTo(...to); g.stroke();
              g.strokeStyle = '#4FA3E8'; g.lineWidth = 9; g.beginPath(); g.moveTo(...from); g.lineTo(...elbow); g.lineTo(...to); g.stroke();
            };
            const fore = at(90, 1); // 왼손: 총열 덮개
            const trig = at(36, 7); // 오른손: 방아쇠
            arm([cx - 30, hy + 46], [cx - 46, hy + 8], fore);
            // ---- 소총 (멜빵 · 개머리판 · 손잡이 · 방아쇠 울 · 탄창 · 몸통 · 조준경 · 총열 덮개 · 총열 · 가늠쇠) ----
            g.strokeStyle = '#8A5A35'; g.lineWidth = 3; g.beginPath(); g.moveTo(...at(-6, 9)); g.quadraticCurveTo(...at(50, 26), ...at(110, 7)); g.stroke(); // 멜빵
            poly([at(-22, -9), at(18, -6), at(18, 7), at(4, 12), at(-22, 11)], '#A8743F'); // 개머리판 (나무)
            bar(-24, -19, -9, 11, '#2B2350'); // 개머리판 끝 고무
            poly([at(28, 6), at(36, 6), at(32, 19), at(25, 18)], '#3A3550'); // 권총 손잡이
            { const [qx, qy] = at(40, 10); g.strokeStyle = ink; g.lineWidth = 2.2; g.beginPath(); g.ellipse(qx, qy, 6, 4, ang, 0, 7); g.stroke(); } // 방아쇠 울
            poly([at(48, 6), at(58, 6), at(62, 24), at(52, 25)], '#3A3550'); // 탄창 (살짝 휘어짐)
            bar(18, 74, -6, 6, '#55507A'); // 몸통
            bar(30, 66, -14, -8, '#2B2350'); // 조준경
            bar(28, 32, -15, -6, '#2B2350'); bar(64, 68, -15, -6, '#2B2350');
            { const [lx, ly] = at(30, -11); g.fillStyle = '#8FD8FF'; g.beginPath(); g.arc(lx, ly, 3, 0, 7); g.fill(); }
            bar(74, 126, -5, 5, '#6B6590'); // 총열 덮개
            for (let k = 0; k < 4; k++) { const [vx, vy] = at(82 + k * 11, 0); g.fillStyle = '#2B2350'; g.beginPath(); g.arc(vx, vy, 1.8, 0, 7); g.fill(); }
            bar(126, 170, -2.2, 2.2, '#3A3550'); // 총열
            bar(166, 172, -3.5, 3.5, '#2B2350'); // 소염기
            poly([at(118, -5), at(122, -5), at(121, -11)], '#2B2350', 1.5); // 가늠쇠
            if (S.flash > 0) { const [fx, fy] = at(184, 0); g.fillStyle = '#FFD43B'; g.beginPath(); g.arc(fx, fy, 13, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(fx, fy, 6, 0, 7); g.fill(); }
            // 오른팔
            arm([cx + 30, hy + 46], [cx + 46, hy + 30], trig);
            // ---- 뒤통수 (큰 머리 = 귀엽게) ----
            const hx = cx - 4; const hr = 33;
            g.fillStyle = '#F2C9A0'; g.strokeStyle = ink; g.lineWidth = 2.5;
            [-1, 1].forEach((side) => { g.beginPath(); g.ellipse(hx + side * (hr - 1), hy + 6, 7, 10, 0, 0, 7); g.fill(); g.stroke(); g.fillStyle = '#F4A9A0'; g.beginPath(); g.ellipse(hx + side * (hr - 1), hy + 6, 3, 5, 0, 0, 7); g.fill(); g.fillStyle = '#F2C9A0'; });
            g.fillStyle = '#4A3326'; g.beginPath(); g.arc(hx, hy, hr, 0, 7); g.fill(); g.stroke();
            // 뒷머리 결 + 삐친 머리카락
            g.strokeStyle = '#2F1F16'; g.lineWidth = 2;
            [-16, -6, 4, 14].forEach((dx) => { g.beginPath(); g.moveTo(hx + dx, hy + 6); g.quadraticCurveTo(hx + dx + 3, hy + 20, hx + dx - 1, hy + 30); g.stroke(); });
            g.fillStyle = '#4A3326'; g.strokeStyle = ink; g.lineWidth = 2;
            poly([[hx - 6, hy + 30], [hx - 2, hy + 40], [hx + 3, hy + 31]], '#4A3326', 2);
            // 거꾸로 쓴 모자: 정수리 + 뒤쪽 조절 고리 구멍 사이로 머리카락
            g.fillStyle = '#E0453A'; g.strokeStyle = ink; g.lineWidth = 2.5;
            g.beginPath(); g.arc(hx, hy - 2, hr + 1, Math.PI * 1.03, Math.PI * 1.97); g.quadraticCurveTo(hx, hy + 8, hx - hr - 1, hy - 2 + Math.sin(Math.PI * 0.03) * hr); g.closePath(); g.fill(); g.stroke();
            g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(hx, hy - hr - 1); g.lineTo(hx, hy + 2); g.stroke();
            g.fillStyle = '#4A3326'; g.strokeStyle = ink; g.lineWidth = 2; g.beginPath(); g.ellipse(hx, hy + 1, 9, 6, 0, Math.PI, 0); g.fill(); g.stroke();
            g.fillStyle = '#fff'; g.fillRect(hx - 12, hy + 1, 24, 4); g.strokeRect(hx - 12, hy + 1, 24, 4);
            g.fillStyle = '#FFD43B'; g.beginPath(); g.arc(hx, hy - hr - 1, 4, 0, 7); g.fill(); g.stroke();
            // 손: 왼손은 총 앞을 감싸 쥐고, 오른손 검지는 방아쇠에
            const hand = ([x, y], r = 7.5) => { g.fillStyle = '#F2C9A0'; g.strokeStyle = ink; g.lineWidth = 2.2; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.stroke(); };
            hand(fore); hand(trig);
            { const [kx, ky] = at(40, 9); g.strokeStyle = '#F2C9A0'; g.lineWidth = 3.5; g.beginPath(); g.moveTo(...trig); g.lineTo(kx, ky); g.stroke(); g.strokeStyle = ink; g.lineWidth = 1; g.stroke(); }
            g.lineCap = 'butt'; g.lineJoin = 'miter';
          }
          if (S.flash > 0) { g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(0, 0, W, H); }
        },
      };
    },
  });
}
