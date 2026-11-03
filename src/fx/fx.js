// 게임 연출 모음 — BGM · 콜아웃(이지/야르/레전드) · "마!" 경고 · 선생님 댄스 · 간식 보상
import './legacy.css';
import './fx.css';
import {
  ac, I, CH, mtof, TRACKS, music, musicStop, MUS, dance, setLegacyMuted, sfxOk, sfxNo, legacySfx, getAC, getMaster, osc,
} from './legacy.js';
import { isMuted } from '../quiz/sound.js';

const BASE = import.meta.env.BASE_URL;
export const snackURL = (k) => `${BASE}assets/snacks/${k}.svg`;
export const SNACKS = {
  choco: { name: '초코파이', short: '초코파이' },
  cake: { name: '오예스', short: '오예스' },
  cookie: { name: '오예스 쿠키앤크림', short: '쿠키앤크림' },
};

/* ------------------------------------------------------------------
   BGM — 지역·화면마다 다른 곡 (기존 앱 합성 엔진 위에 새 곡 추가)
   ------------------------------------------------------------------ */
Object.assign(TRACKS, {
  // 타이틀: 반짝이는 동화 오프닝
  title: { bpm: 116, vol: 0.5, chords: CH([[60, 64, 67], [65, 69, 72], [67, 71, 74], [64, 67, 72]]), roots: [36, 41, 43, 40],
    play(s, b, t, D, p) { const c = p.chords[b], r = p.roots[b];
      if (s === 0 || s === 8) I.kick(D, t, 0.5); if (s === 4 || s === 12) I.clap(D, t, 0.14);
      if (s % 2 === 0) I.hat(D, t, 0.03);
      if (s % 4 === 0) I.bass(D, t, mtof(r), 0.3, 0.22);
      I.marimba(D, t, c[(s >> 1) % 3] * (s % 4 === 2 ? 4 : 2), 0.045);
      if (s === 0) I.pad(D, t, c, 2.1, 0.022); } },
  // 품사 마을: 우쿨렐레 같은 산뜻한 전원풍
  village: { bpm: 104, vol: 0.5, swing: 0.1, chords: CH([[65, 69, 72], [60, 64, 67], [62, 65, 69], [58, 62, 65]]), roots: [41, 36, 38, 34],
    play(s, b, t, D, p) { const c = p.chords[b], r = p.roots[b];
      if (s === 0 || s === 10) I.kick(D, t, 0.45); if (s === 4 || s === 12) I.snare(D, t, 0.08);
      if ([0, 3, 6, 8, 11, 14].includes(s)) I.pluck(D, t, c[s % 3], 0.05);
      if (s === 0 || s === 8) I.bass(D, t, mtof(r), 0.45, 0.2, 'sine');
      if ([2, 7, 10, 15].includes(s)) I.marimba(D, t, c[(s + b) % 3] * 4, 0.035);
      if (s % 4 === 2) I.hat(D, t, 0.025); } },
  // 청크 시티: 통통 튀는 시티팝
  city: { bpm: 116, vol: 0.5, chords: CH([[67, 71, 74, 78], [64, 67, 71, 74], [60, 64, 67, 71], [62, 66, 69, 72]]), roots: [43, 40, 36, 38],
    play(s, b, t, D, p) { const c = p.chords[b], r = p.roots[b];
      if ([0, 6, 8].includes(s)) I.kick(D, t, 0.6); if (s === 4 || s === 12) I.clap(D, t, 0.18);
      if (s % 2 === 1) I.hat(D, t, 0.04);
      if ([0, 2, 3, 6, 8, 10, 11, 14].includes(s)) I.bass(D, t, mtof(r + (s % 4 === 2 ? 12 : 0)), 0.14, 0.24, 'square');
      if ([2, 6, 10, 14].includes(s)) I.stab(D, t, c.map((f) => f), 0.022);
      if (s === 0) I.pad(D, t, c, 2, 0.018); } },
  // 절단 협곡: 두근두근 모험
  canyon: { bpm: 100, vol: 0.5, chords: CH([[57, 60, 64], [55, 59, 62], [53, 57, 60], [52, 56, 59]]), roots: [33, 31, 29, 28],
    play(s, b, t, D, p) { const c = p.chords[b], r = p.roots[b];
      if (s % 4 === 0) I.kick(D, t, 0.55); if (s === 6 || s === 14) I.tom(D, t, 120, 0.35); if (s === 15) I.tom(D, t, 90, 0.3);
      if (s % 2 === 0) I.hat(D, t, 0.03);
      if ([0, 3, 6, 8, 11, 14].includes(s)) I.bass(D, t, mtof(r), 0.18, 0.24);
      if ([0, 2, 4, 6, 8, 10, 12, 14].includes(s)) I.pluck(D, t, c[(s >> 1) % 3] * 2, 0.04);
      if (s === 0 && b % 2 === 0) I.brass(D, t, c, 1.2, 0.02); } },
  // 문장의 성: 마법 같은 왈츠풍 아르페지오
  castle: { bpm: 92, vol: 0.5, swing: 0.18, chords: CH([[62, 66, 69], [59, 62, 66], [55, 59, 62], [57, 61, 64]]), roots: [38, 35, 31, 33],
    play(s, b, t, D, p) { const c = p.chords[b], r = p.roots[b];
      if (s === 0) { I.kick(D, t, 0.4); I.pad(D, t, c, 2.6, 0.03); I.bass(D, t, mtof(r), 1.2, 0.22, 'sine'); }
      if (s === 8) I.snare(D, t, 0.06);
      const arp = [c[0], c[1], c[2], c[1] * 2, c[2] * 2, c[1] * 2];
      if (s % 2 === 0) I.marimba(D, t, arp[(s >> 1) % 6] * 2, 0.04);
      if (s % 4 === 3) I.hat(D, t, 0.02, true); } },
  // 문제 풀 때: 집중되는 로파이
  quiz: { bpm: 86, vol: 0.45, swing: 0.15, chords: CH([[60, 64, 67, 71], [57, 60, 64, 67], [62, 65, 69, 72], [55, 59, 62, 65]]), roots: [36, 33, 38, 31],
    play(s, b, t, D, p) { const c = p.chords[b], r = p.roots[b];
      if (s === 0 || s === 10) I.kick(D, t, 0.4); if (s === 4 || s === 12) I.snare(D, t, 0.08);
      if (s % 2 === 0) I.hat(D, t, 0.025);
      if (s === 0) { I.pad(D, t, c, 2.7, 0.022); I.bass(D, t, mtof(r), 1.1, 0.22, 'sine'); }
      if (s === 6 || s === 14) I.pluck(D, t, c[3] * 2, 0.025); } },
  // 미니게임: 청크런(빠른 칩튠) · 크레인(오락실) · 카트(질주) · 아레나(배틀)
  mgRun: { bpm: 150, vol: 0.5, chords: CH([[60, 64, 67], [65, 69, 72], [67, 71, 74], [69, 72, 76]]), roots: [36, 41, 43, 45],
    play(s, b, t, D, p) { const c = p.chords[b], r = p.roots[b];
      if (s % 4 === 0) I.kick(D, t, 0.6); if (s === 4 || s === 12) I.snare(D, t, 0.14); I.hat(D, t, 0.025);
      if (s % 2 === 0) I.bass(D, t, mtof(r + (s % 8 === 4 ? 12 : 0)), 0.1, 0.22, 'square');
      osc(D, t, 'square', c[(s + (s >> 2)) % 3] * 2, 0.003, 0.08, 0.035); } },
  mgCrane: { bpm: 124, vol: 0.5, swing: 0.12, chords: CH([[64, 67, 71], [62, 65, 69], [60, 64, 67], [62, 66, 69]]), roots: [40, 38, 36, 38],
    play(s, b, t, D, p) { const c = p.chords[b], r = p.roots[b];
      if (s === 0 || s === 8) I.kick(D, t, 0.5); if (s === 4 || s === 12) I.clap(D, t, 0.14);
      if (s % 2 === 0) I.bass(D, t, mtof(r + (s % 4 === 2 ? 7 : 0)), 0.12, 0.2);
      if (s % 2 === 1) I.marimba(D, t, c[(s >> 1) % 3] * 4, 0.04); } },
  mgKart: { bpm: 156, vol: 0.5, chords: CH([[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 56, 59]]), roots: [33, 29, 31, 28],
    play(s, b, t, D, p) { const c = p.chords[b], r = p.roots[b];
      if (s % 4 === 0) I.kick(D, t, 0.65); if (s === 4 || s === 12) I.snare(D, t, 0.16); if (s % 2 === 1) I.hat(D, t, 0.03);
      I.bass(D, t, mtof(r + (s % 2 ? 12 : 0)), 0.09, 0.2, 'sawtooth');
      if ([0, 3, 6, 10, 12].includes(s)) I.stab(D, t, c.map((f) => f * 2), 0.02); } },
  mgArena: { bpm: 128, vol: 0.5, chords: CH([[57, 60, 64], [60, 64, 67], [55, 59, 62], [53, 57, 60]]), roots: [33, 36, 31, 29],
    play(s, b, t, D, p) { const c = p.chords[b], r = p.roots[b];
      if (s % 4 === 0) I.kick(D, t, 0.75); if (s === 4 || s === 12) I.clap(D, t, 0.2); if (s % 4 === 2) I.hat(D, t, 0.06, true);
      if (s % 2 === 0) I.bass(D, t, mtof(r), 0.12, 0.26, 'sawtooth');
      if (s === 0) I.brass(D, t, c, 0.9, 0.03); if (s === 14 && b === 3) I.zap(D, t, 0.05); } },
});

