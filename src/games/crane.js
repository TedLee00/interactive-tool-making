// 청크 크레인 — 인형뽑기. 집게는 저절로 왔다 갔다! STOP으로 멈추고 집기로 뽑는다.
// 라운드 1~4: 지시된 품사 인형 3개씩 · 라운드 5·6: 우리말에 맞게 영어 청크를 순서대로 뽑아 문장 완성
import { openGame, pick, shuffle, clamp, roundRect } from './engine.js';
import { BANK } from '../quiz/bank.js';
import { parseChunks } from '../quiz/notation.js';
import data from '../../data/minigames.json';

const COLORS = ['#FF9ECB', '#8FD8FF', '#FFD36B', '#B79CFF', '#8FE08A', '#FFB36B'];
const POSLIST = ['명사', '동사', '형용사', '부사'];
const NUM = '①②③④⑤⑥';

export function playCrane({ short = false } = {}) {
  return openGame({
    id: 'crane',
    title: '🧸 청크 크레인',
    subtitle: '지시된 품사 인형만 쏙쏙 뽑아라!',
    music: 'mgCrane',
    howto: [
      '집게는 <b>저절로 왔다 갔다</b> 움직여요',
      '원하는 인형 위에서 <b>STOP</b>(멈춤) → <b>집기</b>를 누르면 쏙!',
      '품사 라운드: 화면 위 <b class="red">빨간 글씨 품사</b>의 인형만 3개씩 뽑기',
      '문장 라운드: 우리말 문장에 맞는 <b>영어 청크</b>를 <b>순서대로</b> 뽑아 문장 완성!',
      '맞히면 <b>집게 힘 UP</b> 💪 · 틀리면 집게가 미끄러워져요',
    ],
    async setup(ctx) {
      const S = {
        round: 0, x: 120, vx: 1, mode: 'move', stopped: false, claw: 0, held: null, grip: 0.86, combo: 0, score: 0, ok: 0, wrong: 0,
        dolls: [], t: 0, roundT: 0, got: 0, seq: null, seqIdx: 0, finished: false, switching: false,
      };
      const TOP = 112; // 레일 높이 (위 미션판 아래)
      const floorY = () => ctx.H - 78;
      const banner = document.createElement('div');
      banner.className = 'mg-mission crane-ban';
      ctx.layer.appendChild(banner);

      const usedSeq = new Set();
      const rounds = [
        { kind: 'pos', target: '명사', need: 3, sec: 40 },
        { kind: 'pos', target: '부사', need: 3, sec: 40 },
        { kind: 'pos', target: '형용사', need: 3, sec: 40 },
        { kind: 'pos', target: '동사', need: 3, sec: 40 },
        { kind: 'seq', sec: 60 },
        { kind: 'seq', sec: 60 },
      ];
      // 간식 뽑기 칸: 짧은 판 (품사 2라운드 + 문장 1라운드)
      if (short) rounds.splice(0, rounds.length, rounds[0], pick([rounds[1], rounds[2], rounds[3]]), rounds[4]);
      const NEED = short ? 5 : 10;
      const SPEED = 92; // 집게가 저절로 움직이는 속도(px/s)

      // 6칸 자리: 뒷줄 3 (꼬리표는 인형 위) · 앞줄 3 (꼬리표는 인형 아래) → 글자가 서로 가리지 않음
      const left = 74;
      const slotW = () => (ctx.W - 22 - left) / 3;
      const slotPos = (k) => {
        const row = k >= 3 ? 1 : 0;
        const col = k % 3;
        const step = slotW();
        return { x: left + step * (col + 0.5) + (row ? step * 0.18 : -step * 0.18), y: floorY() - row * 120, row };
      };
      const freeSlot = () => { const used = new Set(S.dolls.map((d) => d.slot)); const free = [0, 1, 2, 3, 4, 5].filter((k) => !used.has(k)); return free.length ? pick(free) : -1; };
      function makeDoll(text, info, slot) {
        return { text, info, slot, r: 24, c: pick(COLORS), wob: Math.random() * 6, get x() { return slotPos(this.slot).x; }, get y() { return slotPos(this.slot).y; }, get row() { return slotPos(this.slot).row; } };
      }
      function layout(items) {
        const slots = shuffle([0, 1, 2, 3, 4, 5]);
        return items.slice(0, 6).map((it, i) => makeDoll(it.text, it, slots[i]));
      }
      function popBanner() { banner.classList.remove('pop'); void banner.offsetWidth; banner.classList.add('pop'); }
      function startRound(i) {
        S.switching = false;
        if (i >= rounds.length) return finish();
        S.round = i; S.roundT = 0; S.got = 0; S.stopped = false; S.mode = 'move';
        const R = rounds[i];
        if (R.kind === 'pos') {
          const others = POSLIST.filter((p) => p !== R.target);
          const items = [
            ...shuffle(data.pos[R.target]).slice(0, 3).map((t) => ({ text: t, pos: R.target })),
            ...shuffle(others.flatMap((p) => data.pos[p].map((t) => ({ text: t, pos: p })))).slice(0, 3),
          ];
          S.dolls = layout(shuffle(items));
          banner.innerHTML = `<small>라운드 ${i + 1}/${rounds.length}</small><b><span class="tg">「${R.target}」</span> 인형을 <span class="tg">${R.need}개</span> 뽑아라!</b><em>💡 품사는 생김새가 아니라 하는 일로!</em>`;
        } else {
          const pool = BANK[11].filter((x) => parseChunks(x.en).length <= 4 && !usedSeq.has(x.id));
          const q = pick(pool.length ? pool : BANK[11]);
          usedSeq.add(q.id);
          const chunks = parseChunks(q.en);
          S.seq = { q, chunks };
          S.seqIdx = 0;
          const decoys = shuffle(BANK[11].filter((x) => x.id !== q.id).flatMap((x) => parseChunks(x.en))).slice(0, 6 - chunks.length);
          S.dolls = layout(shuffle([...chunks.map((c, k) => ({ text: c.text, order: k })), ...decoys.map((c) => ({ text: c.text, order: -1 }))]));
          banner.innerHTML = `<small>라운드 ${i + 1}/${rounds.length} · 문장 완성</small><b>${q.ko}</b><em id="seqLine"><span class="tg">① 번째</span> 영어 조각을 뽑아요</em>`;
        }
        popBanner();
      }
      startRound(0);

      // 버튼: STOP(멈춤/다시) · 집기
      const stopBtn = ctx.button('STOP<small>멈춤</small>', 'stop', {
        onDown: () => {
          if (S.finished || S.mode !== 'move') return;
          S.stopped = !S.stopped;
          stopBtn.innerHTML = S.stopped ? '다시<small>움직이기</small>' : 'STOP<small>멈춤</small>';
          ctx.sfx('tap');
        },
      });
      const dropBtn = ctx.button('집기<small>쏙!</small>', 'drop', {
        onDown: () => {
          if (S.mode === 'move' && !S.finished) { S.mode = 'down'; S.stopped = true; ctx.sfx('tap'); }
        },
      });
      const resetStop = () => { S.stopped = false; stopBtn.innerHTML = 'STOP<small>멈춤</small>'; };

      function nextRound() {
        if (S.switching) return;
        S.switching = true;
        const nx = S.round + 1;
        setTimeout(() => { if (!S.finished) startRound(nx); }, 1000);
      }
      function judge(d) {
        const R = rounds[S.round];
        if (!R || S.finished) return;
        const ok = R.kind === 'pos' ? d.info.pos === R.target : d.info.order === S.seqIdx;
        if (ok) {
          S.combo++; S.ok++; S.got++;
          S.grip = clamp(S.grip + 0.04, 0.5, 0.97);
          const pts = 150 + S.combo * 30;
          S.score += pts;
          ctx.floatText(`+${pts} 💪`, 40, ctx.H * 0.45, '#1E9B5B', 20);
          ctx.burst(36, floorY() - 20, 22);
          if (S.combo >= 3 && S.combo % 3 === 0) ctx.callout('yar', `${S.combo} 연속!`); else ctx.callout('easy');
          if (R.kind === 'seq') {
            S.seqIdx++;
            const line = banner.querySelector('#seqLine');
            const done = S.seq.chunks.slice(0, S.seqIdx).map((c) => c.text).join(' / ');
            if (line) line.innerHTML = S.seqIdx < S.seq.chunks.length ? `${done} / <span class="tg">${NUM[S.seqIdx]} 번째?</span>` : `${done}${S.seq.q.end || '.'} <span class="tg">완성!</span>`;
            if (S.seqIdx >= S.seq.chunks.length) { S.score += 600; ctx.callout('legend', '문장 완성!'); nextRound(); }
          } else if (S.got >= R.need) {
            ctx.floatText('ROUND CLEAR!', ctx.W / 2, ctx.H * 0.4, '#D9822B', 26);
            nextRound();
          } else if (!S.dolls.some((x) => x.info.pos === R.target)) {
            // 목표 인형이 다 떨어지면 새로 채워 준다
            const sl = freeSlot(); const has = new Set(S.dolls.map((x) => x.text));
            const w = pick(data.pos[R.target].filter((x) => !has.has(x)));
            if (sl >= 0 && w) S.dolls.push(makeDoll(w, { text: w, pos: R.target }, sl));
          }
        } else {
          S.combo = 0; S.wrong++;
          S.grip = clamp(S.grip - 0.08, 0.5, 0.97);
          S.score = Math.max(0, S.score - 80);
          const why = R.kind === 'pos' ? `${d.text} → ${d.info.pos}!` : '순서가 달라요!';
          ctx.floatText(`✘ ${why}`, ctx.W / 2, ctx.H * 0.42, '#E0453A', 18);
          ctx.shake(6); ctx.sfx('no');
          if (R.kind === 'seq') { const sl = freeSlot(); if (sl >= 0) { d.slot = sl; S.dolls.push(d); } }
        }
      }
      function finish() {
        if (S.finished) return;
        S.finished = true;
        dropBtn.disabled = true; stopBtn.disabled = true;
        const cleared = S.ok >= NEED;
        const snack = cleared ? (S.ok >= NEED + 5 ? 'cookie' : S.ok >= NEED + 3 ? 'cake' : 'choco') : null;
        ctx.end({
          score: S.score, cleared, coins: Math.min(30, S.ok * 2), snack,
          headline: snack ? '간식 인형 GET!' : '조금만 더!', legendAt: 3600,
          lines: [`맞게 뽑은 인형 <b>${S.ok}</b>개 · 틀린 인형 ${S.wrong}개`, snack ? `${NEED}개 이상 맞혀서 간식 쿠폰 획득!` : `${NEED}개 이상 맞히면 간식 쿠폰!`],
        });
      }

      return {
        update(dt) {
          if (S.finished) return;
          S.t += dt;
          if (!S.switching) S.roundT += dt;
          const R = rounds[S.round];
          if (S.roundT > R.sec && S.mode === 'move' && !S.switching) {
            ctx.floatText('시간 끝! 다음 라운드', ctx.W / 2, ctx.H * 0.4, '#6B5F8A', 20);
            nextRound();
          }
          const k = ctx.input.keys;
          if ((k[' '] || k.ArrowDown) && S.mode === 'move') { S.mode = 'down'; S.stopped = true; }
          // 저절로 왔다 갔다
          const minX = 70; const maxX = ctx.W - 26;
          if (S.mode === 'move' && !S.stopped && !S.switching) {
            S.x += S.vx * SPEED * dt;
            if (S.x > maxX) { S.x = maxX; S.vx = -1; }
            if (S.x < minX) { S.x = minX; S.vx = 1; }
          }
          const tipY = TOP + 30 + S.claw;
          if (S.mode === 'down') {
            S.claw += 240 * dt;
            const under = S.dolls.filter((d) => Math.abs(d.x - S.x) < d.r + 4).sort((a, b) => a.y - b.y)[0];
            const stopAt = under ? under.y - under.r - TOP - 26 : floorY() - TOP - 30;
            if (S.claw >= stopAt) {
              S.claw = stopAt; S.mode = 'up';
              ctx.sfx('bounce');
              if (under) {
                const align = 1 - Math.min(1, Math.abs(under.x - S.x) / (under.r + 4));
                if (Math.random() < S.grip * (0.7 + 0.3 * align)) { S.held = under; S.dolls.splice(S.dolls.indexOf(under), 1); S.slipCheck = true; }
                else ctx.floatText('미끄러졌다!', S.x, tipY - 30, '#6B5F8A', 16);
              } else ctx.floatText('빈 곳이에요!', S.x, tipY - 30, '#6B5F8A', 16);
            }
          } else if (S.mode === 'up') {
            S.claw -= 220 * dt;
            if (S.held && S.slipCheck && S.claw < 90) {
              S.slipCheck = false;
              if (Math.random() > S.grip + 0.2) { const d = S.held; S.held = null; const sl = freeSlot(); if (sl >= 0) { d.slot = sl; S.dolls.push(d); } ctx.floatText('앗, 놓쳤다!', S.x, tipY, '#E0453A', 16); ctx.sfx('no'); }
            }
            if (S.claw <= 0) { S.claw = 0; if (S.held) S.mode = 'carry'; else { S.mode = 'move'; resetStop(); } }
          } else if (S.mode === 'carry') {
            S.x -= 200 * dt;
            if (S.x <= 34) { S.x = 34; const d = S.held; S.held = null; S.mode = 'move'; S.vx = 1; resetStop(); judge(d); }
          }
          if (S.dolls.length < 6 && R.kind === 'pos' && S.mode === 'move' && !S.switching) {
            const sl = freeSlot();
            const has = new Set(S.dolls.map((d) => d.text));
            const p = Math.random() < 0.45 ? R.target : pick(POSLIST);
            const word = pick(data.pos[p].filter((w) => !has.has(w)));
            if (sl >= 0 && word) S.dolls.push(makeDoll(word, { text: word, pos: p }, sl));
          }
          const leftT = Math.max(0, Math.ceil(R.sec - S.roundT));
          ctx.hud(`⏱ <b>${leftT}</b> · 💪 ${Math.round(S.grip * 100)}% · <b>${S.score}</b>`);
        },
        draw(g) {
          const { W, H } = ctx;
          const bg = g.createLinearGradient(0, 0, 0, H);
          bg.addColorStop(0, '#FFE3F0'); bg.addColorStop(1, '#E2F4FF');
          g.fillStyle = bg; g.fillRect(0, 0, W, H);
          roundRect(g, 8, TOP - 26, W - 16, H - TOP + 18, 22);
          g.fillStyle = 'rgba(255,255,255,.55)'; g.fill();
          g.lineWidth = 8; g.strokeStyle = '#FF9ECB'; g.stroke();
          for (let k = 0; k < 14; k++) {
            g.fillStyle = Math.floor(S.t * 6 + k) % 2 ? '#FFD36B' : '#fff';
            g.beginPath(); g.arc(20 + (k * (W - 40)) / 13, TOP - 26, 5, 0, 7); g.fill();
          }
          // 출구
          roundRect(g, 12, floorY() - 60, 48, 76, 8); g.fillStyle = '#B79CFF'; g.fill();
          label(g, 'OUT', 36, floorY() - 72, 60, '#FFD36B');
          g.fillStyle = '#FFE1B8'; g.fillRect(14, floorY() + 26, W - 28, H - floorY() - 30);
          g.fillStyle = '#2B2350'; g.fillRect(16, TOP - 6, W - 32, 8);
          // 인형 (뒷줄 먼저)
          const dolls = [...S.dolls].sort((a, b) => a.y - b.y);
          dolls.forEach((d) => drawDoll(g, d, S.t));
          // 꼬리표는 인형을 다 그린 뒤에 (가리지 않게)
          dolls.forEach((d) => drawLabel(g, d, slotW() - 6));
          // 집게
          const tipY = TOP + 30 + S.claw;
          g.strokeStyle = '#2B2350'; g.lineWidth = 3; g.beginPath(); g.moveTo(S.x, TOP); g.lineTo(S.x, tipY - 10); g.stroke();
          roundRect(g, S.x - 16, TOP - 10, 32, 16, 5); g.fillStyle = S.stopped && S.mode === 'move' ? '#E0453A' : '#E21E8C'; g.fill();
          const open = S.mode === 'down' ? 0.7 : 0.25;
          g.lineWidth = 6; g.strokeStyle = '#2B2350'; g.lineCap = 'round';
          [-1, 1].forEach((s) => { g.beginPath(); g.moveTo(S.x, tipY - 10); g.quadraticCurveTo(S.x + s * 24 * (0.6 + open), tipY + 6, S.x + s * 10 * (0.6 + open), tipY + 24); g.stroke(); });
          g.lineCap = 'butt';
          if (S.held) { const h = S.held; drawDoll(g, { r: h.r, c: h.c, wob: h.wob, x: S.x, y: tipY + 40 }, S.t); drawLabel(g, { text: h.text, x: S.x, y: tipY + 40, r: h.r, row: 1 }, 110); }
          if (S.mode === 'move') { g.setLineDash([4, 6]); g.strokeStyle = 'rgba(224,69,58,.45)'; g.lineWidth = 2; g.beginPath(); g.moveTo(S.x, tipY + 26); g.lineTo(S.x, floorY() + 20); g.stroke(); g.setLineDash([]); }
        },
      };
    },
  });
}

