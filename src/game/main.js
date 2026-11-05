// 품사 원정대 — 3D 보드 게임 (3단계: 보드·캐릭터·주사위·이동)
import * as THREE from 'three';
import board from '../../data/board.json';
import chars from '../../data/characters.json';
import { buildWorld } from '../board/world.js';
import { createAvatar } from '../board/avatar.js';
import { createDice } from '../board/dice.js';
import { makeAnimal, animateAnimal, ANIMALS, ANIMAL_KINDS } from '../board/animals.js';
import { draw, config, setLevel } from '../quiz/bank.js';
import { runCell, timeLimitFor } from '../quiz/cell.js';
import { TYPES } from '../quiz/constants.js';
import { esc } from '../quiz/notation.js';
import { sfx, setMuted, isMuted } from '../quiz/sound.js';
import { loadChar, fillFaces, charURL } from '../board/charart.js';
import { bgm, callout, maWarning, teacherDance, crewDance, finaleDance, dancerShow, snackCard, snackCode, SNACKS, syncMute, unlockAudio } from '../fx/fx.js';
import { playRun, playCrane, playKart, playShoot, playDrum, GAMES } from '../games/index.js';
import { runStudy, askStudy } from '../study/study.js';
import { setPlayer, submitScore, getRanking, rankTableHTML } from '../rank/rank.js';

const BASE = import.meta.env.BASE_URL;
const faceImg = (id, cls = '') => `<img class="face ${cls}" data-face="${id}" alt="">`;
const SAVE_KEY = 'cq.game.v1';
const LEVELS = [
  { id: 'low', name: '난이도 하', icon: '🌱', desc: '쉬운 문제부터 차근차근' },
  { id: 'mid', name: '난이도 중', icon: '🙂', desc: '쉬운·보통·어려운 문제 골고루' },
  { id: 'high', name: '난이도 상', icon: '🔥', desc: '어려운 문제만! 청크·문장 성분 집중' },
];
const levelName = (id) => (LEVELS.find((l) => l.id === id) || LEVELS[0]).name;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------------- 저장 ---------------- */
function loadSave() {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY)); } catch { return null; }
}
let S = null;
function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch { /* 저장 불가 */ }
}
function newGame(name, level, char) {
  S = { v: 1, name, level, grade: levelName(level), char, pos: 0, coins: 0, correct: 0, answered: 0, cellsPlayed: 0, used: [], notes: [], byType: {}, snacks: [], games: {}, gates: {}, regTypes: {}, streak: 0, wrongStreak: 0, perfects: 0, startedAt: Date.now(), finished: false };
  save();
}

/* ---------------- 3D ---------------- */
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
let world = null;
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
    let t = avatar ? avatar.root.position : world.cellPosition(S?.pos || 0);
    // 주사위가 날아가는 동안엔 내 말과 주사위 사이를 비춘다
    if (dice.state === 'rolling') t = t.clone().lerp(dice.mesh.position.clone().setY(0), 0.6);
    cam.target.lerp(t, 1 - Math.exp(-dt * 4));
    const dir = world.direction(Math.round(S?.pos || 0));
    const yaw = Math.atan2(dir.x, -dir.z) * 0.6;
    const off = new THREE.Vector3(Math.sin(yaw) * -8, 7.6, Math.cos(yaw) * 8).multiplyScalar(cam.zoom * 1.2); // 1.2 = 조금 뒤로 물러나 마을이 더 보이게
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
  world.update(dt, elapsed, camera);
  avatar?.update(dt, camera);
  updatePets(dt, elapsed);
  dice.update(dt);
  updateCamera(dt);
  if (cam.mode === 'board') placeDiceHint();
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
window.__CQ = { pets: () => pets, award: (t) => awardPet(t), milestone: () => checkPetMilestone(), get S() { return S; }, get world() { return world; }, cam, get avatar() { return avatar; }, fx: { maWarning, teacherDance, callout }, cell: (i) => resolveCell(board.cells[i]), dice, turn: (sw) => turn(sw), move: (n) => moveBy(n) }; // 테스트용

