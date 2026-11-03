// 청크 크레인 — 예전 앱(스텝업)의 인형뽑기 기계를 그대로 옮겼다:
//   집게가 저절로 좌우로 움직임 → ① STOP(멈추면 집게가 저절로 내려감) → ② 집게가 인형에 닿는 순간 HOLD!
// 학습 요소: 인형마다 단어 꼬리표. 지시된 품사 인형만 뽑기 · 마지막엔 영어 청크를 순서대로 뽑아 문장 완성.
import { openGame, pick, shuffle } from './engine.js';
import { BANK } from '../quiz/bank.js';
import { parseChunks } from '../quiz/notation.js';
import { PRIZE_ART } from '../fx/legacy.js';
import data from '../../data/minigames.json';

const POSLIST = ['명사', '동사', '형용사', '부사'];
const DOLLS = ['bear', 'bunny', 'chick', 'dino'];
const NUM = '①②③④⑤⑥';
// 예전 앱 집게 그림 그대로
const CLAW_SVG = `<svg viewBox="0 0 60 52" width="60" height="52">
  <g class="pL" style="transform-box:view-box;transform-origin:26px 9px"><path d="M26 9 Q12 18 13 34 Q14 44 22 47" stroke="#1B2F4E" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M26 9 Q12 18 13 34 Q14 44 22 47" stroke="#C9D3E0" stroke-width="4" fill="none" stroke-linecap="round"/></g>
  <g class="pR" style="transform-box:view-box;transform-origin:34px 9px"><path d="M34 9 Q48 18 47 34 Q46 44 38 47" stroke="#1B2F4E" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M34 9 Q48 18 47 34 Q46 44 38 47" stroke="#C9D3E0" stroke-width="4" fill="none" stroke-linecap="round"/></g>
  <rect x="20" y="1" width="20" height="12" rx="4" fill="#E21E8C" stroke="#1B2F4E" stroke-width="2.4"/></svg>`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const tw = (ms, fn, ease = (t) => 0.5 - 0.5 * Math.cos(Math.PI * t)) => new Promise((r) => {
  const t0 = performance.now();
  const step = (now) => { const t = Math.min(1, (now - t0) / ms); fn(ease(t)); if (t < 1) requestAnimationFrame(step); else r(); };
  requestAnimationFrame(step);
});

