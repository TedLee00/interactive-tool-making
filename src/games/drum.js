// 품사 드럼 — 리듬 게임. 단어가 자기 품사 북 위로 떨어진다 → 그 북을 두드리면 드럼 연주가 된다.
//   왼쪽: 명사(플로어 탐) · 동사(스네어) | 가운데: 접속사(킥 페달) | 오른쪽: 형용사(하이 탐) · 부사(심벌)
//   단어는 "쿵·짝" 그루브 패턴대로 떨어지게 만들어서, 박자에 맞게 치면 자연스럽게 드럼 비트가 된다.
import { openGame, pick, shuffle, roundRect } from './engine.js';
import data from '../../data/minigames.json';
import { getAC, getMaster, I } from '../fx/legacy.js';
import { bgmStop } from '../fx/fx.js';
import { isMuted } from '../quiz/sound.js';
import { BANK } from '../quiz/bank.js';
import { parseChunks } from '../quiz/notation.js';
import { POS } from '../quiz/constants.js';

const PADS = [
  { pos: '명사', hand: 'L', col: '#E0453A', key: 'a', drum: 'floor' },
  { pos: '동사', hand: 'L', col: '#2E7BC4', key: 's', drum: 'snare' },
  { pos: '접속사', hand: 'F', col: '#2E8B57', key: ' ', drum: 'kick' },
  { pos: '형용사', hand: 'R', col: '#E4801A', key: 'k', drum: 'tom' },
  { pos: '부사', hand: 'R', col: '#7A3FA8', key: 'l', drum: 'cymbal' },
];
const CONJ = ['and', 'but', 'or', 'so', 'because', 'although', 'unless', 'if'];
const BPM = 96;
const BEAT = 60 / BPM;
const FALL = 1.9; // 더 빠르게 떨어짐 (자기 칸으로 떨어지니 읽기 쉬움)
const BARS = 50; // ≈ 2분
// 🎓 퀴즈 타임: 10마디마다 마지막 3마디는 단어가 안 떨어지고 짧은 청크 퀴즈 → 맞히면 음악 LEVEL UP
const CYCLE = 10; const QUIZ_BARS = 3;
const isQuizBar = (b) => b % CYCLE >= CYCLE - QUIZ_BARS;

// 그루브 패턴: 마디(8분음표 8칸) 안에서 어느 북을 칠지 — 명=쿵(플로어) 동=짝(스네어) 형=탐 부=심벌 접=킥
const GROOVES = [
  ['명', '', '동', '', '명', '', '동', ''], // 쿵 짝 쿵 짝
  ['명', '', '동', '', '명', '명', '동', ''], // 쿵 짝 쿵쿵 짝
  ['명', '', '동', '형', '', '명', '동', ''],
  ['부', '', '동', '', '명', '', '동', '부'],
];
const FILLS = [
  ['명', '', '동', '', '형', '형', '부', ''], // 탐 필인
  ['형', '', '형', '', '동', '동', '부', ''],
];
const CODE = { 명: '명사', 동: '동사', 형: '형용사', 부: '부사', 접: '접속사' };

function makeChart() {
  const notes = [];
  for (let b = 0; b < BARS; b++) {
    if (isQuizBar(b)) continue; // 퀴즈 타임
    if (b % 8 === 7) { notes.push({ step: 8 + b * 8, pos: '접속사' }); continue; } // 8마디마다 킥 한 방 + 숨 고르기
    let P = b % 4 === 3 ? pick(FILLS) : pick(GROOVES);
    if (b < 6) P = P.map((c, i) => (i % 2 ? '' : c)); // 처음엔 4분음표만 (천천히 익히기)
    P.forEach((c, k) => { if (c) notes.push({ step: 8 + b * 8 + k, pos: CODE[c] }); });
    if (b > 8 && b % 8 === 3) notes.push({ step: 8 + b * 8 + 6, pos: '접속사' });
  }
  notes.sort((a, b) => a.step - b.step);
  // 같은 칸에 두 단어가 겹치지 않게 (같은 시각 중복 제거)
  const seen = new Set();
  const out = notes.filter((n) => { const k = n.step; if (seen.has(k)) return false; seen.add(k); return true; });
  const bags = {};
  out.forEach((n) => {
    if (n.pos === '접속사') { n.word = pick(CONJ); return; }
    if (!bags[n.pos]?.length) bags[n.pos] = shuffle(data.pos[n.pos].slice());
    n.word = bags[n.pos].pop();
  });
  return out;
}

