// 품사 원정대 — 3D 보드 게임 (3단계: 보드·캐릭터·주사위·이동)
import * as THREE from 'three';
import board from '../../data/board.json';
import chars from '../../data/characters.json';
import { buildWorld } from '../board/world.js';
import { createAvatar } from '../board/avatar.js';
import { createDice } from '../board/dice.js';
import { draw, config } from '../quiz/bank.js';
import { runCell } from '../quiz/cell.js';
import { TYPES } from '../quiz/constants.js';
import { esc } from '../quiz/notation.js';
import { sfx, setMuted, isMuted } from '../quiz/sound.js';

const BASE = import.meta.env.BASE_URL;
const portrait = (id) => `${BASE}assets/characters/${id}.svg`;
const SAVE_KEY = 'cq.game.v1';
const GRADES = ['중1', '중2', '중3', '고1', '고2', '기타'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------------- 저장 ---------------- */
function loadSave() {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY)); } catch { return null; }
}
let S = null;
function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch { /* 저장 불가 */ }
}
function newGame(name, grade, char) {
  S = { v: 1, name, grade, char, pos: 0, coins: 0, correct: 0, answered: 0, cellsPlayed: 0, used: [], notes: [], byType: {}, startedAt: Date.now(), finished: false };
  save();
}

/* ---------------- 3D ---------------- */
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
const world = buildWorld(scene, board);
const dice = createDice(scene);
let avatar = null;

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

const cam = { mode: 'title', zoom: 1, target: new THREE.Vector3(), look: new THREE.Vector3(), pos: new THREE.Vector3(0, 8, 12), flyT: 0 };
function updateCamera(dt) {
  if (cam.mode === 'title') {
    // 출발점부터 성까지 천천히 날아가는 미리보기
    cam.flyT = (cam.flyT + dt * 0.9) % (world.N - 1);
    const p = world.cellPosition(cam.flyT);
    cam.target.lerp(p, 1 - Math.exp(-dt * 2));
    const want = cam.target.clone().add(new THREE.Vector3(Math.sin(cam.flyT * 0.2) * 5, 9, 11));
    cam.pos.lerp(want, 1 - Math.exp(-dt * 1.5));
  } else {
    const t = avatar ? avatar.root.position : world.cellPosition(S?.pos || 0);
    cam.target.lerp(t, 1 - Math.exp(-dt * 4));
    const dir = world.direction(Math.round(S?.pos || 0));
    const yaw = Math.atan2(dir.x, -dir.z) * 0.6;
    const off = new THREE.Vector3(Math.sin(yaw) * -8, 7.6, Math.cos(yaw) * 8).multiplyScalar(cam.zoom);
    cam.pos.lerp(cam.target.clone().add(off), 1 - Math.exp(-dt * 2.5));
  }
  camera.position.copy(cam.pos);
  const ahead = cam.mode === 'title' ? new THREE.Vector3(0, 0, -3) : new THREE.Vector3(0, 0.6, -2.4);
  cam.look.lerp(cam.target.clone().add(ahead), 1 - Math.exp(-dt * 5));
  camera.lookAt(cam.look);
  world.sun.position.copy(cam.target).add(new THREE.Vector3(7, 14, 6));
  world.focus(cam.mode === 'title' ? { z: cam.target.z, isTitle: true } : cam.target);
  world.sun.target.position.copy(cam.target);
}

