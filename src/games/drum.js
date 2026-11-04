// 품사 드럼 — 리듬 게임. 위에서 박자에 맞춰 떨어지는 단어를 보고, 그 품사가 적힌 북을 두드린다.
//   왼손: 명사 · 동사   |   가운데: 접속사(징)   |   오른손: 형용사 · 부사
//   단어는 박자(쿵·짝)에 정확히 떨어지게 만들어서, 맞게 두드리면 진짜 드럼 연주가 된다.
import { openGame, pick, shuffle, clamp, roundRect, tag } from './engine.js';
import data from '../../data/minigames.json';
import { getAC, getMaster, I } from '../fx/legacy.js';
import { bgmStop } from '../fx/fx.js';
import { isMuted } from '../quiz/sound.js';

const PADS = [
  { pos: '명사', hand: 'L', col: '#E0453A', key: 'a' },
  { pos: '동사', hand: 'L', col: '#2E7BC4', key: 's' },
  { pos: '접속사', hand: 'C', col: '#2E8B57', key: ' ' },
  { pos: '형용사', hand: 'R', col: '#E4801A', key: 'k' },
  { pos: '부사', hand: 'R', col: '#7A3FA8', key: 'l' },
];
const CONJ = ['and', 'but', 'or', 'so', 'because', 'although', 'unless', 'if'];
const BPM = 92;
const BEAT = 60 / BPM;
const FALL = 3.0; // 단어가 위에서 판정선까지 내려오는 시간(초) — 읽을 시간 충분히
const BARS = 56; // 56마디 ≈ 2분 30초

/** 마디별 박자 패턴 (1 = 그 박에 단어) — 처음엔 듬성듬성, 갈수록 촘촘 */
function makeChart() {
  const pat = [[1, 0, 1, 0], [1, 0, 0, 0], [1, 0, 1, 0], [1, 1, 0, 0]];
  const mid = [[1, 0, 1, 1], [1, 1, 0, 1], [1, 0, 1, 0], [0, 1, 1, 1]];
  const hi = [[1, 1, 1, 1], [1, 1, 0, 1], [1, 0, 1, 1], [1, 1, 1, 0]];
  const notes = [];
  for (let b = 0; b < BARS; b++) {
    if (b % 8 === 7) continue; // 8마디마다 한 마디 쉬기 (숨 고르기)
    const P = b < 12 ? pick(pat) : b < 36 ? pick(mid) : pick(hi);
    P.forEach((on, k) => { if (on) notes.push({ beat: 4 + b * 4 + k }); }); // 앞 4박은 카운트인
  }
  // 품사 고르기: 4품사 골고루 + 가끔 접속사
  let bag = [];
  notes.forEach((n, i) => {
    if (i > 6 && Math.random() < 0.08) { n.pos = '접속사'; n.word = pick(CONJ); return; }
    if (!bag.length) bag = shuffle(['명사', '동사', '형용사', '부사', '명사', '동사', '형용사', '부사']);
    n.pos = bag.pop();
    n.word = pick(data.pos[n.pos]);
  });
  return notes;
}