export function playDrum() {
  return openGame({
    id: 'drum',
    title: '🥁 품사 드럼',
    subtitle: '자기 품사 북 위로 떨어지는 단어를 박자에 맞춰 쿵! 짝!',
    howto: [
      '단어가 <b class="red">자기 품사 북 위</b>로 떨어져요 — 북에 닿는 순간 아래 버튼을 쿵!',
      '🎓 <b class="red">퀴즈 타임</b> — 맞히면 <span class="hk y">🔥 피버 ×2 (20초)</span> <span class="hk c">🛡 콤보 쉴드 3개</span> <span class="hk p">🎶 음악 LEVEL UP</span> · 빨리 맞힐수록 보너스 최대 +1000',
      '<span class="hk g">🏅 퀴즈 전부 맞히면</span> +2000점 + 간식 쿠폰 🍫',
      '왼쪽 <b>명사(쿵) · 동사(짝)</b> · 가운데 <b>접속사(킥 페달)</b> · 오른쪽 <b>형용사(탐) · 부사(심벌)</b>',
      '박자에 맞게 치면 <b class="red">진짜 드럼 비트</b>가 돼요 — PERFECT를 노려 봐!',
      '틀린 북·놓치면 콤보가 끊겨요 · 정확도 85% 이상이면 간식 쿠폰 🍫',
    ],
    async setup(ctx) {
      bgmStop();
      const notes = makeChart();
      const S = { score: 0, combo: 0, best: 0, perfect: 0, great: 0, good: 0, miss: 0, wrong: 0, finished: false, fx: [], arm: { L: null, R: null }, armT: { L: 0, R: 0 }, foot: 0, drumHit: {}, boom: 0, lvl: 0, quiz: null, qOk: 0, qN: 0, fever: 0, shield: 0 };
      const AC = getAC();
      const master = getMaster();
      const clock = () => (AC && AC.state === 'running' ? AC.currentTime : performance.now() / 1000);
      let t0 = null;
      const STEP = BEAT / 2;
      const arrive = (n) => t0 + n.step * STEP;
      const lastStep = notes[notes.length - 1].step;
      const total = notes.length;

      // ---- 소리 ----
      const out = () => (AC && master && !isMuted() ? master : null);
      // 🔊 반주 전용 볼륨 (예전엔 너무 작았음 → 크게)
      let musBus = null;
      const mus = () => { const D = out(); if (!D) return null; if (!musBus) { musBus = AC.createGain(); musBus.gain.value = 2.6; musBus.connect(master); } return musBus; };
      function drumSound(pos, t = AC.currentTime, v = 1, D = out()) {
        if (!D) return;
        if (pos === '명사') { I.tom(D, t, 95, 0.85 * v); I.kick(D, t, 0.35 * v); }
        else if (pos === '동사') { I.snare(D, t, 0.5 * v); I.clap(D, t, 0.14 * v); }
        else if (pos === '형용사') { I.tom(D, t, 220, 0.7 * v); }
        else if (pos === '부사') { I.hat(D, t, 0.32 * v, true); I.hat(D, t + 0.01, 0.12 * v, true); }
        else { I.kick(D, t, 1 * v); I.hat(D, t, 0.22 * v, true); } // 킥 + 크래시
      }
      const thud = () => { const D = out(); if (D) I.tom(D, AC.currentTime, 52, 0.3); };
      const m2f = (m) => 440 * 2 ** ((m - 69) / 12);
      const PROG = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];
      const BASS = [[45, 45, 52, 45, 47, 45, 52, 47], [41, 41, 48, 41, 43, 41, 48, 43], [36, 36, 43, 36, 38, 36, 43, 38], [43, 43, 50, 43, 45, 43, 50, 45]];
      let nextStep = 0;
      function schedule() { // 반주: 8분음표 베이스 라인 + 코드 + 아주 작은 하이햇 (드럼은 학생이 친다!)
        const D = mus(); if (!D || t0 === null) return;
        while (t0 + nextStep * STEP < AC.currentTime + 0.25) {
          const st = nextStep; const t = t0 + st * STEP; const bar = Math.floor((st - 8) / 8);
          if (st < 8) { if (st % 2 === 0) I.hat(D, t, 0.14, st === 6); } // 카운트인 칙 칙 칙 칙
          else if (st <= Math.max(lastStep + 4, 8 + BARS * 8)) {
            const b = ((bar % 4) + 4) % 4; const k = (st - 8) % 8; // k: 마디 안 8분음표 위치 (0·2·4·6 = 1·2·3·4박)
            // 베이스: 1박 · 2박 반 · 3박 · 4박 반 (통통 튀는 리듬)
            if (k === 0 || k === 3 || k === 4 || k === 7) I.bass(D, t, m2f(BASS[b][k]), STEP * (k % 4 === 0 ? 1.6 : 0.8), 0.11, 'triangle');
            if (k === 0) I.pad(D, t, PROG[b].map(m2f), STEP * 7.8, 0.018);
            if (k === 2 || k === 6) I.stab(D, t, PROG[b].map((m) => m2f(m + 12)), 0.016); // 2·4박 코드 찍기
            if (k === 5 && b % 2) I.marimba(D, t, m2f(PROG[b][2] + 24), 0.025);
            // 박자 가이드: 1·3박 작은 킥, 2·4박 작은 클랩, 8분음표 셰이커 → 박자가 귀에 들림 (학생 드럼이 위에 얹힘)
            if (k === 0 || k === 4) I.kick(D, t, 0.32);
            if (k === 2 || k === 6) I.clap(D, t, 0.09);
            // 🥁 떨어지는 단어의 드럼을 반주에 은은하게 → 음악이 드럼 박자(단어)와 딱 맞게 흘러감 (학생이 치면 그 위에 크게)
            notes.forEach((n) => { if (n.step === st) drumSound(n.pos, t, 0.16, D); });
            I.hat(D, t, k % 2 ? 0.012 : 0.022);
            // 🎶 음악 레벨 (퀴즈를 맞힐수록 악기가 하나씩 늘어남)
            const Lv = S.lvl; const c = PROG[b];
            if (Lv >= 1) I.marimba(D, t, m2f([c[0], c[1], c[2], c[1] + 12][k % 4] + 12), 0.03); // 반짝 아르페지오
            if (Lv >= 2) { I.hat(D, t + STEP / 2, 0.014); if (k === 0) I.brass(D, t, c.map((m) => m2f(m + 12)), STEP * 3, 0.022); } // 16비트 하이햇 + 브라스
            if (Lv >= 3) { const MEL = [76, 74, 72, 74, 76, 79, 76, 72]; if (k % 2 === 0) I.pluck(D, t, m2f(MEL[(bar * 4 + k / 2) % 8] - (b === 2 ? 3 : 0)), 0.045); } // 멜로디
            if (Lv >= 4 && k === 0 && bar % 2 === 0) { I.hat(D, t, 0.12, true); I.zap(D, t, 0.025); } // 크래시 + 반짝
          }
          nextStep++;
        }
      }

      // ---- 버튼 (북 · 페달) ----
      const btns = PADS.map((p) => {
        const b = ctx.button(`<span class="dh"></span><b>${p.pos}</b>`, `dpad ${p.pos === '접속사' ? 'pedal' : ''}`, { onDown: () => hit(p) });
        b.style.setProperty('--dc', p.col);
        return b;
      });
      const keyMap = Object.fromEntries(PADS.map((p) => [p.key, p]));
      const onKey = (e) => { const p = keyMap[e.key]; if (p && !e.repeat) hit(p); };
      window.addEventListener('keydown', onKey);
      // 칸 위치 = 버튼 위치 (단어가 그 버튼 바로 위로 떨어짐)
      const cv = ctx.layer.parentElement.querySelector('canvas');
      const INSET = [18, 4, 0, -4, -18]; // 바깥 북은 살짝 안쪽 (드러머 팔이 짧아도 닿게)
      const colX = PADS.map((_, i) => () => {
        const br = btns[i].getBoundingClientRect(); const cr = cv.getBoundingClientRect();
        return ((br.left + br.width / 2 - cr.left) / cr.width) * ctx.W + INSET[i];
      });
      // 악기 자리 (위에서 내려다본 드럼 세트: 바깥 북은 낮게, 안쪽 북은 조금 위 — 드러머를 둘러싼 반원)
      const DY = [118, 132, 152, 132, 118]; // 악기를 더 아래로 (드러머 가까이)
      const hitY = (i = 2) => ctx.H - DY[i];

      // 🛡 콤보 쉴드: 있으면 실수해도 콤보가 안 끊김
      function breakCombo(i) {
        if (S.shield > 0 && S.combo > 0) { S.shield--; S.fx.push({ txt: `🛡 쉴드! (${S.shield})`, col: '#8FD8FF', life: 0.7, i }); return; }
        S.combo = 0;
      }
      function hit(p) {
        if (S.finished || t0 === null) return;
        const now = clock();
        const i = PADS.indexOf(p);
        if (p.hand === 'F') S.foot = 0.16; else { S.arm[p.hand] = i; S.armT[p.hand] = 0.16; }
        S.drumHit[i] = 0.14; S.boom = 0.22;
        const b = btns[i]; b.classList.remove('boom'); void b.offsetWidth; b.classList.add('boom');
        const cand = notes.filter((n) => !n.done && n.pos === p.pos && Math.abs(arrive(n) - now) < 0.3).sort((a, c) => Math.abs(arrive(a) - now) - Math.abs(arrive(c) - now))[0];
        drumSound(p.pos);
        if (!cand) { breakCombo(i); S.wrong++; S.fx.push({ txt: '빈 박!', col: '#9A90B5', life: 0.6, i }); thud(); return; }
        cand.done = true;
        const dt = Math.abs(arrive(cand) - now);
        const grade = dt <= 0.09 ? 'PERFECT' : dt <= 0.18 ? 'GREAT' : 'GOOD';
        S[grade.toLowerCase()]++; S.combo++; S.best = Math.max(S.best, S.combo);
        const pts = ({ PERFECT: 300, GREAT: 200, GOOD: 100 }[grade] + Math.min(20, S.combo) * 10) * (S.fever > 0 ? 2 : 1); // 🔥 피버 중엔 2배
        S.score += pts;
        S.fx.push({ txt: grade, col: grade === 'PERFECT' ? '#FFD43B' : grade === 'GREAT' ? '#8FE08A' : '#8FD8FF', life: 0.7, i });
        ctx.burst(colX[i](), hitY(i), grade === 'PERFECT' ? 22 : 12, [p.col, '#fff', '#FFD43B']);
        ctx.comboCallout(S.combo, `${S.combo} 콤보!`, { first: 20, second: 50, every: 50 }); // 드럼은 음표가 많아서 20 · 50 · 100 …
      }

      // ---- 🎓 퀴즈 타임 ----
      const qLayer = document.createElement('div'); qLayer.className = 'dq'; ctx.layer.appendChild(qLayer);
      const QPOS = ['N', 'V', 'A', 'D', 'C'];
      const qPool = shuffle((BANK[9] || []).slice());
      function makeQuiz() {
        for (let k = 0; k < 20; k++) {
          const q = qPool.pop() || pick(BANK[9]); if (!q) return null;
          const sent = parseChunks(q.en);
          const ch = sent.filter((c) => QPOS.includes(c.pos));
          if (ch.length < 2) continue;
          const tgt = pick(ch); // 같은 분석 결과에서 고르기 (그래야 문장 속 [ ] 표시가 맞음)
          const opts = tgt.pos === 'C' ? ['N', 'V', 'A', 'D', 'C'] : ['N', 'V', 'A', 'D'];
          return { sent, tgt, opts, end: q.end || '.' };
        }
        return null;
      }
      function openQuiz(qb) {
        const Q = makeQuiz(); if (!Q) return;
        const tEnd = t0 + (8 + (qb + QUIZ_BARS) * 8) * STEP - 0.4;
        S.quiz = { ...Q, tEnd, done: false }; S.qN++;
        const esc2 = (x) => String(x).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
        qLayer.innerHTML = `<div class="dq-card"><div class="dq-t">🎓 QUIZ TIME! <small>맞히면 🔥 피버 ×2 · 🛡 쉴드 · 🎶 음악 UP · 빨리 맞힐수록 보너스!</small></div>
          <div class="dq-s">${Q.sent.map((c) => (c === Q.tgt ? `<b>[ ${esc2(c.text)} ]</b>` : esc2(c.text))).join(' ')}${esc2(Q.end)}</div>
          <div class="dq-q">[ ] 덩어리의 품사는?</div>
          <div class="dq-o">${Q.opts.map((p) => `<button data-p="${p}" class="${POS[p].cls}"><b>${POS[p].sym}</b>${POS[p].name}</button>`).join('')}</div>
          <div class="dq-bar"><i></i></div></div>`;
        qLayer.classList.add('on');
        qLayer.querySelectorAll('button').forEach((bt) => { bt.onclick = () => answerQuiz(bt.dataset.p); });
      }
      function answerQuiz(p) {
        const Q = S.quiz; if (!Q || Q.done) return;
        Q.done = true;
        const ok = p === Q.tgt.pos;
        qLayer.querySelectorAll('button').forEach((bt) => { bt.disabled = true; if (bt.dataset.p === Q.tgt.pos) bt.classList.add('right'); else if (bt.dataset.p === p) bt.classList.add('wrong'); });
        let bonus = 0;
        if (ok) {
          // 🎁 정답 혜택: 빨리 맞힐수록 보너스(최대 +1000) · 🔥 피버 타임(약 20초 동안 점수 2배 + 무대 조명) · 🛡 콤보 쉴드 3개 · 🎶 음악 LEVEL UP
          const left = Math.max(0, Q.tEnd - clock());
          bonus = 300 + Math.round((left / (QUIZ_BARS * 8 * STEP)) * 700);
          S.qOk++; S.lvl = Math.min(4, S.lvl + 1); S.score += bonus; S.fever = 8 * 8 * STEP; S.shield = 3;
          ctx.callout(S.lvl >= 4 ? 'legend' : 'wow', `🔥 FEVER! 🎶 LEVEL ${S.lvl}`); ctx.burst(ctx.W / 2, ctx.H * 0.4, 40, ['#FFD43B', '#fff', '#E21E8C']);
        } else {
          S.lvl = Math.max(0, S.lvl - 1); ctx.sfx('no');
          ctx.floatText(p ? `정답은 ${POS[Q.tgt.pos].name}! 음악 DOWN` : `⏰ 정답은 ${POS[Q.tgt.pos].name}!`, ctx.W / 2, ctx.H * 0.62, '#FF8F8F', 18);
        }
        qLayer.querySelector('.dq-t small').innerHTML = ok ? `정답! <b>+${bonus}</b> · 🔥 FEVER ×2 · 🛡×3 · 🎶 LEVEL ${S.lvl}` : `${POS[Q.tgt.pos].name}였어요 · 🎶 LEVEL ${S.lvl}`;
        setTimeout(() => { qLayer.classList.remove('on'); }, 1400);
      }

      function finish() {
        if (S.finished) return;
        S.finished = true;
        window.removeEventListener('keydown', onKey);
        if (S.qN && S.qOk === S.qN) { S.score += 2000; ctx.callout('legend', '퀴즈 만점! +2000'); } // 🏅 퀴즈 전부 맞히면 큰 보너스 + 간식 쿠폰
        const ok = S.perfect + S.great + S.good;
        const acc = Math.round((ok / total) * 100);
        ctx.end({
          score: S.score, cleared: acc >= 60, coins: Math.min(30, Math.round(acc / 4)), snack: acc >= 85 || (S.qN && S.qOk === S.qN) ? pick(['choco', 'cake', 'cookie']) : null,
          headline: acc >= 90 ? '🥁 드럼 마스터!' : acc >= 60 ? '연주 성공!' : '조금만 더 박자에 맞춰!', legendAt: 40000,
          lines: [`🎓 퀴즈 <b>${S.qOk}/${S.qN}</b> · 최고 음악 레벨 🎶${S.lvl}`, `정확도 <b>${acc}%</b> · PERFECT ${S.perfect} · GREAT ${S.great} · GOOD ${S.good}`, `빈 박·틀림 ${S.wrong} · 놓침 ${S.miss} · 최고 콤보 <b>${S.best}</b>`],
        });
      }

      window.__DRUM = { notes, S, arrive: (n) => (t0 === null ? 0 : arrive(n)), clock, hit: (pos) => hit(PADS.find((q) => q.pos === pos)) }; // 테스트용
      return {
        start() { t0 = clock() + 0.4; },
        update(dt) {
          if (S.finished || t0 === null) return;
          schedule();
          const now = clock();
          notes.forEach((n) => { if (!n.done && now - arrive(n) > 0.3) { n.done = true; n.miss = true; S.miss++; breakCombo(PADS.findIndex((p) => p.pos === n.pos)); } });
          S.fx.forEach((f) => { f.life -= dt; }); S.fx = S.fx.filter((f) => f.life > 0);
          ['L', 'R'].forEach((h) => { S.armT[h] = Math.max(0, S.armT[h] - dt); });
          S.foot = Math.max(0, S.foot - dt); S.boom = Math.max(0, S.boom - dt); S.fever = Math.max(0, S.fever - dt);
          Object.keys(S.drumHit).forEach((k) => { S.drumHit[k] = Math.max(0, S.drumHit[k] - dt); });
          // 🎓 퀴즈 마디가 시작되면 퀴즈 카드
          { const bar = Math.floor(((now - t0) / STEP - 8) / 8);
            if (bar >= 0 && isQuizBar(bar) && bar % CYCLE === CYCLE - QUIZ_BARS && S.lastQ !== bar) { S.lastQ = bar; openQuiz(bar); }
            if (S.quiz && !S.quiz.done) { const left = S.quiz.tEnd - now; const el = qLayer.querySelector('.dq-bar i'); if (el) el.style.width = `${Math.max(0, left / ((QUIZ_BARS * 8 * STEP) - 0.4)) * 100}%`; if (left <= 0) answerQuiz(null); } }
          ctx.hud(`${S.fever > 0 ? '🔥×2 · ' : ''}${S.shield ? `🛡${S.shield} · ` : ''}🎶Lv${S.lvl} · 🎵 <b>${notes.filter((n) => n.done).length}</b>/${total} · <b>${S.score}</b>${S.combo > 1 ? ` <i>🔥${S.combo}</i>` : ''}`);
          if (now > t0 + Math.max(lastStep + 6, 8 + BARS * 8 + 2) * STEP) finish(); // 마지막 퀴즈 타임까지 다 하고 끝
        },
        draw(g) {
          const { W, H } = ctx;
          const now = t0 === null ? 0 : clock();
          const beatPhase = t0 === null ? 0 : ((now - t0) / BEAT) % 1;
          const pulse = 1 - beatPhase;
          // 공연장
          const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#120C2E'); bg.addColorStop(1, '#3A1E5C');
          g.fillStyle = bg; g.fillRect(0, 0, W, H);
          if (S.fever > 0) { // 🔥 피버: 금빛 무대 + 깜빡이는 조명
            g.globalAlpha = 0.18 + 0.14 * Math.abs(Math.sin(now * 8)); g.fillStyle = '#FFB000'; g.fillRect(0, 0, W, H); g.globalAlpha = 1;
            g.font = "400 22px Jua, sans-serif"; g.textAlign = 'center'; g.lineWidth = 5; g.strokeStyle = '#7A1F1F'; g.strokeText(`🔥 FEVER ×2 · ${Math.ceil(S.fever)}`, W / 2, 34); g.fillStyle = '#FFD43B'; g.fillText(`🔥 FEVER ×2 · ${Math.ceil(S.fever)}`, W / 2, 34);
          }
          [[W * 0.2, '#E21E8C'], [W * 0.5, '#FFD43B'], [W * 0.8, '#2E9BDA']].forEach(([x, c], k) => {
            const sway = Math.sin(now * 0.8 + k * 2) * 40;
            const gr = g.createLinearGradient(x, 0, x + sway, H * 0.7); gr.addColorStop(0, c + 'AA'); gr.addColorStop(1, c + '00');
            g.globalAlpha = 0.18 + 0.3 * pulse; g.fillStyle = gr;
            g.beginPath(); g.moveTo(x - 8, 0); g.lineTo(x + 8, 0); g.lineTo(x + sway + 60, H * 0.7); g.lineTo(x + sway - 60, H * 0.7); g.closePath(); g.fill();
          });
          g.globalAlpha = 1;
          // 관객 실루엣 (박자에 맞춰 들썩)
          g.fillStyle = 'rgba(10,6,24,.8)';
          for (let k = 0; k < 9; k++) { const x = (k + 0.5) * (W / 9); const bob = Math.abs(Math.sin(now * 6.3 + k)) * 5; g.beginPath(); g.arc(x, H * 0.36 - bob, 13, 0, 7); g.fill(); g.fillRect(x - 15, H * 0.36 + 8 - bob, 30, 24); }
          // 칸 (단어가 떨어지는 세로 줄)
          const hy = hitY();
          PADS.forEach((p, i) => {
            const x = colX[i](); const yy = hitY(i);
            g.fillStyle = p.col + '22'; g.fillRect(x - 30, 0, 60, yy);
            g.strokeStyle = p.col + '55'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, yy); g.stroke();
          });
          // 떨어지는 단어 (각 칸의 악기 위에 딱 닿게)
          if (t0 !== null) {
            notes.forEach((n) => {
              const left = arrive(n) - now;
              if (left > FALL + 0.15 || (n.done && !n.miss) || (n.miss && left < -0.5)) return;
              const i = PADS.findIndex((p) => p.pos === n.pos); const x = colX[i](); const yy = hitY(i); const y = yy - left * ((yy - 30) / FALL);
              g.globalAlpha = n.miss ? 0.3 : 1;
              g.font = "400 15px Jua, 'Noto Sans KR', sans-serif";
              const w = Math.min(70, Math.max(54, g.measureText(n.word).width + 14));
              roundRect(g, x - w / 2, y - 15, w, 30, 15);
              g.fillStyle = S.fever > 0 ? '#FFF1B0' : '#FFFBF0'; g.fill(); g.lineWidth = S.fever > 0 ? 4 : 3; g.strokeStyle = S.fever > 0 ? '#F2A900' : PADS[i].col; g.stroke(); /* 피버 땐 금빛 단어 */
              g.fillStyle = '#2B2350'; g.textAlign = 'center'; g.textBaseline = 'middle';
              g.font = `400 ${n.word.length > 8 ? 11 : 14}px Jua, 'Noto Sans KR', sans-serif`;
              g.fillText(n.word, x, y + 1);
              g.globalAlpha = 1;
            });
            const cnt = Math.ceil((t0 + 8 * STEP - now) / BEAT);
            if (cnt > 0 && cnt <= 4) { g.font = "400 72px Jua, sans-serif"; g.fillStyle = '#FFD43B'; g.textAlign = 'center'; g.fillText(String(cnt), W / 2, H * 0.3); }
          }
          // 드럼 세트 (단어가 떨어져 닿는 자리)
          const xs = PADS.map((_, i) => colX[i]()); const ys = PADS.map((_, i) => hitY(i));
          drawSpeakers(g, W, H, S, pulse);
          drawKit(g, xs, ys, S, pulse);
          // 판정 글자
          S.fx.forEach((f) => { g.globalAlpha = Math.min(1, f.life * 2); g.font = "400 19px Jua, 'Noto Sans KR', sans-serif"; g.textAlign = 'center'; g.lineWidth = 4; g.strokeStyle = '#120C2E'; const y = hitY(f.i) - 52 - (0.7 - f.life) * 40; g.strokeText(f.txt, colX[f.i](), y); g.fillStyle = f.col; g.fillText(f.txt, colX[f.i](), y); });
          g.globalAlpha = 1;
          drawDrummer(g, xs[2], H, xs, ys, S);
          void hy;
        },
      };
    },
  });
}

