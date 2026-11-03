// 청크 크레인 — 인형뽑기. 지시된 품사 인형만 뽑기 → 마지막 라운드는 영어 청크를 순서대로 뽑아 문장 완성
import { openGame, rand, pick, shuffle, clamp, roundRect, tag } from './engine.js';
import { BANK } from '../quiz/bank.js';
import { parseChunks } from '../quiz/notation.js';
import data from '../../data/minigames.json';

const COLORS = ['#FF9ECB', '#8FD8FF', '#FFD36B', '#B79CFF', '#8FE08A', '#FFB36B'];
const POSLIST = ['명사', '동사', '형용사', '부사'];

export function playCrane() {
  return openGame({
    id: 'crane',
    title: '🧸 청크 크레인',
    subtitle: '지시된 품사 인형만 쏙쏙 뽑아라!',
    music: 'mgCrane',
    howto: [
      '<b>◀ ▶</b>를 꾹 눌러 집게를 옮기고 <b>DROP</b>으로 뽑아요',
      '라운드 1·2: 화면 위 <b>지시된 품사</b>의 인형만 뽑기 (예: 부사 → quickly)',
      '라운드 3: 우리말 문장에 맞는 <b>영어 청크</b>를 <b>순서대로</b> 뽑아 문장 완성!',
      '맞히면 <b>집게 힘 UP</b> 💪 · 틀리면 집게가 미끄러워져요',
    ],
    async setup(ctx) {
      const S = {
        round: 0, x: 180, dir: 0, mode: 'move', claw: 0, held: null, grip: 0.75, combo: 0, score: 0, ok: 0, wrong: 0,
        dolls: [], t: 0, roundT: 0, need: 0, got: 0, seq: null, seqIdx: 0, finished: false, msg: '',
      };
      const TOP = 96; // 레일 높이
      const floorY = () => ctx.H - 70;
      const banner = document.createElement('div');
      banner.className = 'mg-mission';
      ctx.layer.appendChild(banner);

      const rounds = [
        { kind: 'pos', target: '명사', need: 3, sec: 28 },
        { kind: 'pos', target: '부사', need: 3, sec: 28 },
        { kind: 'seq', sec: 40 },
      ];

      // 8칸 자리: 앞줄 4 (꼬리표 아래) · 뒷줄 4 (꼬리표 위)
      const slotPos = (k) => {
        const row = k >= 4 ? 1 : 0;
        const col = k % 4;
        const left = 86;
        const right = ctx.W - 28;
        const step = (right - left) / 4;
        return { x: left + step * (col + 0.5) + (row ? step * 0.5 - step * 0.25 : -step * 0.25), y: floorY() - row * 52, row };
      };
      const freeSlot = () => { const used = new Set(S.dolls.map((d) => d.slot)); const free = [0, 1, 2, 3, 4, 5, 6, 7].filter((k) => !used.has(k)); return free.length ? pick(free) : -1; };
      function makeDoll(text, info, slot) {
        return { text, info, slot, r: 23, c: pick(COLORS), wob: Math.random() * 6, get x() { return slotPos(this.slot).x; }, get y() { return slotPos(this.slot).y; }, get row() { return slotPos(this.slot).row; } };
      }
      function layout(items) {
        const slots = shuffle([0, 1, 2, 3, 4, 5, 6, 7]);
        return items.slice(0, 8).map((it, i) => makeDoll(it.text, it, slots[i]));
      }
      function startRound(i) {
        S.switching = false;
        if (i >= rounds.length) return finish(S.ok >= 6);
        S.round = i; S.roundT = 0; S.got = 0;
        const R = rounds[i];
        if (R.kind === 'pos') {
          const others = POSLIST.filter((p) => p !== R.target);
          const items = [
            ...shuffle(data.pos[R.target]).slice(0, 4).map((t) => ({ text: t, pos: R.target })),
            ...shuffle(others.flatMap((p) => data.pos[p].map((t) => ({ text: t, pos: p })))).slice(0, 4),
          ];
          S.dolls = layout(shuffle(items));
          banner.innerHTML = `<small>라운드 ${i + 1}/3</small><b>「${R.target}」 인형을 ${R.need}개 뽑아라!</b><em>💡 품사는 생김새가 아니라 하는 일로!</em>`;
        } else {
          const q = pick(BANK[11].filter((x) => parseChunks(x.en).length <= 5));
          const chunks = parseChunks(q.en);
          S.seq = { q, chunks };
          S.seqIdx = 0;
          const decoys = shuffle(BANK[11].filter((x) => x.id !== q.id).flatMap((x) => parseChunks(x.en))).slice(0, 8 - chunks.length);
          S.dolls = layout(shuffle([...chunks.map((c, k) => ({ text: c.text, order: k })), ...decoys.map((c) => ({ text: c.text, order: -1 }))]));
          banner.innerHTML = `<small>라운드 3/3 · 문장 완성</small><b>${q.ko}</b><em id="seqLine">① 번째 조각을 뽑아요</em>`;
        }
        banner.classList.remove('pop'); void banner.offsetWidth; banner.classList.add('pop');
      }
      startRound(0);

      ctx.button('◀', 'left', { onDown: () => { S.dir = -1; }, onUp: () => { if (S.dir < 0) S.dir = 0; } });
      const dropBtn = ctx.button('DROP<small>뽑기</small>', 'drop', { onDown: () => { if (S.mode === 'move' && !S.finished) { S.mode = 'down'; ctx.sfx('tap'); } } });
      ctx.button('▶', 'right', { onDown: () => { S.dir = 1; }, onUp: () => { if (S.dir > 0) S.dir = 0; } });

      function judge(d) {
        const R = rounds[S.round];
        if (!R || S.finished) return;
        let ok;
        if (R.kind === 'pos') ok = d.info.pos === R.target;
        else ok = d.info.order === S.seqIdx;
        if (ok) {
          S.combo++; S.ok++; S.got++;
          S.grip = clamp(S.grip + 0.07, 0.4, 0.97);
          const pts = 150 + S.combo * 30;
          S.score += pts;
          ctx.floatText(`+${pts} 💪`, 40, ctx.H * 0.45, '#1E9B5B', 20);
          ctx.burst(36, floorY() - 20, 22);
          if (S.combo >= 3 && S.combo % 3 === 0) ctx.callout('yar', `${S.combo} 연속!`); else ctx.callout('easy');
          if (R.kind === 'seq') {
            S.seqIdx++;
            const line = banner.querySelector('#seqLine');
            const done = S.seq.chunks.slice(0, S.seqIdx).map((c) => c.text).join(' / ');
            if (line) line.textContent = S.seqIdx < S.seq.chunks.length ? `${done} / ${'①②③④⑤⑥'[S.seqIdx]} 번째?` : `${done}${S.seq.q.end || '.'} 완성!`;
            if (S.seqIdx >= S.seq.chunks.length) { S.score += 600; ctx.callout('legend', '문장 완성!'); return finish(true); }
          } else if (S.got >= R.need) {
            ctx.floatText('ROUND CLEAR!', ctx.W / 2, ctx.H * 0.4, '#D9822B', 26);
            if (!S.switching) { S.switching = true; const nx = S.round + 1; setTimeout(() => { if (!S.finished) startRound(nx); }, 900); }
          }
        } else {
          S.combo = 0; S.wrong++;
          S.grip = clamp(S.grip - 0.12, 0.4, 0.97);
          S.score = Math.max(0, S.score - 80);
          const why = R.kind === 'pos' ? `${d.text} → ${d.info.pos}!` : '순서가 달라요!';
          ctx.floatText(`✘ ${why}`, ctx.W / 2, ctx.H * 0.42, '#E0453A', 18);
          ctx.shake(6); ctx.sfx('no');
          if (R.kind === 'seq') { const sl = freeSlot(); if (sl >= 0) { d.slot = sl; S.dolls.push(d); } }
        }
      }
      function finish(cleared) {
        if (S.finished) return;
        S.finished = true;
        dropBtn.disabled = true;
        const snack = S.ok >= 6 ? (S.ok >= 9 ? 'cookie' : S.ok >= 8 ? 'cake' : 'choco') : null;
        ctx.end({
          score: S.score, cleared: cleared || S.ok >= 6, coins: Math.min(25, S.ok * 3), snack,
          headline: snack ? '간식 인형 GET!' : '조금만 더!', legendAt: 2400,
          lines: [`맞게 뽑은 인형 <b>${S.ok}</b>개 · 틀린 인형 ${S.wrong}개`, snack ? '6개 이상 맞혀서 간식 쿠폰 획득!' : '6개 이상 맞히면 간식 쿠폰!'],
        });
      }

      return {
        update(dt) {
          if (S.finished) return;
          S.t += dt; S.roundT += dt;
          const R = rounds[S.round];
          if (S.roundT > R.sec && S.mode === 'move' && !S.switching) {
            if (S.round < 2) { ctx.floatText('시간 끝! 다음 라운드', ctx.W / 2, ctx.H * 0.4, '#6B5F8A', 20); startRound(S.round + 1); } else finish(false);
          }
          const k = ctx.input.keys;
          const dir = S.dir || (k.ArrowLeft ? -1 : k.ArrowRight ? 1 : 0);
          if ((k[' '] || k.ArrowDown) && S.mode === 'move') S.mode = 'down';
          if (S.mode === 'move') S.x = clamp(S.x + dir * 150 * dt, 60, ctx.W - 26);
          const tipY = TOP + 30 + S.claw;
          if (S.mode === 'down') {
            S.claw += 220 * dt;
            const under = S.dolls.filter((d) => Math.abs(d.x - S.x) < d.r).sort((a, b) => a.y - b.y)[0];
            const stopAt = under ? under.y - under.r - TOP - 26 : floorY() - TOP - 30;
            if (S.claw >= stopAt) {
              S.claw = stopAt; S.mode = 'up';
              ctx.sfx('bounce');
              if (under) {
                const align = 1 - Math.abs(under.x - S.x) / under.r;
                if (Math.random() < S.grip * (0.55 + 0.45 * align)) { S.held = under; S.dolls.splice(S.dolls.indexOf(under), 1); S.slipCheck = true; }
                else ctx.floatText('미끄러졌다!', S.x, tipY - 30, '#6B5F8A', 16);
              }
            }
          } else if (S.mode === 'up') {
            S.claw -= 200 * dt;
            if (S.held && S.slipCheck && S.claw < 90) {
              S.slipCheck = false;
              if (Math.random() > S.grip + 0.15) { const d = S.held; S.held = null; const sl = freeSlot(); if (sl >= 0) { d.slot = sl; S.dolls.push(d); } ctx.floatText('앗, 놓쳤다!', S.x, tipY, '#E0453A', 16); ctx.sfx('no'); }
            }
            if (S.claw <= 0) { S.claw = 0; S.mode = S.held ? 'carry' : 'move'; }
          } else if (S.mode === 'carry') {
            S.x -= 190 * dt;
            if (S.x <= 34) { S.x = 34; const d = S.held; S.held = null; S.mode = 'move'; judge(d); }
          }
          if (S.dolls.length < 7 && R.kind === 'pos' && S.mode === 'move') {
            const sl = freeSlot();
            const has = new Set(S.dolls.map((d) => d.text));
            const p = Math.random() < 0.45 ? R.target : pick(POSLIST);
            const word = pick(data.pos[p].filter((w) => !has.has(w)));
            if (sl >= 0 && word) S.dolls.push(makeDoll(word, { text: word, pos: p }, sl));
          }
          const left = Math.max(0, Math.ceil(R.sec - S.roundT));
          ctx.hud(`⏱ <b>${left}</b> · 💪 ${Math.round(S.grip * 100)}% · <b>${S.score}</b>`);
        },
        draw(g) {
          const { W, H } = ctx;
          // 기계 테두리
          const bg = g.createLinearGradient(0, 0, 0, H);
          bg.addColorStop(0, '#FFE3F0'); bg.addColorStop(1, '#E2F4FF');
          g.fillStyle = bg; g.fillRect(0, 0, W, H);
          roundRect(g, 8, TOP - 30, W - 16, H - TOP + 20, 22);
          g.fillStyle = 'rgba(255,255,255,.55)'; g.fill();
          g.lineWidth = 8; g.strokeStyle = '#FF9ECB'; g.stroke();
          for (let k = 0; k < 14; k++) {
            g.fillStyle = Math.floor(S.t * 6 + k) % 2 ? '#FFD36B' : '#fff';
            g.beginPath(); g.arc(20 + (k * (W - 40)) / 13, TOP - 30, 5, 0, 7); g.fill();
          }
          // 출구
          roundRect(g, 12, floorY() - 60, 48, 76, 8); g.fillStyle = '#B79CFF'; g.fill();
          tag(g, 'OUT', 36, floorY() - 72, { size: 12, bg: '#FFD36B' });
          // 바닥
          g.fillStyle = '#FFE1B8'; g.fillRect(14, floorY() + 26, W - 28, H - floorY() - 30);
          // 레일
          g.fillStyle = '#2B2350'; g.fillRect(16, TOP - 6, W - 32, 8);
          // 인형
          const dolls = [...S.dolls].sort((a, b) => a.y - b.y);
          dolls.forEach((d) => drawDoll(g, d, S.t));
          // 집게
          const tipY = TOP + 30 + S.claw;
          g.strokeStyle = '#2B2350'; g.lineWidth = 3; g.beginPath(); g.moveTo(S.x, TOP); g.lineTo(S.x, tipY - 10); g.stroke();
          roundRect(g, S.x - 16, TOP - 10, 32, 16, 5); g.fillStyle = '#E21E8C'; g.fill();
          const open = S.mode === 'down' ? 0.7 : 0.25;
          g.lineWidth = 6; g.strokeStyle = '#2B2350'; g.lineCap = 'round';
          [-1, 1].forEach((s) => { g.beginPath(); g.moveTo(S.x, tipY - 10); g.quadraticCurveTo(S.x + s * 24 * (0.6 + open), tipY + 6, S.x + s * 10 * (0.6 + open), tipY + 24); g.stroke(); });
          g.lineCap = 'butt';
          if (S.held) { const h = S.held; drawDoll(g, { text: h.text, r: h.r, c: h.c, wob: h.wob, x: S.x, y: tipY + 40, row: 1 }, S.t); }
          // 집게 위치 안내선
          if (S.mode === 'move') { g.setLineDash([4, 6]); g.strokeStyle = 'rgba(43,35,80,.25)'; g.lineWidth = 2; g.beginPath(); g.moveTo(S.x, tipY + 26); g.lineTo(S.x, floorY() + 20); g.stroke(); g.setLineDash([]); }
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
  // 귀
  g.fillStyle = d.c;
  [-1, 1].forEach((s) => { g.beginPath(); g.arc(s * 16, -d.r + 2, 9, 0, 7); g.fill(); });
  g.beginPath(); g.arc(0, 0, d.r, 0, 7); g.fill();
  g.lineWidth = 2.5; g.strokeStyle = '#2B2350'; g.stroke();
  g.fillStyle = '#fff'; g.beginPath(); g.ellipse(0, 8, 13, 9, 0, 0, 7); g.fill();
  g.fillStyle = '#2B2350';
  [-8, 8].forEach((s) => { g.beginPath(); g.arc(s, -4, 3, 0, 7); g.fill(); });
  g.beginPath(); g.arc(0, 6, 2.5, 0, 7); g.fill();
  g.restore();
  tag(g, d.text, d.x, d.row === 0 ? d.y + d.r + 12 : d.y - d.r - 14, { size: 12, bg: '#FFFBF0' });
}
