// 청크 배틀 아레나 — 위에서 내려다보는 생존 배틀 (요즘 인기 아레나 게임 스타일, 캐릭터·규칙은 독창적으로)
// 왼손 조이스틱으로 이동, 적을 탭하면 그 적에게 발사. 지시된 품사의 적만 공격해야 한다.
import { openGame, charSprite, rand, pick, clamp, roundRect, tag } from './engine.js';
import data from '../../data/minigames.json';

const TOTAL = 180; // 3분 생존전 (기획서 4-4)
const WAVES = [
  { t: 0, target: '명사', pool: 'pos' },
  { t: 30, target: '부사', pool: 'pos' },
  { t: 60, target: '형용사', pool: 'pos' },
  { t: 90, target: '동사', pool: 'pos' },
  { t: 120, target: '부사구', pool: 'chunks' },
  { t: 150, target: '명사구', pool: 'chunks', boss: true },
];
const BLOB = ['#FF9ECB', '#8FD8FF', '#FFD36B', '#B79CFF', '#8FE08A', '#FFB36B'];

export function playArena({ charId = 'bboy' } = {}) {
  return openGame({
    id: 'arena',
    title: '⚔️ 청크 배틀 아레나',
    subtitle: '3분 동안 살아남아라! 지시된 품사의 적만 공격!',
    music: 'mgArena',
    howto: [
      '<b>왼손으로 화면을 끌면</b> 조이스틱 이동 · <b>적을 탭</b>하면 그 적에게 발사!',
      '위에 뜬 <b>품사만 공격</b> (예: 부사만!) · 다른 적을 때리면 그 적이 <b>더 강해져요</b>',
      '💎 젬을 모으면 공격력 UP · 게이지가 차면 <b>필살기</b> (지시된 적 한꺼번에!)',
      '30초마다 지시가 바뀌고, 마지막엔 <b>오답 대마왕</b>이 나타나요',
    ],
    async setup(ctx) {
      const { g } = ctx;
      const cv = g.canvas;
      const me = await charSprite(charId);
      const S = {
        t: 0, x: 180, y: 300, hp: 6, inv: 0, score: 0, power: 1, gems: 0, gauge: 0, wave: -1, kills: 0, wrongHits: 0,
        enemies: [], shots: [], drops: [], spawnT: 0, cd: 0, boss: null, finished: false, face: 1,
      };
      const rocks = [];
      const banner = document.createElement('div');
      banner.className = 'mg-mission';
      ctx.layer.appendChild(banner);
      const superBtn = ctx.button('💥<small>필살기</small>', 'drop super', { onDown: () => superMove() });
      superBtn.disabled = true;

      // ---- 멀티터치: 조이스틱 손가락 / 공격 탭 ----
      const joy = { id: null, ax: 0, ay: 0, dx: 0, dy: 0 };
      const loc = (e) => { const r = cv.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * ctx.W, y: ((e.clientY - r.top) / r.height) * ctx.H }; };
      const onDown = (e) => {
        if (S.finished) return;
        const p = loc(e);
        const hitE = [...S.enemies, ...(S.boss ? [S.boss] : [])].find((en) => (en.x - p.x) ** 2 + (en.y - p.y) ** 2 < (en.r + 16) ** 2);
        if (hitE) { fire(hitE); return; }
        if (joy.id === null) { joy.id = e.pointerId; joy.ax = p.x; joy.ay = p.y; joy.dx = 0; joy.dy = 0; }
      };
      const onMove = (e) => { if (e.pointerId !== joy.id) return; const p = loc(e); joy.dx = p.x - joy.ax; joy.dy = p.y - joy.ay; };
      const onUp = (e) => { if (e.pointerId === joy.id) { joy.id = null; joy.dx = joy.dy = 0; } };
      cv.addEventListener('pointerdown', onDown);
      cv.addEventListener('pointermove', onMove);
      cv.addEventListener('pointerup', onUp);
      cv.addEventListener('pointercancel', onUp);

      function placeRocks() {
        rocks.length = 0;
        [[0.22, 0.32], [0.78, 0.36], [0.3, 0.72], [0.72, 0.7]].forEach(([fx, fy]) => rocks.push({ x: ctx.W * fx, y: ctx.H * fy, r: 22 }));
      }
      placeRocks();
      S.x = ctx.W / 2; S.y = ctx.H / 2;

      const wave = () => WAVES[S.wave];
      function setWave(i) {
        S.wave = i;
        const w = WAVES[i];
        banner.innerHTML = `<small>WAVE ${i + 1}/${WAVES.length}</small><b>「${w.target}」만 공격!</b><em>💡 ${w.boss ? '오답 대마왕 등장! 명사구로 공격하면 큰 피해' : '다른 품사를 때리면 적이 강해져요'}</em>`;
        banner.classList.remove('pop'); void banner.offsetWidth; banner.classList.add('pop');
        if (i > 0) ctx.callout('nice', `WAVE ${i + 1}`);
        if (w.boss) S.boss = { x: ctx.W / 2, y: 70, r: 44, hp: 30, max: 30, vx: 60, label: '오답 대마왕', boss: true };
      }

      function labelsFor(target, poolName) {
        if (poolName === 'pos') return { good: data.pos[target], bad: Object.entries(data.pos).filter(([k]) => k !== target).flatMap(([, v]) => v) };
        return { good: data.chunks[target], bad: Object.entries(data.chunks).filter(([k]) => k !== target).flatMap(([, v]) => v) };
      }
      function spawn() {
        const w = wave();
        const L = labelsFor(w.target, w.pool);
        const good = Math.random() < 0.5;
        const side = Math.floor(Math.random() * 4);
        const pos = [[rand(20, ctx.W - 20), -20], [ctx.W + 20, rand(60, ctx.H - 40)], [rand(20, ctx.W - 20), ctx.H + 20], [-20, rand(60, ctx.H - 40)]][side];
        S.enemies.push({ x: pos[0], y: pos[1], r: 17, hp: 1, sp: rand(34, 52) + S.t * 0.12, label: pick(good ? L.good : L.bad), good, c: pick(BLOB), grow: 0, wob: Math.random() * 6 });
      }

      function fire(en) {
        if (S.cd > 0) return;
        S.cd = Math.max(0.12, 0.34 - S.power * 0.04);
        const a = Math.atan2(en.y - S.y, en.x - S.x);
        S.face = Math.cos(a) >= 0 ? 1 : -1;
        S.shots.push({ x: S.x, y: S.y - 14, vx: Math.cos(a) * 420, vy: Math.sin(a) * 420, target: en, r: 5 + S.power, life: 1.2 });
        ctx.sfx('tap');
      }

      function superMove() {
        if (S.gauge < 1 || S.finished) return;
        S.gauge = 0; superBtn.disabled = true;
        ctx.callout('legend', '필살기!');
        ctx.shake(10, 0.4);
        S.ring = { r: 0 };
        S.enemies.filter((en) => en.good).forEach((en) => kill(en, true));
        if (S.boss) hitBoss(6);
      }

      function kill(en, bySuper) {
        const i = S.enemies.indexOf(en);
        if (i < 0) return;
        S.enemies.splice(i, 1);
        S.kills++;
        const pts = 100 + en.grow * 50;
        S.score += pts;
        S.gauge = Math.min(1, S.gauge + 0.12);
        if (S.gauge >= 1) superBtn.disabled = false;
        ctx.burst(en.x, en.y, 16, [en.c, '#fff', '#FFD43B']);
        if (!bySuper) ctx.floatText(`+${pts}`, en.x, en.y - 20, '#1E9B5B', 16);
        if (Math.random() < 0.35) S.drops.push({ x: en.x, y: en.y, t: 0 });
        if (S.kills % 8 === 0 && !bySuper) ctx.callout('yar', `${S.kills} 처치!`);
      }
      function hitBoss(n) {
        if (!S.boss) return;
        S.boss.hp -= n;
        ctx.burst(S.boss.x, S.boss.y, 10, ['#7A3FA8', '#fff']);
        if (S.boss.hp <= 0) {
          S.score += 1500;
          ctx.callout('legend', '대마왕 격파!');
          ctx.burst(S.boss.x, S.boss.y, 60);
          S.boss = null; S.bossDown = true;
        }
      }

      function finish(survived) {
        if (S.finished) return;
        S.finished = true;
        superBtn.disabled = true;
        cv.removeEventListener('pointerdown', onDown);
        const cleared = survived;
        ctx.end({
          score: S.score + (survived ? S.hp * 200 : 0), cleared,
          coins: Math.min(35, Math.round(S.score / 150)) + (cleared ? 10 : 0),
          snack: cleared && S.bossDown ? 'cake' : null,
          headline: cleared ? (S.bossDown ? '대마왕까지 격파!' : '3분 생존 성공!') : '쓰러졌어요…',
          legendAt: 5000,
          lines: [`처치 <b>${S.kills}</b> · 잘못 때린 적 ${S.wrongHits}`, `공격력 Lv.${S.power} · 남은 체력 ${Math.max(0, S.hp)}`],
        });
      }

      setWave(0);

      return {
        update(dt) {
          if (S.finished) return;
          S.t += dt;
          const wi = WAVES.reduce((acc, w, i) => (S.t >= w.t ? i : acc), 0);
          if (wi !== S.wave) setWave(wi);
          if (S.t >= TOTAL) return finish(true);

          // 이동
          const k = ctx.input.keys;
          let mx = joy.dx / 40;
          let my = joy.dy / 40;
          if (k.ArrowLeft) mx = -1; if (k.ArrowRight) mx = 1; if (k.ArrowUp) my = -1; if (k.ArrowDown) my = 1;
          const m = Math.hypot(mx, my);
          if (m > 1) { mx /= m; my /= m; }
          const sp = 150 + S.power * 8;
          S.x = clamp(S.x + mx * sp * dt, 16, ctx.W - 16);
          S.y = clamp(S.y + my * sp * dt, 40, ctx.H - 20);
          if (mx) S.face = mx > 0 ? 1 : -1;
          rocks.forEach((r) => { const d = Math.hypot(S.x - r.x, S.y - r.y); if (d < r.r + 14) { S.x = r.x + ((S.x - r.x) / d) * (r.r + 14); S.y = r.y + ((S.y - r.y) / d) * (r.r + 14); } });
          S.cd = Math.max(0, S.cd - dt);
          S.inv = Math.max(0, S.inv - dt);

          // 키보드: 스페이스 → 가장 가까운 적
          if (k[' '] && S.enemies.length) fire(S.enemies.reduce((a, b) => (Math.hypot(a.x - S.x, a.y - S.y) < Math.hypot(b.x - S.x, b.y - S.y) ? a : b)));

          // 적 생성
          S.spawnT -= dt;
          const maxE = 7 + Math.floor(S.t / 30);
          if (S.spawnT <= 0 && S.enemies.length < maxE) { spawn(); S.spawnT = Math.max(0.5, 1.4 - S.t / 200); }

          // 적 이동
          S.enemies.forEach((en) => {
            const a = Math.atan2(S.y - en.y, S.x - en.x);
            en.x += Math.cos(a) * en.sp * dt;
            en.y += Math.sin(a) * en.sp * dt;
            rocks.forEach((r) => { const d = Math.hypot(en.x - r.x, en.y - r.y); if (d < r.r + en.r) { en.x = r.x + ((en.x - r.x) / d) * (r.r + en.r); en.y = r.y + ((en.y - r.y) / d) * (r.r + en.r); } });
            if (Math.hypot(en.x - S.x, en.y - S.y) < en.r + 14 && S.inv <= 0) {
              S.hp--; S.inv = 1.2; ctx.shake(8); ctx.sfx('no');
              ctx.floatText('-1', S.x, S.y - 40, '#E0453A', 20);
              en.x -= Math.cos(a) * 40; en.y -= Math.sin(a) * 40;
              if (S.hp <= 0) finish(false);
            }
          });
          // 보스
          if (S.boss) {
            const b = S.boss;
            b.x += b.vx * dt; if (b.x < 50 || b.x > ctx.W - 50) b.vx *= -1;
            b.y = 70 + Math.sin(S.t * 1.2) * 16;
            if (Math.random() < dt * 0.9) { // 보스가 졸개를 부른다
              const w = wave(); const L = labelsFor(w.target, w.pool); const good = Math.random() < 0.5;
              S.enemies.push({ x: b.x, y: b.y + 30, r: 17, hp: 1, sp: rand(46, 62), label: pick(good ? L.good : L.bad), good, c: pick(BLOB), grow: 0, wob: 0 });
            }
          }
          // 탄
          for (let i = S.shots.length - 1; i >= 0; i--) {
            const s = S.shots[i];
            const tgt = s.target;
            const alive = tgt.boss ? S.boss === tgt : S.enemies.includes(tgt);
            if (alive) { const a = Math.atan2(tgt.y - s.y, tgt.x - s.x); s.vx += (Math.cos(a) * 420 - s.vx) * dt * 6; s.vy += (Math.sin(a) * 420 - s.vy) * dt * 6; }
            s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
            if (s.life <= 0) { S.shots.splice(i, 1); continue; }
            const hitList = [...S.enemies, ...(S.boss ? [S.boss] : [])];
            const hitE = hitList.find((en) => Math.hypot(en.x - s.x, en.y - s.y) < en.r + s.r);
            if (!hitE) continue;
            S.shots.splice(i, 1);
            if (hitE.boss) { hitBoss(S.power >= 3 ? 2 : 1); continue; }
            if (hitE.good) kill(hitE);
            else {
              S.wrongHits++; hitE.grow++; hitE.r = Math.min(30, hitE.r + 4); hitE.sp *= 1.2;
              S.score = Math.max(0, S.score - 50);
              ctx.floatText(`✘ ${wave().target} 아님!`, hitE.x, hitE.y - 30, '#E0453A', 15);
              ctx.sfx('no');
            }
          }
          // 젬
          for (let i = S.drops.length - 1; i >= 0; i--) {
            const d = S.drops[i]; d.t += dt;
            if (Math.hypot(d.x - S.x, d.y - S.y) < 24) {
              S.drops.splice(i, 1); S.gems++;
              if (S.gems % 4 === 0 && S.power < 5) { S.power++; ctx.callout('nice', `공격력 Lv.${S.power}`); }
              ctx.sfx('reveal');
            } else if (d.t > 9) S.drops.splice(i, 1);
          }
          if (S.ring) { S.ring.r += 600 * dt; if (S.ring.r > 600) S.ring = null; }
          const left = Math.max(0, Math.ceil(TOTAL - S.t));
          ctx.hud(`❤️×${Math.max(0, S.hp)} ⏱<b>${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}</b> <b>${S.score}</b>`);
        },
        draw(gc) {
          const { W, H } = ctx;
          // 바닥 타일
          for (let y = 0; y < H; y += 40) for (let x = 0; x < W; x += 40) {
            gc.fillStyle = ((x + y) / 40) % 2 ? '#E8DCFF' : '#F3ECFF';
            gc.fillRect(x, y, 40, 40);
          }
          gc.strokeStyle = 'rgba(183,156,255,.5)'; gc.lineWidth = 6; gc.strokeRect(3, 3, W - 6, H - 6);
          // 바위 · 덤불
          rocks.forEach((r, i) => {
            gc.fillStyle = 'rgba(43,35,80,.15)'; gc.beginPath(); gc.ellipse(r.x, r.y + 14, r.r, 8, 0, 0, 7); gc.fill();
            gc.fillStyle = i % 2 ? '#8FE08A' : '#7ED0B0'; gc.beginPath(); gc.arc(r.x, r.y, r.r, 0, 7); gc.fill();
            gc.fillStyle = 'rgba(255,255,255,.4)'; gc.beginPath(); gc.arc(r.x - 6, r.y - 7, r.r * 0.4, 0, 7); gc.fill();
          });
          // 젬
          S.drops.forEach((d) => {
            const y = d.y - Math.abs(Math.sin(d.t * 4)) * 6;
            gc.fillStyle = '#5BE0FF'; gc.beginPath(); gc.moveTo(d.x, y - 9); gc.lineTo(d.x + 7, y); gc.lineTo(d.x, y + 9); gc.lineTo(d.x - 7, y); gc.fill();
            gc.strokeStyle = '#fff'; gc.lineWidth = 2; gc.stroke();
          });
          // 적
          S.enemies.forEach((en) => {
            const sq = 1 + Math.sin(S.t * 8 + en.wob) * 0.08;
            gc.fillStyle = 'rgba(43,35,80,.15)'; gc.beginPath(); gc.ellipse(en.x, en.y + en.r * 0.8, en.r, en.r * 0.35, 0, 0, 7); gc.fill();
            gc.save(); gc.translate(en.x, en.y); gc.scale(1 / sq, sq);
            gc.fillStyle = en.grow ? '#FF6F6F' : en.c; gc.beginPath(); gc.arc(0, 0, en.r, 0, 7); gc.fill();
            gc.lineWidth = 2.5; gc.strokeStyle = '#2B2350'; gc.stroke();
            gc.fillStyle = '#fff'; [-6, 6].forEach((dx) => { gc.beginPath(); gc.arc(dx, -3, 4.5, 0, 7); gc.fill(); });
            gc.fillStyle = '#2B2350'; [-6, 6].forEach((dx) => { gc.beginPath(); gc.arc(dx + (S.x > en.x ? 1.5 : -1.5), -2, 2.2, 0, 7); gc.fill(); });
            if (en.grow) { gc.strokeStyle = '#2B2350'; gc.lineWidth = 2; gc.beginPath(); gc.moveTo(-10, -10); gc.lineTo(-3, -7); gc.moveTo(10, -10); gc.lineTo(3, -7); gc.stroke(); }
            gc.restore();
            tag(gc, en.label, en.x, en.y - en.r - 12, { size: 11, bg: '#FFFBF0' });
          });
          // 보스
          if (S.boss) {
            const b = S.boss;
            gc.fillStyle = '#7A3FA8'; gc.beginPath(); gc.ellipse(b.x, b.y, b.r + 6, b.r, 0, 0, 7); gc.fill();
            gc.fillStyle = '#FFD43B'; [-22, 0, 22].forEach((dx) => { gc.beginPath(); gc.moveTo(b.x + dx - 8, b.y - b.r + 6); gc.lineTo(b.x + dx, b.y - b.r - 14); gc.lineTo(b.x + dx + 8, b.y - b.r + 6); gc.fill(); });
            gc.fillStyle = '#fff'; [-14, 14].forEach((dx) => { gc.beginPath(); gc.arc(b.x + dx, b.y - 4, 9, 0, 7); gc.fill(); });
            gc.fillStyle = '#E0453A'; [-14, 14].forEach((dx) => { gc.beginPath(); gc.arc(b.x + dx, b.y - 2, 4, 0, 7); gc.fill(); });
            roundRect(gc, b.x - 40, b.y - b.r - 30, 80, 8, 4); gc.fillStyle = 'rgba(255,255,255,.7)'; gc.fill();
            roundRect(gc, b.x - 40, b.y - b.r - 30, 80 * (b.hp / b.max), 8, 4); gc.fillStyle = '#E0453A'; gc.fill();
            tag(gc, b.label, b.x, b.y + b.r + 14, { size: 12, bg: '#FF8A8A', fg: '#fff', border: '#7A1F1F' });
          }
          // 탄
          S.shots.forEach((s) => { gc.fillStyle = '#FFD43B'; gc.beginPath(); gc.arc(s.x, s.y, s.r, 0, 7); gc.fill(); gc.strokeStyle = '#fff'; gc.lineWidth = 2; gc.stroke(); });
          // 필살기 링
          if (S.ring) { gc.strokeStyle = `rgba(255,212,59,${1 - S.ring.r / 600})`; gc.lineWidth = 14; gc.beginPath(); gc.arc(S.x, S.y, S.ring.r, 0, 7); gc.stroke(); }
          // 플레이어
          gc.fillStyle = 'rgba(43,35,80,.2)'; gc.beginPath(); gc.ellipse(S.x, S.y + 4, 16, 6, 0, 0, 7); gc.fill();
          if (me && !(S.inv > 0 && Math.floor(S.inv * 12) % 2)) {
            const h = 52; const w = (me.width / me.height) * h;
            gc.save(); gc.translate(S.x, S.y + 4); gc.scale(S.face, 1);
            gc.drawImage(me, -w / 2, -h - Math.abs(Math.sin(S.t * 10)) * (Math.hypot(joy.dx, joy.dy) > 4 ? 3 : 0), w, h);
            gc.restore();
          }
          // 필살기 게이지 (머리 위)
          roundRect(gc, S.x - 20, S.y - 64, 40, 6, 3); gc.fillStyle = 'rgba(255,255,255,.8)'; gc.fill();
          roundRect(gc, S.x - 20, S.y - 64, 40 * S.gauge, 6, 3); gc.fillStyle = S.gauge >= 1 ? '#FFD43B' : '#8FD8FF'; gc.fill();
          // 조이스틱
          if (joy.id !== null) {
            gc.fillStyle = 'rgba(43,35,80,.12)'; gc.beginPath(); gc.arc(joy.ax, joy.ay, 44, 0, 7); gc.fill();
            const m = Math.min(40, Math.hypot(joy.dx, joy.dy)); const a = Math.atan2(joy.dy, joy.dx);
            gc.fillStyle = 'rgba(43,35,80,.35)'; gc.beginPath(); gc.arc(joy.ax + Math.cos(a) * m, joy.ay + Math.sin(a) * m, 20, 0, 7); gc.fill();
          }
        },
      };
    },
  });
}
