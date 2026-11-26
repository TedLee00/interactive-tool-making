// 📚 정관중 1학년 2학기 기말 · Lesson 7·8 학습 앱
//  - 단어 53개 × (영영풀이 + 문장 넣기) = 106문제 · 객관식 60% / 직접 쓰기 40%
//  - 중간중간 🥁 문법 드럼 3곡(곡마다 문법 4문제: to부정사 · 비인칭 it · 수여동사 · 시간 접속사)
//    🏎️ 영작 카트 3판(판마다 본문 핵심 문장 4개 · 빈칸 2~3개 객관식) — 모두 12문장
//  - 끝나면 총점 · 드럼 합계 · 카트 합계를 구글 시트 순위표에 올리고 내 순위를 보여 준다
import data from '../../data/jg1-l78.json';
import chars from '../../data/characters.json';
import { playDrumLesson } from '../games/drum.js';
import { playKartLesson } from '../games/kart.js';
import { shuffle } from '../games/engine.js';
import { sfx, setMuted, isMuted } from '../quiz/sound.js';
import { syncMute, unlockAudio, callout, comboCallout, bgm, bgmStop } from '../fx/fx.js';
import { fillFaces, charURL } from '../board/charart.js';
import { setPlayer, submitScore, getRanking, rankTableHTML, callApi, queueSend, flushPending } from '../rank/rank.js';
import config from '../../data/config.json';