/** 스피커 (양쪽 위 · 양쪽 아래 끝) — 북을 칠 때마다, 그리고 박자마다 쿵쿵 */
function drawSpeakers(g, W, H, S, pulse) {
  const k = 1 + S.boom * 0.5 + pulse * pulse * 0.05;
  const box = (x, y, w, h, small) => {
    g.save(); g.translate(x + w / 2, y + h / 2); g.scale(1 + S.boom * 0.12, 1 + S.boom * 0.12);
    roundRect(g, -w / 2, -h / 2, w, h, 8); const gr = g.createLinearGradient(-w / 2, 0, w / 2, 0); gr.addColorStop(0, '#2A2342'); gr.addColorStop(0.5, '#3D3460'); gr.addColorStop(1, '#221C38');
    g.fillStyle = gr; g.fill(); g.lineWidth = 3; g.strokeStyle = '#0E0A1E'; g.stroke();
    const cone = (cy, r) => {
      g.fillStyle = '#15102A'; g.beginPath(); g.arc(0, cy, r, 0, 7); g.fill();
      g.strokeStyle = '#6B5FA0'; g.lineWidth = 2; g.stroke();
      const rg = g.createRadialGradient(-r * 0.2, cy - r * 0.2, 1, 0, cy, r * 0.8 * k); rg.addColorStop(0, '#8A7FC0'); rg.addColorStop(1, '#2B2350');
      g.fillStyle = rg; g.beginPath(); g.arc(0, cy, r * 0.78 * k, 0, 7); g.fill();
      g.fillStyle = '#0E0A1E'; g.beginPath(); g.arc(0, cy, r * 0.25 * k, 0, 7); g.fill();
      if (S.boom > 0) { g.strokeStyle = `rgba(255,212,59,${S.boom * 3})`; g.lineWidth = 3; g.beginPath(); g.arc(0, cy, r + 4 + (0.22 - S.boom) * 40, 0, 7); g.stroke(); }
    };
    if (small) { cone(-h * 0.2, w * 0.3); g.fillStyle = '#FFD43B'; g.beginPath(); g.arc(0, h * 0.32, 3, 0, 7); g.fill(); }
    else { cone(-h * 0.27, w * 0.24); cone(h * 0.18, w * 0.36); }
    g.restore();
  };
  box(4, 6, 46, 64, true); box(W - 50, 6, 46, 64, true);
  box(2, H - 64, 46, 60, false); box(W - 48, H - 64, 46, 60, false);
}

