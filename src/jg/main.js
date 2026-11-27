// 📚 정관중 1학년 2학기 기말 · Lesson 7·8 학습 앱
//  - 단어 53개 × (영영풀이 + 문장 넣기) = 106문제 · 객관식 60% / 직접 쓰기 40%
//  - 중간중간 🥁 문법 드럼 3곡(곡마다 문법 5문제 · 떨어지는 노트 = 학습지 단어 영↔한)
//    🏎️ 영작 카트 3판(퀴즈 존 5곳 = 본문 핵심 문장 · 단어 레인 4번) — 모두 15문장
//    💬 대화문 사격장 2판(한글 문장 → 영어 단어 과녁을 순서대로 쏴서 완성) — 모두 10문장
//  - 끝: 게임까지 합친 정답률 90% 이상 PASS(응원단 춤) / NOT PASS(다음에 재도전)
//  - 끝나면 총점 · 드럼 합계 · 카트 합계를 구글 시트 순위표에 올리고 내 순위를 보여 준다
import data from '../../data/jg1-l78.json';
import chars from '../../data/characters.json';
import { playDrumLesson } from '../games/drum.js';
import { playKartLesson } from '../games/kart.js';
import { playShootDialog } from '../games/shoot.js';
import { shuffle } from '../games/engine.js';
import { sfx, setMuted, isMuted } from '../quiz/sound.js';
import { syncMute, unlockAudio, callout, comboCallout, bgm, bgmStop, crewDance } from '../fx/fx.js';
import { fillFaces, charURL } from '../board/charart.js';
import { setPlayer, submitScore, getRanking, rankTableHTML, callApi, queueSend, flushPending } from '../rank/rank.js';
import config from '../../data/config.json';

// 👩‍🏫 선생님 체험 모드: 주소 끝에 ?try=ted5821 — 순위 · 구글 시트에 기록하지 않고, 원하는 게임 · 결과 화면으로 바로 가기
const DEMO = new URLSearchParams(location.search).get('try') === 'ted5821';
const KEY = DEMO ? 'jg78.demo.v2' : 'jg78.save.v2';
const MUSIC = 'jgBox'; // 🎀 부드럽고 귀여운 오르골 곡
const WORD_SEC = 30; const GAME_Q_SEC = 60; const PASS_CUT = 90;
const W = data.words;
const N_ITEMS = W.length * 2;
const CIRC = '①②③④⑤';
const POS = { n: 'n.', v: 'v.', a: 'a.', ad: 'ad.', phr: 'phr.' };
const koShort = (w) => w.ko.replace(/\(.*?\)/g, '').split(/[,;]/)[0].trim();
// 🛣️ 카트 단어 레인에 나올 어려운 단어들
const HARD = ['photography', 'photographer', 'permission', 'wrangler', 'storytelling', 'capture', 'forgive', 'personal', 'unique', 'shocking', 'asleep', 'break into', 'in surprise', 'location', 'signal', 'editor', 'cottage', 'follower', 'be in charge of', 'take care of'];
const PRIZE = {
  total: '🏆 <b>총점 1~3위</b> 특별 상품!',
  games: '🥁 <b>드럼 3곡 합계</b> · 🏎️ <b>카트 3판 합계</b> 각각 <b>1~5위</b> 초코파이 · 오예스!',
  perfect: '💯 <b>단어 문제를 하나도 안 틀리면</b> 초코파이 + 오예스 + 오예스 쿠키앤크림 <b>3종 세트!</b>',
};
// 🎮 게임이 나오는 때: 단어 문제를 이만큼 풀면 (106문제 사이 고르게 6번)
const GAMES = [
  { at: 12, kind: 'drum', round: 1, song: 1 },
  { at: 24, kind: 'kart', round: 1 },
  { at: 36, kind: 'shoot', round: 1 },
  { at: 48, kind: 'drum', round: 2, song: 2 },
  { at: 60, kind: 'kart', round: 2 },
  { at: 72, kind: 'shoot', round: 2 },
  { at: 84, kind: 'drum', round: 3, song: 'rock' },
  { at: 96, kind: 'kart', round: 3 },
];
const GICON = { drum: '🥁', kart: '🏎️', shoot: '💬' };
const N_GRAM = 15; const N_SENT = data.sentences.length; const N_LANE = 12; const N_DLG = data.dialogs.length;
const N_ALL = N_ITEMS + N_GRAM + N_SENT + N_LANE + N_DLG; // 정답률 계산: 단어 + 문법 + 본문 영작 + 단어 레인 + 대화문
const GRAM_CATS = Object.keys(data.grammar); // to부정사 · 비인칭 주어 it · 수여동사 · 시간의 접속사

const app = document.getElementById('app');
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const muteBtn = document.getElementById('mute');
muteBtn.textContent = isMuted() ? '🔇' : '🔊';
muteBtn.onclick = () => { setMuted(!isMuted()); syncMute(); muteBtn.textContent = isMuted() ? '🔇' : '🔊'; };

/* ---------------- 저장 ---------------- */
let S = null;
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } };
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* 저장 불가 */ } };