/* ---------------- 🐾 펫: 미니게임 성공 · 코인 돌파 때 동물 친구가 생겨, 내가 가는 칸 옆을 줄지어 따라 걷는다 ---------------- */
let pets = [];
const petFx = [];
const PET_MAX = 8;
const PET_AT = [40, 90, 150, 220, 300, 400]; // 코인 돌파 기준 (이때마다 새 친구!)
function clearPets() { pets.forEach((p) => scene.remove(p.mesh)); pets = []; }
/** 길 위의 소수 칸 위치 (칸과 칸 사이도 부드럽게) */
function pathPoint(f) {
  const i = Math.max(0, Math.min(world.N - 2, Math.floor(f)));
  const u = Math.max(0, Math.min(1, f - i));
  return world.cellPosition(i).lerp(world.cellPosition(i + 1), u);
}
function petSlot(k) {
  const avIdx = avatar ? Math.max(0, -avatar.root.position.z / 2.6) : S.pos;
  const side = k % 2 ? 1 : -1; const row = Math.floor(k / 2);
  const f = Math.max(0, avIdx - 0.12 - row * 0.42);
  const p = pathPoint(f);
  const fwd = pathPoint(f + 0.3).sub(pathPoint(Math.max(0, f - 0.3))).setY(0).normalize();
  const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
  return { pos: p.addScaledVector(right, side * (1.45 + (row % 2) * 0.12)).setY(0), fwd };
}
function buildPets() {
  clearPets();
  (S?.pets || []).forEach((kind, k) => {
    const mesh = makeAnimal(kind, 0.85);
    if (avatar) mesh.position.copy(petSlot(k).pos);
    scene.add(mesh);
    pets.push({ mesh, kind, join: 0 });
  });
}
/** 새 친구 등장 이펙트: 하늘에서 빙글빙글 떨어지며 별가루 · 빛 고리 */
function petJoinFx(p) {
  p.join = 1.3;
  const at = petSlot(pets.indexOf(p)).pos;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.06, 8, 32), new THREE.MeshBasicMaterial({ color: 0xffd43b, transparent: true }));
  ring.rotation.x = -Math.PI / 2; ring.position.copy(at).setY(0.05);
  scene.add(ring); petFx.push({ o: ring, life: 1.4, kind: 'ring' });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 6, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff3b0, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false }));
  beam.position.copy(at).setY(3); scene.add(beam); petFx.push({ o: beam, life: 1.4, kind: 'beam' });
  const cols = [0xffd43b, 0xff8fb1, 0x8fd8ff, 0x8fe08a, 0xffffff];
  for (let k = 0; k < 16; k++) {
    const st = new THREE.Mesh(new THREE.OctahedronGeometry(0.08), new THREE.MeshBasicMaterial({ color: cols[k % cols.length], transparent: true }));
    const a = (k / 16) * Math.PI * 2;
    st.position.copy(at).setY(0.5);
    st.userData.v = new THREE.Vector3(Math.cos(a) * 2.2, 3 + Math.random() * 2, Math.sin(a) * 2.2);
    scene.add(st); petFx.push({ o: st, life: 1.2, kind: 'star' });
  }
}
function updatePets(dt, t) {
  for (let k = petFx.length - 1; k >= 0; k--) {
    const f = petFx[k]; f.life -= dt;
    if (f.kind === 'ring') { f.o.scale.setScalar(1 + (1.4 - f.life) * 3); f.o.material.opacity = Math.max(0, f.life / 1.4); }
    else if (f.kind === 'beam') f.o.material.opacity = Math.max(0, f.life / 1.4) * 0.5;
    else { f.o.userData.v.y -= 9 * dt; f.o.position.addScaledVector(f.o.userData.v, dt); f.o.rotation.y += dt * 8; f.o.material.opacity = Math.max(0, f.life / 1.2); }
    if (f.life <= 0) { scene.remove(f.o); f.o.geometry.dispose(); f.o.material.dispose(); petFx.splice(k, 1); }
  }
  if (!avatar || !pets.length) return;
  pets.forEach((p, k) => {
    const { pos: want, fwd } = petSlot(k);
    const d = want.clone().sub(p.mesh.position).setY(0);
    const moving = d.length() > 0.08;
    p.mesh.position.x += d.x * (1 - Math.exp(-dt * (7 - k * 0.3)));
    p.mesh.position.z += d.z * (1 - Math.exp(-dt * (7 - k * 0.3)));
    if (p.join > 0) {
      p.join = Math.max(0, p.join - dt);
      const u = p.join / 1.3;
      p.mesh.position.y = u * u * 5; // 하늘에서 쏙
      p.mesh.rotation.y += dt * 14 * u;
      if (p.join === 0) { p.mesh.position.y = 0; sfx('reveal'); }
    } else {
      p.mesh.position.y = 0;
      const face = moving ? Math.atan2(d.x, d.z) : Math.atan2(camera.position.x - p.mesh.position.x, camera.position.z - p.mesh.position.z); /* 멈추면 화면 쪽을 봄 */ void fwd;
      let r = face - p.mesh.rotation.y; r = Math.atan2(Math.sin(r), Math.cos(r));
      p.mesh.rotation.y += r * Math.min(1, dt * 8);
    }
    animateAnimal(p.mesh, t, moving || p.join > 0);
  });
}
/** 새 펫 한 마리 (겹치지 않게) — 이펙트와 함께 옆 칸에 합류 */
function addPet() {
  S.pets ||= [];
  if (S.pets.length >= PET_MAX) return null;
  const left = ANIMAL_KINDS.filter((k) => !S.pets.includes(k));
  if (!left.length) return null;
  const kind = left[Math.floor(Math.random() * left.length)];
  S.pets.push(kind); save();
  const mesh = makeAnimal(kind, 0.85);
  const p = { mesh, kind, join: 0 };
  pets.push(p);
  mesh.position.copy(petSlot(pets.length - 1).pos);
  scene.add(mesh);
  petJoinFx(p);
  return kind;
}
/** 코인(점수)이 기준을 넘을 때마다 새 친구가 반짝 등장 */
async function checkPetMilestone() {
  S.petMiles ||= 0;
  while (S.petMiles < PET_AT.length && S.coins >= PET_AT[S.petMiles]) {
    const at = PET_AT[S.petMiles];
    S.petMiles++; save();
    const kind = addPet();
    if (!kind) continue;
    const A = ANIMALS[kind];
    callout('yar', `🪙 ${at} 돌파!`);
    toast(`🎉 코인 ${at} 돌파! ${A.emoji} ${josa(A.name, '이', '가')} 친구가 되어 옆에서 따라와요`);
    world.sparkle(S.pos);
    await sleep(1400);
  }
}
/** 받침에 따라 조사 고르기: 이/가 · 을/를 */
const hasBatchim = (w) => { const c = String(w).charCodeAt(String(w).length - 1); return c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0; };
const josa = (w, a, b) => `${w}${hasBatchim(w) ? a : b}`;
/** 새 펫 친구 받기 (최대 6마리, 겹치지 않게) */
async function awardPet(gameTitle) {
  const kind = addPet();
  if (!kind) return;
  const A = ANIMALS[kind];
  await new Promise((res) => {
    const ov = document.createElement('div');
    ov.className = 'study-ask pet-card';
    ov.innerHTML = `<div class="sa-card"><div class="sa-ico pet-ico">${A.emoji}</div><h2>${gameTitle} 성공 상품!<br><em>${josa(A.name, '이', '가')}</em> 친구가 됐어요</h2>
      <p>이제 ${josa(A.name, '이', '가')} ${esc(josa(S.name, '을', '를'))} <b>끝까지 따라다녀요</b> 🐾<br>성에 도착할 때까지 함께 가요!</p>
      <div class="sa-btns"><button class="primary big" id="petOk">같이 가자! ▶</button></div></div>`;
    document.body.appendChild(ov);
    callout('yar', `${A.emoji} 새 친구!`);
    ov.querySelector('#petOk').onclick = () => { ov.remove(); res(); };
  });
}