export function playDrum() {
  return openGame({
    id: 'drum',
    title: '🥁 품사 드럼',
    subtitle: '박자에 맞춰 떨어지는 단어의 품사 북을 쿵! 짝!',
    howto: [
      '위에서 <b>단어</b>가 박자에 맞춰 떨어져요 — 그 단어의 <b class="red">품사가 적힌 북</b>을 두드려요',
      '왼손 엄지 <b>명사 · 동사</b> · 오른손 엄지 <b>형용사 · 부사</b> · 가끔 나오는 <b>접속사</b>는 가운데 징!',
      '단어가 <b class="red">판정선(빛나는 링)</b>에 닿는 순간 치면 <b>PERFECT</b> — 진짜 드럼 연주처럼!',
      '틀린 북을 치거나 놓치면 콤보가 끊겨요. 정확도 85% 이상이면 간식 쿠폰 🍫',
    ],
    async setup(ctx) {
      bgmStop();
      const notes = makeChart();
      const S = { score: 0, combo: 0, best: 0, perfect: 0, great: 0, good: 0, miss: 0, wrong: 0, finished: false, hitFx: [], stick: { L: 0, R: 0 }, flash: 0 };
      const AC = getAC();
      const master = getMaster();
      const clock = () => (AC && AC.state === 'running' ? AC.currentTime : performance.now() / 1000);
      let t0 = null; // 첫 박(카운트인 포함) 시각
      const total = notes.length;
      const arrive = (n) => t0 + n.beat * BEAT;
      const lastBeat = notes[notes.length - 1].beat;

      // ---- 소리: 북마다 다른 드럼 소리 + 반주(하이햇·베이스·코드) ----
      const out = () => (AC && master && !isMuted() ? master : null);
      const drum = (pos, at) => {
        const D = out(); if (!D) return; const t = at ?? AC.currentTime;
        if (pos === '명사') { I.kick(D, t, 0.95); I.tom(D, t, 80, 0.3); }
        else if (pos === '동사') { I.snare(D, t, 0.45); I.clap(D, t, 0.18); }
        else if (pos === '형용사') { I.tom(D, t, 210, 0.7); I.hat(D, t, 0.08); }
        else if (pos === '부사') { I.tom(D, t, 140, 0.75); }
        else { I.hat(D, t, 0.35, true); I.tom(D, t, 62, 0.5); I.zap(D, t, 0.03); } // 징
      };
      const thud = () => { const D = out(); if (D) I.tom(D, AC.currentTime, 55, 0.35); };
      const CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]].map((c) => c.map((m) => 440 * 2 ** ((m - 69) / 12)));
      const ROOTS = [45, 41, 36, 43].map((m) => 440 * 2 ** ((m - 69) / 12));
      let nextStep = 0; // 8분음표 단위
      function schedule() {
        const D = out(); if (!D || t0 === null) return;
        while (t0 + nextStep * BEAT / 2 < AC.currentTime + 0.25) {
          const st = nextStep; const t = t0 + st * BEAT / 2; const beat = st / 2; const bar = Math.floor(beat / 4);
          if (beat < 4) { if (st % 2 === 0) I.hat(D, t, 0.12, beat === 3); } // 카운트인: 칙 칙 칙 칙
          else if (beat <= lastBeat + 2) {
            I.hat(D, t, st % 2 ? 0.035 : 0.06);
            if (st % 8 === 0) { I.bass(D, t, ROOTS[bar % 4], BEAT * 1.6, 0.16); I.pad(D, t, CHORDS[bar % 4], BEAT * 3.6, 0.018); }
            if (st % 8 === 4) I.bass(D, t, ROOTS[bar % 4] * 1.5, BEAT * 0.9, 0.11);
          }
          nextStep++;
        }
      }

      // ---- 북 버튼 (왼손 2 · 가운데 징 · 오른손 2) ----
      const btns = PADS.map((p) => {
        const b = ctx.button(`<span class="dh"></span><b>${p.pos}</b>`, `dpad ${p.pos === '접속사' ? 'gong' : ''}`, { onDown: () => hit(p) });
        b.style.setProperty('--dc', p.col);
        return b;
      });
      const keyMap = Object.fromEntries(PADS.map((p) => [p.key, p]));
      const onKey = (e) => { const p = keyMap[e.key]; if (p && !e.repeat) hit(p); };
      window.addEventListener('keydown', onKey);

      function hit(p) {
        if (S.finished || t0 === null) return;
        const now = clock();
        S.stick[p.hand === 'R' ? 'R' : 'L'] = 0.18; if (p.hand === 'C') { S.stick.L = 0.18; S.stick.R = 0.18; }
        const b = btns[PADS.indexOf(p)]; b.classList.remove('boom'); void b.offsetWidth; b.classList.add('boom');
        // 판정선에 가장 가까운(아직 안 친) 단어
        const cand = notes.filter((n) => !n.done && arrive(n) - now < 1.1 && arrive(n) - now > -0.25).sort((a, b2) => arrive(a) - arrive(b2))[0];
        if (!cand) { drum(p.pos); return; } // 빈 박에 치면 그냥 소리만
        cand.done = true;
        const dt = Math.abs(arrive(cand) - now);
        if (cand.pos !== p.pos) {
          S.wrong++; S.combo = 0; cand.res = 'wrong'; thud();
          S.hitFx.push({ txt: `✘ ${cand.word} = ${cand.pos}`, col: '#FF6B6B', life: 1.1 });
          ctx.shake(5);
          return;
        }
        drum(p.pos);
        const grade = dt <= 0.12 ? 'PERFECT' : dt <= 0.26 ? 'GREAT' : 'GOOD';
        S[grade.toLowerCase()]++; S.combo++; S.best = Math.max(S.best, S.combo);
        const pts = { PERFECT: 300, GREAT: 200, GOOD: 100 }[grade] + Math.min(20, S.combo) * 10;
        S.score += pts;
        cand.res = grade;
        S.flash = 0.12;
        S.hitFx.push({ txt: `${grade}! +${pts}`, col: grade === 'PERFECT' ? '#FFD43B' : grade === 'GREAT' ? '#8FE08A' : '#8FD8FF', life: 0.9, x: p.hand });
        ctx.burst(ctx.W / 2, hitY(), grade === 'PERFECT' ? 26 : 14, [p.col, '#fff', '#FFD43B']);
        if (S.combo > 0 && S.combo % 10 === 0) ctx.callout('yar', `${S.combo} 콤보!`);
        else if (grade === 'PERFECT' && S.combo % 4 === 0) ctx.callout('easy');
      }

      const hitY = () => ctx.H * 0.62;
      window.__DRUM = { notes, S, arrive: (n) => (t0 === null ? 0 : arrive(n)), clock, hit: (pos) => hit(PADS.find((p) => p.pos === pos)) }; // 테스트용
      function finish() {
        if (S.finished) return;
        S.finished = true;
        window.removeEventListener('keydown', onKey);
        const ok = S.perfect + S.great + S.good;
        const acc = Math.round((ok / total) * 100);
        ctx.end({
          score: S.score, cleared: acc >= 60, coins: Math.min(30, Math.round(acc / 4)), snack: acc >= 85 ? pick(['choco', 'cake', 'cookie']) : null,
          headline: acc >= 90 ? '🥁 드럼 마스터!' : acc >= 60 ? '연주 성공!' : '조금만 더 박자에 맞춰!', legendAt: 30000,
          lines: [`정확도 <b>${acc}%</b> · PERFECT ${S.perfect} · GREAT ${S.great} · GOOD ${S.good}`, `틀린 북 ${S.wrong} · 놓침 ${S.miss} · 최고 콤보 <b>${S.best}</b>`],
        });
      }

      return {
        start() { t0 = clock() + 0.4; },
        update(dt) {
          if (S.finished || t0 === null) return;
          schedule();
          const now = clock();
          // 놓친 단어
          notes.forEach((n) => { if (!n.done && now - arrive(n) > 0.25) { n.done = true; n.res = 'miss'; S.miss++; S.combo = 0; S.hitFx.push({ txt: `MISS · ${n.word} = ${n.pos}`, col: '#9A90B5', life: 1 }); } });
          S.hitFx.forEach((f) => { f.life -= dt; }); S.hitFx = S.hitFx.filter((f) => f.life > 0);
          S.stick.L = Math.max(0, S.stick.L - dt); S.stick.R = Math.max(0, S.stick.R - dt); S.flash = Math.max(0, S.flash - dt);
          const done = notes.filter((n) => n.done).length;
          ctx.hud(`🎵 <b>${done}</b>/${total} · <b>${S.score}</b>${S.combo > 1 ? ` <i>🔥${S.combo}</i>` : ''}`);
          if (now > t0 + (lastBeat + 3) * BEAT) finish();
        },
        draw(g) {
          const { W, H } = ctx;
          const now = t0 === null ? 0 : clock();
          const beatPhase = t0 === null ? 0 : ((now - t0) / BEAT) % 1;
          // 무대 배경
          const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#120C2E'); bg.addColorStop(1, '#3A1E5C');
          g.fillStyle = bg; g.fillRect(0, 0, W, H);
          // 조명 (박자마다 번쩍)
          const pulse = 1 - beatPhase;
          [[W * 0.15, '#E21E8C'], [W * 0.5, '#FFD43B'], [W * 0.85, '#2E9BDA']].forEach(([x, c], k) => {
            const sway = Math.sin(now * 0.8 + k * 2) * 40;
            const gr = g.createLinearGradient(x, 0, x + sway, H * 0.75);
            gr.addColorStop(0, c + 'AA'); gr.addColorStop(1, c + '00');
            g.globalAlpha = 0.25 + 0.35 * pulse;
            g.fillStyle = gr; g.beginPath(); g.moveTo(x - 10, 0); g.lineTo(x + 10, 0); g.lineTo(x + sway + 70, H * 0.75); g.lineTo(x + sway - 70, H * 0.75); g.closePath(); g.fill();
          });
          g.globalAlpha = 1;
          // 스피커 · 음표 장식
          [[18, H * 0.3], [W - 58, H * 0.3]].forEach(([x, y]) => {
            roundRect(g, x, y, 40, 90, 8); g.fillStyle = '#1B1430'; g.fill(); g.strokeStyle = '#5A4A86'; g.lineWidth = 2; g.stroke();
            [y + 26, y + 64].forEach((cy, i) => { g.fillStyle = '#2B2350'; g.beginPath(); g.arc(x + 20, cy, i ? 15 : 10, 0, 7); g.fill(); g.strokeStyle = '#8A7AC0'; g.beginPath(); g.arc(x + 20, cy, (i ? 15 : 10) * (1 + 0.12 * pulse), 0, 7); g.stroke(); });
          });
          g.font = "400 22px Jua, sans-serif"; g.fillStyle = 'rgba(255,255,255,.18)'; g.textAlign = 'center';
          ['♪', '♫', '♩', '♬'].forEach((n, k) => g.fillText(n, ((k * 97 + now * 30) % (W - 40)) + 20, 60 + ((k * 61 + now * 12) % (H * 0.4))));
          // 레인 + 판정선
          const hy = hitY();
          g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(W / 2 - 80, 0, 160, hy + 30);
          g.strokeStyle = `rgba(255,212,59,${0.5 + 0.5 * pulse})`; g.lineWidth = 4 + 4 * S.flash * 8;
          g.beginPath(); g.ellipse(W / 2, hy, 92, 18, 0, 0, 7); g.stroke();
          g.fillStyle = 'rgba(255,212,59,.15)'; g.fill();
          // 박자 점 (이번 박이 어디인지)
          for (let k = 0; k < 4; k++) { const on = t0 !== null && Math.floor((now - t0) / BEAT) % 4 === k; g.fillStyle = on ? '#FFD43B' : 'rgba(255,255,255,.25)'; g.beginPath(); g.arc(W / 2 - 36 + k * 24, hy + 36, on ? 6 : 4, 0, 7); g.fill(); }
          // 떨어지는 단어
          if (t0 !== null) {
            const speed = (hy - 40) / FALL;
            notes.forEach((n) => {
              const left = arrive(n) - now;
              if (left > FALL + 0.2) return;
              if (n.done && n.res !== 'miss') return;
              if (n.res === 'miss' && left < -0.6) return;
              const y = hy - left * speed;
              const P = PADS.find((p) => p.pos === n.pos);
              g.globalAlpha = n.res === 'miss' ? 0.35 : 1;
              g.font = "400 22px Jua, 'Noto Sans KR', sans-serif";
              const w = Math.max(96, g.measureText(n.word).width + 46);
              roundRect(g, W / 2 - w / 2, y - 20, w, 40, 20);
              g.fillStyle = '#FFFBF0'; g.fill(); g.lineWidth = 3; g.strokeStyle = n.pos === '접속사' ? '#2E8B57' : '#2B2350'; g.stroke();
              g.fillStyle = '#E21E8C'; g.font = "400 20px Jua, sans-serif"; g.textAlign = 'left'; g.fillText('♪', W / 2 - w / 2 + 10, y + 7);
              g.fillStyle = '#2B2350'; g.font = "400 22px Jua, 'Noto Sans KR', sans-serif"; g.textAlign = 'center'; g.fillText(n.word, W / 2 + 8, y + 8);
              void P;
              g.globalAlpha = 1;
            });
            const cnt = Math.ceil((t0 + 4 * BEAT - now) / BEAT);
            if (cnt > 0 && cnt <= 4) { g.font = "400 72px Jua, sans-serif"; g.fillStyle = '#FFD43B'; g.textAlign = 'center'; g.fillText(String(cnt), W / 2, H * 0.36); }
          }
          // 판정 글자
          S.hitFx.forEach((f, k) => { g.globalAlpha = Math.min(1, f.life * 2); g.font = "400 24px Jua, 'Noto Sans KR', sans-serif"; g.textAlign = 'center'; g.lineWidth = 5; g.strokeStyle = '#120C2E'; const y = hy - 60 - k * 26 - (1 - f.life) * 30; g.strokeText(f.txt, W / 2, y); g.fillStyle = f.col; g.fillText(f.txt, W / 2, y); });
          g.globalAlpha = 1;
          // 드러머 뒷모습 (뒤통수 + 양손 드럼스틱)
          drawDrummer(g, W / 2, H, S.stick, pulse);
        },
      };
    },
  });
}