/** 새 판: 단어 순서 · 문제 형식(객관식 60% / 직접 쓰기 40%) · 문법 · 영작 문제 배치 */
function newRun(name, char) {
  // 1바퀴(53문제): 단어마다 영영풀이 또는 문장 넣기 중 하나 → 2바퀴: 나머지 하나 (같은 단어가 붙어 나오지 않게)
  const firstKind = W.map((_, i) => (i % 2 ? 'def' : 'sen'));
  shuffle(firstKind);
  const round1 = shuffle(W.map((_, wi) => ({ wi, k: firstKind[wi] })));
  const round2 = shuffle(W.map((_, wi) => ({ wi, k: firstKind[wi] === 'def' ? 'sen' : 'def' })));
  const items = [...round1, ...round2];
  const nType = Math.round(items.length * 0.4);
  const fmt = shuffle(items.map((_, i) => (i < nType ? 'type' : 'mc')));
  items.forEach((it, i) => { it.f = fmt[i]; });
  // 🥁 드럼 3곡 × 문법 5문제 (곡마다 네 가지 문법 한 문제씩 + 하나 더 · 겹치지 않게)
  const gpool = {}; GRAM_CATS.forEach((c) => { gpool[c] = shuffle(data.grammar[c].map((_, i) => i)); });
  const EXTRA = ['수여동사', 'to부정사', '시간의 접속사'];
  const gram = [0, 1, 2].map((r) => shuffle([...GRAM_CATS, EXTRA[r]]).map((c) => ({ c, i: gpool[c].pop() })));
  // 🏎️ 카트 3판 × 본문 핵심 문장 5개 = 15문장 · 단어 레인 4번씩
  const sent = shuffle(data.sentences.map((_, i) => i));
  const sents = [0, 1, 2].map((r) => sent.slice(r * 5, r * 5 + 5));
  const hard = shuffle(W.map((w, i) => (HARD.includes(w.w) ? i : -1)).filter((i) => i >= 0)).slice(0, 12);
  const lanes = [0, 1, 2].map((r) => hard.slice(r * 4, r * 4 + 4).map((wi, k) => ({ wi, e2k: k % 2 === 0 })));
  // 💬 대화문 사격장 2판 × 5문장 = 10문장
  const dl = shuffle(data.dialogs.map((_, i) => i));
  const dlgs = [dl.slice(0, 5), dl.slice(5, 10)];
  S = { v: 2, name, char, items, i: 0, score: 0, wordOk: 0, mcOk: 0, typeOk: 0, streak: 0, best: 0, wrongs: [], gram, sents, lanes, dlgs, games: [], startedAt: Date.now(), finished: false };
  save();
}

/* ---------------- 배경: 캐릭터들이 둥실둥실 ---------------- */
(function background() {
  const bg = document.querySelector('.jg-bg'); if (!bg) return;
  const ids = ['ted', ...chars.players.map((p) => p.id)];
  bg.innerHTML = ids.map((id, k) => `<img src="${charURL(id)}" alt="" style="--x:${(k * 37) % 92}%;--d:${14 + (k % 5) * 3}s;--dl:${-k * 2.3}s;--s:${0.7 + (k % 3) * 0.18}">`).join('')
    + ['📚', '🥁', '🏎️', '✏️', '⭐', '🎬', '📱', '🎵'].map((e, k) => `<i style="--x:${(k * 13 + 5) % 95}%;--d:${10 + k * 2}s;--dl:${-k * 1.7}s">${e}</i>`).join('');
}());

/* ---------------- 화면: 처음 ---------------- */
function title() {
  bgm(MUSIC);
  const sv = load();
  const can = sv && !sv.finished && sv.items?.length === N_ITEMS;
  app.innerHTML = `<div class="jg-hero card">
      <div class="hero-faces"><img class="face" data-face="ted" alt=""><span class="bubble">기말 대비, 게임처럼 끝내자! 🔥</span></div>
      <div class="kick">정관중학교 1학년 · 2학기 기말</div>
      <h1>Lesson <b>7·8</b><br>단어 · 문법 · 영작</h1>
      <p class="sub">Find Your Dream · Be Smart Online</p>
      <div class="hero-plan">
        <div><i>📖</i><b>단어 ${N_ITEMS}문제</b><small>영영풀이 + 문장 넣기</small></div>
        <div><i>🥁</i><b>문법 드럼 3곡</b><small>곡마다 문법 5문제</small></div>
        <div><i>🏎️</i><b>영작 카트 3판</b><small>본문 핵심 15문장</small></div>
        <div><i>💬</i><b>대화문 사격장</b><small>대화 핵심 10문장</small></div>
      </div>
    </div>
    <div class="prize card"><h3>🎁 상품 안내</h3><ul><li>${PRIZE.total}</li><li>${PRIZE.games}</li><li>${PRIZE.perfect}</li></ul></div>
    <div class="btns">
      ${can ? `<button class="primary big" id="cont">▶ 이어하기 · ${esc(sv.name)} (${sv.i}/${N_ITEMS})</button>` : ''}
      <button class="${can ? 'ghost big' : 'primary big'}" id="new">${can ? '처음부터 새로 하기' : '시작하기 ▶'}</button>
      ${sv && sv.finished ? '<button class="ghost big" id="last">🏆 지난 결과 · 순위 보기</button>' : ''}
    </div>`;
  if (DEMO) demoPanel();
  fillFaces(app);
  app.querySelector('#new').onclick = () => { unlockAudio(); if (can && !confirm('지금까지 푼 기록이 지워져요. 새로 시작할까요?')) return; profile(); };
  if (can) app.querySelector('#cont').onclick = () => { unlockAudio(); S = sv; setPlayer(S.name); next(); };
  if (sv && sv.finished) app.querySelector('#last').onclick = () => { S = sv; setPlayer(S.name); result(); };
}