function placeAvatar(charId) {
  if (avatar) scene.remove(avatar.root);
  const c = chars.players.find((p) => p.id === charId) || chars.players[0];
  avatar = createAvatar(c);
  avatar.root.position.copy(world.cellPosition(S.pos));
  avatar.root.position.y = 0.3;
  scene.add(avatar.root);
  buildPets();
}

/** 한 칸씩 콩콩 뛰어 이동 */
let hopN = 0;
async function hopTo(i, last = false) {
  const from = avatar.root.position.clone();
  const to = world.cellPosition(i);
  to.y = 0.3;
  avatar.root.rotation.y = Math.atan2(to.x - from.x, to.z - from.z);
  avatar.setAnim('hop', { foot: hopN++ % 2 ? 'R' : 'L', last }); // 왼발 · 오른발 번갈아, 마지막 칸은 두 발로
  const D = 420;
  const t0 = performance.now();
  await new Promise((res) => {
    const step = (now) => {
      const p = Math.min(1, (now - t0) / D);
      // 웅크렸다가(0~16%) 점프 → 착지(80%) → 찌그러짐 (avatar.js 'hop' 과 박자를 맞춤)
      const q = Math.min(1, Math.max(0, (p - 0.16) / 0.64));
      const e = q * q * (3 - 2 * q);
      avatar.root.position.lerpVectors(from, to, e);
      avatar.root.position.y = 0.3 + Math.sin(q * Math.PI) * 1.05;
      if (p < 1) requestAnimationFrame(step); else res();
    };
    requestAnimationFrame(step);
  });
  sfx('hop');
  S.pos = i;
}

/** 아직 통과 못 한 게이트가 길을 막는다 — 지나치지 않고 그 칸에 멈춘다 */
function stopLimit(from, to) {
  for (let i = from + 1; i <= to; i++) if (board.cells[i].kind === 'gate' && !(S.gates || {})[i]) return i;
  return to;
}
async function moveBy(n) {
  const want = Math.min(world.N - 1, S.pos + n);
  const target = stopLimit(S.pos, want);
  if (target < want) toast('🚧 게이트 앞에서 멈춤! 관문을 통과해야 지나갈 수 있어요');
  hopN = 0;
  while (S.pos < target) { await hopTo(S.pos + 1, S.pos + 1 === target); await sleep(S.pos === target ? 40 : 10); }
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
  fillFaces(ui);
  return ui;
}

function title() {
  cam.mode = 'title';
  bgm('title');
  if (avatar) { scene.remove(avatar.root); avatar = null; }
  clearPets();
  const sv = loadSave();
  const can = sv && !sv.finished;
  screen(`<div class="title-screen">
    <div class="logo-card">
      <div class="ted-logo"><img class="face" data-face="ted" alt=""><div class="tl-t"><b>Ted</b><span>와 함께하는</span></div></div>
      <h1><span>품사 <b>원정대</b></span><svg class="castle" viewBox="0 0 64 64" aria-hidden="true"><g stroke="#2B2350" stroke-width="2.4" stroke-linejoin="round">
        <path d="M31 6 L31 0" stroke-linecap="round"/><path d="M31 1 L41 4 L31 7 Z" fill="#E21E8C"/>
        <path d="M10 26 L10 18 L14 18 L14 21 L18 21 L18 18 L22 18 L22 26 Z" fill="#B9A9E8"/><path d="M42 26 L42 18 L46 18 L46 21 L50 21 L50 18 L54 18 L54 26 Z" fill="#B9A9E8"/>
        <path d="M24 22 L31 8 L38 22 Z" fill="#F29A2E"/>
        <rect x="24" y="22" width="14" height="14" fill="#D8CCF5"/><rect x="10" y="26" width="12" height="34" fill="#D8CCF5"/><rect x="42" y="26" width="12" height="34" fill="#D8CCF5"/>
        <path d="M6 60 L6 36 L10 36 L10 40 L14 40 L14 36 L18 36 L18 40 L22 40 L22 36 L26 36 L26 40 L30 40 L30 36 L34 36 L34 40 L38 40 L38 36 L42 36 L42 40 L46 40 L46 36 L50 36 L50 40 L54 40 L54 36 L58 36 L58 60 Z" fill="#EDE6FF"/>
        <path d="M25 60 L25 50 Q32 42 39 50 L39 60 Z" fill="#8A5A35"/>
        <rect x="29" y="26" width="4" height="6" rx="2" fill="#FFD43B"/><rect x="14" y="30" width="4" height="6" rx="2" fill="#FFD43B"/><rect x="46" y="30" width="4" height="6" rx="2" fill="#FFD43B"/></g>
        <path d="M32 46 L32 60" stroke="#5A3A20" stroke-width="1.5"/></svg></h1>
      <div class="kicker">CHUNK QUEST</div>
      <p>주사위를 굴려 「문장의 성」까지!</p>
    </div>
    <div class="title-btns">
      ${can ? `<button class="primary big" id="cont">이어하기 · ${esc(sv.name)} (${sv.pos}/${board.cells.length - 1}칸)</button>` : ''}
      <button class="${can ? 'ghost big' : 'primary big'}" id="new">${can ? '처음부터 새로 하기' : '시작하기 ▶'}</button>
      <button class="ghost big study-btn" id="study">📚 출발 전 개념 학습</button>
      <div class="title-links"><a href="./quiz-lab.html">🧪 연습장 · 미니게임</a><a href="./review.html">📋 문제 검수</a></div>
    </div></div>`);
  ui.querySelector('#study').onclick = async () => { unlockAudio(); await runStudy({ sfx }); };
  ui.querySelector('#new').onclick = () => {
    if (can && !confirm('저장된 진행 상황이 지워져요. 새로 시작할까요?')) return;
    profile();
  };
  if (can) ui.querySelector('#cont').onclick = () => { S = sv; startBoard(false); };
}