let wanted = null;
export function bgm(name) {
  wanted = name;
  if (isMuted()) { musicStop(); MUS.cur = name; return; }
  if (MUS.cur === name && MUS.timer) return;
  music(name);
}
export function bgmStop() { musicStop(); }
export function syncMute() {
  setLegacyMuted(isMuted());
  if (!isMuted() && wanted) music(wanted);
}
/** 첫 터치에서 오디오 시작 (iOS 정책) */
export function unlockAudio() { ac(); }

/* ------------------------------------------------------------------
   콜아웃 — 화면에 쾅! 찍히는 글자 + 목소리 + 효과음
   ------------------------------------------------------------------ */
let KO = null;
const pickKo = () => { try { KO = speechSynthesis.getVoices().find((v) => /^ko/i.test(v.lang)) || KO; } catch { /* */ } };
try { pickKo(); speechSynthesis.addEventListener?.('voiceschanged', pickKo); } catch { /* */ }
function say(text, { rate = 1.15, pitch = 1.2 } = {}) {
  if (isMuted()) return;
  try {
    pickKo();
    if (!KO) return;
    const u = new SpeechSynthesisUtterance(text);
    u.voice = KO; u.lang = KO.lang; u.rate = rate; u.pitch = pitch; u.volume = 1;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  } catch { /* 음성 없음 */ }
}