function drawDrummer(g, cx, H, stick, pulse) {
  const ink = '#2B2350';
  const hy = H - 70;
  g.lineCap = 'round'; g.lineJoin = 'round';
  // 어깨 · 티셔츠
  g.fillStyle = '#E21E8C'; g.strokeStyle = ink; g.lineWidth = 2.5;
  g.beginPath(); g.moveTo(cx - 54, H + 6); g.quadraticCurveTo(cx - 50, hy + 30, cx - 22, hy + 24); g.lineTo(cx + 22, hy + 24); g.quadraticCurveTo(cx + 50, hy + 30, cx + 54, H + 6); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#FFD43B'; g.font = "400 14px Jua, sans-serif"; g.textAlign = 'center'; g.fillText('POS BAND', cx, hy + 50);
  // 팔 + 스틱 (치는 순간 아래로 휙)
  [['L', -1], ['R', 1]].forEach(([h, s]) => {
    const swing = stick[h] > 0 ? 1 : 0;
    const sx = cx + s * 40; const sy = hy + 30;
    const hx = cx + s * 62; const hy2 = hy + (swing ? 4 : -14);
    g.strokeStyle = ink; g.lineWidth = 13; g.beginPath(); g.moveTo(sx, sy); g.lineTo(hx, hy2); g.stroke();
    g.strokeStyle = '#E21E8C'; g.lineWidth = 8; g.beginPath(); g.moveTo(sx, sy); g.lineTo(hx, hy2); g.stroke();
    const ang = swing ? s * 0.25 : -s * 0.9 - 0.2 * pulse * s;
    const tx = hx + Math.sin(ang) * 60 * s * -1 + s * 18; const ty = hy2 - Math.cos(ang) * 58;
    g.strokeStyle = '#C8955A'; g.lineWidth = 6; g.beginPath(); g.moveTo(hx, hy2); g.lineTo(tx, ty); g.stroke();
    g.fillStyle = '#F4E3C4'; g.beginPath(); g.arc(tx, ty, 4.5, 0, 7); g.fill();
    g.fillStyle = '#F2C9A0'; g.strokeStyle = ink; g.lineWidth = 2; g.beginPath(); g.arc(hx, hy2, 7, 0, 7); g.fill(); g.stroke();
  });
  // 뒤통수 + 헤드폰
  g.fillStyle = '#F2C9A0'; g.strokeStyle = ink; g.lineWidth = 2.5;
  [-1, 1].forEach((s) => { g.beginPath(); g.ellipse(cx + s * 27, hy + 2, 6, 9, 0, 0, 7); g.fill(); g.stroke(); });
  g.fillStyle = '#2B1C14'; g.beginPath(); g.arc(cx, hy - 4, 28, 0, 7); g.fill(); g.stroke();
  g.strokeStyle = '#3E2A1E'; g.lineWidth = 2; [-12, -3, 6, 14].forEach((dx) => { g.beginPath(); g.moveTo(cx + dx, hy - 6); g.quadraticCurveTo(cx + dx + 3, hy + 8, cx + dx - 1, hy + 20); g.stroke(); });
  g.strokeStyle = '#1B1430'; g.lineWidth = 6; g.beginPath(); g.arc(cx, hy - 6, 30, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
  g.fillStyle = '#E21E8C'; g.strokeStyle = ink; g.lineWidth = 2;
  [-1, 1].forEach((s) => { g.beginPath(); g.roundRect(cx + s * 30 - 6, hy - 14, 12, 20, 5); g.fill(); g.stroke(); });
  g.lineCap = 'butt';
}