function profile(name = '', grade = 'mid') {
  screen(`<div class="panel-screen"><div class="panel card">
    <h2>원정대원 등록</h2>
    <label class="fld">이름 또는 닉네임<input id="nm" maxlength="12" placeholder="예: 민트초코" value="${esc(name)}" autocomplete="off"></label>
    <div class="fld">난이도<div class="levels">${LEVELS.map((l) => `<button class="gr lv ${l.id === grade ? 'on' : ''}" data-g="${l.id}"><span>${l.icon}</span><b>${l.name}</b><small>${l.desc}</small></button>`).join('')}</div></div>
    <p class="muted">기록은 선생님께만 보여요. 닉네임도 괜찮아요.</p>
    <div class="row"><button class="ghost" id="back">◀ 처음</button><button class="primary" id="next">다음 ▶</button></div>
    <div class="err" id="err"></div></div></div>`);
  let g = grade;
  ui.querySelectorAll('.gr').forEach((b) => { b.onclick = () => { g = b.dataset.g; ui.querySelectorAll('.gr').forEach((x) => x.classList.toggle('on', x === b)); }; });
  ui.querySelector('#back').onclick = title;
  ui.querySelector('#next').onclick = () => {
    const n = ui.querySelector('#nm').value.trim();
    if (!n) { ui.querySelector('#err').textContent = '이름을 써 주세요.'; return; }
    if (!g) { ui.querySelector('#err').textContent = '난이도를 골라 주세요.'; return; }
    choose(n, g);
  };
}

