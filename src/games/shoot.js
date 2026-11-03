// 청크 사격장 — 지시된 품사가 적힌 과녁만 정확히 탭해서 맞힌다. 라운드마다 12초!
import { openGame, rand, pick, shuffle, clamp, roundRect } from './engine.js';
import data from '../../data/minigames.json';

const ROUNDS = [
  { target: '명사', pool: 'pos', sec: 12 },
  { target: '부사', pool: 'pos', sec: 12 },
  { target: '형용사', pool: 'pos', sec: 12 },
  { target: '동사', pool: 'pos', sec: 12 },
  { target: '부사구', pool: 'chunks', sec: 14 },
];
const RING = ['#E0453A', '#fff', '#2E7BC4', '#fff', '#FFD43B'];

export function playShoot() {
  return openGame({
    id: 'shoot',
    title: '🎯 청크 사격장',
    subtitle: '지시된 품사 과녁만 탕! 탕! 정확하게 맞혀라',
    music: 'mgArena',
    howto: [
      '화면 위 <b>지시된 품사</b>의 과녁만 <b>정확히 탭</b>해서 쏘기',
      '라운드마다 <b>12초!</b> 명사 → 부사 → 형용사 → 동사 → 부사구',
      '틀린 과녁을 쏘면 <b>-1초</b> · 빈 곳을 쏘면 콤보가 끊겨요',
      '연속으로 맞히면 점수가 쑥쑥! 많이 맞히면 오예스 쿠폰 🍫',
    ],
    async setup(ctx) {
      const S = { round: -1, t: 0, left: 0, targets: [], spawnT: 0, score: 0, hits: 0, wrong: 0, combo: 0, best: 0, holes: [], gun: 0, aim: { x: 180, y: 300 }, finished: false, flash: 0 };
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
        S.left = R.sec; S.targets = []; S.spawnT = 0; S.roundHits = 0;
        banner.innerHTML = `<small>ROUND ${S.round + 1}/${ROUNDS.length}</small><b>「<span class="tg">${R.target}</span>」만 쏴라!</b>`;
        banner.classList.remove('pop'); void banner.offsetWidth; banner.classList.add('pop');
        if (S.round > 0) ctx.callout('nice', `${R.target}만!`);
      }

      function spawn() {
        const R = ROUNDS[S.round];
        const W = words(R);
        const good = Math.random() < 0.45;
        const present = new Set(S.targets.map((t) => t.label));
        const label = pick((good ? W.good : W.bad).filter((w) => !present.has(w))) || pick(good ? W.good : W.bad);
        const r = R.pool === 'chunks' ? 36 : 31;
        const ry = rows();
        const sp = 55 + S.round * 12;
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
        S.targets.push({ kind: 'pop', label, good, x, y: ctx.H * 0.8, base: ctx.H * 0.8, up: 0, life: 2.4 - S.round * 0.15, r, t: 0, alive: true });
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
        const snack = S.hits >= 18 ? 'cake' : null;
        ctx.end({
          score: S.score, cleared: S.hits >= 12, coins: Math.min(30, S.hits * 2), snack,
          headline: S.hits >= 18 ? '명사수 등장!' : S.hits >= 12 ? '사격 성공!' : '조금만 더 정확하게!', legendAt: 3500,
          lines: [`명중 <b>${S.hits}</b> · 잘못 쏜 과녁 ${S.wrong}`, `최고 콤보 <b>${S.best}</b> · 18발 이상 명중하면 오예스 쿠폰!`],
        });
      }

      return {
        start() { nextRound(); },
        update(dt) {
          if (S.finished || S.round < 0) return;
          ctx.input.taps.forEach(shoot);
          S.t += dt;
          S.left -= dt;
          S.gun = Math.max(0, S.gun - dt);
          S.flash = Math.max(0, S.flash - dt);
          if (S.left <= 0) { ctx.floatText('TIME!', ctx.W / 2, ctx.H * 0.45, '#D9822B', 30); nextRound(); return; }
          S.spawnT -= dt;
          const alive = S.targets.filter((t) => t.alive).length;
          if (S.spawnT <= 0 && alive < 6) { spawn(); S.spawnT = Math.max(0.35, 0.75 - S.round * 0.08); }
          S.targets.forEach((t) => {
            t.t += dt;
            if (t.kind === 'slide') { t.x += t.vx * dt; t.ty = t.y + Math.sin(t.t * 4) * 3; if (t.x < -60 || t.x > ctx.W + 60) t.alive = false; }
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
          // 총알 자국
          S.holes.forEach((h) => { g.globalAlpha = Math.min(1, h.life); g.fillStyle = '#2B2350'; g.beginPath(); g.arc(h.x, h.y, 4, 0, 7); g.fill(); g.globalAlpha = 1; });
          // 조준선
          const a = S.aim;
          g.strokeStyle = 'rgba(255,212,59,.9)'; g.lineWidth = 2.5;
          g.beginPath(); g.arc(a.x, a.y, 14, 0, 7); g.moveTo(a.x - 22, a.y); g.lineTo(a.x - 8, a.y); g.moveTo(a.x + 8, a.y); g.lineTo(a.x + 22, a.y); g.moveTo(a.x, a.y - 22); g.lineTo(a.x, a.y - 8); g.moveTo(a.x, a.y + 8); g.lineTo(a.x, a.y + 22); g.stroke();
          // 장난감 총 (조준점을 향해 돌고, 쏠 때 반동)
          const gx = W / 2;
          const gy = H - 10;
          const ang = Math.atan2(a.y - gy, a.x - gx) + Math.PI / 2;
          g.save(); g.translate(gx, gy + S.gun * 40); g.rotate(clamp(ang, -1.1, 1.1));
          roundRect(g, -14, -70, 28, 70, 10); g.fillStyle = '#FF9ECB'; g.fill(); g.lineWidth = 3; g.strokeStyle = '#2B2350'; g.stroke();
          roundRect(g, -8, -86, 16, 20, 5); g.fillStyle = '#8FD8FF'; g.fill(); g.stroke();
          if (S.flash > 0) { g.fillStyle = '#FFD43B'; g.beginPath(); g.arc(0, -96, 12, 0, 7); g.fill(); }
          g.restore();
          if (S.flash > 0) { g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(0, 0, W, H); }
        },
      };
    },
  });
}