const CALLOUTS = {
  easy: { text: 'EASY!', ko: '이지!', cls: 'co-easy', voice: '이지!', sfx: () => sfxOk() },
  nice: { text: 'NICE!', ko: '나이스!', cls: 'co-easy', voice: '나이스!', sfx: () => sfxOk() },
  yar: { text: '야르!', ko: '3연속 정답', cls: 'co-yar', voice: '야르!', sfx: () => legacySfx([523, 659, 784, 1047], 'square', 0.1, 0.06) },
  legend: { text: 'LEGEND!', ko: '레전드', cls: 'co-legend', voice: '레전드!', sfx: () => legacySfx([523, 659, 784, 1047, 1319, 1568], 'triangle', 0.16, 0.08) },
  oops: { text: '앗!', ko: '', cls: 'co-oops', voice: null, sfx: () => sfxNo() },
};
export function callout(kind, sub) {
  const c = CALLOUTS[kind];
  if (!c) return;
  if (!isMuted()) { ac(); c.sfx(); }
  if (c.voice) setTimeout(() => say(c.voice, kind === 'legend' ? { rate: 1, pitch: 1 } : {}), 120);
  const el = document.createElement('div');
  el.className = `callout ${c.cls}`;
  el.innerHTML = `<b>${c.text}</b>${sub || c.ko ? `<small>${sub || c.ko}</small>` : ''}`;
  if (kind === 'legend' || kind === 'yar') {
    for (let k = 0; k < 18; k++) {
      const s = document.createElement('i');
      s.style.setProperty('--a', `${(k / 18) * 360}deg`);
      s.style.setProperty('--d', `${80 + Math.random() * 90}px`);
      el.appendChild(s);
    }
  }
  document.body.appendChild(el);
  setTimeout(() => el.remove(), kind === 'legend' ? 2000 : 1300);
}

/* ------------------------------------------------------------------
   쇼 — 선생님 댄스 · 크루 군무 · 피날레 · 연속 오답 "마!"
   ------------------------------------------------------------------ */
const withMusicBack = (p) => p.then(() => { if (wanted) bgm(wanted); });
export const teacherDance = (msg) => withMusicBack(dance('teacher', msg));
export const crewDance = (msg) => withMusicBack(dance('crew', msg));
export const finaleDance = (msg) => withMusicBack(dance('finale', msg));
export const dancerShow = (kind, msg) => withMusicBack(dance(kind, msg));
export function maWarning() {
  return withMusicBack(dance('ma', '연속 오답 3개! 정신 차리라, 마!'));
}

/* ------------------------------------------------------------------
   간식 쿠폰 (초코파이 · 오예스 · 쿠키앤크림)
   ------------------------------------------------------------------ */
export function pickSnack(weights = { choco: 0.5, cake: 0.32, cookie: 0.18 }) {
  let r = Math.random();
  for (const [k, w] of Object.entries(weights)) { r -= w; if (r <= 0) return k; }
  return 'choco';
}
export function snackCode() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => A[Math.floor(Math.random() * A.length)]).join('');
}
/** 간식 획득 카드 (닫으면 resolve) */
export function snackCard(kind, how, name) {
  return new Promise((res) => {
    const s = SNACKS[kind];
    const ov = document.createElement('div');
    ov.className = 'snack-ov';
    ov.innerHTML = `<div class="snack-card"><div class="rays"></div>
      <div class="kicker">${how}</div><img src="${snackURL(kind)}" alt=""><h2>${s.name} GET!</h2>
      <p>${name ? `${name} · ` : ''}쿠폰이 저장됐어요. 수업이 끝나면 선생님께 보여 주세요!</p>
      <button class="primary big">받기 ▶</button></div>`;
    document.body.appendChild(ov);
    if (!isMuted()) legacySfx([660, 880, 990, 1320], 'triangle', 0.15, 0.09);
    ov.querySelector('button').onclick = () => { ov.remove(); res(); };
  });
}

export { getAC, getMaster, sfxOk, sfxNo };