function choose(name, grade) {
  let pick = chars.players[0].id;
  const draw = () => {
    const c = chars.players.find((p) => p.id === pick);
    screen(`<div class="panel-screen"><div class="panel card">
      <h2>함께 떠날 캐릭터</h2>
      <div class="chars">${chars.players.map((p) => `<button class="ch ${p.id === pick ? 'on' : ''}" data-id="${p.id}" style="--cc:${p.color}"><img src="${charURL(p.id)}" alt=""><b>${esc(p.name)}</b><small class="nick">${esc(p.nick)}</small><small>${esc(p.title)}</small></button>`).join('')}</div>
      <div class="say">${faceImg(c.id)}<p><b>${esc(c.name)}</b> “${esc(c.lines.select)}”</p></div>
      <div class="row"><button class="ghost" id="back">◀ 이전</button><button class="primary" id="go">${esc(c.name)}(와)과 출발! ▶</button></div></div></div>`);
    ui.querySelectorAll('.ch').forEach((b) => { b.onclick = () => { pick = b.dataset.id; sfx('tap'); draw(); }; });
    ui.querySelector('#back').onclick = () => profile(name, grade);
    ui.querySelector('#go').onclick = async () => {
      newGame(name, grade, pick);
      ui.innerHTML = '';
      // 게임 전에 먼저 학습할까요? → 네: 4챕터 학습 + OX (맞힌 개수만큼 코인)
      if (await askStudy()) {
        const r = await runStudy({ sfx });
        S.coins += r.correct; S.studied = r; save();
        if (r.correct) toastLater(`📚 출발 전 개념 학습 OX ${r.correct}/${r.total} · 코인 +${r.correct}`);
      }
      startBoard(true);
    };
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
      <span class="lvb ${S.level}">${{ low: '하', mid: '중', high: '상' }[S.level] || '중'}</span>
      <span class="pos"><b>${S.pos}</b>/${board.cells.length - 1}칸 · 🎲<b class="trn">${S.turns || 0}</b></span>
      <span class="coin">🪙 <b>${S.coins}</b></span>
      ${(S.snacks || []).length ? `<span class="snk">🍫 <b>${S.snacks.length}</b></span>` : ''}
      <button class="menu" id="menu" aria-label="메뉴">☰</button>
    </div>
    <div class="progress"><i style="width:${(S.pos / (board.cells.length - 1)) * 100}%"></i>${board.regions.map((r, k) => `<em style="left:${(board.cells.findIndex((c) => c.region === k) / (board.cells.length - 1)) * 100}%"></em>`).join('')}</div>
    <div class="talk talk-top" id="talk"><img id="talkImg" class="face" data-face="ted" alt=""><p id="talkTxt"></p></div>
    <div class="hud-bottom">
      <div class="me">${faceImg(p.id)}<span>${esc(S.name)}</span></div>
    </div>
    <div class="dice-hint" id="diceHint"><i class="ring"></i><i class="ring r2"></i><span>👆 주사위를 <b>위로 휙!</b><small>손가락으로 쓸어 올려요</small></span></div>
    <div class="swipe-line" id="swipeLine"></div>
    <div class="bignum" id="bignum"></div>
    <div class="toast" id="toast"></div>
  </div>`);
  ui.querySelector('#menu').onclick = menu;
  setRollEnabled(canRoll);
}

function talk(text, who = 'guide') {
  const img = ui.querySelector('#talkImg');
  const tx = ui.querySelector('#talkTxt');
  if (!img) return;
  img.dataset.face = who === 'guide' ? 'ted' : player().id;
  fillFaces(ui);
  tx.innerHTML = `<b>${esc(who === 'guide' ? chars.guide.name : player().name)}</b> ${esc(text)}`;
  const t = ui.querySelector('#talk');
  t.classList.remove('pop'); void t.offsetWidth; t.classList.add('pop');
}

let canRoll = false;
function setRollEnabled(on) {
  canRoll = on;
  ui.querySelector('#diceHint')?.classList.toggle('on', on);
  if (on && avatar && dice.state !== 'ready') {
    const base = avatar.root.position.clone().setY(0);
    dice.ready(base, world.direction(S.pos).setY(0).normalize().negate());
  }
}

/** 화면 속 3D 주사위를 손가락으로 위로 쓸어 올리면 던진다 (속도 = 세기, 좌우 = 비틀기) */
const DIE_PICK_R = 95; // 주사위 화면 위치에서 이 거리 안에서 시작하면 주사위를 잡은 것
function dieScreen() {
  const v = dice.mesh.position.clone().project(camera);
  return { x: (v.x + 1) / 2 * window.innerWidth, y: (1 - v.y) / 2 * window.innerHeight, ok: v.z < 1 };
}
let swipeSt = null;
function swipeStart(e) {
  if (!canRoll || busy || dice.state !== 'ready' || cam.mode !== 'board') return;
  if (e.target.closest && e.target.closest('button, .menu-ov, .sheet, .mg-ov, input')) return;
  const d = dieScreen();
  if (!d.ok || Math.hypot(e.clientX - d.x, e.clientY - d.y) > DIE_PICK_R) return;
  e.preventDefault();
  swipeSt = { x: e.clientX, y: e.clientY, pts: [[e.clientX, e.clientY, performance.now()]] };
  unlockAudio();
  ui.querySelector('#diceHint')?.classList.add('hold');
}
function swipeMove(e) {
  if (!swipeSt) return;
  swipeSt.pts.push([e.clientX, e.clientY, performance.now()]);
  if (swipeSt.pts.length > 8) swipeSt.pts.shift();
  const dx = e.clientX - swipeSt.x; const dy = e.clientY - swipeSt.y;
  const line = ui.querySelector('#swipeLine');
  if (line) line.style.cssText = `display:block;left:${swipeSt.x}px;top:${swipeSt.y}px;width:${Math.hypot(dx, dy)}px;transform:rotate(${Math.atan2(dy, dx)}rad)`;
}
function swipeEnd(e) {
  if (!swipeSt) return;
  const st = swipeSt; swipeSt = null;
  const line = ui.querySelector('#swipeLine'); if (line) line.style.display = 'none';
  ui.querySelector('#diceHint')?.classList.remove('hold');
  const p0 = st.pts[0];
  const dt = Math.max(16, performance.now() - p0[2]);
  const up = p0[1] - e.clientY;
  const total = st.y - e.clientY;
  const dx = e.clientX - st.x;
  if (total < 30) { talk('주사위를 손가락으로 꾹 누른 채 위로 휙! 쓸어 올려 봐!'); return; }
  const speed = up / dt;
  const power = Math.max(0.15, Math.min(1, (speed - 0.2) / 2.2 + total / 900));
  const lateral = Math.max(-1, Math.min(1, dx / 140));
  turn({ power, lateral });
}
window.addEventListener('pointerdown', swipeStart, { passive: false });
window.addEventListener('pointermove', swipeMove);
window.addEventListener('pointerup', swipeEnd);
window.addEventListener('pointercancel', () => { swipeSt = null; const l = ui.querySelector('#swipeLine'); if (l) l.style.display = 'none'; });
/** 반짝이는 안내 고리가 화면 속 주사위를 따라다님 */
function placeDiceHint() {
  const h = ui.querySelector('#diceHint');
  if (!h || !canRoll || dice.state !== 'ready') return;
  const d = dieScreen();
  h.style.transform = `translate(${d.x}px, ${d.y}px)`;
}

function menu() {
  const ov = document.createElement('div');
  ov.className = 'menu-ov';
  ov.innerHTML = `<div class="card menu-box"><h3>메뉴</h3>
    <button class="ghost" id="snd">${isMuted() ? '🔇 소리 켜기' : '🔊 소리 끄기'}</button>
    <button class="ghost" id="study">📚 출발 전 개념 학습 다시 보기</button>
    <button class="ghost" id="note">📒 오답노트 (${S.notes.length})</button>
    <button class="ghost" id="snk">🍫 내 간식 쿠폰 (${(S.snacks || []).length})</button>
    <button class="ghost" id="home">🏠 처음 화면 (자동 저장됨)</button>
    <button class="primary" id="close">닫기</button></div>`;
  document.body.appendChild(ov);
  ov.querySelector('#snd').onclick = () => { setMuted(!isMuted()); syncMute(); ov.remove(); };
  ov.querySelector('#study').onclick = async () => { ov.remove(); setRollEnabled(false); await runStudy({ sfx }); hud(); if (!busy) setRollEnabled(true); };
  ov.querySelector('#snk').onclick = () => {
    const list = S.snacks || [];
    ov.querySelector('.menu-box').innerHTML = `<h3>🍫 내 간식 쿠폰</h3><div class="notes">${list.length ? list.map((k) => `<div class="cp"><img src="${BASE}assets/snacks/${k.kind}.svg" alt=""><div><b>${esc(SNACKS[k.kind].name)}</b><small>${esc(k.how)} · 코드 ${k.code}</small></div></div>`).join('') : '<p class="muted">간식 뽑기 칸과 미니게임에서 받을 수 있어요.</p>'}</div><button class="primary" id="close2">닫기</button>`;
    ov.querySelector('#close2').onclick = () => ov.remove();
  };
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
const toastLater = (t) => setTimeout(() => toast(t), 1800);
function toast(text) {
  const el = ui.querySelector('#toast');
  el.textContent = text;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
}

function snapCamera() {
  const t = avatar.root.position;
  const dir = world.direction(S.pos);
  const yaw = Math.atan2(dir.x, -dir.z) * 0.6;
  cam.target.copy(t);
  cam.pos.copy(t).add(new THREE.Vector3(Math.sin(yaw) * -8, 7.6, Math.cos(yaw) * 8).multiplyScalar(1.2));
  cam.look.copy(t).add(new THREE.Vector3(0, 0.6, -2.4));
}

async function startBoard(fresh) {
  cam.mode = 'board';
  S.level ||= 'mid'; setLevel(S.level); setPlayer(S.name);
  S.snacks ||= []; S.games ||= {}; S.gates ||= {}; S.regTypes ||= {}; S.streak ||= 0; S.wrongStreak ||= 0; S.perfects ||= 0;
  bgm(regionOf(S.pos).id);
  placeAvatar(S.char);
  if (!fresh) snapCamera(); // 이어하기: 바로 내 말 위치에서 시작
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
async function turn(swipe = { power: 0.6, lateral: 0 }) {
  if (busy) return;
  busy = true;
  setRollEnabled(false);
  S.turns = (S.turns || 0) + 1; save(); // 주사위를 덜 던지고 빨리 도착할수록 총점 UP
  talk(player().lines.roll, 'me');
  sfx('whoosh');
  const base = avatar.root.position.clone().setY(0);
  const ahead = world.direction(S.pos).setY(0).normalize();
  if (dice.state !== 'ready') dice.ready(base, ahead.clone().negate());
  cam.zoom = 1.4;
  const value = await dice.roll({ power: swipe.power, lateral: swipe.lateral, forward: ahead, onBounce: () => sfx('bounce') });
  bigNumber(value);
  sfx('reveal');
  await sleep(800);
  await dice.hide();
  cam.zoom = 1;
  const prevRegion = board.cells[S.pos].region;
  await moveBy(value);
  hud();
  cam.zoom = 0.8;
  const cell = board.cells[S.pos];
  if (cell.region !== prevRegion) await enterRegion(cell.region);
  await resolveCell(cell);
  await checkPetMilestone();
  cam.zoom = 1;
  busy = false;
  if (!S.finished) {
    hud();
    if (S.bonusRoll) { S.bonusRoll = false; talk('보너스! 바로 한 번 더 굴려!'); } else talk(chars.guide.lines.roll);
    setRollEnabled(true);
  }
}

async function resolveCell(cell) {
  if (cell.kind === 'goal') return goal();
  if (cell.kind === 'quiz') {
    const T = TYPES[cell.type];
    talk(`「${T.short}」에 도착! ${T.name} 문제 5개를 풀어 보자.`);
    await sleep(1200);
    const r = await playQuiz(cell.type, cell.region);
    if (r.reward.move > 0) {
      avatar.setAnim('joy');
      talk(r.reward.perfect ? chars.guide.lines.perfect : chars.guide.lines.good);
      sfx(r.reward.perfect ? 'perfect' : 'ok');
      await sleep(1400);
      toast(`보너스 ${r.reward.move}칸 전진!`);
      await moveBy(r.reward.move);
      hud();
      if (await checkpoint()) return;
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
  if (cell.kind === 'gate') return gateFlow(cell);
  if (cell.kind === 'arcade') {
    // 🎮 다시 한 판 칸: 정답률 70% 이상인 학생은 사격장·카트를 한 번 더!
    const acc = S.answered ? S.correct / S.answered : 0;
    if (acc >= 0.7) { toast(`🎮 보너스 게임 찬스! 정답률 ${Math.round(acc * 100)}%`); return playCellGame(cell); }
    talk(`정답률 70% 이상이면 여기서 ${GAMES[cell.game].title}을 한 번 더 할 수 있어! 지금 ${Math.round(acc * 100)}% — 다음엔 꼭!`);
    await sleep(2200);
    return;
  }
  if (cell.game) return playCellGame(cell);
  if (cell.kind === 'trap') {
    toast('⚠️ 함정! 2칸 뒤로');
    talk('앗, 함정이야! 2칸 뒤로 미끄러져…');
    avatar.setAnim('sad'); sfx('no');
    await sleep(900);
    await moveBack(2);
    return;
  }
  if (cell.kind === 'portal') {
    toast('🌀 순간이동 포털! 3칸 앞으로');
    talk('소용돌이 포털이다! 슝~ 3칸 앞으로!');
    await teleport(stopLimit(S.pos, Math.min(world.N - 1, S.pos + 3)));
    await checkpoint();
    return;
  }
  if (cell.kind === 'bonus') {
    toast('🎲 보너스 주사위! 한 번 더!');
    talk('보너스 주사위! 한 번 더 굴려!');
    callout('nice', '한 번 더!');
    await sleep(900);
    S.bonusRoll = true;
  }
}

/** 이동 후 게이트/도착 칸에 섰다면 그 칸을 실행 */
async function checkpoint() {
  const c = board.cells[S.pos];
  if (c.kind === 'goal') { await goal(); return true; }
  if (c.kind === 'gate' && !S.gates[S.pos]) { await gateFlow(c); return true; }
  return false;
}

/** 이 지역에서 아직 2종류를 못 풀었으면 남은 유형으로 「관문 시험」 */
async function regionExam(k) {
  const reg = board.regions[k];
  const done = new Set(S.regTypes[k] || []);
  while (done.size < 2) {
    const left = reg.types.filter((t) => !done.has(t));
    const fresh = left.filter((t) => !(board.regions[k - 1]?.types || []).includes(t)); // 앞 지역과 겹치지 않는 유형 우선
    const pool = fresh.length ? fresh : left;
    const t = pool[Math.floor(Math.random() * pool.length)];
    toast(`📝 관문 시험: ${reg.name}에서는 두 가지 시험을 꼭 풀어야 해요 (${done.size}/2)`);
    talk(`잠깐! ${reg.name}을 떠나기 전에 「${TYPES[t].short}」 시험도 풀고 가자!`);
    await sleep(1800);
    await playQuiz(t, k);
    done.add(t);
  }
}

/** 게이트: 지역 시험 2종 확인 → 미니게임 한 판 (꼭 해야 지나갈 수 있음) */
async function gateFlow(cell) {
  await regionExam(cell.region);
  await playCellGame(cell);
  S.gates[S.pos] = true;
  save();
  hud();
  // 마을 클리어 쇼: 1마을 다 같이 → 2마을 선생님 → 3마을 피라미드 퍼레이드 (마지막은 성 도착 피날레)
  const reg = board.regions[cell.region];
  if (!(S.showsDone ||= []).includes(cell.region)) {
    S.showsDone.push(cell.region); save();
    avatar.setAnim('joy');
    if (cell.region === 0) await crewDance(`${reg.name} 클리어! 원정대 다 같이 🎉`);
    else if (cell.region === 1) await teacherDance(`${reg.name} 클리어! ${S.name}, 선생님도 참을 수 없다 📚`);
    else if (cell.region === 2) await dancerShow('pyramid', `${reg.name} 클리어! 피라미드 퍼레이드 🔺`);
    avatar.setAnim('idle');
  }
}

/** 한 칸(5문제) 풀고 기록 */
async function playQuiz(type, region) {
  const r = await quizSheet(type, region);
  (S.regTypes[region] ||= []).includes(type) || S.regTypes[region].push(type);
  S.coins += r.reward.coins;
  const before = S.correct;
  S.correct += r.correct;
  void before;
  S.answered += r.total;
  S.cellsPlayed++;
  const bt = (S.byType[type] ||= { c: 0, n: 0 });
  bt.c += r.correct;
  bt.n += r.total;
  S.notes.push(...r.wrongs.map((w) => ({ ...w, at: Date.now() })));
  save();
  hud();
  return r;
}

async function enterRegion(k) {
  const reg = board.regions[k];
  bgm(reg.id);
  talk(chars.guide.lines[reg.id]);
  await sleep(1400);
}

/** 미니게임 칸 (게이트 · 간식 뽑기) */
async function playCellGame(cell) {
  const G = GAMES[cell.game];
  toast(`${G.icon} ${G.title}!`);
  talk(cell.kind === 'gate' ? `미니게임 게이트! 「${G.title}」에 도전해 보자!` : cell.kind === 'arcade' ? `잘하고 있어! 「${G.title}」 한 판 더!` : cell.kind === 'play' ? `🎵 「${G.title}」 칸이야! 박자에 맞춰 품사 북을 쳐 보자!` : '간식 뽑기 칸이야! 품사 인형을 뽑아 간식을 노려 봐!');
  await sleep(1300);
  const play = { run: playRun, crane: playCrane, kart: playKart, shoot: playShoot, drum: playDrum }[cell.game];
  const r = await play({ charId: S.char, name: S.name, short: cell.kind === 'snack' });
  bgm(regionOf(S.pos).id);
  S.coins += r.coins || 0;
  const best = S.games[cell.game] || 0;
  S.games[cell.game] = Math.max(best, r.score || 0);
  const won = r.snacks?.length ? r.snacks : r.snack ? [r.snack] : [];
  for (const k of won) {
    S.snacks.push({ kind: k, how: G.title, code: snackCode(), at: Date.now() });
    save();
    await snackCard(k, G.title, S.name);
  }
  save();
  hud();
  if (r.cleared) await awardPet(G.title);
  if (r.cleared) {
    // 미니게임 성공 → 선생님 댄스
    avatar.setAnim('joy');
    callout('legend', `${G.title} 성공!`);
    talk(cell.kind === 'gate' ? `${G.title} 성공! ${regionOf(S.pos).name} 관문 통과!` : chars.guide.lines.good);
    await sleep(1600);
    avatar.setAnim('idle');
  } else if (!r.quit) talk(chars.guide.lines.retry);
}

async function moveBack(n) {
  const target = Math.max(0, S.pos - n);
  hopN = 0;
  while (S.pos > target) { await hopTo(S.pos - 1, S.pos - 1 === target); await sleep(10); }
  avatar.root.rotation.y = 0;
  avatar.setAnim('idle');
  world.sparkle(S.pos);
  save();
  hud();
}

async function teleport(i) {
  sfx('whoosh');
  const r0 = avatar.root;
  for (let k = 0; k < 12; k++) { r0.rotation.y += 0.6; r0.scale.setScalar(1 - k / 12); await sleep(30); }
  S.pos = i;
  r0.position.copy(world.cellPosition(i)); r0.position.y = 0.3;
  snapCamera();
  for (let k = 0; k <= 12; k++) { r0.rotation.y += 0.6; r0.scale.setScalar(k / 12); await sleep(30); }
  r0.rotation.y = 0; r0.scale.setScalar(1);
  world.sparkle(i); sfx('reveal');
  save(); hud();
}

function quizSheet(type, region = board.cells[S.pos].region, extraSec = 0) {
  const ov = document.createElement('div');
  ov.className = 'sheet';
  ov.innerHTML = '<div class="sheet-inner wrap" id="cellRoot"></div>';
  document.body.appendChild(ov);
  requestAnimationFrame(() => ov.classList.add('open'));
  const used = new Set(S.used);
  const qs = draw(type, config.questionsPerCell, used);
  S.used = [...used];
  save();
  bgm('quiz');
  const hooks = {
    async onAnswer(ok) {
      if (ok) {
        S.streak++; S.wrongStreak = 0;
        // 연속 정답 보상 (퀴즈 칸이 바뀌어도 이어서 셈, 틀리면 처음부터): 3연속 이지 → 6연속 야르 → 10연속 레전드 (그 뒤 13·16·20 … 반복)
        const st = ((S.streak - 1) % 10) + 1;
        if (st === 3) callout('easy', `${S.streak}연속 정답!`);
        else if (st === 6) callout('yar', `${S.streak}연속 정답!`);
        else if (st === 10) callout('legend', `${S.streak}연속 정답!`);
        else sfx('ok');
      } else {
        S.streak = 0; S.wrongStreak++;
        callout('oops', S.wrongStreak >= 2 ? `연속 오답 ${S.wrongStreak}` : '해설을 읽어 봐요');
        if (S.wrongStreak >= 3) { S.wrongStreak = 0; save(); await sleep(900); await maWarning(); }
      }
      save();
    },
  };
  return runCell(ov.querySelector('#cellRoot'), { type, questions: qs, config, hooks, timeLimit: timeLimitFor(type, region, config) + extraSec }).then(async (r) => {
    ov.classList.remove('open');
    setTimeout(() => ov.remove(), 300);
    bgm(regionOf(S.pos).id);
    if (r.reward.perfect) { S.perfects++; save(); }
    return r;
  });
}

/** 총점: 게임·퀴즈로 모은 코인 × 10 + 적은 턴으로 도착한 보너스 (25턴 기준, 1턴 줄일 때마다 +30점) */
const turnBonus = () => Math.max(0, 25 - (S.turns || 0)) * 30;
const totalScore = () => S.coins * 10 + turnBonus();
function rankHTML() {
  const { list, place } = recordRank();
  const t = tierOf(S.coins);
  const medal = (i) => ['🥇', '🥈', '🥉'][i] || `${i + 1}`;
  void list; void place; void medal;
  return `<div class="tier"><span>${t.icon}</span><b>${esc(t.name)}</b><small>코인이 많을수록 높은 등급</small></div>
    <div id="goalRank"><p class="rk-wait">🏆 순위 불러오는 중…</p></div>`;
}

/** 목적지 도착 — 시상식은 4단계에서 */
const RANK_KEY = 'cq.rank.v1';
const TIERS = [
  { min: 320, name: '전설의 청크 마스터', icon: '👑' },
  { min: 240, name: '골드 원정대장', icon: '🥇' },
  { min: 170, name: '실버 탐험가', icon: '🥈' },
  { min: 100, name: '브론즈 모험가', icon: '🥉' },
  { min: 0, name: '새싹 원정대원', icon: '🌱' },
];
const tierOf = (c) => TIERS.find((t) => c >= t.min);
function recordRank() {
  let list = [];
  try { list = JSON.parse(localStorage.getItem(RANK_KEY)) || []; } catch { /* 없음 */ }
  if (!S.rankId) {
    S.rankId = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    list.push({ id: S.rankId, name: S.name, char: S.char, level: S.level, coins: S.coins, at: Date.now() });
  } else {
    const me = list.find((x) => x.id === S.rankId);
    if (me) me.coins = S.coins;
  }
  list.sort((a, b) => b.coins - a.coins || a.at - b.at);
  list = list.slice(0, 50);
  try { localStorage.setItem(RANK_KEY, JSON.stringify(list)); } catch { /* 저장 불가 */ }
  save();
  return { list, place: list.findIndex((x) => x.id === S.rankId) + 1 };
}

/** 성 도착 전 마지막 확인: 성 시험 2종 · 간식 뽑기 한 번은 꼭 */
async function finalChecks() {
  await regionExam(board.cells[S.pos].region);

}

/** 🏆 아너스 미션 — 정답률 80% 이상인 학생만: 오류 수리 · 청크 퍼즐 · 번역의 탑을 「상」 난이도로 한 번 더 */
async function honorsMission() {
  const acc = S.answered ? S.correct / S.answered : 0;
  if (acc < 0.8 || S.honors) return;
  const yes = await new Promise((res) => {
    const ov = document.createElement('div');
    ov.className = 'study-ask';
    ov.innerHTML = `<div class="sa-card"><div class="sa-ico">🏆</div><h2>아너스 미션<br><em>도전할까요?</em></h2>
      <p>정답률 <b>${Math.round(acc * 100)}%</b>! 실력자에게만 열리는 마지막 도전<br>🛠️ 오류 수리 · 🧩 청크 퍼즐 · 🗼 번역의 탑 — <b>난이도 상</b><br>맞힌 문제마다 코인 <b>+5</b> 보너스</p>
      <div class="sa-btns"><button class="primary big" id="hY">도전! 🔥</button><button class="ghost big" id="hN">다음에 할래요</button></div></div>`;
    document.body.appendChild(ov);
    ov.querySelector('#hY').onclick = () => { ov.remove(); res(true); };
    ov.querySelector('#hN').onclick = () => { ov.remove(); res(false); };
  });
  if (!yes) return;
  const keep = S.level;
  setLevel('high');
  let ok = 0; let n = 0;
  for (const t of [10, 11, 12]) {
    talk(`아너스 미션 ${[10, 11, 12].indexOf(t) + 1}/3 — 「${TYPES[t].short}」 상 난이도!`);
    const r = await quizSheet(t, 3, 10);
    ok += r.correct; n += r.total;
    S.coins += r.reward.coins + r.correct * 5;
  }
  setLevel(keep);
  S.honors = { correct: ok, total: n };
  save();
  callout(ok >= n - 2 ? 'legend' : 'yar', `아너스 ${ok}/${n}`);
  await sleep(1600);
}

async function goal() {
  const first = !S.finished;
  if (first) await finalChecks();
  S.finished = true;
  save();
  avatar.setAnim('win');
  if (first) { bgm('castle'); await finaleDance(`🎉 ALL CLEAR! ${S.name} 문장의 성 도착`); }
  if (first) await honorsMission();
  avatar.root.rotation.y = 0;
  cam.zoom = 0.7;
  const acc = S.answered ? Math.round((S.correct / S.answered) * 100) : 0;
  screen(`<div class="panel-screen goal"><div class="panel card">
    <div class="kicker">GOAL!</div><h2>문장의 성 도착!</h2>
    <p>${esc(player().lines.win)}</p>
    <div class="goal-stats"><div><b>${S.correct}</b><small>정답</small></div><div><b>${acc}%</b><small>정답률</small></div><div><b>🪙 ${S.coins}</b><small>코인</small></div><div><b>🎲 ${S.turns || 0}</b><small>턴</small></div></div>
    ${(S.pets || []).length ? `<div class="goal-pets"><small>끝까지 함께한 친구들</small><span>${S.pets.map((k) => `<i title="${ANIMALS[k].name}">${ANIMALS[k].emoji}</i>`).join('')}</span></div>` : ''}
    ${S.honors ? `<div class="honors">🏆 아너스 미션 <b>${S.honors.correct}/${S.honors.total}</b></div>` : ''}
    <div class="total-score"><small>총점 = 코인 ${S.coins} × 10 + 빠른 도착 보너스 ${turnBonus()}</small><b>${totalScore()}<em>점</em></b></div>
    ${(S.snacks || []).length ? `<div class="goal-snacks">${S.snacks.map((k) => `<img src="${BASE}assets/snacks/${k.kind}.svg" alt="">`).join('')}</div>` : ''}
    ${rankHTML()}
    <button class="primary big" id="home">처음으로</button></div></div>`);
  ui.querySelector('#home').onclick = title;
  // 완주 코인 순위 (반 전체 / 이 기기) — 한 판에 한 번만 기록
  const fill = (R) => { const el = ui.querySelector('#goalRank'); if (el) el.innerHTML = rankTableHTML('board', R, S.name, '점'); };
  if (!S.boardSent) { S.boardSent = true; save(); submitScore('board', totalScore(), S.name).then(fill).catch(() => {}); }
  else getRanking('board', S.name).then(fill).catch(() => {});
}

// iOS: 첫 터치에서 소리 시작
document.addEventListener('pointerdown', () => { unlockAudio(); syncMute(); }, { once: true });

async function boot() {
  // 간판 글꼴(Jua)이 준비된 뒤 3D 보드를 그린다 (최대 2.5초 기다림)
  try { await Promise.race([document.fonts.load('400 40px Jua'), sleep(2500)]); } catch { /* 글꼴 없음 */ }
  world = buildWorld(scene, board, chars.guide);
  dice.setObstacles(world.obstacles);
  chars.players.forEach((p) => loadChar(p.id).catch(() => {}));
  requestAnimationFrame(loop);
  title();
}
boot();
