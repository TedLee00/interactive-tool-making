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
/* 자연 악기 (오카리나 · 우쿨렐레 · 칼림바 · 플루트 · 셰이커) — 맑고 편안한 소리 */
function ocarina(D, t, f, dur, v = 0.05) {
  const A = getAC(); const o = A.createOscillator(); const g = A.createGain(); const lfo = A.createOscillator(); const lg = A.createGain(); const lp = A.createBiquadFilter();
  o.type = 'sine'; o.frequency.setValueAtTime(f, t); lfo.frequency.value = 5.2; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.012, t + Math.min(0.3, dur * 0.6));
  lfo.connect(lg); lg.connect(o.frequency); lp.type = 'lowpass'; lp.frequency.value = f * 3;
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.06); g.gain.setValueAtTime(v * 0.85, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.12);
  o.connect(lp); lp.connect(g); g.connect(D); o.start(t); lfo.start(t); o.stop(t + dur + 0.2); lfo.stop(t + dur + 0.2);
  osc(D, t, 'triangle', f * 2, 0.04, dur * 0.5, v * 0.08); // 숨결 같은 배음
}
function uke(D, t, f, v = 0.05) { // 줄을 튕기는 소리: 밝은 톱니파 → 빠르게 닫히는 필터
  const A = getAC(); const o = A.createOscillator(); const g = A.createGain(); const lp = A.createBiquadFilter();
  o.type = 'sawtooth'; o.frequency.setValueAtTime(f, t); lp.type = 'lowpass'; lp.Q.value = 2;
  lp.frequency.setValueAtTime(f * 7, t); lp.frequency.exponentialRampToValueAtTime(f * 1.2, t + 0.25);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
  o.connect(lp); lp.connect(g); g.connect(D); o.start(t); o.stop(t + 0.6);
}
const strum = (D, t, chord, v = 0.035, down = true) => { const c = [...chord, chord[0] * 2]; (down ? c : c.slice().reverse()).forEach((f, i) => uke(D, t + i * 0.014, f * 2, v)); };
const kalimba = (D, t, f, v = 0.05) => { osc(D, t, 'sine', f, 0.002, 0.7, v); osc(D, t, 'sine', f * 5.4, 0.001, 0.06, v * 0.2); };
const flute = (D, t, f, dur, v = 0.035) => { ocarina(D, t, f, dur, v); osc(D, t, 'sine', f * 3, 0.08, dur * 0.6, v * 0.06); };
const shaker = (D, t, v = 0.02) => I.hat(D, t, v);