/** 위에서 내려다본 드럼 세트: 플로어 탐 · 스네어 · (가운데 킥) · 하이 탐 · 심벌 — 크게 */
function drawKit(g, xs, ys, S, pulse) {
  const ink = '#1B1430';
  const tnow = performance.now() / 1000;
  // 가운데 킥 드럼: 위에서 보면 눕혀진 원통 — 앞쪽(위) 울림판이 타원으로 보임
  {
    const kx = xs[2]; const ky = ys[2]; const kb = S.drumHit[2] ? 1.05 : 1;
    g.save(); g.translate(kx, ky); g.scale(kb, kb);
    const sh = g.createLinearGradient(-34, 0, 34, 0); sh.addColorStop(0, '#9E1463'); sh.addColorStop(0.5, '#FF4FAE'); sh.addColorStop(1, '#9E1463');
    roundRect(g, -34, -22, 68, 70, 10); g.fillStyle = sh; g.fill(); g.lineWidth = 3; g.strokeStyle = ink; g.stroke();
    g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(-34, 8, 68, 6);
    g.fillStyle = '#FFF4F8'; g.beginPath(); g.ellipse(0, -22, 34, 12, 0, 0, 7); g.fill(); g.stroke();
    g.font = "400 12px Jua, sans-serif"; g.fillStyle = '#E21E8C'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('POS', 0, -21);
    // 페달 (아래쪽, 발 닿는 곳)
    g.fillStyle = '#7D8899'; roundRect(g, -9, 50, 18, 26, 5); g.fill(); g.lineWidth = 2; g.stroke();
    if (S.foot > 0) { g.fillStyle = 'rgba(255,79,174,.6)'; g.beginPath(); g.ellipse(0, -22, 40, 16, 0, 0, 7); g.fill(); }
    g.restore();
  }
  // 북 (위에서 본 모습: 아래로 살짝 보이는 몸통 + 크롬 테 + 북면 + 조임 나사)
  const drum = (x, y, r, col, i) => {
    const hit = S.drumHit[i] > 0; const sq = hit ? 0.94 : 1;
    g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(x + 4, y + 16, r + 4, r * 0.8, 0, 0, 7); g.fill();
    const sh = g.createLinearGradient(x - r, 0, x + r, 0); sh.addColorStop(0, col); sh.addColorStop(0.5, '#ffffff88'); sh.addColorStop(1, col);
    g.fillStyle = col; g.beginPath(); g.ellipse(x, y + 10, r, r * 0.82, 0, 0, 7); g.fill(); g.lineWidth = 3; g.strokeStyle = ink; g.stroke();
    g.fillStyle = sh; g.globalAlpha = 0.35; g.beginPath(); g.ellipse(x, y + 10, r, r * 0.82, 0, 0, Math.PI); g.fill(); g.globalAlpha = 1;
    const rim = g.createLinearGradient(x - r, y - r, x + r, y + r); rim.addColorStop(0, '#FFFFFF'); rim.addColorStop(0.5, '#A8B0C0'); rim.addColorStop(1, '#E8ECF4');
    g.fillStyle = rim; g.beginPath(); g.ellipse(x, y, r, r * 0.82, 0, 0, 7); g.fill(); g.stroke();
    const hd = g.createRadialGradient(x - r * 0.3, y - r * 0.3, 2, x, y, r); hd.addColorStop(0, '#FFFFFF'); hd.addColorStop(1, '#EDE6D6');
    g.fillStyle = hd; g.beginPath(); g.ellipse(x, y, r * 0.86 * sq, r * 0.7 * sq, 0, 0, 7); g.fill();
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; g.fillStyle = '#5A6070'; g.beginPath(); g.arc(x + Math.cos(a) * r * 0.93, y + Math.sin(a) * r * 0.76, 2.2, 0, 7); g.fill(); }
    if (hit) { g.strokeStyle = `rgba(255,212,59,${S.drumHit[i] * 6})`; g.lineWidth = 4; g.beginPath(); g.ellipse(x, y, r + 8, r * 0.82 + 7, 0, 0, 7); g.stroke(); }
  };
  drum(xs[0], ys[0], 34, '#E0453A', 0); // 플로어 탐 (명사)
  drum(xs[1], ys[1], 29, '#2E7BC4', 1); // 스네어 (동사)
  drum(xs[3], ys[3], 28, '#E4801A', 3); // 하이 탐 (형용사)
  // 심벌 (부사): 위에서 본 큰 금빛 원판 + 동심원 결 + 가운데 종 — 치면 흔들흔들
  {
    const cx = xs[4]; const cy = ys[4]; const hit = S.drumHit[4] > 0;
    const wob = hit ? Math.sin(tnow * 50) * 0.12 : Math.sin(tnow * 1.5) * 0.02;
    g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(cx + 6, cy + 18, 36, 26, 0, 0, 7); g.fill();
    g.strokeStyle = '#8A7AC0'; g.lineWidth = 4; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + 4, cy + 40); g.stroke();
    g.save(); g.translate(cx, cy); g.scale(1 + wob, 0.8 - wob);
    const gr = g.createRadialGradient(-10, -10, 2, 0, 0, 40); gr.addColorStop(0, '#FFF6B8'); gr.addColorStop(0.5, '#F2C14E'); gr.addColorStop(1, '#B8862E');
    g.fillStyle = gr; g.strokeStyle = ink; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 40, 0, 7); g.fill(); g.stroke();
    g.strokeStyle = 'rgba(140,96,30,.45)'; g.lineWidth = 1.2; for (let r = 12; r < 39; r += 5) { g.beginPath(); g.arc(0, 0, r, 0, 7); g.stroke(); }
    g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(-14, -14, 12, 5, -0.8, 0, 7); g.fill();
    const bl = g.createRadialGradient(-3, -3, 1, 0, 0, 11); bl.addColorStop(0, '#FFF6B8'); bl.addColorStop(1, '#C9A04A');
    g.fillStyle = bl; g.beginPath(); g.arc(0, 0, 11, 0, 7); g.fill(); g.lineWidth = 2; g.stroke();
    g.fillStyle = ink; g.beginPath(); g.arc(0, 0, 3, 0, 7); g.fill();
    g.restore();
    if (hit) { g.strokeStyle = `rgba(255,246,184,${S.drumHit[4] * 6})`; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, 48, 0, 7); g.stroke(); }
  }
  void pulse;
}

