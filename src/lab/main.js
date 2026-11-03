// 퀴즈 연습장 — 유형을 골라 한 칸(5문제)을 풀어 본다. (3단계에서 보드 칸이 이 엔진을 부른다)
import { TYPES } from '../quiz/constants.js';
import { BANK, config, draw } from '../quiz/bank.js';
import { runCell } from '../quiz/cell.js';
import { esc } from '../quiz/notation.js';
import { setMuted, isMuted } from '../quiz/sound.js';
import { playRun, playCrane, playKart, playShoot, GAMES } from '../games/index.js';
import { syncMute, unlockAudio } from '../fx/fx.js';

const KEY = 'cq.lab';
const load = () => {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
};
const S = Object.assign({ used: [], coins: 0, moves: 0, notes: [], played: 0 }, load());
const save = () => {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* 저장 불가 */ }
};
const used = new Set(S.used);

const REGIONS = [
  { name: '품사 마을', level: '하', color: '#3E9B5B', types: [1, 2, 3, 4] },
  { name: '청크 시티', level: '중', color: '#2E7BC4', types: [5, 6, 7] },
  { name: '절단 협곡', level: '중상', color: '#C2602D', types: [8, 9, 10] },
  { name: '문장의 성', level: '상', color: '#7A3FA8', types: [11, 12] },
];

const app = document.getElementById('app');
const muteBtn = document.getElementById('mute');
muteBtn.textContent = isMuted() ? '🔇' : '🔊';
muteBtn.onclick = () => { setMuted(!isMuted()); syncMute(); muteBtn.textContent = isMuted() ? '🔇' : '🔊'; };

function home() {
  app.innerHTML = `
    <div class="stats card"><div><b>${S.played}</b><small>칸</small></div><div><b>${S.moves}</b><small>전진</small></div><div><b>🪙 ${S.coins}</b><small>코인</small></div><div><b>${S.notes.length}</b><small>오답</small></div></div>
    ${REGIONS.map((r) => `<section class="region" style="--rc:${r.color}"><h2>${esc(r.name)} <small>${esc(r.level)}</small></h2>
      <div class="types">${r.types.map((t) => `<button class="tcard" data-t="${t}"><span class="no">${t}</span><b>${esc(TYPES[t].name)}</b><small>${esc(TYPES[t].level)} · ${(BANK[t] || []).length}문제</small></button>`).join('')}</div></section>`).join('')}
    <section class="region" style="--rc:#E21E8C"><h2>미니게임 연습 <small>상품 없음</small></h2>
      <div class="types">${Object.entries(GAMES).map(([k, gm]) => `<button class="tcard mg" data-g="${k}"><span class="no">${gm.icon}</span><b>${esc(gm.title)}</b><small>${esc(gm.desc)}</small></button>`).join('')}</div></section>
    <div class="row"><button class="ghost" id="notes">📒 오답노트</button><button class="ghost" id="reset">새 판 시작</button></div>
    <p class="muted">같은 판에서는 같은 문제가 다시 나오지 않아요. 「새 판 시작」을 누르면 기록이 지워집니다.</p>`;
  app.querySelectorAll('.tcard:not(.mg)').forEach((b) => { b.onclick = () => play(+b.dataset.t); });
  app.querySelectorAll('.tcard.mg').forEach((b) => {
    b.onclick = async () => {
      unlockAudio(); syncMute();
      const fn = { run: playRun, crane: playCrane, kart: playKart, shoot: playShoot }[b.dataset.g];
      const r = await fn({ charId: 'bboy' });
      S.coins += r.coins || 0; save(); home();
    };
  });
  app.querySelector('#reset').onclick = () => {
    if (!confirm('기록(코인·오답노트·출제 기록)을 지우고 새 판을 시작할까요?')) return;
    Object.assign(S, { used: [], coins: 0, moves: 0, notes: [], played: 0 });
    used.clear();
    save();
    home();
  };
  app.querySelector('#notes').onclick = notes;
}

async function play(type) {
  const qs = draw(type, config.questionsPerCell, used);
  S.used = [...used];
  save();
  window.scrollTo(0, 0);
  const r = await runCell(app, { type, questions: qs, config });
  S.played++;
  S.coins += r.reward.coins;
  S.moves += r.reward.move;
  S.notes.push(...r.wrongs.map((w) => ({ ...w, at: Date.now() })));
  save();
  home();
  window.scrollTo(0, 0);
}

function notes() {
  app.innerHTML = `<div class="card"><h2 style="margin-top:0">📒 오답노트 <small class="muted">${S.notes.length}개</small></h2>
    ${S.notes.length ? S.notes.slice().reverse().map((w) => `<div class="wn"><div class="muted">유형 ${w.type} · ${esc(TYPES[w.type].name)}</div><div class="wq">${esc(w.question)}</div><div class="wm">내 답: ${esc(w.mine)}</div><div class="wa">정답: ${esc(w.answer)}</div></div>`).join('') : '<p class="muted">아직 틀린 문제가 없어요.</p>'}
    <div class="row"><button class="primary" id="back">◀ 돌아가기</button></div></div>`;
  app.querySelector('#back').onclick = home;
}

home();