Object.assign(TRACKS, {
  // 🌿 숲속 오카리나: 우쿨렐레 아르페지오 위로 오카리나가 노래
  natOcarina: { bpm: 92, vol: 0.55, swing: 0.12, chords: CH([[60, 64, 67], [57, 60, 64], [65, 69, 72], [67, 71, 74]]), roots: [48, 45, 41, 43],
    play(s, b, t, D, p) { const c = p.chords[b]; const spb = 60 / p.bpm / 4;
      if (s % 2 === 0) uke(D, t, c[[0, 1, 2, 1][(s >> 1) % 4]] * 2, 0.03);
      if (s === 0) I.bass(D, t, mtof(p.roots[b] - 12), 0.8, 0.12, 'sine');
      if (s % 4 === 2) shaker(D, t, 0.012);
      if (s === 0 && b === 0) p.n = (p.n || 0) + 1; const ph = (p.n || 0) % 2; const M = [[76, 74, 72, 74], [72, 71, 69, 72], [69, 72, 77, 76], [74, 71, 67, 67]][b];
      const pat = ph ? [[0, M[0], 6], [6, M[1], 2], [8, M[2], 4], [12, M[3], 4]] : [[0, M[0], 4], [4, M[1], 4], [8, M[2], 8]];
      pat.forEach(([st, n, l]) => { if (s === st) ocarina(D, t, mtof(n), l * spb * 0.95, 0.05); }); } },
  // 🎐 칼림바 들판: 맑은 칼림바 + 부드러운 플루트
  natKalimba: { bpm: 84, vol: 0.55, chords: CH([[62, 66, 69], [59, 62, 66], [55, 59, 62], [57, 61, 64]]), roots: [38, 35, 31, 33],
    play(s, b, t, D, p) { const c = p.chords[b]; const spb = 60 / p.bpm / 4;
      const arp = [c[0], c[2], c[1] * 2, c[2], c[0] * 2, c[1] * 2, c[2] * 2, c[1] * 2];
      if (s % 2 === 0) kalimba(D, t, arp[(s >> 1) % 8], 0.045);
      if (s === 0) { I.pad(D, t, c, 3.2, 0.012); I.bass(D, t, mtof(p.roots[b]), 1.4, 0.1, 'sine'); }
      if (s === 8 && b % 2 === 1) flute(D, t, c[2] * 2, spb * 7, 0.03);
      if (s === 0 && b % 2 === 0) flute(D, t, c[1] * 4, spb * 6, 0.025); } },
  // 🏕️ 우쿨렐레 캠프: 신나는 스트럼 + 휘파람 같은 오카리나
  natUke: { bpm: 112, vol: 0.55, swing: 0.15, chords: CH([[67, 71, 74], [64, 67, 71], [60, 64, 67], [62, 66, 69]]), roots: [43, 40, 36, 38],
    play(s, b, t, D, p) { const c = p.chords[b]; const spb = 60 / p.bpm / 4;
      if ([0, 4, 6, 10, 12, 14].includes(s)) strum(D, t, c, 0.025, s % 4 === 0);
      if (s === 0 || s === 8) I.bass(D, t, mtof(p.roots[b]), 0.3, 0.14, 'sine');
      if (s === 4 || s === 12) I.clap(D, t, 0.05);
      if (s % 2 === 1) shaker(D, t, 0.014);
      if (s === 2) ocarina(D, t, c[2] * 2, spb * 3, 0.04); if (s === 6) ocarina(D, t, c[1] * 2, spb * 2, 0.04); if (s === 8) ocarina(D, t, c[0] * 2, spb * 6, 0.045); } },
  // 📖 퀴즈용 잔잔한 숲: 느린 칼림바 · 오카리나 긴 음
  quizNature: { bpm: 76, vol: 0.5, chords: CH([[60, 64, 67, 71], [57, 60, 64, 67], [65, 69, 72, 76], [62, 65, 69, 72]]), roots: [36, 33, 41, 38],
    play(s, b, t, D, p) { const c = p.chords[b]; const spb = 60 / p.bpm / 4;
      if ([0, 3, 6, 10, 13].includes(s)) kalimba(D, t, c[[0, 2, 1, 3, 2][[0, 3, 6, 10, 13].indexOf(s)]] * 2, 0.035);
      if (s === 0) { I.pad(D, t, c, 3.4, 0.014); I.bass(D, t, mtof(p.roots[b]), 1.6, 0.1, 'sine'); }
      if (s === 8 && b === 3) ocarina(D, t, c[3] * 2, spb * 7, 0.03); } },
  // 🎮 미니게임용 어쿠스틱 질주: 빠른 우쿨렐레 + 오카리나 리프
  mgFolk: { bpm: 140, vol: 0.55, chords: CH([[69, 72, 76], [65, 69, 72], [67, 71, 74], [64, 68, 71]]), roots: [45, 41, 43, 40],
    play(s, b, t, D, p) { const c = p.chords[b]; const spb = 60 / p.bpm / 4;
      if (s % 2 === 0) strum(D, t, c, 0.022, s % 4 === 0);
      if (s % 4 === 0) I.kick(D, t, 0.45); if (s === 4 || s === 12) I.clap(D, t, 0.1); if (s % 2 === 1) shaker(D, t, 0.018);
      if (s % 4 === 0) I.bass(D, t, mtof(p.roots[b] + (s === 8 ? 7 : 0)), 0.2, 0.16, 'triangle');
      const R = [c[0] * 2, c[1] * 2, c[2] * 2, c[1] * 2];
      if ([0, 3, 6, 10].includes(s)) ocarina(D, t, R[[0, 3, 6, 10].indexOf(s)], spb * 2.6, 0.04); } },

  // 타이틀: 잔잔한 동화 — 오르골 아르페지오 + 부드러운 현악 패드 + 가끔 오카리나 (드럼 없음)
  title: { bpm: 70, vol: 0.55, chords: CH([[60, 64, 67, 72], [57, 60, 64, 69], [53, 57, 60, 65], [55, 59, 62, 67]]), roots: [36, 33, 29, 31],
    play(s, b, t, D, p) { const c = p.chords[b]; const spb = 60 / p.bpm / 4;
      const box = (f, v) => { osc(D, t, 'sine', f, 0.002, 1.1, v); osc(D, t, 'sine', f * 4, 0.001, 0.12, v * 0.18); osc(D, t, 'triangle', f * 2, 0.002, 0.4, v * 0.12); }; // 오르골
      const arp = [c[0] * 2, c[2] * 2, c[1] * 2, c[3] * 2, c[2] * 2, c[1] * 2, c[3] * 2, c[2] * 4];
      if (s % 2 === 0) box(arp[(s >> 1) % 8], 0.04);
      if (s === 0) { I.pad(D, t, c, spb * 16, 0.016); I.bass(D, t, mtof(p.roots[b]), spb * 14, 0.08, 'sine'); }
      if (s === 8 && b % 2 === 1) ocarina(D, t, c[3] * 2, spb * 7, 0.025);
      if (s === 14 && b === 3) box(c[0] * 8, 0.02); } }, // 반짝!
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
  // 나눔 협곡: 두근두근 모험
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
const ALT = {
  // 장면별로 원래 곡과 자연 악기 곡을 번갈아 (골고루)
  village: ['village', 'natOcarina', 'natUke'], city: ['city', 'natUke', 'natKalimba'], canyon: ['canyon', 'natOcarina'],
  castle: ['castle', 'natKalimba'], quiz: ['quiz', 'quizNature', 'natKalimba'],
  mgRun: ['mgRun', 'mgFolk'], mgCrane: ['mgCrane', 'natUke'], mgKart: ['mgKart', 'mgFolk'], mgArena: ['mgArena', 'mgFolk'],
};
const altIdx = {};
export function bgm(name0) {
  let name = name0;
  // 같은 장면 곡이 이미 흐르고 있으면 그대로, 새로 들어갈 때마다 다음 곡으로 돌아가며
  if (ALT[name0] && !(ALT[name0].includes(MUS.cur) && MUS.timer)) { altIdx[name0] = ((altIdx[name0] ?? Math.floor(Math.random() * ALT[name0].length)) + 1) % ALT[name0].length; name = ALT[name0][altIdx[name0]]; }
  else if (ALT[name0] && ALT[name0].includes(MUS.cur)) name = MUS.cur;
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
export function unlockAudio() { ac(); preloadVoices(); }

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

// 선생님이 직접 녹음한 목소리 (이지 · 야르)
const CLIPS = { easy: `${BASE}assets/voice/easy.mp3`, yar: `${BASE}assets/voice/yar.mp3` };
const clipCache = {};
function playClip(kind) {
  if (isMuted() || !CLIPS[kind]) return false;
  try {
    const a = (clipCache[kind] ||= new Audio(CLIPS[kind]));
    a.currentTime = 0; a.volume = 1;
    a.play().catch(() => {});
    return true;
  } catch { return false; }
}
/** 첫 터치 때 미리 불러 두기 (휴대폰에서 바로 소리 나게) */
export function preloadVoices() { Object.keys(CLIPS).forEach((k) => { try { (clipCache[k] ||= new Audio(CLIPS[k])).load(); } catch { /* */ } }); }
/** "LEGEND!" — 영어 목소리로 크고 굵게 */
function sayLegend() {
  if (isMuted()) return;
  try {
    const en = speechSynthesis.getVoices().find((v) => /^en(-|_)?(US|GB)?/i.test(v.lang));
    const u = new SpeechSynthesisUtterance('Legend!');
    if (en) { u.voice = en; u.lang = en.lang; } else u.lang = 'en-US';
    u.rate = 0.8; u.pitch = 0.75; u.volume = 1;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  } catch { /* 음성 없음 */ }
}

const CALLOUTS = {
  easy: { text: 'EASY!', ko: '이지!', cls: 'co-easy', voice: '이지!', sfx: () => sfxOk() },
  nice: { text: 'NICE!', ko: '나이스!', cls: 'co-easy', voice: '나이스!', sfx: () => sfxOk() },
  yar: { text: '야르!', ko: '10연속 정답', cls: 'co-yar', voice: '야르!', sfx: () => legacySfx([523, 659, 784, 1047], 'square', 0.1, 0.06) },
  legend: { text: 'LEGEND!', ko: '레전드', cls: 'co-legend', voice: '레전드!', sfx: () => legacySfx([523, 659, 784, 1047, 1319, 1568], 'triangle', 0.16, 0.08) },
  oops: { text: '앗!', ko: '', cls: 'co-oops', voice: null, sfx: () => sfxNo() },
  wow: { text: 'GOOD!', ko: '', cls: 'co-easy', voice: null, sfx: () => sfxOk() }, // 목소리 없이 글자 · 효과음만 (이지·야르를 아끼려고)
};
/** 미니게임 연속 칭찬: 5연속 이지 · 10연속 야르 · 그 뒤 10개마다 야르 (그 사이는 목소리 없음) — 원장님 결정 */
export function comboCallout(n, sub, { first = 5, second = 10, every = 10 } = {}) {
  if (n === first) return callout('easy', sub);
  if (n === second || (n > second && every && (n - second) % every === 0)) return callout('yar', sub);
  return null;
}
export function callout(kind, sub) {
  const c = CALLOUTS[kind];
  if (!c) return;
  if (!isMuted()) { ac(); c.sfx(); }
  if (kind === 'legend') setTimeout(sayLegend, 120);
  else if (!playClip(kind) && c.voice) setTimeout(() => say(c.voice), 120);
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