/** 귀여운 드러머 (위·뒤에서 내려다봄): 둥근 머리 · 헤드폰 · 짧은 스틱, 치는 북으로 손이 쏙 */
function drawDrummer(g, cx, H, xs, ys, S) {
  const ink = '#2B2350';
  const headY = H - 34;
  const STICK = 34;
  g.lineCap = 'round'; g.lineJoin = 'round';
  // 의자 · 어깨 (위에서 본 넓적한 타원 몸)
  g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(cx, H - 6, 62, 22, 0, 0, 7); g.fill();
  const bd = g.createRadialGradient(cx - 14, headY + 4, 4, cx, headY + 14, 60); bd.addColorStop(0, '#A48BF0'); bd.addColorStop(1, '#5B3FB8');
  g.fillStyle = bd; g.strokeStyle = ink; g.lineWidth = 2.5; g.beginPath(); g.ellipse(cx, headY + 16, 50, 30, 0, 0, 7); g.fill(); g.stroke();
  const arm = (h) => {
    const s = h === 'L' ? -1 : 1;
    const sx = cx + s * 46; const sy = headY + 4;
    const hitting = S.armT[h] > 0 && S.arm[h] !== null;
    const ti = hitting ? S.arm[h] : (h === 'L' ? 1 : 3);
    const tx = xs[ti]; const ty = ys[ti] + (hitting ? 0 : -6);
    const dx = tx - sx; const dy = ty - sy; const L = Math.hypot(dx, dy) || 1;
    const lift = hitting ? 0 : 14; // 쉬는 동안 스틱을 살짝 들고 있음
    const reach = Math.min(70, L - STICK); // 팔은 짧게 (최대 70) — 모자라면 스틱이 조금 길어짐
    const stick = L - reach;
    const hx = sx + (dx / L) * reach; const hyy = sy + (dy / L) * reach + lift;
    const ex = (sx + hx) / 2 + s * 16; const ey = (sy + hyy) / 2 + 10; // 팔꿈치는 바깥쪽으로 살짝
    g.strokeStyle = ink; g.lineWidth = 14; g.beginPath(); g.moveTo(sx, sy); g.quadraticCurveTo(ex, ey, hx, hyy); g.stroke();
    g.strokeStyle = '#8B6FE0'; g.lineWidth = 9; g.beginPath(); g.moveTo(sx, sy); g.quadraticCurveTo(ex, ey, hx, hyy); g.stroke();
    const stx = hitting ? tx : hx + (dx / L) * stick; const sty = hitting ? ty : hyy + (dy / L) * stick - lift * 0.8;
    g.strokeStyle = '#7A4F2A'; g.lineWidth = 6; g.beginPath(); g.moveTo(hx - (dx / L) * 6, hyy - (dy / L) * 6); g.lineTo(stx, sty); g.stroke();
    g.strokeStyle = '#E8C9A0'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(hx, hyy); g.lineTo(stx, sty); g.stroke();
    g.fillStyle = '#F4E3C4'; g.strokeStyle = ink; g.lineWidth = 1.5; g.beginPath(); g.arc(stx, sty, 4, 0, 7); g.fill(); g.stroke();
    // 손 (주먹 쥔 손등)
    const hg = g.createRadialGradient(hx - 2, hyy - 3, 1, hx, hyy, 9); hg.addColorStop(0, '#FFE2C4'); hg.addColorStop(1, '#E8B486');
    g.fillStyle = hg; g.strokeStyle = ink; g.lineWidth = 2; g.beginPath(); g.arc(hx, hyy, 8.5, 0, 7); g.fill(); g.stroke();
  };
  arm('L'); arm('R');
  // 머리 (위·뒤에서 본 둥근 머리, 입체 음영) + 헤드폰
  [-1, 1].forEach((s) => { g.fillStyle = '#F2C9A0'; g.strokeStyle = ink; g.lineWidth = 2; g.beginPath(); g.ellipse(cx + s * 30, headY - 2, 6, 8, 0, 0, 7); g.fill(); g.stroke(); });
  const hr = g.createRadialGradient(cx - 10, headY - 16, 3, cx, headY - 4, 34); hr.addColorStop(0, '#7A5640'); hr.addColorStop(1, '#2E1F17');
  g.fillStyle = hr; g.strokeStyle = ink; g.lineWidth = 2.5; g.beginPath(); g.arc(cx, headY - 4, 31, 0, 7); g.fill(); g.stroke();
  // 정수리 가마 (위에서 보면 소용돌이)
  g.strokeStyle = '#1E140E'; g.lineWidth = 2; g.beginPath(); for (let a = 0; a < 9; a += 0.3) { const r = a * 1.6; g.lineTo(cx + 4 + Math.cos(a) * r, headY - 10 + Math.sin(a) * r); } g.stroke();
  g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.ellipse(cx - 12, headY - 18, 10, 6, -0.6, 0, 7); g.fill();
  g.strokeStyle = '#1B1430'; g.lineWidth = 6; g.beginPath(); g.moveTo(cx - 32, headY - 2); g.quadraticCurveTo(cx, headY - 20, cx + 32, headY - 2); g.stroke();
  g.fillStyle = '#FFD43B'; g.strokeStyle = ink; g.lineWidth = 2;
  [-1, 1].forEach((s) => { g.beginPath(); g.roundRect(cx + s * 33 - 7, headY - 14, 14, 22, 7); g.fill(); g.stroke(); });
  g.lineCap = 'butt';
}