function drawDoll(g, d, t) {
  const wob = Math.sin(t * 3 + d.wob) * 0.06;
  g.save();
  g.translate(d.x, d.y);
  g.rotate(wob);
  g.fillStyle = d.c;
  [-1, 1].forEach((s) => { g.beginPath(); g.arc(s * 16, -d.r + 2, 9, 0, 7); g.fill(); });
  g.beginPath(); g.arc(0, 0, d.r, 0, 7); g.fill();
  g.lineWidth = 2.5; g.strokeStyle = '#2B2350'; g.stroke();
  g.fillStyle = '#fff'; g.beginPath(); g.ellipse(0, 8, 13, 9, 0, 0, 7); g.fill();
  g.fillStyle = '#2B2350';
  [-8, 8].forEach((s) => { g.beginPath(); g.arc(s, -4, 3, 0, 7); g.fill(); });
  g.beginPath(); g.arc(0, 6, 2.5, 0, 7); g.fill();
  g.restore();
}

/** 글자가 길면 여러 줄로 감싸 그린다 */
function wrap(g, text, maxW) {
  const words = text.split(' ');
  const lines = [];
  let cur = '';
  words.forEach((w) => {
    const t = cur ? `${cur} ${w}` : w;
    if (g.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
  });
  if (cur) lines.push(cur);
  return lines;
}
function label(g, text, x, y, maxW, bg = '#FFFBF0') {
  g.font = "400 15px Jua, 'Noto Sans KR', sans-serif";
  const lines = wrap(g, text, maxW - 12);
  const w = Math.min(maxW, Math.max(...lines.map((l) => g.measureText(l).width)) + 14);
  const lh = 17;
  const h = lines.length * lh + 8;
  roundRect(g, x - w / 2, y - h / 2, w, h, 10);
  g.fillStyle = bg; g.fill();
  g.lineWidth = 2.5; g.strokeStyle = '#2B2350'; g.stroke();
  g.fillStyle = '#2B2350'; g.textAlign = 'center'; g.textBaseline = 'middle';
  lines.forEach((l, i) => g.fillText(l, x, y - h / 2 + 4 + lh * (i + 0.5) + 1));
  return h;
}
function drawLabel(g, d, maxW) {
  g.font = "400 15px Jua, 'Noto Sans KR', sans-serif";
  const n = wrap(g, d.text, maxW - 12).length;
  const h = n * 17 + 8;
  // 뒷줄: 인형 위 · 앞줄: 인형 아래
  const y = d.row === 1 ? d.y - d.r - 12 - h / 2 : d.y + d.r + 6 + h / 2;
  label(g, d.text, d.x, y, maxW);
}
