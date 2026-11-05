// 청크 크레인 — 예전 앱(스텝업)의 인형뽑기 기계를 그대로 옮겼다:
//   집게가 저절로 좌우로 움직임 → ① STOP(멈추면 집게가 저절로 내려감) → ② 집게가 인형에 닿는 순간 HOLD!
// 학습 요소: 인형마다 단어 꼬리표. 지시된 품사 인형만 뽑기 · 마지막엔 영어 청크를 순서대로 뽑아 문장 완성.
import { openGame, pick, shuffle } from './engine.js';
import { BANK } from '../quiz/bank.js';
import { parseChunks } from '../quiz/notation.js';
import { PRIZE_ART, dancerSVG, C as DANCERS } from '../fx/legacy.js';
import data from '../../data/minigames.json';
import { snackURL } from '../fx/fx.js';

const POSLIST = ['명사', '동사', '형용사', '부사'];
const ST = 'stroke="#1B2F4E" stroke-width="2.4" stroke-linejoin="round"';
// 인형 종류 늘리기: 예전 앱 곰·토끼·병아리·공룡 + 새로 그린 고양이·돼지·펭귄·개구리
const EXTRA = {
  cat: () => `<svg viewBox="0 0 80 86"><path d="M18 30 L22 8 L36 22 Z M62 30 L58 8 L44 22 Z" fill="#FFB35C" ${ST}/><ellipse cx="40" cy="62" rx="24" ry="20" fill="#FFB35C" ${ST}/><circle cx="40" cy="36" r="22" fill="#FFB35C" ${ST}/><path d="M22 34 L30 36 M58 34 L50 36" stroke="#E08A2E" stroke-width="3" stroke-linecap="round"/><circle cx="32" cy="35" r="3" fill="#1B2F4E"/><circle cx="48" cy="35" r="3" fill="#1B2F4E"/><path d="M37 42 Q40 45 43 42" stroke="#1B2F4E" stroke-width="2" fill="none"/><circle cx="27" cy="42" r="3.5" fill="#FF9C9C" opacity=".6"/><circle cx="53" cy="42" r="3.5" fill="#FF9C9C" opacity=".6"/></svg>`,
  pig: () => `<svg viewBox="0 0 80 86"><ellipse cx="40" cy="62" rx="24" ry="20" fill="#FFB7C5" ${ST}/><path d="M20 22 L24 8 L34 18 Z M60 22 L56 8 L46 18 Z" fill="#FF8FA8" ${ST}/><circle cx="40" cy="36" r="22" fill="#FFB7C5" ${ST}/><ellipse cx="40" cy="42" rx="9" ry="6.5" fill="#FF8FA8" ${ST}/><circle cx="37" cy="42" r="1.6" fill="#1B2F4E"/><circle cx="43" cy="42" r="1.6" fill="#1B2F4E"/><circle cx="31" cy="32" r="3" fill="#1B2F4E"/><circle cx="49" cy="32" r="3" fill="#1B2F4E"/></svg>`,
  penguin: () => `<svg viewBox="0 0 80 86"><ellipse cx="40" cy="58" rx="24" ry="24" fill="#2B2350" ${ST}/><ellipse cx="40" cy="62" rx="15" ry="17" fill="#fff"/><circle cx="40" cy="32" r="20" fill="#2B2350" ${ST}/><ellipse cx="40" cy="36" rx="13" ry="11" fill="#fff"/><circle cx="34" cy="33" r="2.8" fill="#1B2F4E"/><circle cx="46" cy="33" r="2.8" fill="#1B2F4E"/><path d="M35 40 L45 40 L40 46 Z" fill="#FFA94D" ${ST}/><path d="M28 82 L36 78 M52 82 L44 78" stroke="#FFA94D" stroke-width="5" stroke-linecap="round"/></svg>`,
  frog: () => `<svg viewBox="0 0 80 86"><ellipse cx="40" cy="62" rx="25" ry="19" fill="#7ED07A" ${ST}/><ellipse cx="40" cy="40" rx="24" ry="17" fill="#7ED07A" ${ST}/><circle cx="27" cy="26" r="9" fill="#7ED07A" ${ST}/><circle cx="53" cy="26" r="9" fill="#7ED07A" ${ST}/><circle cx="27" cy="26" r="4" fill="#1B2F4E"/><circle cx="53" cy="26" r="4" fill="#1B2F4E"/><path d="M28 44 Q40 52 52 44" stroke="#1B2F4E" stroke-width="2.4" fill="none" stroke-linecap="round"/><circle cx="24" cy="44" r="3.5" fill="#FF9C9C" opacity=".6"/><circle cx="56" cy="44" r="3.5" fill="#FF9C9C" opacity=".6"/></svg>`,
};
const ART = (k) => (EXTRA[k] ? EXTRA[k]() : PRIZE_ART[k]());
const DOLLS = ['bear', 'bunny', 'chick', 'dino', 'cat', 'pig', 'penguin', 'frog'];
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
      '라운드 <b>5개</b>: 화면 가운데에 나오는 <b class="red">품사</b>의 인형만 3개씩 → 마지막은 영어 청크를 <b>순서대로</b>',
      '🍫 가끔 <b class="red">과자를 머리에 인 인형</b>이 걸어 다녀요 — 무조건 정답! 잡으면 그 과자가 상품',
    ],
    async setup(ctx) {
      const rounds = [
        { kind: 'pos', target: '명사', need: 3, sec: 55 },
        { kind: 'pos', target: '부사', need: 3, sec: 55 },
        { kind: 'pos', target: '형용사', need: 3, sec: 55 },
        { kind: 'pos', target: '동사', need: 3, sec: 55 },
        { kind: 'seq', sec: 75 },
      ];
      if (short) rounds.splice(0, rounds.length, rounds[0], pick([rounds[1], rounds[2], rounds[3]]), rounds[4]);
      const NEED = short ? 5 : 9;
      const SLOTS = 4; // 바닥 한 줄 (휴대폰 폭에서 꼬리표가 안 겹치게)
      const warn = document.createElement('div');
      warn.className = 'shoot-warn crane-warn';
      ctx.layer.appendChild(warn);
      let snackBag = [];
      const nextSnack = () => { if (!snackBag.length) snackBag = shuffle(['choco', 'cake', 'cookie']); return snackBag.pop(); };
      let walker = null; let walkerT = 9;

      const banner = document.createElement('div');
      banner.className = 'mg-mission crane-ban';
      ctx.layer.appendChild(banner);
      const G = document.createElement('div');
      G.className = 'cm-glass2';
      G.innerHTML = `<div class="cm-rail"></div><div class="cm-chute"><span>OUT ⬇</span></div>
        <div class="cm-car" id="cmCar"><div class="blk"></div><div class="cm-cable" id="cmCable"></div><div class="cm-claw open" id="cmClaw">${CLAW_SVG}</div></div>
        <div class="cm-msg2" id="cmMsg"></div>
        <div class="cm-show"><div class="cm-neon" id="cmNeon"></div></div>
        <div class="cm-dancer rabbit dancing">${dancerSVG(DANCERS.latina)}</div>`;
      ctx.layer.appendChild(G);
      // Ted 선생님이 가끔 기계 옆에서 빼꼼
      const peekEl = document.createElement('div');
      peekEl.className = 'cm-peek';
      peekEl.innerHTML = `<img src="${import.meta.env.BASE_URL}assets/characters/ted.svg" alt=""><span></span>`;
      ctx.layer.appendChild(peekEl);
      let peekT = 14;
      const PEEK = ['잘 노려 봐!', '지금이야!', '품사부터 생각!', '오~ 손맛 좋은데?', '천천히~'];
      const car = G.querySelector('#cmCar'); const cable = G.querySelector('#cmCable'); const claw = G.querySelector('#cmClaw'); const msg = G.querySelector('#cmMsg');
      const say = (t) => { msg.innerHTML = t; };

      const S = { snacks: [], intro: 0, round: 0, roundT: 0, got: 0, ok: 0, wrong: 0, combo: 0, score: 0, finished: false, switching: false, seq: null, seqIdx: 0 };
      let items = [];
      const W = () => G.clientWidth; const H = () => G.clientHeight;
      const CAB0 = 40; const SWEEP = 80; const DESCEND = 95;
      // 레일: 원래보다 약 13% 아래
      let RAIL = 0;
      const placeRail = () => { const dc = G.querySelector('.cm-dancer'); if (dc) dc.style.top = `${Math.round(H() * 0.2) + 16}px`; RAIL = Math.round(H() * 0.2); /* 원래 위치(맨 위)에서 약 20% 아래로 */ G.querySelector('.cm-rail').style.top = `${RAIL}px`; car.style.top = `${RAIL + 2}px`; };
      let x = 140; let dir = 1; let L = CAB0; let mode = 'sweep'; let stopL = 0; let block = null;
      const setCar = () => { car.style.transform = `translateX(${x - 30}px)`; cable.style.height = `${L}px`; claw.style.top = `${18 + L}px`; };
      const tipY = () => RAIL + 2 + 18 + L + 60;
      placeRail();
      setCar();

      function place(it) { it.el.style.transform = `translate(${it.cx - it.w / 2}px,${it.cy - it.h / 2}px) rotate(${it.rot}deg)`; }
      function addItem(text, info, slot) {
        const k = pick(DOLLS); const w = 48; const h = 52;
        const el = document.createElement('div');
        el.className = 'cm-it';
        el.style.width = `${w}px`;
        el.innerHTML = `${ART(k)}<span class="cm-tag2">${text}</span>`;
        G.appendChild(el);
        const it = { k, w, h, text, info, slot, el, rot: (Math.random() * 2 - 1) * 16, cx: 0, cy: 0 };
        layoutOne(it);
        items.push(it);
        return it;
      }
      // 바닥에 한 줄로 자연스럽게 (살짝 기울고 들쭉날쭉) · 꼬리표는 높이를 번갈아 서로 안 가리게
      function layoutOne(it) {
        const x0 = 104; const x1 = W() - 34;
        const span = (x1 - x0) / SLOTS;
        it.cx = x0 + span * (it.slot + 0.5) + (Math.random() * 2 - 1) * span * 0.12;
        it.cy = H() - 12 - it.h / 2 - Math.random() * 6;
        it.home = [it.cx, it.cy];
        it.el.style.zIndex = 3;
        it.el.querySelector('.cm-tag2')?.classList.toggle('hi', it.slot % 2 === 1);
        place(it);
      }
      const freeSlot = () => { const used = new Set(items.filter((i) => !i.walker).map((i) => i.slot)); const f = [...Array(SLOTS).keys()].filter((k) => !used.has(k)); return f.length ? pick(f) : -1; };
      function clearItems() { items.forEach((i) => i.el.remove()); items = []; walker = null; walkerT = 7 + Math.random() * 5; }

      /** 화면 가운데에 크게 한 번 → 사라지면 위의 작은 띠만 남는다 */
      function showWarn(html) {
        warn.innerHTML = `<div class="sw-in">${html}</div>`;
        warn.classList.remove('on'); void warn.offsetWidth; warn.classList.add('on');
        S.intro = 2.4;
        ctx.sfx('reveal');
      }
      /** 🍫 과자를 머리에 인 인형: 천천히 왼쪽↔오른쪽 걸어 다님. 무조건 정답(지금 품사) */
      function spawnWalker() {
        const R = rounds[S.round];
        if (R.kind !== 'pos' || walker) return;
        const has = new Set(items.map((i) => i.text));
        const word = pick(data.pos[R.target].filter((w) => !has.has(w))) || pick(data.pos[R.target]);
        const snack = nextSnack();
        const el = document.createElement('div');
        el.className = 'cm-it cm-walker';
        el.style.width = '58px';
        el.innerHTML = `<img class="wsn" src="${snackURL(snack)}" alt="">${ART(pick(DOLLS))}<span class="cm-tag2 gold">${word}</span>`;
        G.appendChild(el);
        const it = { walker: true, snack, k: 'w', w: 58, h: 62, text: word, info: { text: word, pos: R.target }, el, rot: 0, cx: 90, cy: H() - 12 - 31 - 4, vx: 32, life: 16 };
        el.style.zIndex = 6;
        items.push(it); walker = it; place(it);
        ctx.floatText('🍫 과자 인형 등장! (무조건 정답)', ctx.W / 2, ctx.H * 0.42, '#FFD43B', 18);
      }
      function popBanner() { banner.classList.remove('pop'); void banner.offsetWidth; banner.classList.add('pop'); }
      // 기계 안을 가득 채우는 장식 인형 더미 (뽑는 인형 뒤쪽, 꼬리표 없음)
      for (let k = 0; k < 9; k++) {
        const el = document.createElement('div');
        el.className = 'cm-it cm-deco';
        const w = 40 + Math.random() * 10;
        el.style.width = `${w}px`;
        el.innerHTML = ART(DOLLS[k % DOLLS.length]);
        const cx = 96 + ((W() - 120) * (k + 0.5)) / 9 + (Math.random() - 0.5) * 14;
        const cy = H() - 8 - w * 0.5 - (k % 3) * 6;
        el.style.transform = `translate(${cx - w / 2}px,${cy - w * 0.55}px) rotate(${(Math.random() - 0.5) * 50}deg)`;
        G.appendChild(el);
      }
      function startRound(i) {
        S.switching = false;
        if (i >= rounds.length) return finish();
        S.round = i; S.roundT = 0; S.got = 0;
        clearItems();
        const R = rounds[i];
        const slots = shuffle([...Array(SLOTS).keys()]);
        if (R.kind === 'pos') {
          const others = POSLIST.filter((p) => p !== R.target);
          const list = shuffle([
            ...shuffle(data.pos[R.target]).slice(0, 2).map((t) => ({ text: t, pos: R.target })),
            ...shuffle(others.flatMap((p) => data.pos[p].map((t) => ({ text: t, pos: p })))).slice(0, 2),
          ]);
          list.forEach((it, k) => addItem(it.text, it, slots[k]));
          banner.innerHTML = `<small>라운드 ${i + 1}/${rounds.length}</small><b><span class="tg">「${R.target}」</span> 인형 <span class="tg">${R.need}개</span>!</b>`;
          G.querySelector('#cmNeon').innerHTML = `<b>「${R.target}」</b>만 찾기!<small>${R.need}개 뽑기</small>`;
          showWarn(`<small>⚠ 라운드 ${i + 1} ⚠</small><b>「<span>${R.target}</span>」</b><b>인형을 뽑아라!</b><em>${R.need}개 뽑으면 다음 라운드</em>`);
        } else {
          const pool = BANK[11].filter((q) => parseChunks(q.en).length <= 3 && !(S.usedSeq ||= new Set()).has(q.id));
          const q = pick(pool.length ? pool : BANK[11]);
          S.usedSeq.add(q.id);
          const chunks = parseChunks(q.en);
          S.seq = { q, chunks }; S.seqIdx = 0;
          const decoys = shuffle(BANK[11].filter((x2) => x2.id !== q.id).flatMap((x2) => parseChunks(x2.en))).slice(0, SLOTS - chunks.length);
          shuffle([...chunks.map((c, k) => ({ text: c.text, order: k })), ...decoys.map((c) => ({ text: c.text, order: -1 }))])
            .forEach((it, k) => addItem(it.text, it, slots[k]));
          G.querySelector('#cmNeon').innerHTML = `<b>순서대로</b> 뽑기!<small>문장 완성</small>`;
          banner.innerHTML = `<small>라운드 ${i + 1}/${rounds.length} · 문장 완성</small><b>${q.ko}</b><em id="seqLine"><span class="tg">① 번째</span> 영어 조각을 뽑아요</em>`;
          showWarn(`<small>⚠ 마지막 라운드 ⚠</small><b><span>문장 완성!</span></b><em>${q.ko}<br>영어 조각을 순서대로 뽑아요</em>`);
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
        stopL = Math.max(CAB0, (block ? block.cy - block.h / 2 + block.h * 0.9 : H() - 12) - 80 - RAIL);
      }
      async function grab(pressed) {
        if (mode !== 'down' && mode !== 'wait') return;
        mode = 'busy'; holdBtn.disabled = true;
        try { await grabInner(pressed); } catch (e) { console.error(e); claw.classList.add('open'); L = CAB0; setCar(); }
        finally { if (!S.finished && !S.switching && mode === 'busy') { mode = 'sweep'; stopBtn.disabled = false; } } // 무슨 일이 있어도 다시 움직이게
      }
      async function grabInner(pressed) {
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
        if (caught) caught.held = true;
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
        while (items.filter((i) => !i.walker).length < SLOTS) {
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
        if (it.walker) { walker = null; S.snacks.push(it.snack); ctx.callout('legend', '과자 인형 GET!'); ctx.floatText('🍫 과자 상품 획득!', ctx.W / 2, ctx.H * 0.36, '#E21E8C', 24); }
        if (ok) {
          S.combo++; S.ok++; S.got++;
          const pts = 150 + S.combo * 30; S.score += pts;
          ctx.floatText(`+${pts} ${it.text}`, 60, ctx.H * 0.55, '#1E9B5B', 20);
          ctx.burst(40, ctx.H - 40, 22);
          if (!ctx.comboCallout(S.combo, `${S.combo} 연속!`)) ctx.sfx('ok');
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
          if (R.kind === 'seq') { const sl = freeSlot(); if (sl >= 0) addItem(it.text, it.info, sl); } else if (!it.walker) refill();
        }
      }
      function finish() {
        if (S.finished) return;
        S.finished = true; stopBtn.disabled = true; holdBtn.disabled = true;
        const cleared = S.ok >= NEED;
        const snacks = S.snacks.slice();
        if (cleared && !snacks.length) snacks.push(S.ok >= NEED + 4 ? 'cookie' : S.ok >= NEED + 2 ? 'cake' : 'choco');
        ctx.end({
          score: S.score, cleared, coins: Math.min(30, S.ok * 2), snack: snacks[0] || null, snacks,
          headline: snacks.length ? '간식 인형 GET!' : '조금만 더!', legendAt: 3600,
          lines: [`맞게 뽑은 인형 <b>${S.ok}</b>개 · 틀린 인형 ${S.wrong}개`, snacks.length ? `${NEED}개 이상 맞혀서 간식 쿠폰 획득!` : `${NEED}개 이상 맞히면 간식 쿠폰!`],
        });
      }

      startRound(0);
      window.__CRANE = { S, startRound, get mode() { return mode; } }; // 테스트용
      return {
        update(dt) {
          if (S.finished) return;
          if (S.intro > 0) { S.intro -= dt; ctx.hud(`⏸ 준비! · 🧸 ${S.ok} · <b>${S.score}</b>`); return; }
          if (!S.switching) S.roundT += dt;
          peekT -= dt;
          if (peekT <= 0) { peekT = 18 + Math.random() * 10; peekEl.querySelector('span').textContent = pick(PEEK); peekEl.classList.remove('on'); void peekEl.offsetWidth; peekEl.classList.add('on'); }
          // 과자 인형: 가끔 등장해서 천천히 걸어 다님
          if (!S.switching && rounds[S.round].kind === 'pos') {
            if (!walker) { walkerT -= dt; if (walkerT <= 0) spawnWalker(); }
            else if (!walker.held) {
              walker.cx += walker.vx * dt; walker.life -= dt;
              walker.rot = Math.sin(performance.now() / 160) * 6;
              if (walker.cx > W() - 34) { walker.cx = W() - 34; walker.vx = -Math.abs(walker.vx); }
              if (walker.cx < 96) { walker.cx = 96; walker.vx = Math.abs(walker.vx); }
              walker.el.classList.toggle('flip', walker.vx < 0);
              place(walker);
              if (walker.life <= 0 && mode === 'sweep') { walker.el.remove(); items.splice(items.indexOf(walker), 1); walker = null; walkerT = 10 + Math.random() * 6; }
            }
          }
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