export function playCrane({ short = false } = {}) {
  return openGame({
    id: 'crane',
    title: '🧸 청크 크레인',
    subtitle: '지시된 품사 인형만 쏙쏙 뽑아라!',
    music: 'mgCrane',
    howto: [
      '집게가 <b>저절로 왔다 갔다</b> 움직여요',
      '<b class="red">① STOP</b> — 인형 <b>바로 위</b>에서 누르면 집게가 <b>저절로 내려가요</b>',
      '<b class="red">② HOLD</b> — 내려가던 집게가 인형에 <b>닿는 순간</b> 꾹!',
      '품사 라운드: 화면 위 <b class="red">빨간 글씨 품사</b>의 인형만 3개씩 · 문장 라운드: 영어 청크를 <b>순서대로</b>',
    ],
    async setup(ctx) {
      const rounds = [
        { kind: 'pos', target: '명사', need: 3, sec: 55 },
        { kind: 'pos', target: '부사', need: 3, sec: 55 },
        { kind: 'pos', target: '형용사', need: 3, sec: 55 },
        { kind: 'pos', target: '동사', need: 3, sec: 55 },
        { kind: 'seq', sec: 75 },
        { kind: 'seq', sec: 75 },
      ];
      if (short) rounds.splice(0, rounds.length, rounds[0], pick([rounds[1], rounds[2], rounds[3]]), rounds[4]);
      const NEED = short ? 5 : 10;

      const banner = document.createElement('div');
      banner.className = 'mg-mission crane-ban';
      ctx.layer.appendChild(banner);
      const G = document.createElement('div');
      G.className = 'cm-glass2';
      G.innerHTML = `<div class="cm-rail"></div><div class="cm-chute"><span>OUT ⬇</span></div>
        <div class="cm-car" id="cmCar"><div class="blk"></div><div class="cm-cable" id="cmCable"></div><div class="cm-claw open" id="cmClaw">${CLAW_SVG}</div></div>
        <div class="cm-msg2" id="cmMsg"></div>`;
      ctx.layer.appendChild(G);
      const car = G.querySelector('#cmCar'); const cable = G.querySelector('#cmCable'); const claw = G.querySelector('#cmClaw'); const msg = G.querySelector('#cmMsg');
      const say = (t) => { msg.innerHTML = t; };

      const S = { round: 0, roundT: 0, got: 0, ok: 0, wrong: 0, combo: 0, score: 0, finished: false, switching: false, seq: null, seqIdx: 0 };
      let items = [];
      const W = () => G.clientWidth; const H = () => G.clientHeight;
      const CAB0 = 40; const SWEEP = 80; const DESCEND = 95;
      let x = 140; let dir = 1; let L = CAB0; let mode = 'sweep'; let stopL = 0; let block = null;
      const setCar = () => { car.style.transform = `translateX(${x - 30}px)`; cable.style.height = `${L}px`; claw.style.top = `${18 + L}px`; };
      const tipY = () => 2 + 18 + L + 60;
      setCar();

      function place(it) { it.el.style.transform = `translate(${it.cx - it.w / 2}px,${it.cy - it.h / 2}px) rotate(${it.rot}deg)`; }
      function addItem(text, info, slot) {
        const k = pick(DOLLS); const w = 54; const h = 58;
        const el = document.createElement('div');
        el.className = 'cm-it';
        el.style.width = `${w}px`;
        el.innerHTML = `${PRIZE_ART[k]()}<span class="cm-tag2">${text}</span>`;
        G.appendChild(el);
        const it = { k, w, h, text, info, slot, el, rot: (Math.random() * 2 - 1) * 16, cx: 0, cy: 0 };
        layoutOne(it);
        items.push(it);
        return it;
      }
      // 자연스럽게 흩어 놓기: 인형 더미처럼 3층 × 2개, 층마다 좌우로 어긋나게 (꼬리표가 서로 안 가리게)
      function layoutOne(it) {
        const x0 = 100; const x1 = W() - 30;
        const tier = Math.floor(it.slot / 2); const col = it.slot % 2;
        const span = x1 - x0;
        const shift = tier === 1 ? 0.14 : tier === 2 ? -0.06 : 0;
        it.cx = x0 + span * ((col ? 0.74 : 0.26) + shift) + (Math.random() * 2 - 1) * span * 0.05;
        it.cy = H() - 10 - it.h / 2 - tier * 74 - Math.random() * 10;
        it.home = [it.cx, it.cy];
        it.el.style.zIndex = 5 - tier;
        place(it);
      }
      const freeSlot = () => { const used = new Set(items.map((i) => i.slot)); const f = [0, 1, 2, 3, 4, 5].filter((k) => !used.has(k)); return f.length ? pick(f) : -1; };
      function clearItems() { items.forEach((i) => i.el.remove()); items = []; }

      function popBanner() { banner.classList.remove('pop'); void banner.offsetWidth; banner.classList.add('pop'); }
      function startRound(i) {
        S.switching = false;
        if (i >= rounds.length) return finish();
        S.round = i; S.roundT = 0; S.got = 0;
        clearItems();
        const R = rounds[i];
        const slots = shuffle([0, 1, 2, 3, 4, 5]);
        if (R.kind === 'pos') {
          const others = POSLIST.filter((p) => p !== R.target);
          const list = shuffle([
            ...shuffle(data.pos[R.target]).slice(0, 3).map((t) => ({ text: t, pos: R.target })),
            ...shuffle(others.flatMap((p) => data.pos[p].map((t) => ({ text: t, pos: p })))).slice(0, 3),
          ]);
          list.forEach((it, k) => addItem(it.text, it, slots[k]));
          banner.innerHTML = `<small>라운드 ${i + 1}/${rounds.length}</small><b><span class="tg">「${R.target}」</span> 인형을 <span class="tg">${R.need}개</span> 뽑아라!</b><em>💡 품사는 생김새가 아니라 하는 일로!</em>`;
        } else {
          const pool = BANK[11].filter((q) => parseChunks(q.en).length <= 4 && !(S.usedSeq ||= new Set()).has(q.id));
          const q = pick(pool.length ? pool : BANK[11]);
          S.usedSeq.add(q.id);
          const chunks = parseChunks(q.en);
          S.seq = { q, chunks }; S.seqIdx = 0;
          const decoys = shuffle(BANK[11].filter((x2) => x2.id !== q.id).flatMap((x2) => parseChunks(x2.en))).slice(0, 6 - chunks.length);
          shuffle([...chunks.map((c, k) => ({ text: c.text, order: k })), ...decoys.map((c) => ({ text: c.text, order: -1 }))])
            .forEach((it, k) => addItem(it.text, it, slots[k]));
          banner.innerHTML = `<small>라운드 ${i + 1}/${rounds.length} · 문장 완성</small><b>${q.ko}</b><em id="seqLine"><span class="tg">① 번째</span> 영어 조각을 뽑아요</em>`;
        }
        mode = 'sweep';
        say('① 인형 바로 위에서 <b>STOP</b> → ② 닿는 순간 <b>HOLD</b>!');
        popBanner();
      }

      const stopBtn = ctx.button('① STOP<small>멈추면 내려가요</small>', 'drop cm-stop', { onDown: () => drop() });
      const holdBtn = ctx.button('② HOLD<small>닿는 순간 꾹!</small>', 'cm-hold', { onDown: () => { if (mode === 'down' || mode === 'wait') grab(true); } });
      holdBtn.disabled = true;

      function drop() {
        if (mode !== 'sweep' || S.finished || S.switching) return;
        mode = 'down'; stopBtn.disabled = true; holdBtn.disabled = false;
        say('내려가는 중… 인형에 <b>닿는 순간 HOLD!</b>');
        ctx.sfx('tap');
        const under = items.filter((it) => Math.abs(it.cx - x) < it.w * 0.5).sort((a, b) => (a.cy - a.h / 2) - (b.cy - b.h / 2));
        block = under[0] || null;
        stopL = Math.max(CAB0, (block ? block.cy - block.h / 2 + block.h * 0.9 : H() - 12) - 80);
      }
      async function grab(pressed) {
        if (mode !== 'down' && mode !== 'wait') return;
        mode = 'busy'; holdBtn.disabled = true;
        claw.classList.remove('open'); ctx.sfx('bounce'); await sleep(320);
        let caught = null;
        if (block) {
          const dx = Math.abs(block.cx - x); const top = block.cy - block.h / 2; const tip = tipY();
          const gx = dx <= 12; const okx = dx <= 20;
          const gy = pressed && tip >= top + block.h * 0.2 && tip <= top + block.h * 0.95;
          const oky = pressed && tip >= top && tip <= top + block.h * 1.05;
          const p = gx && gy ? 1 : (okx && gy) || (gx && oky) ? 0.6 : okx && oky ? 0.3 : 0;
          if (Math.random() < p) caught = block;
        }
        say(caught ? '잡았다! 🙌' : !pressed ? '<b>HOLD</b>를 안 눌렀어요…' : !block || Math.abs(block.cx - x) > 24 ? '인형 한가운데가 아니었어요…' : '아깝다! 살짝 빗나갔어요…');
        const follow = () => { if (caught) { caught.cx = x; caught.cy = tipY() - 14; caught.rot *= 0.9; caught.el.style.zIndex = 8; place(caught); } };
        const Ls = L;
        await tw(1300, (t) => { L = Ls + (CAB0 - Ls) * t; setCar(); follow(); });
        if (caught && !S.finished) {
          const xs = x;
          await tw(1200, (t) => { x = xs + (38 - xs) * t; setCar(); follow(); });
          claw.classList.add('open');
          const it = caught; const sy = it.cy;
          await tw(480, (t) => { it.cy = sy + (H() + 80 - sy) * t; it.rot += 3; place(it); }, (t) => t * t);
          it.el.remove(); items.splice(items.indexOf(it), 1);
          judge(it);
        } else claw.classList.add('open');
        if (!S.finished && !S.switching) { mode = 'sweep'; stopBtn.disabled = false; }
      }

      function refill() {
        const R = rounds[S.round];
        if (R.kind !== 'pos') return;
        while (items.length < 6) {
          const sl = freeSlot(); if (sl < 0) break;
          const has = new Set(items.map((i) => i.text));
          const needTarget = !items.some((i) => i.info.pos === R.target);
          const p = needTarget || Math.random() < 0.45 ? R.target : pick(POSLIST);
          const w = pick(data.pos[p].filter((v) => !has.has(v)));
          if (!w) break;
          addItem(w, { text: w, pos: p }, sl);
        }
      }
      function nextRound() {
        if (S.switching) return;
        S.switching = true; stopBtn.disabled = true;
        const nx = S.round + 1;
        setTimeout(() => { if (!S.finished) { startRound(nx); stopBtn.disabled = false; } }, 1200);
      }
      function judge(it) {
        const R = rounds[S.round];
        const ok = R.kind === 'pos' ? it.info.pos === R.target : it.info.order === S.seqIdx;
        if (ok) {
          S.combo++; S.ok++; S.got++;
          const pts = 150 + S.combo * 30; S.score += pts;
          ctx.floatText(`+${pts} ${it.text}`, 60, ctx.H * 0.55, '#1E9B5B', 20);
          ctx.burst(40, ctx.H - 40, 22);
          if (S.combo >= 3 && S.combo % 3 === 0) ctx.callout('yar', `${S.combo} 연속!`); else ctx.callout('easy');
          if (R.kind === 'seq') {
            S.seqIdx++;
            const line = banner.querySelector('#seqLine');
            const done = S.seq.chunks.slice(0, S.seqIdx).map((c) => c.text).join(' / ');
            if (line) line.innerHTML = S.seqIdx < S.seq.chunks.length ? `${done} / <span class="tg">${NUM[S.seqIdx]} 번째?</span>` : `${done}${S.seq.q.end || '.'} <span class="tg">완성!</span>`;
            if (S.seqIdx >= S.seq.chunks.length) { S.score += 600; ctx.callout('legend', '문장 완성!'); nextRound(); }
          } else if (S.got >= R.need) { ctx.floatText('ROUND CLEAR!', ctx.W / 2, ctx.H * 0.4, '#D9822B', 28); nextRound(); } else refill();
        } else {
          S.combo = 0; S.wrong++; S.score = Math.max(0, S.score - 80);
          ctx.floatText(`✘ ${R.kind === 'pos' ? `${it.text} → ${it.info.pos}!` : '순서가 달라요!'}`, ctx.W / 2, ctx.H * 0.45, '#E0453A', 20);
          ctx.shake(6); ctx.sfx('no');
          if (R.kind === 'seq') { const sl = freeSlot(); if (sl >= 0) addItem(it.text, it.info, sl); } else refill();
        }
      }
      function finish() {
        if (S.finished) return;
        S.finished = true; stopBtn.disabled = true; holdBtn.disabled = true;
        const cleared = S.ok >= NEED;
        const snack = cleared ? (S.ok >= NEED + 5 ? 'cookie' : S.ok >= NEED + 3 ? 'cake' : 'choco') : null;
        ctx.end({
          score: S.score, cleared, coins: Math.min(30, S.ok * 2), snack,
          headline: snack ? '간식 인형 GET!' : '조금만 더!', legendAt: 3600,
          lines: [`맞게 뽑은 인형 <b>${S.ok}</b>개 · 틀린 인형 ${S.wrong}개`, snack ? `${NEED}개 이상 맞혀서 간식 쿠폰 획득!` : `${NEED}개 이상 맞히면 간식 쿠폰!`],
        });
      }

      startRound(0);
      return {
        update(dt) {
          if (S.finished) return;
          if (!S.switching) S.roundT += dt;
          const R = rounds[S.round];
          if (S.roundT > R.sec && mode === 'sweep' && !S.switching) { ctx.floatText('시간 끝! 다음 라운드', ctx.W / 2, ctx.H * 0.4, '#6B5F8A', 20); nextRound(); }
          if ((ctx.input.keys[' '] || ctx.input.keys.ArrowDown) && mode === 'sweep') drop();
          if (mode === 'sweep' && !S.switching) {
            x += dir * SWEEP * dt;
            if (x > W() - 32) { x = W() - 32; dir = -1; }
            if (x < 100) { x = 100; dir = 1; }
            setCar();
          } else if (mode === 'down') {
            L = Math.min(stopL, L + DESCEND * dt); setCar();
            if (L >= stopL) { mode = 'wait'; say(block ? '쿵! <b>지금 HOLD!</b>' : '바닥이에요…'); setTimeout(() => { if (mode === 'wait') grab(false); }, block ? 700 : 250); }
          }
          ctx.hud(`⏱ <b>${Math.max(0, Math.ceil(R.sec - S.roundT))}</b> · 🧸 ${S.ok} · <b>${S.score}</b>`);
        },
        draw(g) {
          const bg = g.createLinearGradient(0, 0, 0, ctx.H);
          bg.addColorStop(0, '#E21E8C'); bg.addColorStop(1, '#B5126E');
          g.fillStyle = bg; g.fillRect(0, 0, ctx.W, ctx.H);
        },
      };
    },
  });
}