let last = performance.now();
let elapsed = 0;
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  elapsed += dt;
  world.update(dt, elapsed);
  avatar?.update(dt);
  updateCamera(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
window.__CQ = { get S() { return S; }, world, cam, get avatar() { return avatar; } }; // 테스트용

function placeAvatar(charId) {
  if (avatar) scene.remove(avatar.root);
  const c = chars.players.find((p) => p.id === charId) || chars.players[0];
  avatar = createAvatar(c);
  avatar.root.position.copy(world.cellPosition(S.pos));
  avatar.root.position.y = 0.3;
  scene.add(avatar.root);
}

/** 한 칸씩 콩콩 뛰어 이동 */
async function hopTo(i) {
  const from = avatar.root.position.clone();
  const to = world.cellPosition(i);
  to.y = 0.3;
  avatar.root.rotation.y = Math.atan2(to.x - from.x, to.z - from.z);
  avatar.setAnim('hop');
  const D = 360;
  const t0 = performance.now();
  await new Promise((res) => {
    const step = (now) => {
      const p = Math.min(1, (now - t0) / D);
      avatar.root.position.lerpVectors(from, to, p);
      avatar.root.position.y = 0.3 + Math.sin(p * Math.PI) * 0.9;
      if (p < 1) requestAnimationFrame(step); else res();
    };
    requestAnimationFrame(step);
  });
  sfx('hop');
  S.pos = i;
}

async function moveBy(n) {
  const target = Math.min(world.N - 1, S.pos + n);
  while (S.pos < target) { await hopTo(S.pos + 1); await sleep(40); }
  avatar.root.rotation.y = 0; // 카메라 쪽을 보게
  avatar.setAnim('idle');
  world.sparkle(S.pos);
  sfx('reveal');
  save();
}

/* ---------------- UI ---------------- */
const ui = document.getElementById('ui');
const player = () => chars.players.find((p) => p.id === S.char);
const regionOf = (i) => board.regions[board.cells[i].region];

function screen(html) {
  ui.innerHTML = html;
  return ui;
}

function title() {
  cam.mode = 'title';
  if (avatar) { scene.remove(avatar.root); avatar = null; }
  const sv = loadSave();
  const can = sv && !sv.finished;
  screen(`<div class="title-screen">
    <div class="logo-card">
      <div class="kicker">CHUNK QUEST</div>
      <h1>품사 <b>원정대</b></h1>
      <p>주사위를 굴려 「문장의 성」까지!</p>
    </div>
    <div class="title-btns">
      ${can ? `<button class="primary big" id="cont">이어하기 · ${esc(sv.name)} (${sv.pos}/${board.cells.length - 1}칸)</button>` : ''}
      <button class="${can ? 'ghost big' : 'primary big'}" id="new">${can ? '처음부터 새로 하기' : '시작하기 ▶'}</button>
      <div class="title-links"><a href="./quiz-lab.html">🧪 퀴즈 연습장</a><a href="./review.html">📋 문제 검수</a></div>
    </div></div>`);
  ui.querySelector('#new').onclick = () => {
    if (can && !confirm('저장된 진행 상황이 지워져요. 새로 시작할까요?')) return;
    profile();
  };
  if (can) ui.querySelector('#cont').onclick = () => { S = sv; startBoard(false); };
}

function profile(name = '', grade = '') {
  screen(`<div class="panel-screen"><div class="panel card">
    <h2>원정대원 등록</h2>
    <label class="fld">이름 또는 닉네임<input id="nm" maxlength="12" placeholder="예: 민트초코" value="${esc(name)}" autocomplete="off"></label>
    <div class="fld">학년<div class="grades">${GRADES.map((g) => `<button class="gr ${g === grade ? 'on' : ''}" data-g="${g}">${g}</button>`).join('')}</div></div>
    <p class="muted">기록은 선생님께만 보여요. 닉네임도 괜찮아요.</p>
    <div class="row"><button class="ghost" id="back">◀ 처음</button><button class="primary" id="next">다음 ▶</button></div>
    <div class="err" id="err"></div></div></div>`);
  let g = grade;
  ui.querySelectorAll('.gr').forEach((b) => { b.onclick = () => { g = b.dataset.g; ui.querySelectorAll('.gr').forEach((x) => x.classList.toggle('on', x === b)); }; });
  ui.querySelector('#back').onclick = title;
  ui.querySelector('#next').onclick = () => {
    const n = ui.querySelector('#nm').value.trim();
    if (!n) { ui.querySelector('#err').textContent = '이름을 써 주세요.'; return; }
    if (!g) { ui.querySelector('#err').textContent = '학년을 골라 주세요.'; return; }
    choose(n, g);
  };
}

function choose(name, grade) {
  let pick = chars.players[0].id;
  const draw = () => {
    const c = chars.players.find((p) => p.id === pick);
    screen(`<div class="panel-screen"><div class="panel card">
      <h2>함께 떠날 캐릭터</h2>
      <div class="chars">${chars.players.map((p) => `<button class="ch ${p.id === pick ? 'on' : ''}" data-id="${p.id}" style="--cc:${p.body}"><img src="${portrait(p.id)}" alt=""><b>${esc(p.name)}</b><small>${esc(p.title)}</small></button>`).join('')}</div>
      <div class="say"><img src="${portrait(c.id)}" alt=""><p><b>${esc(c.name)}</b> “${esc(c.lines.select)}”</p></div>
      <div class="row"><button class="ghost" id="back">◀ 이전</button><button class="primary" id="go">${esc(c.name)}(와)과 출발! ▶</button></div></div></div>`);
    ui.querySelectorAll('.ch').forEach((b) => { b.onclick = () => { pick = b.dataset.id; sfx('tap'); draw(); }; });
    ui.querySelector('#back').onclick = () => profile(name, grade);
    ui.querySelector('#go').onclick = () => { newGame(name, grade, pick); startBoard(true); };
  };
  draw();
}

/* ---- 보드 HUD ---- */
let busy = false;
function hud() {
  const reg = regionOf(S.pos);
  const p = player();
  screen(`<div class="hud">
    <div class="hud-top">
      <span class="reg" style="--rc:${reg.color}">${esc(reg.name)}</span>
      <span class="pos"><b>${S.pos}</b>/${board.cells.length - 1}칸</span>
      <span class="coin">🪙 <b>${S.coins}</b></span>
      <button class="menu" id="menu" aria-label="메뉴">☰</button>
    </div>
    <div class="progress"><i style="width:${(S.pos / (board.cells.length - 1)) * 100}%"></i>${board.regions.map((r, k) => `<em style="left:${(board.cells.findIndex((c) => c.region === k) / (board.cells.length - 1)) * 100}%"></em>`).join('')}</div>
    <div class="hud-bottom">
      <div class="talk" id="talk"><img id="talkImg" src="${portrait('guide')}" alt=""><p id="talkTxt"></p></div>
      <div class="me"><img src="${portrait(p.id)}" alt=""><span>${esc(S.name)}</span></div>
      <button class="dice-btn" id="roll"><span class="pip-ico">🎲</span>주사위 굴리기</button>
    </div>
    <div class="bignum" id="bignum"></div>
    <div class="toast" id="toast"></div>
  </div>`);
  ui.querySelector('#roll').onclick = turn;
  ui.querySelector('#menu').onclick = menu;
}

function talk(text, who = 'guide') {
  const img = ui.querySelector('#talkImg');
  const tx = ui.querySelector('#talkTxt');
  if (!img) return;
  img.src = portrait(who === 'guide' ? 'guide' : player().id);
  tx.innerHTML = `<b>${esc(who === 'guide' ? chars.guide.name : player().name)}</b> ${esc(text)}`;
  const t = ui.querySelector('#talk');
  t.classList.remove('pop'); void t.offsetWidth; t.classList.add('pop');
}

function setRollEnabled(on) {
  const b = ui.querySelector('#roll');
  if (b) b.disabled = !on;
}

function menu() {
  const ov = document.createElement('div');
  ov.className = 'menu-ov';
  ov.innerHTML = `<div class="card menu-box"><h3>메뉴</h3>
    <button class="ghost" id="snd">${isMuted() ? '🔇 소리 켜기' : '🔊 소리 끄기'}</button>
    <button class="ghost" id="note">📒 오답노트 (${S.notes.length})</button>
    <button class="ghost" id="home">🏠 처음 화면 (자동 저장됨)</button>
    <button class="primary" id="close">닫기</button></div>`;
  document.body.appendChild(ov);
  ov.querySelector('#snd').onclick = () => { setMuted(!isMuted()); ov.remove(); };
  ov.querySelector('#close').onclick = () => ov.remove();
  ov.querySelector('#home').onclick = () => { ov.remove(); title(); };
  ov.querySelector('#note').onclick = () => {
    ov.querySelector('.menu-box').innerHTML = `<h3>📒 오답노트</h3><div class="notes">${S.notes.length ? S.notes.slice().reverse().map((w) => `<div class="wn"><div class="muted">${esc(TYPES[w.type].name)}</div><div class="wq">${esc(w.question)}</div><div class="wm">내 답: ${esc(w.mine)}</div><div class="wa">정답: ${esc(w.answer)}</div></div>`).join('') : '<p class="muted">아직 없어요.</p>'}</div><button class="primary" id="close2">닫기</button>`;
    ov.querySelector('#close2').onclick = () => ov.remove();
  };
}

function bigNumber(n) {
  const el = ui.querySelector('#bignum');
  el.textContent = n;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
}
function toast(text) {
  const el = ui.querySelector('#toast');
  el.textContent = text;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
}

async function startBoard(fresh) {
  cam.mode = 'board';
  placeAvatar(S.char);
  hud();
  if (S.finished) return goal();
  if (fresh) {
    talk(chars.guide.lines.start);
    await sleep(2600);
    talk(chars.guide.lines.village);
  } else talk(`다시 왔구나, ${S.name}! ${chars.guide.lines.roll}`);
  setRollEnabled(true);
}

/** 한 턴: 주사위 → 이동 → 칸 실행 */
async function turn() {
  if (busy) return;
  busy = true;
  setRollEnabled(false);
  talk(player().lines.roll, 'me');
  sfx('whoosh');
  const value = 1 + Math.floor(Math.random() * 6);
  const base = avatar.root.position.clone();
  base.y = 0;
  const camDir = camera.position.clone().sub(base).setY(0).normalize();
  const side = new THREE.Vector3(-camDir.z, 0, camDir.x);
  const from = base.clone().add(camDir.clone().multiplyScalar(4)).add(side.clone().multiplyScalar(-1.5)).setY(3.2);
  const to = base.clone().add(camDir.clone().multiplyScalar(1.2)).add(side.clone().multiplyScalar(1.3)).setY(0);
  cam.zoom = 1.12;
  await dice.roll(value, from, to, () => sfx('bounce'));
  bigNumber(value);
  sfx('reveal');
  await sleep(700);
  await dice.hide();
  cam.zoom = 1;
  const prevRegion = board.cells[S.pos].region;
  await moveBy(value);
  hud();
  cam.zoom = 0.8;
  const cell = board.cells[S.pos];
  if (cell.region !== prevRegion) {
    talk(chars.guide.lines[board.regions[cell.region].id]);
    await sleep(1800);
  }
  await resolveCell(cell);
  cam.zoom = 1;
  busy = false;
  if (!S.finished) { hud(); talk(chars.guide.lines.roll); setRollEnabled(true); }
}

async function resolveCell(cell) {
  if (cell.kind === 'goal') return goal();
  if (cell.kind === 'quiz') {
    const T = TYPES[cell.type];
    talk(`「${T.short}」에 도착! ${T.name} 문제 5개를 풀어 보자.`);
    await sleep(1200);
    const r = await quizSheet(cell.type);
    S.coins += r.reward.coins;
    S.correct += r.correct;
    S.answered += r.total;
    S.cellsPlayed++;
    const bt = (S.byType[cell.type] ||= { c: 0, n: 0 });
    bt.c += r.correct;
    bt.n += r.total;
    S.notes.push(...r.wrongs.map((w) => ({ ...w, at: Date.now() })));
    save();
    hud();
    if (r.reward.move > 0) {
      avatar.setAnim('joy');
      talk(r.reward.perfect ? chars.guide.lines.perfect : chars.guide.lines.good);
      sfx(r.reward.perfect ? 'perfect' : 'ok');
      await sleep(1400);
      toast(`보너스 ${r.reward.move}칸 전진!`);
      await moveBy(r.reward.move);
      hud();
      if (board.cells[S.pos].kind === 'goal') return goal();
      talk(player().lines.joy, 'me');
      await sleep(1400);
    } else {
      avatar.setAnim('sad');
      talk(chars.guide.lines.retry);
      await sleep(1800);
      avatar.setAnim('idle');
    }
    return;
  }
  // 특수 칸: 효과는 4단계에서 완성
  const label = board.kinds[cell.kind]?.label || '';
  toast(`${label}!`);
  talk(`${label} — ${chars.guide.lines.special}`);
  await sleep(1800);
}

function quizSheet(type) {
  const ov = document.createElement('div');
  ov.className = 'sheet';
  ov.innerHTML = '<div class="sheet-inner wrap" id="cellRoot"></div>';
  document.body.appendChild(ov);
  requestAnimationFrame(() => ov.classList.add('open'));
  const used = new Set(S.used);
  const qs = draw(type, config.questionsPerCell, used);
  S.used = [...used];
  save();
  return runCell(ov.querySelector('#cellRoot'), { type, questions: qs, config }).then((r) => {
    ov.classList.remove('open');
    setTimeout(() => ov.remove(), 300);
    return r;
  });
}

/** 목적지 도착 — 시상식은 4단계에서 */
async function goal() {
  S.finished = true;
  save();
  avatar.setAnim('win');
  avatar.root.rotation.y = 0;
  cam.zoom = 0.7;
  const acc = S.answered ? Math.round((S.correct / S.answered) * 100) : 0;
  screen(`<div class="panel-screen goal"><div class="panel card">
    <div class="kicker">GOAL!</div><h2>문장의 성 도착!</h2>
    <p>${esc(player().lines.win)}</p>
    <div class="goal-stats"><div><b>${S.correct}</b><small>정답</small></div><div><b>${acc}%</b><small>정답률</small></div><div><b>🪙 ${S.coins}</b><small>코인</small></div></div>
    <p class="muted">시상식(금·은·동 시상대)은 다음 단계에서 완성돼요.</p>
    <button class="primary big" id="home">처음으로</button></div></div>`);
  sfx('perfect');
  ui.querySelector('#home').onclick = title;
}

title();