/** 👩‍🏫 체험 패널: 단어 문제 · 게임 8개 · 결과(PASS / NOT PASS)로 바로 가기 */
function demoPanel() {
  const box = document.createElement('div');
  box.className = 'card demo';
  box.innerHTML = `<h3>👩‍🏫 선생님 체험 모드</h3><p>순위표 · 구글 시트에 <b>기록되지 않아요</b>. 바로 가고 싶은 곳을 누르세요.</p>
    <div class="demo-btns"><button data-j="word">📖 단어 문제</button>${GAMES.map((g, k) => `<button data-j="${k}">${GICON[g.kind]} ${GNAME[g.kind]} ${g.round}</button>`).join('')}
    <button data-j="pass">🎉 결과 · PASS</button><button data-j="np">💪 결과 · NOT PASS</button></div>`;
  app.prepend(box);
  box.querySelectorAll('[data-j]').forEach((b) => {
    b.onclick = () => {
      unlockAudio(); newRun('체험(선생님)', 'bboy'); setPlayer(S.name);
      const j = b.dataset.j;
      if (j === 'word') return next();
      if (j === 'pass' || j === 'np') {
        const good = j === 'pass';
        Object.assign(S, { i: N_ITEMS, wordOk: good ? 100 : 60, mcOk: 60, typeOk: 40, score: good ? 42000 : 26000, best: 25, wrongs: good ? [1] : [1, 2, 3, 4] });
        S.games = GAMES.map((g) => ({ kind: g.kind, raw: g.kind === 'drum' ? 250000 : 2500, pts: 1, qOk: good ? 5 : 3, qN: 5, laneOk: good ? 4 : 2 }));
        save(); return result();
      }
      const k = +j; S.i = GAMES[k].at;
      S.games = GAMES.slice(0, k).map((g) => ({ kind: g.kind, raw: 0, pts: 0, qOk: 0, qN: 5, laneOk: 0 }));
      save(); gameGate(k);
    };
  });
}

function profile() {
  let char = chars.players[0].id;
  app.innerHTML = `<div class="card prof"><h2>✏️ 이름과 캐릭터</h2>
    <label class="fld">이름 (순위표에 올라가요 · 이름만)<input id="nm" maxlength="10" placeholder="예: 민준" autocomplete="off"></label>
    <div class="fld">함께할 캐릭터 <small>카트 레이스에 나와요</small><div class="chars">${chars.players.map((p, k) => `<button class="ch ${k ? '' : 'on'}" data-c="${p.id}"><img src="${charURL(p.id)}" alt=""><span>${esc(p.name)}</span></button>`).join('')}</div></div>
    <button class="primary big" id="go">다음 ▶</button></div>`;
  app.querySelectorAll('.ch').forEach((b) => { b.onclick = () => { char = b.dataset.c; app.querySelectorAll('.ch').forEach((x) => x.classList.toggle('on', x === b)); sfx('tap'); }; });
  app.querySelector('#go').onclick = () => {
    const name = app.querySelector('#nm').value.trim();
    if (!name) { app.querySelector('#nm').focus(); app.querySelector('#nm').classList.add('shake'); return; }
    newRun(name, char); setPlayer(name); guide();
  };
}

function guide() {
  app.innerHTML = `<div class="card guide"><h2>📋 이렇게 진행돼요</h2>
    <ol class="steps">
      <li><b>📖 단어 ${N_ITEMS}문제</b> — 7·8과 단어 ${W.length}개를 <em>영영풀이</em>로 한 번, <em>문장 속 빈칸</em>으로 한 번!<small>객관식 60% · 직접 쓰기 40% · 한 문제 <b>30초</b></small></li>
      <li><b>🥁 문법 드럼 3곡</b> — 떨어지는 노트는 <em>학습지 단어</em>(영↔한) · 연주 중간 문법 퀴즈 5번<small>한 문제 1분 · 푸는 동안 연주 멈춤 · 정답이면 드럼 솔로 + 관객 환호!</small></li>
      <li><b>🏎️ 영작 카트 3판</b> — 퀴즈 존 5곳 본문 핵심 문장 빈칸 채우기 + 단어 레인 4번<small>3판 × 5문장 = 본문 핵심 15문장 · 한 문제 1분</small></li>
      <li><b>💬 대화문 사격장 2판</b> — 한글 문장을 보고 영어 단어 과녁을 <em>순서대로</em> 쏴서 완성<small>2판 × 5문장 = 대화 핵심 10문장 · 문장당 30초</small></li>
      <li><b>🏆 마지막</b> — 게임 퀴즈까지 합친 정답률 <em>90% 이상이면 PASS!</em> · 총점 · 드럼 · 카트 · 대화문 순위</li>
    </ol>
    <div class="score-rule"><b>점수</b> 객관식 100 · 직접 쓰기 150 · 연속 정답 보너스 · 드럼 · 카트 점수 · 문법/영작 정답 +500</div>
    <div class="prize"><h3>🎁 상품</h3><ul><li>${PRIZE.total}</li><li>${PRIZE.games}</li><li>${PRIZE.perfect}</li></ul></div>
    <button class="primary big" id="go">🚀 출발!</button></div>`;
  app.querySelector('#go').onclick = () => { unlockAudio(); next(); };
}

