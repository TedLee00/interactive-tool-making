// 청크 사격장 — 지시된 품사가 적힌 과녁만 정확히 탭해서 맞힌다. 라운드마다 12초!
import { openGame, rand, pick, shuffle, clamp, roundRect, loadImage, asset } from './engine.js';
import data from '../../data/minigames.json';

// 3단계 × 4라운드 = 12라운드 (약 3분 30초) — 단계가 오를수록 과녁이 빨라진다
const ROUNDS = [
  { target: '명사', pool: 'pos', sec: 15 },
  { target: '부사', pool: 'pos', sec: 15 },
  { target: '형용사', pool: 'pos', sec: 15 },
  { target: '동사', pool: 'pos', sec: 15 },
  { target: '형용사', pool: 'pos', sec: 14 },
  { target: '명사', pool: 'pos', sec: 14 },
  { target: '동사', pool: 'pos', sec: 14 },
  { target: '부사', pool: 'pos', sec: 14 },
  { target: '부사구', pool: 'chunks', sec: 18 },
  { target: '형용사구', pool: 'chunks', sec: 18 },
  { target: '명사구', pool: 'chunks', sec: 18 },
  { target: '부사절', pool: 'chunks', sec: 18 },
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
      '라운드 <b>12개</b>(각 14~18초): 명사·부사·형용사·동사 → 마지막엔 <b>부사구·형용사구·명사구·부사절</b>',
      '틀린 과녁을 쏘면 <b>-1초</b> · 빈 곳을 쏘면 콤보가 끊겨요',
      '🍫 <b class="red">과자 과녁</b>이 가끔 아주 빠르게 지나가요! 맞는 품사면 과자 획득, <b class="red">틀리면 -300점 · -3초</b>',
      '과녁 품사가 바뀌면 화면 가운데에 <b>큰 경고판</b>이 떠요. 연속으로 맞히면 점수가 쑥쑥!',
    ],
    async setup(ctx) {
      const SNK = {};
      await Promise.all(Object.keys(SNACK_NAME).map(async (k) => { SNK[k] = await loadImage(asset(`snacks/${k}.svg`)).catch(() => null); }));
      const warn = document.createElement('div');
      warn.className = 'shoot-warn';
      ctx.layer.appendChild(warn);
      const S = { snacks: [], snackT: 4, round: -1, t: 0, left: 0, targets: [], spawnT: 0, score: 0, hits: 0, wrong: 0, combo: 0, best: 0, holes: [], gun: 0, aim: { x: 180, y: 300 }, finished: false, flash: 0 };
      const banner = document.createElement('div');
      banner.className = 'mg-mission shoot-ban';
      ctx.layer.appendChild(banner);

      const rows = () => [ctx.H * 0.26, ctx.H * 0.44, ctx.H * 0.62];
      const words = (R) => {
        if (R.pool === 'pos') return { good: data.pos[R.target], bad: Object.entries(data.pos).filter(([k]) => k !== R.target).flatMap(([, v]) => v) };
        return { good: data.chunks[R.target], bad: Object.entries(data.chunks).filter(([k]) => k !== R.target).flatMap(([, v]) => v) };
      };
      function nextRound() {
        S.round++;
        if (S.round >= ROUNDS.length) return finish();
        const R = ROUNDS[S.round];
        S.left = R.sec; S.targets = []; S.spawnT = 0; S.roundHits = 0; S.pause = PAUSE;
        banner.innerHTML = `<small>ROUND ${S.round + 1}/${ROUNDS.length}</small><b>「<span class="tg">${R.target}</span>」만 쏴라!</b>${R.pool === 'chunks' ? '<em>💡 단어 하나가 아니라 <span class="tg">덩어리(구·절)</span>의 품사!</em>' : ''}`;
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
        const lvl = Math.min(6, S.round); // 난이도 상한
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
        const snack = S.snacks.length ? (S.snacks.includes('cookie') ? 'cookie' : S.snacks.includes('cake') ? 'cake' : 'choco') : S.hits >= 55 ? 'cake' : null;
        ctx.end({
          score: S.score, cleared: S.hits >= 35, coins: Math.min(30, Math.round(S.hits / 2)), snack,
          headline: S.hits >= 55 ? '명사수 등장!' : S.hits >= 35 ? '사격 성공!' : '조금만 더 정확하게!', legendAt: 9000,
          lines: [`명중 <b>${S.hits}</b> · 잘못 쏜 과녁 ${S.wrong} · 🍫 과자 과녁 <b>${S.snacks.length}</b>개`, `최고 콤보 <b>${S.best}</b> · 35발 명중하면 성공 · 55발 이상이면 오예스 쿠폰!`],
        });
      }

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
            S.snackT = rand(7, 11);
            const R = ROUNDS[S.round]; const Wd = words(R);
            const good = Math.random() < 0.5;
            const dir = Math.random() < 0.5 ? 1 : -1;
            S.targets.push({ kind: 'snack', snack: pick(Object.keys(SNACK_NAME)), label: pick(good ? Wd.good : Wd.bad), good, x: dir > 0 ? -50 : ctx.W + 50, y: ctx.H * 0.16 + 6, vx: dir * (230 + Math.min(6, S.round) * 18), r: R.pool === 'chunks' ? 34 : 30, t: 0, alive: true });
            ctx.floatText('🍫 과자 과녁이 온다!', ctx.W / 2, ctx.H * 0.12, '#FFD43B', 18);
          }
          S.spawnT -= dt;
          const alive = S.targets.filter((t) => t.alive).length;
          if (S.spawnT <= 0 && alive < 6) { spawn(); S.spawnT = Math.max(0.42, 0.78 - Math.min(6, S.round) * 0.06); }
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
          // 뒷모습 사수: 뒤통수 + 어깨 + 위로 총을 겨눈 두 팔 (조준점을 향해 몸을 살짝 돌리고, 쏠 때 반동)
          {
            const rec = S.gun * 34;
            const cx = W / 2 + clamp((a.x - W / 2) * 0.12, -26, 26);
            const by = H + 6 + rec; // 몸통 아래쪽(화면 밖까지)
            const hy = H - 112 + rec; // 머리 중심
            const pivX = cx; const pivY = hy - 46; // 총 손잡이 위치 (머리 위)
            const ang = clamp(Math.atan2(a.y - pivY, a.x - pivX) + Math.PI / 2, -1.0, 1.0);
            const ink = '#2B2350';
            // 몸통 (후드티)
            g.fillStyle = '#E0453A'; g.strokeStyle = ink; g.lineWidth = 3;
            g.beginPath(); g.moveTo(cx - 70, by); g.quadraticCurveTo(cx - 66, hy + 30, cx - 30, hy + 26); g.lineTo(cx + 30, hy + 26); g.quadraticCurveTo(cx + 66, hy + 30, cx + 70, by); g.closePath(); g.fill(); g.stroke();
            // 후드 (등 뒤에 접힌 모자)
            g.fillStyle = '#C2362C'; g.beginPath(); g.ellipse(cx, hy + 36, 34, 16, 0, 0, Math.PI); g.fill(); g.stroke();
            // 등 번호
            g.font = "400 22px Jua, 'Noto Sans KR', sans-serif"; g.fillStyle = '#FFD43B'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('7', cx, hy + 66);
            // 팔: 어깨에서 총 손잡이까지
            const grip = (side) => { const ox = side * 9; return [pivX + Math.cos(ang) * ox - Math.sin(ang) * 6, pivY + Math.sin(ang) * ox + Math.cos(ang) * 6]; };
            [-1, 1].forEach((side) => {
              const [gx2, gy2] = grip(side);
              const sx = cx + side * 44; const sy = hy + 36;
              g.lineCap = 'round'; g.lineJoin = 'round';
              // 팔꿈치를 바깥으로 벌려 뒤에서도 두 팔이 보이게
              const ex = cx + side * 66; const ey = hy - 18;
              g.strokeStyle = ink; g.lineWidth = 20; g.beginPath(); g.moveTo(sx, sy); g.lineTo(ex, ey); g.lineTo(gx2, gy2); g.stroke();
              g.strokeStyle = '#E0453A'; g.lineWidth = 14; g.beginPath(); g.moveTo(sx, sy); g.lineTo(ex, ey); g.lineTo(gx2, gy2); g.stroke();
            });
            // 장난감 총 (머리 위로 겨눔)
            g.save(); g.translate(pivX, pivY); g.rotate(ang);
            roundRect(g, -12, -58, 24, 58, 9); g.fillStyle = '#FF9ECB'; g.fill(); g.lineWidth = 3; g.strokeStyle = ink; g.stroke();
            roundRect(g, -7, -74, 14, 20, 5); g.fillStyle = '#8FD8FF'; g.fill(); g.stroke();
            g.fillStyle = '#FFD43B'; g.beginPath(); g.arc(0, -30, 5, 0, 7); g.fill();
            if (S.flash > 0) { g.fillStyle = '#FFD43B'; g.beginPath(); g.arc(0, -86, 13, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(0, -86, 6, 0, 7); g.fill(); }
            g.restore();
            // 손 (총 손잡이를 꼭 쥔 두 주먹)
            [-1, 1].forEach((side) => { const [gx2, gy2] = grip(side); g.fillStyle = '#F2C9A0'; g.strokeStyle = ink; g.lineWidth = 2.5; g.beginPath(); g.arc(gx2, gy2, 8, 0, 7); g.fill(); g.stroke(); });
            // 뒤통수: 귀 + 동그란 머리 + 삐침 머리 + 거꾸로 쓴 모자
            g.fillStyle = '#F2C9A0'; g.strokeStyle = ink; g.lineWidth = 3;
            [-1, 1].forEach((side) => { g.beginPath(); g.ellipse(cx + side * 33, hy + 4, 8, 11, 0, 0, 7); g.fill(); g.stroke(); });
            g.fillStyle = '#3A2A20'; g.beginPath(); g.arc(cx, hy, 34, 0, 7); g.fill(); g.stroke();
            g.fillStyle = '#5A4232'; g.beginPath(); g.ellipse(cx - 10, hy - 12, 12, 7, -0.5, 0, 7); g.fill();
            // 거꾸로 쓴 야구모자 (챙이 뒤로 = 우리 쪽)
            g.fillStyle = '#2E7BC4'; g.beginPath(); g.arc(cx, hy - 6, 33, Math.PI * 1.02, Math.PI * 1.98); g.closePath(); g.fill(); g.stroke();
            g.fillStyle = '#1F5E9C'; g.beginPath(); g.ellipse(cx, hy - 4, 22, 7, 0, 0, 7); g.fill(); g.stroke();
            g.fillStyle = '#FFD43B'; g.beginPath(); g.arc(cx, hy - 38, 4, 0, 7); g.fill();
            // 머리 위 삐침
            g.strokeStyle = '#3A2A20'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(cx + 6, hy + 30); g.quadraticCurveTo(cx + 2, hy + 40, cx - 6, hy + 36); g.stroke();
            g.lineCap = 'butt';
          }
          if (S.flash > 0) { g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(0, 0, W, H); }
        },
      };
    },
  });
}