const KEY = 'jg78.save.v1';
const W = data.words;
const N_ITEMS = W.length * 2;
const CIRC = '①②③④⑤';
const POS = { n: 'n. 명사', v: 'v. 동사', a: 'a. 형용사', ad: 'ad. 부사', phr: '숙어' };
const PRIZE = {
  total: '🏆 <b>총점 1~3위</b> 특별 상품!',
  games: '🥁 <b>드럼 3곡 합계</b> · 🏎️ <b>카트 3판 합계</b> 각각 <b>1~5위</b> 초코파이 · 오예스!',
  perfect: '💯 <b>단어 문제를 하나도 안 틀리면</b> 초코파이 + 오예스 + 오예스 쿠키앤크림 <b>3종 세트!</b>',
};
// 🎮 게임이 나오는 때: 단어 문제를 이만큼 풀면 (106문제 사이 고르게 6번)
const GAMES = [
  { at: 15, kind: 'drum', round: 1, song: 1 },
  { at: 30, kind: 'kart', round: 1 },
  { at: 46, kind: 'drum', round: 2, song: 2 },
  { at: 61, kind: 'kart', round: 2 },
  { at: 76, kind: 'drum', round: 3, song: 'rock' },
  { at: 92, kind: 'kart', round: 3 },
];
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
  // 🥁 드럼 3곡 × 문법 4문제 (곡마다 네 가지 문법을 한 문제씩 · 겹치지 않게)
  const gpool = {}; GRAM_CATS.forEach((c) => { gpool[c] = shuffle(data.grammar[c].map((_, i) => i)); });
  const gram = [0, 1, 2].map(() => shuffle(GRAM_CATS.slice()).map((c) => ({ c, i: gpool[c].pop() })));
  // 🏎️ 카트 3판 × 본문 핵심 문장 4개 = 12문장
  const sent = shuffle(data.sentences.map((_, i) => i));
  const sents = [0, 1, 2].map((r) => sent.slice(r * 4, r * 4 + 4));
  S = { v: 1, name, char, items, i: 0, score: 0, wordOk: 0, mcOk: 0, typeOk: 0, streak: 0, best: 0, wrongs: [], gram, sents, games: [], startedAt: Date.now(), finished: false };
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
  bgm('title');
  const sv = load();
  const can = sv && !sv.finished && sv.items?.length === N_ITEMS;
  app.innerHTML = `<div class="jg-hero card">
      <div class="hero-faces"><img class="face" data-face="ted" alt=""><span class="bubble">기말 대비, 게임처럼 끝내자! 🔥</span></div>
      <div class="kick">정관중학교 1학년 · 2학기 기말</div>
      <h1>Lesson <b>7·8</b><br>단어 · 문법 · 영작</h1>
      <p class="sub">Find Your Dream · Be Smart Online</p>
      <div class="hero-plan">
        <div><i>📖</i><b>단어 ${N_ITEMS}문제</b><small>영영풀이 + 문장 넣기</small></div>
        <div><i>🥁</i><b>문법 드럼 3곡</b><small>곡마다 문법 4문제</small></div>
        <div><i>🏎️</i><b>영작 카트 3판</b><small>본문 핵심 12문장</small></div>
      </div>
    </div>
    <div class="prize card"><h3>🎁 상품 안내</h3><ul><li>${PRIZE.total}</li><li>${PRIZE.games}</li><li>${PRIZE.perfect}</li></ul></div>
    <div class="btns">
      ${can ? `<button class="primary big" id="cont">▶ 이어하기 · ${esc(sv.name)} (${sv.i}/${N_ITEMS})</button>` : ''}
      <button class="${can ? 'ghost big' : 'primary big'}" id="new">${can ? '처음부터 새로 하기' : '시작하기 ▶'}</button>
      ${sv && sv.finished ? '<button class="ghost big" id="last">🏆 지난 결과 · 순위 보기</button>' : ''}
    </div>`;
  fillFaces(app);
  app.querySelector('#new').onclick = () => { unlockAudio(); if (can && !confirm('지금까지 푼 기록이 지워져요. 새로 시작할까요?')) return; profile(); };
  if (can) app.querySelector('#cont').onclick = () => { unlockAudio(); S = sv; setPlayer(S.name); next(); };
  if (sv && sv.finished) app.querySelector('#last').onclick = () => { S = sv; setPlayer(S.name); result(); };
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
      <li><b>📖 단어 ${N_ITEMS}문제</b> — 7·8과 단어 ${W.length}개를 <em>영영풀이</em>로 한 번, <em>문장 속 빈칸</em>으로 한 번!<small>객관식 60% · 직접 쓰기 40% (직접 쓰기는 첫 글자 · 글자 수 힌트)</small></li>
      <li><b>🥁 문법 드럼 3곡</b> — 연주 중간에 문법 퀴즈 4번 (to부정사 · 비인칭 주어 it · 수여동사 · 시간의 접속사)<small>한 문제 1분 · 푸는 동안 연주는 잠깐 멈춤 · 정답이면 드럼 솔로 + 관객 환호!</small></li>
      <li><b>🏎️ 영작 카트 3판</b> — 퀴즈 존 4곳에서 교과서 본문 핵심 문장 빈칸(2~3개) 채우기<small>3판 × 4문장 = 본문 핵심 12문장 완성!</small></li>
      <li><b>🏆 마지막</b> — 총점 · 드럼 합계 · 카트 합계 순위가 나와요</li>
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
  const marks = GAMES.map((g, k) => `<i class="gm ${S.games[k] ? 'done' : ''}" style="left:${(g.at / N_ITEMS) * 100}%">${g.kind === 'drum' ? '🥁' : '🏎️'}</i>`).join('');
  return `<div class="jg-top card">
    <div class="who"><img src="${charURL(S.char)}" alt=""><b>${esc(S.name)}</b><span class="sc">⭐ ${S.score.toLocaleString()}</span>${S.streak >= 2 ? `<span class="st">🔥 ${S.streak}연속</span>` : ''}</div>
    <div class="track"><div class="fill" style="width:${pct}%"></div>${marks}<img class="runner" src="${charURL(S.char)}" alt="" style="left:${pct}%"></div>
    <div class="cnt">${S.i}/${N_ITEMS} · 🏁</div></div>`;
}