/* ---------------- 진행 ---------------- */
function next() {
  const g = GAMES.find((x, k) => S.i >= x.at && !S.games[k]);
  if (g) return gameGate(GAMES.indexOf(g));
  if (S.i >= N_ITEMS) return result();
  question();
}

function topHTML() {
  const pct = (S.i / N_ITEMS) * 100;
  const marks = GAMES.map((g, k) => `<i class="gm ${S.games[k] ? 'done' : ''}" style="left:${(g.at / N_ITEMS) * 100}%">${GICON[g.kind]}</i>`).join('');
  return `<div class="jg-top card">
    <div class="who"><img src="${charURL(S.char)}" alt=""><b>${esc(S.name)}</b><span class="sc">⭐ ${S.score.toLocaleString()}</span>${S.streak >= 2 ? `<span class="st">🔥 ${S.streak}연속</span>` : ''}</div>
    <div class="track"><div class="fill" style="width:${pct}%"></div>${marks}<img class="runner" src="${charURL(S.char)}" alt="" style="left:${pct}%"></div>
    <div class="cnt">${S.i}/${N_ITEMS} · 🏁</div></div>`;
}

const norm = (s) => String(s || '').toLowerCase().replace(/[’`]/g, "'").replace(/[.!?,]+$/g, '').replace(/\s+/g, ' ').trim();
const hintOf = (ans) => ans.split(' ').map((w) => w[0] + ' _'.repeat(w.length - 1)).join('   ');
const blankHTML = (ex, fill) => esc(ex).replace('___', fill ? `<b class="fill">${esc(fill)}</b>` : '<span class="blank">　　　　</span>');

let qTimer = null;
function question() {
  const it = S.items[S.i]; const w = W[it.wi];
  const ans = it.k === 'sen' && w.a ? w.a : w.w;
  const head = `<div class="qtag"><span class="l l${w.l}">Lesson ${w.l}</span><span>${it.k === 'def' ? '📖 영영풀이' : '✏️ 문장 넣기'}</span><span class="${it.f}">${it.f === 'mc' ? '객관식' : '⌨️ 직접 쓰기'}</span><em>${S.i + 1}번</em></div>`;
  const prompt = it.k === 'def'
    ? `<p class="ask">다음 영영풀이에 알맞은 ${w.p === 'phr' ? '표현' : '단어'}는?</p><div class="def"><small>${POS[w.p]}</small>${esc(w.def)}</div>`
    : `<p class="ask">빈칸에 알맞은 ${w.p === 'phr' ? '표현' : '단어'}는?</p><div class="sen">${blankHTML(w.ex)}</div>`;
  let body;
  let opts = null;
  if (it.f === 'mc') {
    const same = W.filter((x, k) => k !== it.wi && (x.p === w.p || (w.p === 'phr') === (x.p === 'phr')) && x.w !== w.w);
    const others = shuffle(same.length >= 3 ? same : W.filter((_, k) => k !== it.wi)).slice(0, 3).map((x) => (it.k === 'sen' && w.a && x.p === 'phr' ? x.w : x.w));
    opts = shuffle([ans, ...others]);
    body = `<div class="opts">${opts.map((o, k) => `<button class="opt" data-k="${k}"><b>${CIRC[k]}</b> ${esc(o)}</button>`).join('')}</div>`;
  } else {
    body = `<div class="type"><div class="hint">힌트: <b>${esc(hintOf(ans))}</b> <small>(${ans.replace(/ /g, '').length}글자${ans.includes(' ') ? ` · ${ans.split(' ').length}단어` : ''})</small></div>
      <input id="ta" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="영어로 쓰세요"><button class="primary" id="tok">확인</button></div>`;
  }
  app.innerHTML = `${topHTML()}<div class="card qcard">${head}<div class="wtimer"><b id="qsec">${WORD_SEC}</b><div class="wbar"><i id="qbi"></i></div></div>${prompt}${body}<div id="fb"></div></div>`;
  window.scrollTo(0, 0);
  let over = false;
  const t0 = performance.now();
  clearInterval(qTimer);
  qTimer = setInterval(() => {
    const left = Math.max(0, WORD_SEC - (performance.now() - t0) / 1000);
    const sec = app.querySelector('#qsec'); const bi = app.querySelector('#qbi'); if (!sec) return clearInterval(qTimer);
    sec.textContent = Math.ceil(left); sec.classList.toggle('low', left <= 10); bi.style.width = `${(left / WORD_SEC) * 100}%`; bi.classList.toggle('low', left <= 10);
    if (left <= 0) { clearInterval(qTimer); timeUp(); }
  }, 100);
  const done = (mine) => { if (over) return; over = true; clearInterval(qTimer); grade(it, w, ans, mine); };
  const timeUp = () => { app.querySelectorAll('.opt').forEach((x) => { x.disabled = true; if (opts && opts[+x.dataset.k] === ans) x.classList.add('right'); }); const inp = app.querySelector('#ta'); if (inp) { inp.disabled = true; app.querySelector('#tok').disabled = true; } done(null); };
  if (opts) app.querySelectorAll('.opt').forEach((b) => { b.onclick = () => { if (over) return; app.querySelectorAll('.opt').forEach((x) => { x.disabled = true; if (opts[+x.dataset.k] === ans) x.classList.add('right'); }); if (opts[+b.dataset.k] !== ans) b.classList.add('wrong'); done(opts[+b.dataset.k]); }; });
  else {
    const inp = app.querySelector('#ta'); setTimeout(() => inp.focus(), 50);
    const go = () => { if (over || !inp.value.trim()) return; inp.disabled = true; app.querySelector('#tok').disabled = true; done(inp.value); };
    app.querySelector('#tok').onclick = go;
    inp.onkeydown = (e) => { if (e.key === 'Enter') go(); };
  }
}

function grade(it, w, ans, mine) {
  const ok = mine != null && (norm(mine) === norm(ans) || (it.f === 'type' && norm(mine) === norm(w.w)));
  let pts = 0;
  if (ok) {
    S.streak++; S.best = Math.max(S.best, S.streak); S.wordOk++;
    if (it.f === 'mc') S.mcOk++; else S.typeOk++;
    pts = (it.f === 'mc' ? 100 : 150) + Math.min(10, S.streak) * 10;
    S.score += pts;
    if (!comboCallout(S.streak, `${S.streak}연속 정답!`)) sfx('ok');
  } else {
    S.streak = 0; S.wrongs.push(it.wi); sfx('no');
  }
  S.i++; save();
  const filled = it.k === 'sen' ? blankHTML(w.ex, ans) : esc(w.ex.replace('___', ans));
  const fb = app.querySelector('#fb');
  fb.innerHTML = `<div class="fb ${ok ? 'ok' : 'no'}"><div class="fb-h">${ok ? `⭕ 정답! <b>+${pts}</b>` : `${mine == null ? '⏰ 시간 끝!' : '❌'} 정답은 <b>${esc(ans)}</b>${it.f === 'type' && mine != null ? ` <small>(내 답: ${esc(mine)})</small>` : ''}`}</div>
    <div class="fb-w"><b>${esc(w.w)}</b> ${esc(w.ko)}</div><div class="fb-s">${it.k === 'def' ? filled : esc(w.def)}</div>
    ${ok ? '' : '<button class="primary" id="nx">다음 ▶</button>'}</div>`;
  if (ok) setTimeout(next, 1300); else { const b = fb.querySelector('#nx'); b.onclick = next; b.focus(); }
}

/* ---------------- 🎮 게임 ---------------- */
const GNAME = { drum: '문법 드럼', kart: '영작 카트', shoot: '대화문 사격장' };
const GROUNDS = { drum: 3, kart: 3, shoot: 2 };
function gameGate(k) {
  const g = GAMES[k];
  const info = {
    drum: `<p>떨어지는 <b>학습지 단어</b>를 박자에 맞춰 쿵! 짝! (영어 ↔ 한글 — 치면 뜻이 바뀌어요)<br>중간에 <b>문법 퀴즈 5번</b> — to부정사 · 비인칭 주어 it · 수여동사 · 시간의 접속사</p>
      <ul><li>⏱ 한 문제 <b>1분</b> (푸는 동안 연주는 잠깐 멈춤)</li><li>⭕ 정답이면 <b>🥁 드럼 솔로 + 관객 환호</b></li><li>문법 정답 1개마다 총점 <b>+500</b></li></ul>`,
    kart: `<p>6명 레이스! 퀴즈 존 <b>5곳</b>에서 <b>교과서 본문 핵심 문장</b>의 빈칸을 채우고<br><b>단어 레인 4번</b>에서는 알맞은 뜻(단어) 레인으로 달려요</p>
      <ul><li>✍️ 빈칸 2~3개 · 알맞은 말 묶음 고르기 (<b>1분</b>)</li><li>🛣 단어 레인 정답 → 부스터 + 게이지 50%</li><li>영작 · 레인 정답마다 총점 <b>+500 / +200</b></li></ul>`,
    shoot: `<p>위에 뜬 <b>한글 대화문</b>을 보고<br>올라오는 <b>영어 단어 과녁</b>을 순서대로 쏴서 문장을 완성해요</p>
      <ul><li>⏱ 문장당 <b>30초</b> · 5문장</li><li>✏️ 쏠 때마다 한글 아래에 영어 문장이 만들어져요</li><li>순서가 틀린 과녁은 -100 · -1초 · 문장 완성마다 총점 <b>+300</b></li></ul>`,
  }[g.kind];
  app.innerHTML = `${topHTML()}<div class="card gate ${g.kind}">
    <div class="g-ico">${GICON[g.kind]}</div>
    <div class="kick">GAME TIME · ${k + 1}/${GAMES.length}</div>
    <h2>${GNAME[g.kind]} ${g.round}/${GROUNDS[g.kind]}</h2>
    ${info}
    ${g.kind === 'shoot' ? '' : `<div class="prize small">${PRIZE.games}</div>`}
    <button class="primary big" id="gp">${{ drum: '🥁 연주 시작!', kart: '🏁 레이스 시작!', shoot: '🎯 사격 시작!' }[g.kind]}</button></div>`;
  app.querySelector('#gp').onclick = () => playGame(k);
}

/** 🥁 드럼 노트용 학습지 단어: 품사별 { en, ko } (숙어는 동사/부사 칸, 접속사 칸은 시간 접속사 등) */
function drumWords() {
  const B = { 명사: [], 동사: [], 형용사: [], 부사: [], 접속사: [] };
  const PHR = { 'in the future': '부사', 'in surprise': '부사' };
  W.forEach((w) => { const k = w.p === 'n' ? '명사' : w.p === 'v' ? '동사' : w.p === 'a' ? '형용사' : w.p === 'ad' ? '부사' : (PHR[w.w] || '동사'); B[k].push({ en: w.w, ko: koShort(w) }); });
  B.접속사 = [['when', '~할 때'], ['before', '~하기 전에'], ['after', '~한 후에'], ['because', '~때문에'], ['and', '그리고'], ['but', '하지만'], ['so', '그래서']].map(([en, ko]) => ({ en, ko }));
  return B;
}
/** 🛣️ 카트 단어 레인: 영어 → 한글 뜻 / 한글 뜻 → 영어 */
// 🛣️ 단어 레인 매력적인 오답: 철자 · 뜻이 비슷해서 헷갈리는 말 (ko = 영어→뜻 레인, en = 뜻→영어 레인)
const CONF = {
  photography: { ko: ['사진작가', '사진 찍다'], en: ['photographer', 'photograph'] },
  photographer: { ko: ['사진술', '사진 찍다'], en: ['photography', 'photograph'] },
  permission: { ko: ['허락하다', '임무'], en: ['permit', 'mission'] },
  wrangler: { ko: ['레슬링 선수', '말다툼하다'], en: ['wrestler', 'stranger'] },
  storytelling: { ko: ['이야기꾼', '이야기책'], en: ['storyteller', 'storybook'] },
  capture: { ko: ['녹화하다', '편집하다'], en: ['record', 'shoot'] },
  forgive: { ko: ['잊어버리다', '금지하다'], en: ['forget', 'forbid'] },
  personal: { ko: ['사람', '사회적인'], en: ['person', 'social'] },
  unique: { ko: ['통일된', '평범한'], en: ['united', 'union'] },
  shocking: { ko: ['충격받은', '놀란'], en: ['shocked', 'surprised'] },
  asleep: { ko: ['잠자다', '깨어 있는'], en: ['sleep', 'awake'] },
  'break into': { ko: ['고장 나다', '헤어지다'], en: ['break down', 'break up'] },
  'in surprise': { ko: ['놀라운', '갑자기'], en: ['surprising', 'by surprise'] },
  location: { ko: ['지역의', '위치시키다'], en: ['local', 'locate'] },
  signal: { ko: ['서명', '표지판'], en: ['signature', 'sign'] },
  editor: { ko: ['편집하다', '판(版)'], en: ['edit', 'edition'] },
  cottage: { ko: ['성', '대학'], en: ['castle', 'college'] },
  follower: { ko: ['따라가다', '지도자'], en: ['follow', 'leader'] },
  'be in charge of': { ko: ['~을 돌보다', '~에 관심이 있다'], en: ['take care of', 'be interested in'] },
  'take care of': { ko: ['~을 담당하다', '~을 조심하다'], en: ['be in charge of', 'be careful of'] },
};
function laneSet(r) {
  return (S.lanes[r] || []).map(({ wi, e2k }) => {
    const w = W[wi];
    const lab = (x) => (e2k ? koShort(x) : x.w);
    const C = CONF[w.w];
    const others = C ? (e2k ? C.ko : C.en) : shuffle(W.filter((x, k) => k !== wi && x.p === w.p)).slice(0, 2).map(lab);
    return { word: e2k ? w.w : koShort(w), target: lab(w), labels: shuffle([lab(w), ...others]), hint: e2k ? '뜻' : '영어 단어' };
  });
}

async function playGame(k) {
  const g = GAMES[k];
  unlockAudio(); syncMute(); bgmStop(); setPlayer(S.name);
  let r;
  if (g.kind === 'drum') {
    const quizzes = S.gram[g.round - 1].map(({ c, i }) => {
      const q = data.grammar[c][i];
      // 보기 순서 섞기 (①~④ · ⓐ · (a) · 개수처럼 순서 자체가 답인 문제는 그대로)
      const fixed = q.o.some((t) => /^[①-⑤ⓐ-ⓔ(]|개$/.test(t));
      const order = fixed ? q.o.map((_, j) => j) : shuffle(q.o.map((_, j) => j));
      const pos = order.indexOf(q.a);
      return { tag: c, sentHTML: q.s, ask: q.q, opts: order.map((j, n) => ({ v: String(n), label: `${CIRC[n]} ${q.o[j]}` })), ans: String(pos), ansLabel: `${CIRC[pos]} ${q.o[q.a]}`, explain: q.x };
    });
    r = await playDrumLesson({ song: g.song, round: g.round, rounds: 3, quizzes, quizSec: GAME_Q_SEC, words: drumWords(), prizeNote: '드럼 3곡 합계 1~5위 초코파이 · 오예스!' });
  } else if (g.kind === 'kart') {
    const quizzes = S.sents[g.round - 1].map((i) => {
      const q = data.sentences[i]; const order = shuffle(q.o.map((_, j) => j));
      return { src: q.src, ko: q.ko, html: q.html.replace(/<u>(①|②|③)<\/u>/g, '<u class="kb">$1 ______</u>'), blanks: q.blanks, opts: order.map((j) => q.o[j]), ans: order.indexOf(q.a), full: q.full, tip: q.tip };
    });
    r = await playKartLesson({ charId: S.char, name: S.name, round: g.round, rounds: 3, quizzes, lanes: laneSet(g.round - 1), quizSec: GAME_Q_SEC, prizeNote: '카트 3판 합계 1~5위 초코파이 · 오예스!' });
  } else {
    const sentences = S.dlgs[g.round - 1].map((i) => data.dialogs[i]);
    r = await playShootDialog({ sentences, round: g.round, rounds: 2, sec: 30 });
  }
  bgm(MUSIC);
  if (r.quit) {
    app.innerHTML = `${topHTML()}<div class="card gate"><h2>게임을 그만뒀어요</h2><p>다시 하면 점수를 받을 수 있어요!</p>
      <button class="primary big" id="re">🔁 다시 하기</button><button class="ghost big" id="sk">건너뛰기 (0점)</button></div>`;
    app.querySelector('#re').onclick = () => playGame(k);
    app.querySelector('#sk').onclick = () => { S.games[k] = { kind: g.kind, raw: 0, pts: 0, qOk: 0, qN: 5, laneOk: 0 }; save(); next(); };
    return;
  }
  const raw = Math.round(r.score || 0);
  const qOk = r.qOk || 0; const laneOk = r.laneOk || 0;
  const pts = g.kind === 'drum' ? Math.round(raw / 100) + qOk * 500 : g.kind === 'kart' ? raw + qOk * 500 + laneOk * 200 : Math.round(raw / 2) + qOk * 300;
  S.games[k] = { kind: g.kind, raw, pts, qOk, qN: r.qN || 5, laneOk, place: r.place };
  S.score += pts; save();
  const head = { drum: `문법 ${qOk}/${r.qN}`, kart: `영작 ${qOk}/${r.qN} · 레인 ${laneOk}/${r.laneN || 4}`, shoot: `대화문 ${qOk}/${r.qN}` }[g.kind];
  const sub = { drum: `드럼 점수 ${raw.toLocaleString()}`, kart: `${r.place || '-'}등 골인 · 카트 점수 ${raw.toLocaleString()}`, shoot: `사격 점수 ${raw.toLocaleString()}` }[g.kind];
  app.innerHTML = `${topHTML()}<div class="card gate done"><div class="g-ico">${GICON[g.kind]}</div>
    <h2>${head} 정답!</h2><p>${sub}</p>
    <div class="gain">총점 <b>+${pts.toLocaleString()}</b></div>
    <button class="primary big" id="gn">${S.i >= N_ITEMS && GAMES.every((_, j) => S.games[j]) ? '🏆 결과 보기 ▶' : '단어 문제 계속 ▶'}</button></div>`;
  callout(qOk >= (r.qN || 5) - 1 ? 'legend' : 'wow', `+${pts}`);
  app.querySelector('#gn').onclick = next;
}

/* ---------------- 🏆 결과 · 순위 · PASS ---------------- */
function stats() {
  const sum = (kind, f = 'raw') => S.games.filter((g) => g && g.kind === kind).reduce((a, g) => a + (g[f] || 0), 0);
  const gram = sum('drum', 'qOk'); const sent = sum('kart', 'qOk'); const lane = sum('kart', 'laneOk'); const dlg = sum('shoot', 'qOk');
  const ok = S.wordOk + gram + sent + lane + dlg;
  const acc = Math.round((ok / N_ALL) * 100);
  return { drum: sum('drum'), kart: sum('kart'), shoot: sum('shoot'), gram, sent, lane, dlg, ok, acc, pass: acc >= PASS_CUT };
}

/** 🙌 NOT PASS: 캐릭터들이 걸어 나와 "다음에 재도전!" 팻말 · 파이팅 */
function retryShow(acc) {
  const ov = document.createElement('div');
  ov.className = 'retry-show';
  const crew = ['ted', 'bboy', 'latina', 'braids', 'disco'];
  ov.innerHTML = `<div class="rs-sky"><i>☁️</i><i>☁️</i><i>🌈</i></div>
    <div class="rs-title"><b>NOT PASS</b><span>다음에 재도전!</span></div>
    <div class="rs-crew">${crew.map((id, k) => `<div class="rs-c" style="--k:${k}"><img src="${charURL(id)}" alt="">${k === 0 ? '<div class="rs-sign">💪 다음에 재도전!</div>' : `<em>${['파이팅!', '할 수 있어!', '한 번 더!', '거의 다 왔어!'][k - 1]}</em>`}</div>`).join('')}</div>
    <div class="rs-info">PASS 기준: 정답률 <b>${PASS_CUT}% 이상</b> · 나의 정답률 <b>${acc}%</b><br><small>틀린 단어를 복습하고 다시 도전해요!</small></div>
    <button class="primary big" id="rsOk">다시 도전할게요! 💪</button>`;
  document.body.appendChild(ov);
  sfx('end');
  ov.querySelector('#rsOk').onclick = () => ov.remove();
}

async function result() {
  const T = stats();
  const wrongWords = [...new Set(S.wrongs)].map((wi) => W[wi]);
  const perfect = S.wrongs.length === 0;
  const first = !S.finished;
  S.finished = true; save();
  bgm(MUSIC);
  app.innerHTML = `<div class="card res ${T.pass ? 'pass' : 'notpass'}">
    <div class="kick">FINISH! · ${esc(S.name)}</div>
    <h2>🏆 총점 <b>${S.score.toLocaleString()}</b>점 <span class="stamp ${T.pass ? 'ok' : 'no'}">${T.pass ? 'PASS' : 'NOT PASS'}</span></h2>
    <div class="acc">전체 정답률 <b>${T.acc}%</b> <small>(게임 포함 ${T.ok}/${N_ALL} · PASS 기준 ${PASS_CUT}% 이상)</small></div>
    ${T.pass ? '<div class="pass-msg">🎉 PASS! 기말 준비 완벽해요!</div>' : `<div class="retry-msg">💪 다음에 재도전! <small>PASS 기준 정답률 ${PASS_CUT}% 이상 — 틀린 단어를 복습하고 다시 도전해요</small></div>`}
    ${perfect ? `<div class="perfect">💯 단어 ${N_ITEMS}문제 전부 정답!<br><small>초코파이 + 오예스 + 오예스 쿠키앤크림 3종 세트 대상!</small></div>` : ''}
    <div class="bd">
      <div><i>📖</i><b>${S.wordOk}/${N_ITEMS}</b><small>단어</small></div>
      <div><i>🥁</i><b>${T.gram}/${N_GRAM}</b><small>문법 · 드럼 ${T.drum.toLocaleString()}</small></div>
      <div><i>🏎️</i><b>${T.sent}/${N_SENT}</b><small>본문 영작 · 레인 ${T.lane}/${N_LANE}</small></div>
      <div><i>💬</i><b>${T.dlg}/${N_DLG}</b><small>대화문 · ${T.shoot.toLocaleString()}</small></div>
    </div>
    <p class="muted">객관식 ${S.mcOk} · 직접 쓰기 ${S.typeOk} 정답 · 최고 ${S.best}연속 · 카트 합계 ${T.kart.toLocaleString()}</p>
    <div id="rk"><p class="rk-wait">🏆 순위 계산 중… (구글 시트에 기록하는 중)</p></div>
    <div class="prize"><h3>🎁 상품 안내</h3><ul><li>${PRIZE.total}</li><li>${PRIZE.games}</li><li>${PRIZE.perfect}</li></ul></div>
    ${wrongWords.length ? `<details class="wrongs"><summary>📒 틀린 단어 ${wrongWords.length}개 다시 보기</summary><ul>${wrongWords.map((w) => `<li><b>${esc(w.w)}</b> ${esc(w.ko)}<small>${esc(w.def)}</small></li>`).join('')}</ul></details>` : ''}
    <div class="btns"><button class="primary big" id="again">🔁 ${T.pass ? '다시 도전 (최고 점수로 순위)' : '재도전하기'}</button><button class="ghost big" id="home">처음 화면</button></div></div>`;
  app.querySelector('#again').onclick = () => { if (confirm('새로 시작할까요? (순위는 최고 점수로 남아요)')) { localStorage.removeItem(KEY); profile(); } };
  app.querySelector('#home').onclick = title;
  if (first) {
    if (DEMO) S.finished = true;
    if (T.pass) { callout('legend', `PASS! ${T.acc}%`); setTimeout(() => crewDance(`🎉 ${S.name} PASS! 응원단 출동!`), 900); } else setTimeout(() => retryShow(T.acc), 600);
    if (config.rankApi && !DEMO) {
      const row = { name: S.name, total: S.score, wordOk: S.wordOk, wordN: N_ITEMS, wordAcc: Math.round((S.wordOk / N_ITEMS) * 100), mcOk: S.mcOk, typeOk: S.typeOk, gramOk: T.gram, gramN: N_GRAM, sentOk: `${T.sent} · 레인 ${T.lane}/${N_LANE} · 대화문 ${T.dlg}/${N_DLG}`, sentN: N_SENT, drum: T.drum, kart: T.kart, best: S.best, wrongs: `${T.pass ? 'PASS' : 'NOT PASS'} ${T.acc}% · ${wrongWords.map((w) => w.w).join(', ')}`, minutes: Math.round((Date.now() - S.startedAt) / 60000) };
      callApi('reportLesson', [row]).then(() => flushPending()).catch(() => queueSend('reportLesson', [row]));
    }
  }
  // 순위: 처음 끝냈을 때만 기록 + 순위, 다시 볼 때는 순위만
  const send = first && !DEMO ? (id, v) => submitScore(id, v, S.name) : (id) => getRanking(id, S.name); // 체험 모드는 기록 없이 순위만 보기
  const R = await Promise.all([send('jg78-total', S.score), send('jg78-drum', T.drum), send('jg78-kart', T.kart), send('jg78-shoot', T.shoot)]).catch(() => null);
  const el = app.querySelector('#rk'); if (!el) return;
  if (!R) { el.innerHTML = '<p class="muted">순위를 불러오지 못했어요. 인터넷 연결 후 「지난 결과 · 순위 보기」로 다시 확인해요.</p>'; return; }
  el.innerHTML = `<div class="myrank">${['총점', '🥁 드럼', '🏎️ 카트', '💬 대화문'].map((t, k) => `<div><small>${t}</small><b>${R[k].myRank || '-'}위</b><em>${R[k].count}명 중</em></div>`).join('')}</div>`
    + rankTableHTML('jg78-total', R[0], S.name) + rankTableHTML('jg78-drum', R[1], S.name) + rankTableHTML('jg78-kart', R[2], S.name) + rankTableHTML('jg78-shoot', R[3], S.name);
}

// 테스트용 (자동 테스트에서 문제 · 게임 위치로 바로 가기)
window.__JG = { get S() { return S; }, set S(v) { S = v; }, next, save, W, GAMES, retryShow };
title();