const norm = (s) => String(s || '').toLowerCase().replace(/[’`]/g, "'").replace(/[.!?,]+$/g, '').replace(/\s+/g, ' ').trim();
const hintOf = (ans) => ans.split(' ').map((w) => w[0] + ' _'.repeat(w.length - 1)).join('   ');
const blankHTML = (ex, fill) => esc(ex).replace('___', fill ? `<b class="fill">${esc(fill)}</b>` : '<span class="blank">　　　　</span>');

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
  app.innerHTML = `${topHTML()}<div class="card qcard">${head}${prompt}${body}<div id="fb"></div></div>`;
  window.scrollTo(0, 0);
  const done = (mine) => grade(it, w, ans, mine);
  if (opts) app.querySelectorAll('.opt').forEach((b) => { b.onclick = () => { app.querySelectorAll('.opt').forEach((x) => { x.disabled = true; if (opts[+x.dataset.k] === ans) x.classList.add('right'); }); if (opts[+b.dataset.k] !== ans) b.classList.add('wrong'); done(opts[+b.dataset.k]); }; });
  else {
    const inp = app.querySelector('#ta'); setTimeout(() => inp.focus(), 50);
    const go = () => { if (!inp.value.trim()) return; inp.disabled = true; app.querySelector('#tok').disabled = true; done(inp.value); };
    app.querySelector('#tok').onclick = go;
    inp.onkeydown = (e) => { if (e.key === 'Enter') go(); };
  }
}

function grade(it, w, ans, mine) {
  const ok = norm(mine) === norm(ans) || (it.f === 'type' && norm(mine) === norm(w.w));
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
  fb.innerHTML = `<div class="fb ${ok ? 'ok' : 'no'}"><div class="fb-h">${ok ? `⭕ 정답! <b>+${pts}</b>` : `❌ 정답은 <b>${esc(ans)}</b>${it.f === 'type' ? ` <small>(내 답: ${esc(mine)})</small>` : ''}`}</div>
    <div class="fb-w"><b>${esc(w.w)}</b> ${esc(w.ko)}</div><div class="fb-s">${it.k === 'def' ? filled : esc(w.def)}</div>
    ${ok ? '' : '<button class="primary" id="nx">다음 ▶</button>'}</div>`;
  if (ok) setTimeout(next, 1300); else { const b = fb.querySelector('#nx'); b.onclick = next; b.focus(); }
}

/* ---------------- 🎮 게임 ---------------- */
function gameGate(k) {
  const g = GAMES[k];
  const isDrum = g.kind === 'drum';
  app.innerHTML = `${topHTML()}<div class="card gate ${g.kind}">
    <div class="g-ico">${isDrum ? '🥁' : '🏎️'}</div>
    <div class="kick">GAME TIME · ${k + 1}/6</div>
    <h2>${isDrum ? `문법 드럼 ${g.round}/3` : `영작 카트 ${g.round}/3`}</h2>
    ${isDrum ? `<p>떨어지는 단어를 박자에 맞춰 쿵! 짝!<br>중간에 <b>문법 퀴즈 4번</b> — to부정사 · 비인칭 주어 it · 수여동사 · 시간의 접속사</p>
      <ul><li>⏱ 한 문제 <b>1분</b> (푸는 동안 연주는 잠깐 멈춤)</li><li>⭕ 정답이면 <b>🥁 드럼 솔로 + 관객 환호</b></li><li>문법 정답 1개마다 총점 <b>+500</b></li></ul>`
    : `<p>6명 레이스! 퀴즈 존 4곳에서 멈추면<br><b>교과서 본문 핵심 문장</b>의 빈칸을 채워요</p>
      <ul><li>✍️ 빈칸 2~3개 · 알맞은 말 묶음 고르기 (30초)</li><li>⭕ 정답이면 ⚡ 게이지 +60%</li><li>영작 정답 1개마다 총점 <b>+500</b></li></ul>`}
    <div class="prize small">${PRIZE.games}</div>
    <button class="primary big" id="gp">${isDrum ? '🥁 연주 시작!' : '🏁 레이스 시작!'}</button></div>`;
  app.querySelector('#gp').onclick = () => playGame(k);
}

async function playGame(k) {
  const g = GAMES[k];
  unlockAudio(); syncMute(); bgmStop(); setPlayer(S.name);
  let r;
  if (g.kind === 'drum') {
    const quizzes = S.gram[g.round - 1].map(({ c, i }) => {
      const q = data.grammar[c][i];
      return { tag: c, sentHTML: q.s, ask: q.q, opts: q.o.map((t, j) => ({ v: String(j), label: `${CIRC[j]} ${t}` })), ans: String(q.a), ansLabel: `${CIRC[q.a]} ${q.o[q.a]}`, explain: q.x };
    });
    r = await playDrumLesson({ song: g.song, round: g.round, rounds: 3, quizzes, prizeNote: '드럼 3곡 합계 1~5위 초코파이 · 오예스!' });
  } else {
    const quizzes = S.sents[g.round - 1].map((i) => {
      const q = data.sentences[i]; const order = shuffle(q.o.map((_, j) => j));
      return { src: q.src, ko: q.ko, html: q.html.replace(/<u>(①|②|③)<\/u>/g, '<u class="kb">$1 ______</u>'), blanks: q.blanks, opts: order.map((j) => q.o[j]), ans: order.indexOf(q.a), full: q.full, tip: q.tip };
    });
    r = await playKartLesson({ charId: S.char, name: S.name, round: g.round, rounds: 3, quizzes, prizeNote: '카트 3판 합계 1~5위 초코파이 · 오예스!' });
  }
  bgm('title');
  if (r.quit) {
    app.innerHTML = `${topHTML()}<div class="card gate"><h2>게임을 그만뒀어요</h2><p>다시 하면 점수를 받을 수 있어요!</p>
      <button class="primary big" id="re">🔁 다시 하기</button><button class="ghost big" id="sk">건너뛰기 (0점)</button></div>`;
    app.querySelector('#re').onclick = () => playGame(k);
    app.querySelector('#sk').onclick = () => { S.games[k] = { kind: g.kind, raw: 0, pts: 0, qOk: 0, qN: 4 }; save(); next(); };
    return;
  }
  const raw = Math.round(r.score || 0);
  const pts = g.kind === 'drum' ? Math.round(raw / 100) + (r.qOk || 0) * 500 : raw + (r.qOk || 0) * 500;
  S.games[k] = { kind: g.kind, raw, pts, qOk: r.qOk || 0, qN: r.qN || 4, place: r.place };
  S.score += pts; save();
  app.innerHTML = `${topHTML()}<div class="card gate done"><div class="g-ico">${g.kind === 'drum' ? '🥁' : '🏎️'}</div>
    <h2>${g.kind === 'drum' ? `문법 ${r.qOk}/${r.qN}` : `영작 ${r.qOk}/${r.qN}`} 정답!</h2>
    <p>${g.kind === 'drum' ? `드럼 점수 ${raw.toLocaleString()}` : `${r.place || '-'}등 골인 · 카트 점수 ${raw.toLocaleString()}`}</p>
    <div class="gain">총점 <b>+${pts.toLocaleString()}</b></div>
    <button class="primary big" id="gn">단어 문제 계속 ▶</button></div>`;
  callout((r.qOk || 0) >= 4 ? 'legend' : 'wow', `+${pts}`);
  app.querySelector('#gn').onclick = next;
}

/* ---------------- 🏆 결과 · 순위 ---------------- */
async function result() {
  const sum = (kind) => S.games.filter((g) => g && g.kind === kind).reduce((a, g) => a + g.raw, 0);
  const gOk = (kind) => S.games.filter((g) => g && g.kind === kind).reduce((a, g) => a + g.qOk, 0);
  const drum = sum('drum'); const kart = sum('kart');
  const wrongWords = [...new Set(S.wrongs)].map((wi) => W[wi]);
  const perfect = S.wrongs.length === 0;
  const first = !S.finished;
  S.finished = true; save();
  bgm('title');
  app.innerHTML = `<div class="card res">
    <div class="kick">FINISH! · ${esc(S.name)}</div>
    <h2>🏆 총점 <b>${S.score.toLocaleString()}</b>점</h2>
    ${perfect ? `<div class="perfect">💯 단어 ${N_ITEMS}문제 전부 정답!<br><small>초코파이 + 오예스 + 오예스 쿠키앤크림 3종 세트 대상!</small></div>` : ''}
    <div class="bd">
      <div><i>📖</i><b>${S.wordOk}/${N_ITEMS}</b><small>단어 (${Math.round((S.wordOk / N_ITEMS) * 100)}%)</small></div>
      <div><i>🥁</i><b>${gOk('drum')}/12</b><small>문법 · 드럼 ${drum.toLocaleString()}</small></div>
      <div><i>🏎️</i><b>${gOk('kart')}/12</b><small>영작 · 카트 ${kart.toLocaleString()}</small></div>
    </div>
    <p class="muted">객관식 ${S.mcOk} · 직접 쓰기 ${S.typeOk} 정답 · 최고 ${S.best}연속</p>
    <div id="rk"><p class="rk-wait">🏆 순위 계산 중… (구글 시트에 기록하는 중)</p></div>
    <div class="prize"><h3>🎁 상품 안내</h3><ul><li>${PRIZE.total}</li><li>${PRIZE.games}</li><li>${PRIZE.perfect}</li></ul></div>
    ${wrongWords.length ? `<details class="wrongs"><summary>📒 틀린 단어 ${wrongWords.length}개 다시 보기</summary><ul>${wrongWords.map((w) => `<li><b>${esc(w.w)}</b> ${esc(w.ko)}<small>${esc(w.def)}</small></li>`).join('')}</ul></details>` : ''}
    <div class="btns"><button class="primary big" id="again">🔁 다시 도전 (최고 점수로 순위)</button><button class="ghost big" id="home">처음 화면</button></div></div>`;
  app.querySelector('#again').onclick = () => { if (confirm('새로 시작할까요? (순위는 최고 점수로 남아요)')) { localStorage.removeItem(KEY); profile(); } };
  app.querySelector('#home').onclick = title;
  if (first) {
    callout('legend', `총점 ${S.score.toLocaleString()}`);
    if (config.rankApi) {
      const row = { name: S.name, total: S.score, wordOk: S.wordOk, wordN: N_ITEMS, wordAcc: Math.round((S.wordOk / N_ITEMS) * 100), mcOk: S.mcOk, typeOk: S.typeOk, gramOk: gOk('drum'), gramN: 12, sentOk: gOk('kart'), sentN: 12, drum, kart, best: S.best, wrongs: wrongWords.map((w) => w.w).join(', '), minutes: Math.round((Date.now() - S.startedAt) / 60000) };
      callApi('reportLesson', [row]).then(() => flushPending()).catch(() => queueSend('reportLesson', [row]));
    }
  }
  // 순위: 처음 끝냈을 때만 기록 + 순위, 다시 볼 때는 순위만
  const send = first ? (id, v) => submitScore(id, v, S.name) : (id) => getRanking(id, S.name);
  const R = await Promise.all([send('jg78-total', S.score), send('jg78-drum', drum), send('jg78-kart', kart)]).catch(() => null);
  const el = app.querySelector('#rk'); if (!el) return;
  if (!R) { el.innerHTML = '<p class="muted">순위를 불러오지 못했어요. 인터넷 연결 후 「지난 결과 · 순위 보기」로 다시 확인해요.</p>'; return; }
  el.innerHTML = `<div class="myrank">${['총점', '🥁 드럼 합계', '🏎️ 카트 합계'].map((t, k) => `<div><small>${t}</small><b>${R[k].myRank || '-'}위</b><em>${R[k].count}명 중</em></div>`).join('')}</div>`
    + rankTableHTML('jg78-total', R[0], S.name) + rankTableHTML('jg78-drum', R[1], S.name) + rankTableHTML('jg78-kart', R[2], S.name);
}

// 테스트용 (자동 테스트에서 문제 · 게임 위치로 바로 가기)
window.__JG = { get S() { return S; }, set S(v) { S = v; }, next, save, W, GAMES };
title();
