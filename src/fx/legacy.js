// ===================================================================
// 기존 앱(Step Up 4 · Movie Quiz)의 효과 엔진을 그대로 옮긴 모듈
//  - Web Audio 합성 BGM·효과음 (TRACKS / music)
//  - 댄서 캐릭터 SVG (dancerSVG / C / tedSVG) + 춤 동작 엔진 (CHOREO)
//  - 댄스 쇼 (dance: teacher, crew, finale, ma …) + "마!" 목소리
//  - 과자 그림 (PRIZE_ART: 초코파이 · 오예스 · 쿠키앤크림)
// 원본: legacy/index.html 810~1601행. 바꾼 곳은 setMuted의 버튼 표시 줄만 삭제.
// ===================================================================
/* eslint-disable */
/* =====================================================================
   AUDIO — synthesized BGM (different per stage) + dance tracks + SFX
   ===================================================================== */
let AC = null, muted = false, MASTER = null, NOISE = null;
function ac() {
  if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)();
    const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 6500;
    MASTER = AC.createGain(); MASTER.gain.value = .8; MASTER.connect(lp); lp.connect(AC.destination); } catch (e) {} }
  if (AC && AC.state === 'suspended') AC.resume();
  return AC;
}
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
function env(g, t, a, d, v) { g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(.0001, t + a + d); }
function osc(D, t, type, f, a, d, v, f2) {
  const o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + a + d);
  env(g, t, a, d, v); o.connect(g); g.connect(D); o.start(t); o.stop(t + a + d + .05);
}
function nz(D, t, ft, ff, d, v) {
  if (!NOISE) { NOISE = AC.createBuffer(1, AC.sampleRate, AC.sampleRate); const ch = NOISE.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1; }
  const s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
  s.buffer = NOISE; f.type = ft; f.frequency.value = ff; env(g, t, .002, d, v);
  s.connect(f); f.connect(g); g.connect(D); s.start(t, Math.random() * .5); s.stop(t + d + .05);
}
const I = {
  kick: (D, t, v = .9) => osc(D, t, 'sine', 150, .002, .3, v, 40),
  snare: (D, t, v = .35) => { nz(D, t, 'bandpass', 1800, .16, v); osc(D, t, 'triangle', 190, .002, .09, v * .6); },
  clap: (D, t, v = .3) => [0, .012, .024].forEach(o => nz(D, t + o, 'bandpass', 1300, .1, v)),
  hat: (D, t, v = .1, open) => nz(D, t, 'highpass', 7500, open ? .18 : .035, v),
  bass: (D, t, f, d, v = .3, type = 'triangle') => osc(D, t, type, f, .008, d, v),
  pluck: (D, t, f, v = .1) => osc(D, t, 'triangle', f, .003, .25, v),
  marimba: (D, t, f, v = .14) => { osc(D, t, 'sine', f, .002, .32, v); osc(D, t, 'sine', f * 4, .002, .05, v * .25); },
  pad: (D, t, fs, d, v = .04, type = 'triangle') => fs.forEach(f => osc(D, t, type, f, .12, d, v)),
  stab: (D, t, fs, v = .05) => fs.forEach(f => osc(D, t, 'square', f, .004, .13, v)),
  brass: (D, t, fs, d, v = .04) => fs.forEach(f => { osc(D, t, 'sawtooth', f, .04, d, v); osc(D, t, 'sawtooth', f * 1.006, .04, d, v * .7); }),
  zap: (D, t, v = .06) => osc(D, t, 'square', 1400, .002, .14, v, 160),
  tom: (D, t, f = 110, v = .7) => osc(D, t, 'sine', f, .002, .32, v, f * .55),
  trom: (D, t, f, d, v = .07) => { osc(D, t, 'sawtooth', f, .04, d, v, f * .9); osc(D, t, 'square', f / 2, .04, d, v * .4, f * .45); },
};
const CH = (arr) => arr.map(c => c.map(mtof));
const TRACKS = {
  // Stage 1 — sunny pop-funk
  s1: {bpm: 112, vol: .55, chords: CH([[60, 64, 67], [67, 71, 74], [69, 72, 76], [65, 69, 72]]), roots: [36, 43, 45, 41],
    play(s, b, t, D, p) { const c = p.chords[b], r = p.roots[b];
      if ([0, 7, 8, 10].includes(s)) I.kick(D, t, .7); if (s === 4 || s === 12) I.clap(D, t, .22);
      if (s % 2 === 0) I.hat(D, t, .05); if (s % 4 === 2) I.hat(D, t, .05, true);
      if ([0, 3, 6, 8, 11, 14].includes(s)) I.bass(D, t, mtof(r + (s === 6 || s === 14 ? 12 : 0)), .2, .26);
      if ([2, 6, 10, 14].includes(s)) c.forEach(f => I.pluck(D, t, f, .035));
      if (s === 0 || s === 9) I.marimba(D, t, c[2] * 2, .06); }},
  // Stage 2 — chill lo-fi
  s2: {bpm: 82, vol: .6, swing: .14, chords: CH([[62, 65, 69, 72], [55, 59, 65, 69], [60, 64, 67, 71], [57, 60, 64, 67]]), roots: [38, 31, 36, 33],
    play(s, b, t, D, p) { const c = p.chords[b], r = p.roots[b];
      if ([0, 7, 10].includes(s)) I.kick(D, t, .5); if (s === 4 || s === 12) I.snare(D, t, .15);
      if (s % 2 === 0) I.hat(D, t, .035);
      if (s === 0) I.pad(D, t, c, 2.6, .028); if (s === 0 || s === 10) I.bass(D, t, mtof(r), .9, .28, 'sine');
      if (s === 3 || s === 11) I.pluck(D, t, c[3] * 2, .03); if (s === 14 && b % 2) I.pluck(D, t, c[1] * 2, .025); }},
  // Stage 3 — Miami reggaeton
  s3: {bpm: 96, vol: .55, chords: CH([[57, 60, 64], [53, 57, 60], [60, 64, 67], [55, 59, 62]]), roots: [33, 29, 36, 31],
    play(s, b, t, D, p) { const c = p.chords[b], r = p.roots[b];
      if (s % 4 === 0) I.kick(D, t, .7); if ([3, 6, 11, 14].includes(s)) I.snare(D, t, .2);
      if (s % 2 === 1) I.hat(D, t, .045);
      if ([0, 3, 8, 11].includes(s)) I.bass(D, t, mtof(r), .22, .3, 'sine');
      if ([0, 2, 4, 7, 8, 10, 12, 15].includes(s)) I.marimba(D, t, c[(s >> 1) % 3] * 2, .07); }},
  disco: {bpm: 120, vol: .7, chords: CH([[57, 60, 64], [62, 65, 69], [55, 59, 62], [60, 64, 67]]), roots: [45, 50, 43, 48],
    play(s, b, t, D, p) { const r = p.roots[b];
      if (s % 4 === 0) I.kick(D, t); if (s % 4 === 2) I.hat(D, t, .09, true); if (s === 4 || s === 12) I.clap(D, t, .3);
      if (s % 2 === 0) I.bass(D, t, mtof(r - 12 + (s % 4 === 2 ? 12 : 0)), .12, .3, 'sawtooth');
      if (s === 0 || s === 10) I.stab(D, t, p.chords[b].map(f => f * 2), .03); }},
  break: {bpm: 98, vol: .7, roots: [40, 40, 43, 38],
    play(s, b, t, D, p) { const r = p.roots[b];
      if ([0, 7, 10].includes(s)) I.kick(D, t); if (s === 4 || s === 12) I.snare(D, t, .4); if (s === 15) I.snare(D, t, .12);
      if (s % 2 === 0) I.hat(D, t, .07);
      if ([0, 3, 6, 10, 13].includes(s)) I.bass(D, t, mtof(r + (s === 6 ? 7 : s === 13 ? 10 : 0)), .14, .3, 'square');
      if (s === 14 && b % 2) I.zap(D, t, .05); }},
  pop: {bpm: 100, vol: .7, roots: [41, 41, 44, 39],
    play(s, b, t, D, p) { const r = p.roots[b];
      if ([0, 3, 8, 11].includes(s)) I.kick(D, t); if (s === 4 || s === 12) I.clap(D, t, .3);
      if (s % 2 === 1) I.hat(D, t, .05); if (s === 7 || s === 15) I.zap(D, t, .06);
      if ([0, 2, 8, 10].includes(s)) I.bass(D, t, mtof(r), .08, .3, 'square'); }},
  crew: {bpm: 124, vol: .7, chords: CH([[60, 64, 67, 71], [57, 60, 64, 67], [62, 65, 69, 72], [55, 59, 62, 65]]), roots: [36, 33, 38, 31],
    play(s, b, t, D, p) { const r = p.roots[b];
      if (s % 4 === 0) I.kick(D, t); if (s === 4 || s === 12) I.clap(D, t, .3); if (s % 4 === 2) I.hat(D, t, .08, true);
      if ([3, 6, 11, 14].includes(s)) I.stab(D, t, p.chords[b], .028);
      if (s % 4 === 2) I.bass(D, t, mtof(r), .14, .32, 'sine'); }},
  run: {bpm: 150, vol: .62, roots: [48, 53, 48, 55],
    mel: [[72, 0, 76, 0, 79, 0, 76, 0, 77, 0, 81, 0, 79, 0, 76, 0], [74, 0, 77, 0, 81, 0, 77, 0, 79, 0, 76, 0, 74, 0, 72, 0],
          [72, 0, 76, 0, 79, 0, 84, 0, 83, 0, 79, 0, 81, 0, 79, 0], [77, 0, 76, 0, 74, 0, 72, 0, 74, 0, 76, 74, 72, 0, 0, 0]],
    play(s, b, t, D, p) { const r = p.roots[b], m = p.mel[b][s];
      if (s === 0 || s === 8 || s === 10) I.kick(D, t, .7); if (s === 4 || s === 12) I.snare(D, t, .22); if (s % 2 === 0) I.hat(D, t, .05);
      if (s % 2 === 0) I.bass(D, t, mtof(s % 4 === 0 ? r - 12 : r - 5), .12, .26, 'square');
      if (m) { osc(D, t, 'square', mtof(m), .004, .1, .05); osc(D, t, 'triangle', mtof(m + 12), .004, .06, .03); } }},
  // kart race — goofy oom-pah march: tuba on the beat, chord "pah" on the off-beat, bouncy marimba tune, woodblock, slide-whistle tag
  kart: {bpm: 116, vol: .66, swing: .16, roots: [36, 41, 43, 36], chords: CH([[60, 64, 67], [60, 65, 69], [59, 62, 67], [60, 64, 67]]),
    mel: [[72, 0, 76, 0, 79, 0, 76, 0, 77, 76, 74, 0, 72, 0, 0, 0], [69, 0, 72, 0, 77, 0, 72, 0, 74, 72, 69, 0, 67, 0, 0, 0],
          [71, 0, 74, 0, 79, 0, 74, 0, 77, 0, 76, 0, 74, 0, 71, 0], [72, 0, 0, 76, 0, 0, 79, 0, 84, 0, 0, 0, 0, 0, 0, 0]],
    play(s, b, t, D, p) { const r = p.roots[b], m = p.mel[b][s];
      if (s === 0 || s === 8) { I.bass(D, t, mtof(r), .2, .34, 'triangle'); I.kick(D, t, .45); }
      if (s === 4 || s === 12) { I.bass(D, t, mtof(r + 7), .16, .28, 'triangle'); I.stab(D, t, p.chords[b], .028); osc(D, t, 'sine', 1250, .001, .05, .07); }
      if (s % 4 === 2) osc(D, t, 'sine', 900, .001, .04, .05);
      if (m) I.marimba(D, t, mtof(m), .17);
      if (b === 3 && s === 11) osc(D, t, 'sine', 620, .02, .38, .07, 1500);
      if (b === 1 && s === 14) osc(D, t, 'square', mtof(79), .003, .05, .03); }},
  pyramid: {bpm: 128, vol: .72, chords: CH([[62, 66, 69], [59, 62, 66], [55, 59, 62], [57, 61, 64]]), roots: [38, 35, 31, 33],
    play(s, b, t, D, p) { const r = p.roots[b];
      if (s % 4 === 0) I.kick(D, t); if (s === 4 || s === 12) I.clap(D, t, .3); if (s % 2 === 1) I.hat(D, t, .06);
      if (s === 0) I.brass(D, t, p.chords[b], .5, .035);
      if (s % 4 === 2) I.bass(D, t, mtof(r), .14, .3, 'sawtooth');
      if (b === 3 && s >= 8) I.snare(D, t, .08 + (s - 8) * .03); }},
  finale: {bpm: 128, vol: .75, chords: CH([[60, 64, 67], [65, 69, 72], [67, 71, 74], [60, 64, 67]]), roots: [36, 41, 43, 36],
    play(s, b, t, D, p) { const r = p.roots[b];
      if (s % 4 === 0) I.kick(D, t); if (s === 4 || s === 12) I.clap(D, t, .32); if (s % 4 === 2) I.hat(D, t, .08, true);
      if ([0, 6, 12].includes(s)) I.brass(D, t, p.chords[b].map(f => f), .28, .04);
      if (s % 2 === 0) I.bass(D, t, mtof(r + (s % 4 === 2 ? 12 : 0)), .12, .28, 'sawtooth');
      if (s === 0 && b === 0) nz(D, t, 'highpass', 4000, 1.2, .12);
      if (b === 3 && s >= 12) I.tom(D, t, 160 - (s - 12) * 20, .5); }},
  ma: {bpm: 104, vol: .8,
    play(s, b, t, D) {
      if ([0, 4, 8, 10, 12].includes(s)) { I.tom(D, t, 90, .9); I.clap(D, t, .25); }
      if (s === 0) I.brass(D, t, [mtof(55), mtof(62), mtof(67)], .35, .05);
      if (s % 2 === 1) I.hat(D, t, .04); }},
  boo: {bpm: 76, vol: .75,
    play(s, b, t, D) {
      if (s === 0 || s === 8) I.bass(D, t, mtof(31 - b), .4, .35, 'sine'); if (s === 4 || s === 12) I.snare(D, t, .15);
      if (s === 0) I.trom(D, t, mtof(62 - b * 2), .9, .06); if (s === 8) I.trom(D, t, mtof(61 - b * 2), .9, .06); }},
};
const MUS = {timer: null, gain: null, cur: null};
function music(name) {
  musicStop(); MUS.cur = name; if (muted || !name || !ac()) return;
  const P = TRACKS[name], g = AC.createGain(); g.gain.value = P.vol; g.connect(MASTER); MUS.gain = g;
  let step = 0, next = AC.currentTime + .06;
  MUS.timer = setInterval(() => {
    const spb = 60 / P.bpm / 4;
    while (next < AC.currentTime + .15) {
      const s = step % 16, b = Math.floor(step / 16) % 4;
      try { P.play(s, b, next, g, P); } catch (e) {}
      const sw = P.swing ? (s % 2 === 0 ? 1 + P.swing : 1 - P.swing) : 1;
      next += spb * sw; step++;
    }
  }, 25);
}
function musicStop() {
  if (MUS.timer) clearInterval(MUS.timer); MUS.timer = null;
  if (MUS.gain && AC) { const g = MUS.gain; g.gain.setTargetAtTime(.0001, AC.currentTime, .06); setTimeout(() => g.disconnect(), 500); }
  MUS.gain = null;
}
const sfx = (fs, type, v, gap) => { if (muted || !ac()) return; fs.forEach((f, i) => osc(MASTER, AC.currentTime + i * gap, type, f, .005, .14, v)); };
// correct: bright rising bell chime "띵-동-딩!" · wrong: low double buzzer "삐-빅"
function sfxOk() { if (muted || !ac()) return; const t = AC.currentTime + .01;
  [1046.5, 1318.5, 1568, 2093].forEach((f, i) => { osc(MASTER, t + i * .075, 'triangle', f, .004, .32, .34); osc(MASTER, t + i * .075, 'sine', f * 2, .004, .16, .1); });
  osc(MASTER, t + .3, 'sine', 3136, .004, .25, .08); }
function sfxNo() { if (muted || !ac()) return; const t = AC.currentTime + .01;
  [0, .22].forEach(d => { osc(MASTER, t + d, 'sawtooth', 146, .006, .17, .26, 120); osc(MASTER, t + d, 'square', 151, .006, .17, .12, 124); }); }
function setMuted(m) {
  muted = m; const t = muted ? '🔇' : '🔊';
  if (muted) { const c = MUS.cur; musicStop(); MUS.cur = c; } else if (MUS.cur) music(MUS.cur);
}

/* =====================================================================
   CHARACTERS — SVG hip-hop crew
   ===================================================================== */
const OUT = '#1B2F4E';
const LN = (x1, y1, x2, y2, col, w) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${OUT}" stroke-width="${w + 5}" stroke-linecap="round"/><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>`;
const GR = (cls, ox, oy, inner) => `<g class="${cls}" style="transform-origin:${ox}px ${oy}px">${inner}</g>`;
const ST = `stroke="${OUT}" stroke-width="2.5"`;

const TED_ART = `<ellipse cx="75" cy="141" rx="26" ry="4.5" fill="rgba(42,26,23,.13)"/>    <g class="tWhole" style="transform-origin:75px 141px">     <g class="tLegL" style="transform-origin:66px 118px"><path d="M66 118 L66 133" stroke="#2A2A30" stroke-width="4.5" stroke-linecap="round"/><ellipse cx="64.5" cy="135" rx="6" ry="2.6" fill="#0E0E12"/></g>     <g class="tLegR" style="transform-origin:84px 118px"><path d="M84 118 L84 133" stroke="#2A2A30" stroke-width="4.5" stroke-linecap="round"/><ellipse cx="85.5" cy="135" rx="6" ry="2.6" fill="#0E0E12"/></g>     <g class="tSkirt" style="transform-origin:75px 107px">       <g fill="#FFFFFF" stroke="#E8C9D2" stroke-width=".8"><circle cx="49.5" cy="131.6" r="2.5"/><circle cx="54.5" cy="132.3" r="2.5"/><circle cx="59.5" cy="132.9" r="2.5"/><circle cx="64.5" cy="133.3" r="2.5"/><circle cx="69.5" cy="133.6" r="2.5"/><circle cx="74.5" cy="133.6" r="2.5"/><circle cx="79.5" cy="133.6" r="2.5"/><circle cx="84.5" cy="133.4" r="2.5"/><circle cx="89.5" cy="133.0" r="2.5"/><circle cx="94.5" cy="132.4" r="2.5"/><circle cx="99.5" cy="131.7" r="2.5"/></g>       <path d="M61.5 107 C55.5 110 48.5 119 48.5 129.5 Q75 134 101.5 129.5 C101.5 119 94.5 110 88.5 107 Z" fill="#FFD3DF" stroke="#F2AFC3" stroke-width="1"/>       <path d="M67.5 109 Q61 118 59 130.8 M75 109.5 L75 132.2 M82.5 109 Q89 118 91 130.8" stroke="#F4B6C8" stroke-width="1.1" fill="none"/>       <path d="M48.5 129.5 Q75 134 101.5 129.5" stroke="#FFFFFF" stroke-width="1.8" fill="none"/>       <g fill="#F0C4D0"><circle cx="49.5" cy="131.3" r=".75"/><circle cx="54.5" cy="132.0" r=".75"/><circle cx="59.5" cy="132.6" r=".75"/><circle cx="64.5" cy="133.0" r=".75"/><circle cx="69.5" cy="133.3" r=".75"/><circle cx="74.5" cy="133.3" r=".75"/><circle cx="79.5" cy="133.3" r=".75"/><circle cx="84.5" cy="133.1" r=".75"/><circle cx="89.5" cy="132.7" r=".75"/><circle cx="94.5" cy="132.1" r=".75"/><circle cx="99.5" cy="131.4" r=".75"/></g>     </g>     <path d="M62 86 Q62 81 68 80 L82 80 Q88 81 88 86 L88 109 L62 109 Z" fill="#FFFFFF" stroke="#CFC9C2" stroke-width="1.3"/>     <path d="M75 82 L75 109" stroke="#DCD6CF" stroke-width="1.2"/>     <circle cx="75" cy="91" r="1.1" fill="#BDB5AC"/><circle cx="75" cy="98" r="1.1" fill="#BDB5AC"/><circle cx="75" cy="105" r="1.1" fill="#BDB5AC"/>     <path d="M79.5 89 L85 89 L85 94 Q82.3 95.5 79.5 94 Z" fill="none" stroke="#D3CDC6" stroke-width="1"/><path d="M81 87.5 L81 90.5" stroke="#3A6FD8" stroke-width="1.6" stroke-linecap="round"/>     <path d="M68 79 L75 85 L71 89 L65.5 82 Z M82 79 L75 85 L79 89 L84.5 82 Z" fill="#FFFFFF" stroke="#C9C2BA" stroke-width="1.1" stroke-linejoin="round"/>     <rect x="61" y="106.5" width="28" height="3.6" rx="1.5" fill="#2B2B33"/><rect x="73" y="106" width="4.5" height="4.6" rx="1" fill="#B9A37A"/>     <path d="M71.5 76 L78.5 76 L78 80.5 L72 80.5 Z" fill="#FFE0C2"/>     <g class="tHead" style="transform-origin:75px 80px"><g transform="translate(75 79) scale(1.16) translate(-75 -79)">     <circle cx="75" cy="56" r="23" fill="#FFE0C2"/>     <ellipse cx="52.5" cy="59" rx="3.4" ry="4.8" fill="#F7CFAE"/><ellipse cx="97.5" cy="59" rx="3.4" ry="4.8" fill="#F7CFAE"/>     <path d="M52.5 54 Q51 40 58 35 L58.5 31 L62 34 L63.5 29 L67 32.5 L69 27.5 L72 31.5 L74.5 26.5 L77 31 L80 27 L82 31.5 L85.5 28.5 L87 33 L90.5 31 L91.5 35.5 Q98.5 40 97.5 54 Q96 46 91 44 Q75 39.5 59 44 Q54 46 52.5 54Z" fill="#2B2724"/>     <path d="M53.5 50 Q53 54 54.5 57 M96.5 50 Q97 54 95.5 57" stroke="#2B2724" stroke-width="2.6" fill="none" stroke-linecap="round"/>     <g class="blink" style="transform-origin:75px 57px">       <path d="M64.4 57.4 L68.6 57.4 L68.4 58.6 Q66.5 59.6 64.6 58.6 Z M81.4 57.4 L85.6 57.4 L85.4 58.6 Q83.5 59.6 81.6 58.6 Z" fill="#2A1E1C"/>       <path d="M63.8 57.3 L69.2 57.3 M80.8 57.3 L86.2 57.3" stroke="#2A1E1C" stroke-width="1.3" stroke-linecap="round"/>       <path d="M63 55.3 L70.2 55.3 M79.8 55.3 L87 55.3" stroke="#1E1A18" stroke-width="2" fill="none" stroke-linecap="round"/>     </g>     <rect x="59.3" y="51.6" width="14.4" height="10.3" rx="2.2" fill="none" stroke="#111012" stroke-width="2.8"/>     <rect x="76.3" y="51.6" width="14.4" height="10.3" rx="2.2" fill="none" stroke="#111012" stroke-width="2.8"/>     <path d="M73.5 55 Q75 53.5 76.5 55" stroke="#111012" stroke-width="2.2" fill="none"/>     <path d="M59.5 54.3 L54.5 53.3 M90.5 54.3 L95.5 53.3" stroke="#111012" stroke-width="2.2" stroke-linecap="round"/>          <path d="M58.5 64.8 Q75 61.8 91.5 64.8 Q92.5 74 85 77.5 Q75 80.5 65 77.5 Q57.5 74 58.5 64.8 Z" fill="#FFFFFF" stroke="#D3CDC6" stroke-width="1.15"/>     <path d="M60 68.3 Q75 65.6 90 68.3 M60.8 71.8 Q75 69.2 89.2 71.8 M63 75 Q75 72.8 87 75" stroke="#E9E4DF" stroke-width=".95" fill="none"/>     <path d="M58.8 66 L53 60.5 M91.2 66 L97 60.5" stroke="#EAE6E1" stroke-width="1.3" stroke-linecap="round"/>     </g></g>      <g class="tArmL" style="transform-origin:62.5px 85px">       <path d="M62.5 85 L59.5 94" stroke="#CFC9C2" stroke-width="7.5" stroke-linecap="round" fill="none"/><path d="M62.5 85 L59.5 94" stroke="#FFFFFF" stroke-width="5.5" stroke-linecap="round" fill="none"/>       <g class="tForeL" style="transform-origin:59.5px 94px"><path d="M59.5 94 L58 102" stroke="#CFC9C2" stroke-width="7.5" stroke-linecap="round" fill="none"/><path d="M59.5 94 L58 102" stroke="#FFFFFF" stroke-width="5.5" stroke-linecap="round" fill="none"/><circle cx="58" cy="104" r="3.6" fill="#FFE0C2"/></g></g>     <g class="tArmR" style="transform-origin:87.5px 85px">       <path d="M87.5 85 Q91 92 91 99" stroke="#CFC9C2" stroke-width="7.5" stroke-linecap="round" fill="none"/><path d="M87.5 85 Q91 92 91 99" stroke="#FFFFFF" stroke-width="5.5" stroke-linecap="round" fill="none"/>       <g class="tForeR" style="transform-origin:91px 99px"><path d="M91 99 Q95 97.5 98 93" stroke="#CFC9C2" stroke-width="7.5" stroke-linecap="round" fill="none"/><path d="M91 99 Q95 97.5 98 93" stroke="#FFFFFF" stroke-width="5.5" stroke-linecap="round" fill="none"/>       <g transform="rotate(-6 99 88)">         <path d="M87 80 Q93 79.2 99 81.6 L110.5 80 L110.5 94.5 Q104.5 93.6 99 96 Q93 93.6 87 94.5 Z" fill="#F6EFE4" stroke="#D9CFC0" stroke-width=".7"/>         <path d="M86 81.2 Q92.5 80.6 99 83 L99 97 Q92.5 94.8 86 95.6 Z" fill="#8E2222"/>         <path d="M112 81.2 Q105.5 80.6 99 83 L99 97 Q105.5 94.8 112 95.6 Z" fill="#7A1C1C"/>         <path d="M99 83 L99 97" stroke="#5E1212" stroke-width="2.2" stroke-linecap="round"/>         <rect x="88.8" y="85.5" width="7" height="1.6" rx=".8" fill="#C9A04A" transform="rotate(6 92 86)"/><rect x="89.5" y="88.6" width="5.4" height="1.1" rx=".5" fill="#C9A04A" opacity=".8" transform="rotate(6 92 89)"/>       </g>       <circle cx="98.5" cy="93" r="3.8" fill="#FFE0C2"/></g></g>    </g>    `;
const tedSVG = () => `<svg viewBox="22.5 2.6 105 146" class="dz ted">${TED_ART}</svg>`;
function dancerSVG(c) {
  if (c.ted) return tedSVG();
  const sk = c.skin, tc = c.topCol, tc2 = c.topCol2 || '#fff', bc = c.botCol, top = c.top || 'tee', bot = c.bot || 'baggy', shoe = c.shoe || '#fff';
  const upper = (top === 'tank' || top === 'crop') ? sk : top === 'overalls' ? tc2 : tc;
  const fore = (top === 'hoodie' || top === 'jacket' || top === 'track') ? tc : sk;
  const hcol = c.glove || sk;
  const fist = (x, y, prop) => {
    if (prop === 'gun') { // inflatable foam-finger glove (white): long index finger, puffy palm with curled-finger bumps, thumb, wrist cuff
      const S = `stroke="${OUT}" stroke-width="3" stroke-linejoin="round"`;
      return `<g class="gunSide">`
        + `<path d="M${x - 16} ${y - 6} Q${x - 26} ${y + 4} ${x - 24} ${y + 14} Q${x - 31} ${y + 18} ${x - 27} ${y + 26} Q${x - 32} ${y + 31} ${x - 26} ${y + 38} Q${x - 28} ${y + 45} ${x - 18} ${y + 47} L${x - 9} ${y + 47} L${x - 9} ${y + 72} Q${x - 9} ${y + 84} ${x + 1} ${y + 84} Q${x + 11} ${y + 84} ${x + 11} ${y + 72} L${x + 12} ${y + 40} Q${x + 26} ${y + 34} ${x + 28} ${y + 20} Q${x + 30} ${y + 6} ${x + 18} ${y + 4} L${x + 16} ${y - 6} Z" fill="#fff" ${S}/>`
        + `<path d="M${x - 24} ${y + 14} Q${x - 16} ${y + 18} ${x - 10} ${y + 15} M${x - 27} ${y + 26} Q${x - 18} ${y + 30} ${x - 10} ${y + 27} M${x - 26} ${y + 38} Q${x - 18} ${y + 41} ${x - 10} ${y + 39}" stroke="#AEB9C8" stroke-width="2" fill="none" stroke-linecap="round"/>`
        + `<path d="M${x + 12} ${y + 40} Q${x + 4} ${y + 28} ${x + 18} ${y + 8}" stroke="#AEB9C8" stroke-width="2" fill="none" stroke-linecap="round"/>`
        + `<path d="M${x + 6} ${y + 50} L${x + 7} ${y + 72} Q${x + 7} ${y + 80} ${x + 2} ${y + 81} L${x + 2} ${y + 50} Z" fill="#E3E9F1"/>`
        + `<path d="M${x - 5} ${y + 54} L${x - 5} ${y + 72}" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`
        + `<ellipse cx="${x - 12}" cy="${y + 4}" rx="4" ry="7" fill="#F4F7FB" transform="rotate(20 ${x - 12} ${y + 4})"/>`
        + `<rect x="${x - 17}" y="${y - 14}" width="34" height="12" rx="5" fill="#EEF2F7" ${S}/><path d="M${x - 13} ${y - 8} L${x + 13} ${y - 8}" stroke="#C9D2DE" stroke-width="2"/></g>`; }
    if (prop === 'pie') return `<ellipse cx="${x}" cy="${y - 4}" rx="22" ry="9" fill="#3E1C0B" ${ST}/><rect x="${x - 21}" y="${y - 14}" width="42" height="7" fill="#FFF6E8"/><ellipse cx="${x}" cy="${y - 16}" rx="22" ry="10" fill="#4A220E" ${ST}/><path d="M${x - 12} ${y - 20} Q${x - 2} ${y - 26} ${x + 9} ${y - 24}" stroke="#8A5A3A" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="${x}" cy="${y}" r="7" fill="${hcol}" ${ST}/>`;
    if (prop === 'point') return `<rect x="${x - 3}" y="${y + 1}" width="6" height="16" rx="3" fill="${hcol}" ${ST}/><circle cx="${x}" cy="${y}" r="7.5" fill="${hcol}" ${ST}/>`;
    if (prop === 'book') return `<g class="book"><rect x="${x - 19}" y="${y - 13}" width="34" height="25" rx="2.5" fill="#2E9BDA" ${ST}/><rect x="${x - 16}" y="${y - 10}" width="28" height="19" fill="#fff"/><line x1="${x - 2}" y1="${y - 10}" x2="${x - 2}" y2="${y + 9}" stroke="${OUT}" stroke-width="1.5"/><text x="${x - 2}" y="${y + 3}" font-size="6" font-weight="900" font-family="Inter,Arial" text-anchor="middle" fill="#1B2F4E">ENGLISH</text></g><circle cx="${x}" cy="${y}" r="7" fill="${hcol}" ${ST}/>`;
    if (prop === 'thumb') return `<rect x="${x - 3.5}" y="${y + 2}" width="7" height="15" rx="3.5" fill="${hcol}" ${ST}/><circle cx="${x}" cy="${y}" r="8" fill="${hcol}" ${ST}/>`;
    return `<circle cx="${x}" cy="${y}" r="7" fill="${hcol}" ${ST}/>`;
  };
  const wrist = (x, y) => c.wrist ? `<rect x="${x - 7}" y="${y - 15}" width="14" height="6" rx="2" fill="${c.wrist}" stroke="${OUT}" stroke-width="1.5"/>` : '';
  const armL = GR('armL', 52, 95, LN(52, 95, 49, 121, upper, 12) + GR('foreL', 49, 121, LN(49, 121, 48, 145, fore, 10) + wrist(48, 149) + fist(48, 149, c.propL)));
  const armR = GR('armR', 88, 95, LN(88, 95, 91, 121, upper, 12) + GR('foreR', 91, 121, LN(91, 121, 92, 145, fore, 10) + wrist(92, 149) + fist(92, 149, c.propR)));
  // legs
  const tw = bot === 'joggers' || bot === 'slacks' ? 13 : 17, sw = bot === 'joggers' || bot === 'slacks' ? 12 : bot === 'shorts' ? 11 : 16;
  const shinCol = bot === 'shorts' ? sk : bc;
  const extra = (x, y) => (bot === 'flare' ? `<path d="M${x - 9} ${y - 12} L${x + 9} ${y - 12} L${x + 13} ${y + 2} L${x - 13} ${y + 2} Z" fill="${bc}" ${ST}/>` : '')
    + (bot === 'shorts' ? `<rect x="${x - 6}" y="${y - 10}" width="12" height="8" fill="#fff" stroke="${OUT}" stroke-width="1.5"/>` : '')
    + (bot === 'joggers' ? `<rect x="${x - 7}" y="${y - 6}" width="14" height="5" rx="2" fill="${c.cuff || '#fff'}" stroke="${OUT}" stroke-width="1.5"/>` : '');
  const shoeG = (x, y, dir) => (c.high ? `<rect x="${x - 8}" y="${y - 9}" width="16" height="13" rx="3" fill="${shoe}" ${ST}/>` : '')
    + `<ellipse cx="${x + dir * 5}" cy="${y + 3}" rx="${c.platform ? 14 : 13}" ry="${c.platform ? 9 : 7.5}" fill="${shoe}" ${ST}/><line x1="${x + dir * 5 - 11}" y1="${y + 8}" x2="${x + dir * 5 + 11}" y2="${y + 8}" stroke="#fff" stroke-width="2.2"/>`;
  const thighL = bot === 'shorts' ? `<rect x="51" y="138" width="20" height="26" rx="7" fill="${bc}" ${ST}/>` : '';
  const thighR = bot === 'shorts' ? `<rect x="69" y="138" width="20" height="26" rx="7" fill="${bc}" ${ST}/>` : '';
  const legL = GR('legL', 61, 140, LN(61, 140, 60, 178, bot === 'shorts' ? sk : bc, bot === 'shorts' ? 11 : tw) + thighL + GR('shinL', 60, 178, LN(60, 178, 59, 210, shinCol, sw) + extra(59, 210) + shoeG(59, 212, -1)));
  const legR = GR('legR', 79, 140, LN(79, 140, 80, 178, bot === 'shorts' ? sk : bc, bot === 'shorts' ? 11 : tw) + thighR + GR('shinR', 80, 178, LN(80, 178, 81, 210, shinCol, sw) + extra(81, 210) + shoeG(81, 212, 1)));
  // torso
  let torso = '';
  if (top === 'hoodie') torso += `<path d="M49 98 Q46 80 70 79 Q94 80 91 98 Z" fill="${tc}" ${ST}/>`;
  const baseFill = top === 'overalls' ? tc2 : top === 'jersey' ? '#fff' : tc;
  torso += `<rect x="49" y="86" width="42" height="58" rx="13" fill="${top === 'crop' ? sk : baseFill}" stroke="${OUT}" stroke-width="3"/>`;
  if (top === 'crop') torso += `<rect x="49" y="86" width="42" height="30" rx="12" fill="${tc}" stroke="${OUT}" stroke-width="3"/><circle cx="70" cy="124" r="1.6" fill="${OUT}"/>`;
  if (top === 'tank') torso += `<path d="M56 87 Q70 100 84 87" stroke="${OUT}" stroke-width="2" fill="${sk}"/>`;
  if (top === 'jacket' || top === 'track') torso += `<rect x="63" y="88" width="14" height="52" fill="${tc2}" stroke="${OUT}" stroke-width="2"/>` + (top === 'track' ? `<line x1="52" y1="92" x2="52" y2="140" stroke="#fff" stroke-width="3"/><line x1="88" y1="92" x2="88" y2="140" stroke="#fff" stroke-width="3"/>` : `<path d="M60 87 L66 100 L63 87Z M80 87 L74 100 L77 87Z" fill="${OUT}"/>`);
  if (top === 'hoodie') torso += `<rect x="57" y="118" width="26" height="13" rx="5" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="2"/><line x1="65" y1="90" x2="64" y2="104" stroke="#fff" stroke-width="2"/><line x1="75" y1="90" x2="76" y2="104" stroke="#fff" stroke-width="2"/>`;
  if (top === 'overalls') torso += `<rect x="56" y="104" width="28" height="36" rx="4" fill="${bc}" ${ST}/><line x1="57" y1="105" x2="53" y2="88" stroke="${bc}" stroke-width="5"/><line x1="83" y1="105" x2="87" y2="88" stroke="${bc}" stroke-width="5"/><circle cx="60" cy="108" r="2" fill="#FFD43B"/><circle cx="80" cy="108" r="2" fill="#FFD43B"/>`;
  if (top === 'jersey') { for (let x = 54; x < 90; x += 6) torso += `<line x1="${x}" y1="88" x2="${x}" y2="142" stroke="${tc}" stroke-width="1" opacity=".5"/>`; }
  if (c.print) torso += `<text x="70" y="${top === 'crop' ? 108 : 125}" font-family="Inter,Arial" font-weight="900" font-size="${c.print.length > 2 ? 13 : 21}" text-anchor="middle" fill="${c.printCol || '#fff'}">${c.print}</text>`;
  if (c.tie) torso += `<path d="M67 88 L73 88 L71.5 93 L74 118 L70 124 L66 118 L68.5 93 Z" fill="${c.tie}" stroke="${OUT}" stroke-width="1.6"/>`;
  if (c.badge) torso += `<rect x="78" y="100" width="11" height="7" rx="1.5" fill="#fff" stroke="${OUT}" stroke-width="1.2"/><text x="83.5" y="105.6" font-size="4.6" font-weight="900" font-family="Inter,Arial" text-anchor="middle" fill="${OUT}">${c.badge}</text>`;
  if (c.chain) torso += `<path d="M59 88 Q70 110 81 88" stroke="#F2C14E" stroke-width="3.5" fill="none"/><circle cx="70" cy="105" r="4.5" fill="#F2C14E" ${ST}/>`;
  if (c.phones) torso += `<path d="M55 90 Q70 104 85 90" stroke="#222" stroke-width="4" fill="none"/><circle cx="55" cy="90" r="6.5" fill="${c.phones}" ${ST}/><circle cx="85" cy="90" r="6.5" fill="${c.phones}" ${ST}/>`;
  torso += `<rect x="51" y="${top === 'crop' ? 124 : 131}" width="38" height="${top === 'crop' ? 22 : 15}" rx="6" fill="${bc}" stroke="${OUT}" stroke-width="3"/>`;
  // hair & hats
  const hc = c.hairCol || '#1A1410';
  let hb = '', hf = '';
  const curls = (pts, r, col, s = 2.2) => pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${col}" stroke="${OUT}" stroke-width="${s}"/>`).join('');
  switch (c.hair) {
    case 'perm': hb = curls([[44, 72], [96, 72], [42, 60], [98, 60], [46, 47], [94, 47], [55, 37], [85, 37], [70, 33]], 12.5, hc) + `<circle cx="70" cy="54" r="27" fill="${hc}"/>`;
      hf = curls([[54, 44], [64, 40], [76, 40], [86, 44]], 8, hc, 1.6); break;
    case 'afro': hb = `<circle cx="70" cy="50" r="35" fill="${hc}" ${ST}/>` + curls([[42, 66], [98, 66]], 11, hc); break;
    case 'braids': hf = `<path d="M46 60 Q46 35 70 35 Q94 35 94 60 Q88 45 70 46 Q52 45 46 60Z" fill="${hc}" ${ST}/><path d="M58 37 Q57 46 54 54 M70 35 L70 46 M82 37 Q83 46 86 54" stroke="#3a2a20" stroke-width="2" fill="none"/>`;
      hb = `<path d="M48 60 Q44 85 47 104" stroke="${hc}" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M92 60 Q96 85 93 104" stroke="${hc}" stroke-width="7" fill="none" stroke-linecap="round"/><circle cx="47" cy="106" r="4" fill="${c.bead || '#E21E8C'}"/><circle cx="93" cy="106" r="4" fill="${c.bead || '#E21E8C'}"/>`; break;
    case 'bun': hf = `<path d="M46 60 Q46 35 70 35 Q94 35 94 60 Q88 46 70 47 Q54 47 46 60Z" fill="${hc}" ${ST}/>`; hb = `<circle cx="70" cy="31" r="12" fill="${hc}" ${ST}/>`; break;
    case 'pony': hb = `<path d="M92 50 Q112 58 104 84" stroke="${hc}" stroke-width="12" fill="none" stroke-linecap="round"/>`; hf = `<path d="M46 60 Q46 35 70 35 Q94 35 94 60 Q88 46 70 47 Q54 47 46 60Z" fill="${hc}" ${ST}/>`; break;
    case 'mohawk': hf = `<path d="M58 44 L62 18 L67 38 L71 14 L75 38 L80 20 L83 44 Z" fill="${hc}" ${ST}/><path d="M48 56 Q48 46 56 42 M92 56 Q92 46 84 42" stroke="#555" stroke-width="2" fill="none" opacity=".5"/>`; break;
    case 'curly': hf = curls([[50, 52], [56, 42], [66, 37], [77, 37], [87, 42], [92, 52]], 9.5, hc, 2); break;
    case 'short': hf = `<path d="M47 58 Q47 36 70 36 Q93 36 93 58 Q86 46 70 46 Q54 46 47 58Z" fill="${hc}" ${ST}/>`; break;
    case 'buzz': hf = `<path d="M47 56 Q48 37 70 37 Q92 37 93 56 Q85 47 70 47 Q55 47 47 56Z" fill="${hc}" opacity=".85"/>`; break;
  }
  const hat = c.hat, h1 = c.hatCol, h2 = c.hatCol2 || '#fff';
  let hh = '';
  if (hat === 'snapF') hh = `<path d="M46 57 Q47 33 70 33 Q93 33 94 57 Z" fill="${h1}" ${ST}/><path d="M92 54 L116 58 Q116 50 92 46 Z" fill="${h2}" ${ST}/><circle cx="70" cy="34" r="3" fill="${h2}"/>`;
  if (hat === 'snapB') hh = `<path d="M46 57 Q47 33 70 33 Q93 33 94 57 Z" fill="${h1}" ${ST}/><path d="M48 54 L24 58 Q24 50 48 46 Z" fill="${h2}" ${ST}/><circle cx="70" cy="34" r="3" fill="${h2}"/>`;
  if (hat === 'bucket') hh = `<path d="M50 50 Q52 30 70 30 Q88 30 90 50 Z" fill="${h1}" ${ST}/><path d="M38 56 Q70 42 102 56 L98 61 Q70 50 42 61 Z" fill="${h1}" ${ST}/><line x1="51" y1="48" x2="89" y2="48" stroke="${h2}" stroke-width="3"/>`;
  if (hat === 'beanie') hh = `<path d="M46 55 Q46 29 70 29 Q94 29 94 55 Z" fill="${h1}" ${ST}/><rect x="44" y="49" width="52" height="9" rx="4.5" fill="${h2}" ${ST}/><circle cx="70" cy="26" r="7" fill="${h2}" ${ST}/>`;
  if (hat === 'bandana') hh = `<path d="M46 52 Q70 38 94 52 L94 58 Q70 45 46 58 Z" fill="${h1}" ${ST}/><path d="M93 54 L106 50 L102 60 Z M93 55 L104 64 L96 64 Z" fill="${h1}" ${ST}/><circle cx="60" cy="50" r="1.6" fill="#fff"/><circle cx="70" cy="46" r="1.6" fill="#fff"/><circle cx="80" cy="50" r="1.6" fill="#fff"/>`;
  if (hat === 'headband') hh = `<rect x="45" y="47" width="50" height="8" rx="4" fill="${h1}" ${ST}/>`;
  if (hat === 'bag') hh = `<path d="M44 64 Q38 30 70 26 Q102 30 96 64 Q70 54 44 64 Z" fill="#FF8A1E" ${ST}/><path d="M56 30 Q52 12 62 14 Q70 16 64 30" stroke="#FF8A1E" stroke-width="6" fill="none"/><path d="M84 30 Q88 12 78 14 Q70 16 76 30" stroke="#FF8A1E" stroke-width="6" fill="none"/><path d="M56 40 Q60 50 58 58 M84 40 Q80 50 82 58" stroke="#FFB366" stroke-width="2.5" fill="none"/>`;
  // face
  let eyes = c.glasses === 'round'
    ? `<circle cx="61" cy="61" r="7.5" fill="#111"/><circle cx="79" cy="61" r="7.5" fill="#111"/><line x1="68" y1="60" x2="72" y2="60" stroke="#111" stroke-width="2"/><circle cx="59" cy="59" r="2" fill="#fff" opacity=".7"/>`
    : c.glasses ? `<rect x="52" y="56" width="16" height="9" rx="3.5" fill="#111"/><rect x="72" y="56" width="16" height="9" rx="3.5" fill="#111"/><line x1="68" y1="59" x2="72" y2="59" stroke="#111" stroke-width="2"/><line x1="55" y1="58" x2="60" y2="58" stroke="#fff" stroke-width="1.5" opacity=".7"/>`
    : (c.face === 'boo' || c.face === 'shout') ? `<path d="M55 61 l8 -3 M85 61 l-8 -3" stroke="${OUT}" stroke-width="3" stroke-linecap="round"/>`
    : `<circle cx="62" cy="60" r="3.2" fill="${OUT}"/><circle cx="78" cy="60" r="3.2" fill="${OUT}"/><circle cx="63" cy="59" r="1" fill="#fff"/><circle cx="79" cy="59" r="1" fill="#fff"/>`;
  if (c.eyes === 'happy') eyes = (c.glasses ? '' : '') + `<path d="M56 62 Q61 55 66 62" stroke="${OUT}" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M74 62 Q79 55 84 62" stroke="${OUT}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  if (c.brows) eyes += `<path d="M55 52 Q61 48 67 51 M73 51 Q79 48 85 52" stroke="${c.hairCol || OUT}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  if (c.lash) eyes += `<path d="M58 57 l-3 -2 M82 57 l3 -2" stroke="${OUT}" stroke-width="2"/>`;
  const mouth = {
    boo: `<path d="M60 69 Q70 83 80 69 Z" fill="#5A1220" ${ST}/><ellipse cx="73" cy="77" rx="5" ry="4.5" fill="#FF7AA8"/>`,
    shout: `<ellipse cx="70" cy="74" rx="8" ry="10" fill="#5A1220" ${ST}/><ellipse cx="70" cy="79" rx="5" ry="3.5" fill="#FF7AA8"/>`,
    grin: `<path d="M60 69 Q70 82 80 69 Z" fill="#fff" ${ST}/>`,
    smirk: `<path d="M62 72 Q72 76 79 68" stroke="${OUT}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  }[c.face] || `<path d="M61 70 Q70 78 79 70" stroke="${OUT}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  const lips = c.lips ? `<path d="M63 71 Q70 75 77 71" stroke="${c.lips}" stroke-width="3" fill="none"/>` : '';
  const cheeks = `<circle cx="55" cy="68" r="4" fill="#FF8FB1" opacity=".45"/><circle cx="85" cy="68" r="4" fill="#FF8FB1" opacity=".45"/>`;
  const ear = c.hoops ? `<circle cx="46" cy="70" r="5" fill="none" stroke="#F2C14E" stroke-width="2.5"/><circle cx="94" cy="70" r="5" fill="none" stroke="#F2C14E" stroke-width="2.5"/>` : '';
  const mask = c.mask ? `<path d="M47 62 L52 66 M93 62 L88 66" stroke="#C9CED6" stroke-width="2"/><path d="M52 64 Q70 59 88 64 L87 76 Q70 89 53 76 Z" fill="${c.mask}" stroke="${OUT}" stroke-width="2.2"/><path d="M55 69 Q70 66 85 69 M56 74 Q70 72 84 74" stroke="rgba(0,0,0,.18)" stroke-width="1.5" fill="none"/>` : '';
  const head = GR('head', 70, 86, hb + `<rect x="64" y="78" width="12" height="12" fill="${sk}" stroke="${OUT}" stroke-width="2"/><circle cx="70" cy="61" r="24" fill="${sk}" stroke="${OUT}" stroke-width="3"/>` + hf + hh + eyes + (c.mask ? '' : mouth + lips) + (c.mask ? '' : cheeks) + ear + mask);
  const whole = GR('whole', 70, 140, legL + legR + torso + head + armL + armR);
  return `<svg viewBox="-20 -14 180 250" class="dz"><ellipse cx="70" cy="223" rx="38" ry="6" fill="rgba(0,0,0,.14)"/>${whole}</svg>`;
}

/* Cast — diverse Miami street crew */
const C = {
  perm:   {name:'Perm Queen', skin:'#F3CBA5', hair:'perm', hairCol:'#141010', top:'crop', topCol:'#E21E8C', botCol:'#2E7D5B', bot:'baggy', shoe:'#fff', high:true, hoops:true, face:'grin', lips:'#D9346A'},
  bboy:   {name:'B-Boy', skin:'#5A3824', hair:'buzz', hairCol:'#120c08', hat:'snapB', hatCol:'#E0453A', hatCol2:'#1B2F4E', top:'tee', topCol:'#28A064', print:'4', botCol:'#1B2F4E', shoe:'#fff', high:true, chain:true, face:'grin', wrist:'#E0453A'},
  blond:  {name:'Skater', skin:'#FFE2CC', hair:'curly', hairCol:'#F4C64E', hat:'bucket', hatCol:'#2E9BDA', hatCol2:'#fff', top:'tank', topCol:'#FFD43B', bot:'shorts', botCol:'#4F7CC4', shoe:'#E21E8C', face:'smile'},
  disco:  {name:'Disco King', skin:'#8D5A3B', hair:'afro', hairCol:'#24170f', top:'jacket', topCol:'#F2C14E', topCol2:'#E21E8C', bot:'flare', botCol:'#FFFFFF', shoe:'#F2C14E', platform:true, chain:true, glasses:'round', face:'grin', propL:'point', propR:'point'},
  teacher:{name:'Ted', ted:true},
  braids: {name:'Braids', skin:'#6B4226', hair:'braids', hairCol:'#1a120c', bead:'#2E9BDA', top:'hoodie', topCol:'#2E9BDA', bot:'joggers', botCol:'#222831', cuff:'#2E9BDA', shoe:'#fff', high:true, phones:'#E21E8C', face:'grin', lips:'#9E3B5A'},
  popper: {name:'Popper', skin:'#E8B98F', hair:'mohawk', hairCol:'#E21E8C', top:'track', topCol:'#1B2F4E', topCol2:'#fff', bot:'joggers', botCol:'#1B2F4E', cuff:'#E21E8C', shoe:'#fff', glove:'#fff', glasses:true, face:'smirk'},
  latina: {name:'Bandana', skin:'#C68B59', hair:'pony', hairCol:'#2b1a10', hat:'bandana', hatCol:'#E0453A', top:'overalls', topCol2:'#fff', botCol:'#4F7CC4', shoe:'#fff', high:true, hoops:true, face:'grin', lips:'#C2334D'},
  bun:    {name:'Bun', skin:'#FFE2CC', hair:'bun', hairCol:'#C2482B', hat:'headband', hatCol:'#28A064', top:'crop', topCol:'#28A064', botCol:'#7BA7D9', shoe:'#fff', face:'smile', lips:'#E0607E', wrist:'#fff'},
  booA:   {name:'Boo Pink', skin:'#FFE2CC', hair:'pony', hairCol:'#6B4226', hat:'snapB', hatCol:'#FF9EC4', hatCol2:'#FFFFFF', top:'hoodie', topCol:'#FFC2DA', print:'♥', printCol:'#FF5FA2', bot:'joggers', botCol:'#FFFFFF', cuff:'#FF9EC4', shoe:'#FF9EC4', high:true, face:'boo', lips:'#E0607E'},
  booB:   {name:'Boo Lilac', skin:'#9A6644', hair:'braids', hairCol:'#1a120c', bead:'#FFD43B', hat:'headband', hatCol:'#B79CFF', top:'hoodie', topCol:'#D3C4FF', print:'★', printCol:'#8E6CF0', bot:'joggers', botCol:'#FFFFFF', cuff:'#B79CFF', shoe:'#B79CFF', high:true, hoops:true, face:'boo', lips:'#B4466A'},
  fan:    {name:'Fan', skin:'#F2C9A0', hair:'short', hairCol:'#141010', hat:'bag', top:'jersey', topCol:'#1B2F4E', print:'10', printCol:'#1B2F4E', botCol:'#D9DDE3', shoe:'#fff', face:'shout', propR:'gun', propCol:'#FFD43B'},
  fan2:   {name:'Fan2', skin:'#FFE2CC', hair:'pony', hairCol:'#3A2316', hat:'bag', top:'jersey', topCol:'#E0453A', print:'7', printCol:'#E0453A', botCol:'#1B2F4E', shoe:'#fff', face:'shout', propR:'gun', propCol:'#FF6FB5'},
};
const withProp = (c, o) => Object.assign({}, c, o);
/* =====================================================================
   SHOW ENGINE — 4s walk-in · 8s dance · 4s walk-out
   ===================================================================== */
/* =====================================================================
   CHOREO — beat-based key poses → smooth CSS keyframes
   Every part always gets the same transform-function list, so the browser
   interpolates cleanly. Feet are kept on the floor automatically (g:1):
   when the knees bend, the body sinks instead of the feet floating.
   ===================================================================== */
(function CHOREO() {
  const REST = {x: 0, y: 0, r: 0, sx: 1, ll: 3, sl: 0, lr: -3, sr: 0, al: 6, fl: -8, ar: -6, fr: 8, ka: 1, kb: 1, kl: 1, kr: 1, hd: 0, g: 1};
  const KEYS = Object.keys(REST), RAD = Math.PI / 180;
  const EASE = {
    s: t => .5 - .5 * Math.cos(Math.PI * t),               // smooth in-out
    o: t => 1 - Math.pow(1 - t, 3),                         // quick out (accent)
    h: t => t < .25 ? 1 - Math.pow(1 - t / .25, 3) : 1,     // popping hit: snap & hold
    l: t => t,
  };
  // how far the lower foot sits below the hip line → body offset that plants it on the floor
  function ground(P) {
    const r = P.r * RAD;
    // k = thigh foreshortening (knee lifted toward the viewer); the shin keeps its real length
    const foot = (hx, a, b, k) => { a *= RAD; b *= RAD;
      const fx = (hx - 38 * k * Math.sin(a) - 43 * Math.sin(a + b)) * P.sx, fy = 38 * k * Math.cos(a) + 43 * Math.cos(a + b);
      return fx * Math.sin(r) + fy * Math.cos(r); };
    return 81 - Math.max(foot(-9, P.ll, P.sl, P.kl), foot(9, P.lr, P.sr, P.kr));
  }
  function build(name, keys, o) {
    const F = []; let prev = Object.assign({}, REST);
    keys.forEach(k => { const q = Object.assign({}, prev); KEYS.forEach(f => { if (k[f] !== undefined) q[f] = k[f]; }); q.b = k.b; q.e = k.e || 's'; F.push(q); prev = q; });
    const N = o.samples || 120, rows = {whole: [], legL: [], shinL: [], legR: [], shinR: [], armL: [], foreL: [], armR: [], foreR: [], head: []};
    const d = v => v.toFixed(1);
    for (let i = 0; i <= N; i++) {
      const bt = o.len * i / N; let P;
      let j = F.findIndex(k => k.b >= bt - 1e-9);
      if (j === -1) P = F[F.length - 1];
      else if (j === 0) P = F[0];
      else { const A = F[j - 1], B = F[j], u = Math.min(1, Math.max(0, (bt - A.b) / ((B.b - A.b) || 1))), w = EASE[B.e](u);
        P = {}; KEYS.forEach(f => P[f] = A[f] + (B[f] - A[f]) * w); }
      const gy = P.g > 0 ? ground(P) * P.g : 0, pc = +(100 * i / N).toFixed(2);
      rows.whole.push([pc, `translate(${d(P.x)}px,${d(P.y + gy)}px) rotate(${d(P.r)}deg) scale(${P.sx.toFixed(3)},1)`]);
      rows.legL.push([pc, `rotate(${d(P.ll)}deg) scale(1,${P.kl.toFixed(3)})`]); rows.shinL.push([pc, `rotate(${d(P.sl)}deg) scale(1,${(1 / P.kl).toFixed(3)})`]);
      rows.legR.push([pc, `rotate(${d(P.lr)}deg) scale(1,${P.kr.toFixed(3)})`]); rows.shinR.push([pc, `rotate(${d(P.sr)}deg) scale(1,${(1 / P.kr).toFixed(3)})`]);
      rows.armL.push([pc, `rotate(${d(P.al)}deg) scale(1,${P.ka.toFixed(3)})`]); rows.foreL.push([pc, `rotate(${d(P.fl)}deg)`]);
      rows.armR.push([pc, `rotate(${d(P.ar)}deg) scale(1,${P.kb.toFixed(3)})`]); rows.foreR.push([pc, `rotate(${d(P.fr)}deg)`]);
      rows.head.push([pc, `rotate(${d(P.hd)}deg)`]);
    }
    let css = '';
    Object.entries(rows).forEach(([part, a]) => { const kn = `ch_${name}_${part}`;
      css += `@keyframes ${kn}{${a.map(([p, t]) => `${p}%{transform:${t}}`).join('')}}`
        + `${o.sel || '.' + name} .${part}{animation:${kn} ${o.dur} linear ${o.once ? 'both' : 'infinite'}}`; });
    return css;
  }
  const sec = (bpm, beats) => (beats * 60 / bpm).toFixed(3) + 's';
  let css = '';

  /* ---------- WALK-IN: relaxed groove walk, one step per beat ---------- */
  // natural gait: the standing leg sweeps back at constant speed (linear) so the planted foot doesn't skate;
  // the body speed is matched to the stride in runShow (--beat per actor)
  // FRONT-FACING WALK (the dancers face the audience while crossing the stage):
  // legs stay vertical — a step is the knee lifting toward the viewer (thigh foreshortens, the foot rises),
  // the weight shifts over the standing leg, arms swing forward/back (a forward arm looks shorter), body bobs
  const gait = (o = {}) => { const L = o.lift ?? .66, sw = o.sway ?? 3, rs = o.rs ?? 2, bob = o.bob ?? 4, h = o.hd ?? 3, m = o.arm ?? .14, bend = o.bend ?? 14, out = 9;
    const base = {e: 'l', ll: 3, sl: 0, lr: -3, sr: 0};
    const K0 = Object.assign({b: 0}, base, {kl: 1, kr: 1, x: 0, r: 0, y: 2, hd: h, al: out, fl: -4, ka: 1, ar: -out - 4, fr: bend, kb: 1 - m});
    return [K0,
      Object.assign({b: .5}, base, {kr: L, sr: 4, x: -sw, r: -rs, y: -bob, hd: -h, ar: -out, fr: 6, kb: 1, al: out, fl: -6, ka: 1}),
      Object.assign({b: 1}, base, {kr: 1, kl: 1, x: 0, r: 0, y: 2, hd: h, al: out + 4, fl: -bend, ka: 1 - m, ar: -out, fr: 4, kb: 1}),
      Object.assign({b: 1.5}, base, {kl: L, sl: -4, x: sw, r: rs, y: -bob, hd: -h, al: out, fl: -6, ka: 1, ar: -out, fr: 6, kb: 1}),
      Object.assign({}, K0, {b: 2})]; };
  css += build('walk', gait(), {len: 2, dur: 'var(--b2)', sel: '.walk', samples: 80});

  /* ---------- STYLE-SPECIFIC ENTRANCES (one step per beat, travel → right) ---------- */
  const entr = (name, keys) => { css += build('wk_' + name, keys, {len: 2, dur: 'var(--b2)', sel: '.walk.wk-' + name, samples: 80}); };
  // disco: relaxed groove walk — big natural arm swing (fingers pointing), hips rolling side to side
  entr('disco', gait({sway: 6, rs: 4, bob: 4, hd: 8, arm: .2, bend: 22}));
  // b-boy: bouncy b-boy bop walk — loose arm swing, deeper bounce, head nodding
  entr('break', gait({lift: .6, bob: 7, hd: 9, rs: 3, sway: 3, arm: .16, bend: 30}));
  // popper: robot glide — one straight leg slides, the other heel pops up; arms ticking at 90°
  entr('pop', [
    {b: 0,   e: 'h', ll: 10, sl: 0, lr: -6, sr: 32, al: 22, fl: -88, ar: -22, fr: 88, hd: 0, y: 0, r: 0},
    {b: .5,  e: 'h', al: 32, fl: -96, ar: -14, fr: 82, hd: 14},
    {b: 1,   e: 'h', ll: -6, sl: 32, lr: 10, sr: 0, al: 22, fl: -88, ar: -22, fr: 88, hd: 0},
    {b: 1.5, e: 'h', al: 14, fl: -82, ar: -32, fr: 96, hd: -14},
    {b: 2,   e: 'h', ll: 10, sl: 0, lr: -6, sr: 32, al: 22, fl: -88, ar: -22, fr: 88, hd: 0},
  ]);
  // crew: swagger — deeper bob, head nodding, loose arms
  entr('crew', gait({lift: .62, bob: 6, hd: 9, sway: 4, rs: 4, arm: .18, bend: 26}));
  // pyramid crew: light jog — knees high, arms pumping at 90°
  entr('jog', [
    {b: 0,   kl: .5, kr: 1, ll: 3, lr: -3, al: 16, fl: -78, ka: .85, ar: -16, fr: 78, kb: 1, y: -4, x: 2, hd: 3},
    {b: .5,  kl: .9, kr: .9, al: 16, ka: 1, ar: -16, kb: 1, y: -11, x: 0, hd: 0},
    {b: 1,   kl: 1, kr: .5, al: 16, fl: -78, ka: 1, ar: -16, fr: 78, kb: .85, y: -4, x: -2, hd: -3},
    {b: 1.5, kl: .9, kr: .9, ka: 1, kb: 1, y: -11, x: 0, hd: 0},
    {b: 2,   kl: .5, kr: 1, ll: 3, lr: -3, al: 16, fl: -78, ka: .85, ar: -16, fr: 78, kb: 1, y: -4, x: 2, hd: 3},
  ]);
  // "마!" fans: cheering march — knees up high, finger-gun pumped to the sky on every step
  entr('ma', gait({lift: .62, bob: 5, hd: 6, sway: 3, rs: 3, arm: .16, bend: 18}).map((k, i) => Object.assign({}, k, {ar: i % 2 ? -50 : -58, fr: -88, kb: 1})));   // glove held up at the side, elbow bent
  // boo duo: stomping walk with both thumbs-down held out front, head shaking
  entr('rabbit', gait({lift: .6, bob: 6, hd: 8, sway: 4, rs: 3, arm: .2, bend: 24}));
  entr('boo', gait({lift: .6, bob: 5, hd: 12, sway: 4, rs: 3}).map(k => Object.assign({}, k, {al: 30, fl: 0, ka: 1, ar: -30, fr: 0, kb: 1})));

  /* ---------- DISCO: the classic point, done relaxed —
     one arm points to the sky (head follows the finger), the other folds down to the bent pose;
     weight sits on one leg (the other knee gives), hips sway under the body, a small bounce on every beat;
     arms trade every 2 beats with a smooth sweep ---------- */
  {
    // one point per beat (120 BPM): R up → hip out to the left, L up → hip out to the right; small knee give on the "and"
    const R = {ar: -152, fr: 0, al: 34, fl: 128, hd: 10, r: 5, x: -8, ll: -3, lr: -14, kl: 1, kr: .9, sl: 0, sr: 2, y: 1},
          L = {al: 152, fl: 0, ar: -34, fr: -128, hd: -10, r: -5, x: 8, ll: 14, lr: 3, kl: .9, kr: 1, sl: -2, sr: 0, y: 1};
    const K = [Object.assign({b: 0, e: 'o'}, R), {b: .5, e: 's', y: -3, kl: .95, kr: .95},
               Object.assign({b: 1, e: 'o'}, L), {b: 1.5, e: 's', y: -3, kl: .95, kr: .95}, Object.assign({b: 2, e: 'o'}, R)];
    css += build('disco', K, {len: 2, dur: sec(120, 2), samples: 100});
  }

  /* ---------- POPPING: the earlier robot hits (snap poses) → full-arm WAVE left→right→left ---------- */
  {
    const AL = [90, 75, 95, 90, 150, 35, 90, 120], FL = [90, 0, 45, 0, 60, -110, 120, 30],
          AR = [-90, -90, -95, -75, -40, -150, -90, -120], FR = [0, -90, -45, 0, 110, -60, -120, -30], HD = [0, 16, 0, -16];
    const legA = {ll: 10, sl: 0, lr: -8, sr: -30}, legB = {ll: -8, sl: 32, lr: 10, sr: 0};
    const K = [];
    for (let i = 0; i < 8; i++) K.push(Object.assign({b: i / 2, e: 'h', al: AL[i], fl: FL[i], ar: AR[i], fr: FR[i], hd: HD[i % 4], x: 0, r: 0}, i % 2 ? legB : legA));
    // the wave: arms flat out, a ripple runs fingertips → elbow → shoulder → across → out the other hand … and back
    const flat = {al: 90, fl: 0, ar: -90, fr: 0, hd: 0, r: 0, ll: 6, sl: 0, lr: -6, sr: 0};
    const W = [
      ['h', flat], ['s', {fl: 65}], ['s', {fl: -45, al: 116}], ['s', {fl: 0, al: 100, hd: -14, r: -6, y: -4}],
      ['s', {al: 90, ar: -100, hd: 14, r: 6, y: -4}], ['s', {ar: -116, fr: 45, hd: 6, r: 0, y: 0}], ['s', {ar: -90, fr: -65, hd: 0}], ['s', {fr: 0}],
      ['s', {fr: -65}], ['s', {fr: 45, ar: -116}], ['s', {fr: 0, ar: -100, hd: 14, r: 6, y: -4}],
      ['s', {ar: -90, al: 100, hd: -14, r: -6, y: -4}], ['s', {al: 116, fl: -45, hd: -6, r: 0, y: 0}], ['s', {al: 90, fl: 65, hd: 0}], ['s', {fl: 0}],
    ];
    W.forEach(([e, p], i) => K.push(Object.assign({b: 4 + i * 0.27, e}, p)));
    K.push(Object.assign({b: 8, e: 'h', al: AL[0], fl: FL[0], ar: AR[0], fr: FR[0], hd: 0}, legA));
    css += build('pop', K, {len: 8, dur: sec(100, 8), samples: 160});
    css += `.pop .whole{animation:ch_pop_whole ${sec(100, 8)} linear infinite,pHit ${sec(100, 1)} steps(1) infinite,pGlide ${sec(100, 8)} ease-in-out infinite}`;
  }

  /* ---------- 토끼춤 RABBIT DANCE: walking in place on the beat — the front knee comes up toward us
     (foot forward) while the back leg pushes straight back with the heel up; arms swing across the body
     like stirring, shoulders and head bob with each step ---------- */
  {
    const Lf = {kl: .72, ll: 6, sl: -4, kr: 1, lr: -9, sr: 26, al: -28, fl: -100, ka: .82, ar: -30, fr: 18, kb: 1, r: 5, x: -2, hd: 7, y: -3};
    const Rf = {kr: .72, lr: -6, sr: 4, kl: 1, ll: 9, sl: -26, ar: 28, fr: 100, kb: .82, al: 30, fl: -18, ka: 1, r: -5, x: 2, hd: -7, y: -3};
    const mid = {kl: .9, kr: .9, ll: 4, lr: -4, sl: 0, sr: 0, al: 10, fl: -40, ar: -10, fr: 40, ka: .95, kb: .95, r: 0, x: 0, hd: 0, y: 3};
    css += build('rabbit', [Object.assign({b: 0, e: 's'}, Lf), Object.assign({b: .5, e: 's'}, mid), Object.assign({b: 1, e: 's'}, Rf),
      Object.assign({b: 1.5, e: 's'}, mid), Object.assign({b: 2, e: 's'}, Lf)], {len: 2, dur: sec(120, 2), samples: 80});
  }

  /* ---------- CREW: fun party routine (8 counts, 124 BPM, every move lands on the beat) —
     bounce & clap → the sprinkler → chicken wings → the lasso → hip-bump step → point & freeze ---------- */
  {
    const K = [], push = (b, p, e) => K.push(Object.assign({b, e: e || 's'}, p));
    const base = {x: 0, r: 0, hd: 0, y: 0, ll: 5, sl: 0, lr: -5, sr: 0, kl: 1, kr: 1, g: 1, al: 34, fl: -60, ar: -34, fr: 60};
    // 1  bounce + clap in front (clap on the beat, open on the "and")
    push(0, Object.assign({}, base, {kl: .86, kr: .86, y: 4, al: 48, fl: -112, ar: -48, fr: 112, hd: 6}), 'o');
    push(.5, {kl: 1, kr: 1, y: 0, al: 62, fl: -40, ar: -62, fr: 40, hd: -4});
    push(1, {kl: .86, kr: .86, y: 4, al: 48, fl: -112, ar: -48, fr: 112, hd: 6}, 'o');
    push(1.5, {kl: 1, kr: 1, y: 0, al: 62, fl: -40, ar: -62, fr: 40, hd: -4});
    // 2  the sprinkler: left hand behind the head, right arm sweeps out in 3 ticks
    push(2, {al: 160, fl: 120, ar: -60, fr: -20, hd: -6, r: -3, kl: .9, kr: 1, y: 2}, 'o');
    push(2.33, {ar: -78, hd: 2}, 'o'); push(2.66, {ar: -96, hd: 10, r: 0}, 'o'); push(3, {ar: -114, hd: 16, r: 3}, 'o');
    push(3.5, {ar: -40, fr: 60, al: 34, fl: -60, hd: 0, r: 0, kl: .86, kr: .86, y: 4});
    // 3  chicken wings: fists at the armpits, elbows flap, knees pump, head pecks
    for (let k = 0; k < 4; k++) push(4 + k * .25, {al: k % 2 ? 70 : 30, fl: -150, ar: k % 2 ? -70 : -30, fr: 150, hd: k % 2 ? 12 : -6, kl: k % 2 ? .8 : 1, kr: k % 2 ? 1 : .8, y: k % 2 ? 4 : 0, r: 0}, 'o');
    // 4  the lasso: right arm circles overhead, left hand on the hip, hips sway
    for (let k = 0; k <= 4; k++) { const th = k / 4 * 2 * Math.PI; push(5 + k * .25, {ar: -160 + 10 * Math.cos(th), fr: -40 + 30 * Math.sin(th), al: 35, fl: -115, x: 6 * Math.sin(th), r: 3 * Math.sin(th), hd: 6 * Math.cos(th), kl: 1, kr: 1, y: 0}, 'l'); }
    // 5  hip-bump steps: side-step with a bump left, then right (comic)
    push(6.25, {x: -10, r: -9, hd: 10, al: 20, fl: -30, ar: -60, fr: 60, ll: 14, lr: -2, kl: .92, kr: 1}, 'o');
    push(6.75, {x: 10, r: 9, hd: -10, ar: -20, fr: 30, al: 60, fl: -60, lr: -14, ll: 2, kl: 1, kr: .92}, 'o');
    // 6  point at the camera & freeze with a wink tilt
    push(7.25, {x: 0, r: 4, hd: 14, ar: -95, fr: -8, al: 35, fl: -115, ll: 5, lr: -12, kl: 1, kr: .9, y: 0}, 'o');
    push(7.75, {hd: 16});
    push(8, Object.assign({}, base, {kl: .86, kr: .86, y: 4, al: 48, fl: -112, ar: -48, fr: 112, hd: 6}), 's');
    css += build('crew', K, {len: 8, dur: sec(124, 8)});
  }

  /* ---------- BREAKING (one 8-second set, keyed in seconds):
     toprock (Indian step) → go-down → footwork sweeps → kick-up to headspin
     → handstand freeze (head turning) → one-arm freeze → roll out → b-boy pose ---------- */
  {
    const K = [];
    const push = (b, p, e) => K.push(Object.assign({b, e: e || 's'}, p));
    const ready = {ll: 5, sl: 0, lr: -5, sr: 0, al: 40, fl: -20, ar: -40, fr: 20, x: 0, r: 0, hd: 0, y: 0, g: 1, sx: 1, ka: 1, kb: 1};
    const crossR = {lr: 24, sr: -6, ll: -8, sl: 0, al: -14, fl: -75, ar: 14, fr: 75, x: -4, r: -4, hd: 6};
    const kickR  = {lr: -42, sr: 12, ll: 6, sl: 0, al: 82, fl: 20, ar: -82, fr: -20, x: 3, r: 6, hd: -6};
    const crossL = {ll: -24, sl: 6, lr: 8, sr: 0, al: -14, fl: -75, ar: 14, fr: 75, x: 4, r: 4, hd: -6};
    const kickL  = {ll: 42, sl: -12, lr: -6, sr: 0, al: 82, fl: 20, ar: -82, fr: -20, x: -3, r: -6, hd: 6};
    push(0, ready); push(.3, crossR); push(.6, ready); push(.9, kickR); push(1.2, ready);
    push(1.5, crossL); push(1.8, ready); push(2.1, kickL); push(2.4, ready);
    // go down: deep crouch, palms on the floor
    const tuck = {g: 0, y: 38, x: 0, r: 0, ll: 88, sl: -88, lr: -88, sr: 88, al: 8, fl: 0, ar: -8, fr: 0, ka: 1.33, kb: 1.33, hd: 0};
    push(2.85, tuck);
    // footwork: sweep one leg out along the floor, tuck, sweep the other
    push(3.2, {ll: 58, sl: 0, lr: -88, sr: 88, x: 10, r: -6, hd: -8});
    push(3.5, tuck);
    push(3.85, {lr: -58, sr: 0, ll: 88, sl: -88, x: -10, r: 6, hd: 8});
    push(4.15, tuck);
    // kick up over the hands onto the head
    push(4.45, {r: 95, y: 4, ll: 40, sl: -80, lr: -40, sr: 80, al: 150, ar: -150, fl: 0, fr: 0, ka: 1, kb: 1, x: 0, hd: 0});
    push(4.75, {r: 180, y: -20, ll: 26, sl: 0, lr: -26, sr: 0, al: 150, ar: -150, fl: 0, fr: 0});
    // headspin: smooth turn (scaleX = cos) with legs in a V and arms out
    for (let i = 1; i <= 12; i++) { const t = i / 12;
      push(4.75 + t * 1.2, {sx: Math.cos(t * 4 * Math.PI), al: 98, ar: -98, fl: 20, fr: -20, ll: 28, lr: -28}, 'l'); }
    // push up into a handstand freeze, head looking around
    push(6.2, {sx: 1, y: -43, al: 172, ar: -172, fl: 0, fr: 0, ka: 1.32, kb: 1.32, ll: 4, sl: 0, lr: -4, sr: 0, hd: 0}, 'o');
    push(6.45, {ll: 24, lr: -24, hd: -22});
    push(6.7, {hd: 22});
    // shift onto one arm: the other bends out, legs straight to the sky
    push(7.0, {r: 168, y: -46, al: 100, fl: 65, ka: 1.1, ar: -178, kb: 1.32, ll: 9, lr: -9, hd: -10}, 'o');
    push(7.3, {hd: -14});
    // roll out and land
    push(7.5, {r: 270, y: 34, al: 160, fl: 0, ka: 1, ar: -160, kb: 1, ll: 40, sl: -70, lr: -40, sr: 70, hd: 0});
    push(7.65, {r: 360, y: 0, g: 1, ll: 22, sl: -44, lr: -22, sr: 44, al: 70, fl: 0, ar: -70, fr: 0});
    // b-boy pose: arms crossed, lean back
    push(7.85, {ll: 12, sl: 0, lr: -12, sr: 0, al: 60, fl: -125, ar: -60, fr: 125, r: 357, hd: -8}, 'o');
    push(8, {hd: -4});
    css += build('break', K, {len: 8, dur: '8s', once: true, samples: 320});
  }

  /* ---------- BOO: "우~" arm sway → thumbs-down squat bounce ---------- */
  css += build('boo', [
    {b: 0, al: 150, fl: 20, ar: -150, fr: -20, r: -6, x: -6, hd: -8, ll: 6, sl: 0, lr: -6, sr: 0},
    {b: .5, r: 6, x: 6, hd: 8, al: 162, ar: -138},
    {b: 1, r: -6, x: -6, hd: -8, al: 138, ar: -162},
    {b: 1.5, r: 6, x: 6, hd: 8, al: 162, ar: -138},
    {b: 2, e: 'o', r: 0, x: 0, hd: 0, al: 32, fl: 0, ar: -32, fr: 0, ll: 24, sl: -48, lr: -24, sr: 48},
    {b: 2.5, al: 22, ar: -22, sl: -58, sr: 58, ll: 28, lr: -28, hd: 6},
    {b: 3, al: 32, ar: -32, ll: 24, sl: -48, lr: -24, sr: 48, hd: -6},
    {b: 3.5, al: 22, ar: -22, sl: -58, sr: 58, ll: 28, lr: -28, hd: 6},
    {b: 4, al: 150, fl: 20, ar: -150, fr: -20, r: -6, x: -6, hd: -8, ll: 6, sl: 0, lr: -6, sr: 0},
  ], {len: 4, dur: sec(76, 4)});

  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
})();

(function genTed() {
  const ss = x => x * x * (3 - 2 * x), mix = (a, b, k) => a + (b - a) * k;
  const parts = {tWhole: [], tHead: [], tSkirt: [], tArmL: [], tForeL: [], tArmR: [], tForeR: [], tLegL: [], tLegR: []};
  for (let p = 0; p <= 100; p += 0.5) {
    const t = p / 100 * 8, TAU = Math.PI * 2; let P;
    if (p < 30) {                                   // A: hop & pump the book, wave the other hand
      const h = Math.sin(t * TAU * 1.6);
      P = {wy: -Math.abs(h) * 9, wr: Math.sin(t * TAU * .8) * 8, sx: 1, hd: h * 10, sk: h * 10, ss: 1,
           ar: -95 + h * 38, fr: -10, al: 140 + Math.sin(t * TAU * 3.2) * 22, fl: 25, ll: Math.max(0, h) * 26, lr: -Math.max(0, -h) * 26};
    } else if (p < 60) {                            // B: book disco — book up / finger up, swap every 0.6s
      const ph = ((t - 2.4) % 1.2) / 1.2, up = ph < .5;
      const k = ss(Math.min(1, (up ? ph : ph - .5) / .15));
      const A = {ar: -30, fr: -45, al: 150, fl: 0, wr: -8, sk: -12}, B = {ar: -155, fr: 115, al: 35, fl: -115, wr: 8, sk: 12};
      const from = up ? A : B, to = up ? B : A;
      P = {wy: -Math.abs(Math.sin(t * TAU * 1.67)) * 5, sx: 1, hd: mix(from.wr, to.wr, k) * 1.2, ss: 1,
           ar: mix(from.ar, to.ar, k), fr: mix(from.fr, to.fr, k), al: mix(from.al, to.al, k), fl: mix(from.fl, to.fl, k),
           wr: mix(from.wr, to.wr, k), sk: mix(from.sk, to.sk, k), ll: up ? 14 * k : 14 * (1 - k), lr: up ? -14 * (1 - k) : -14 * k};
    } else if (p < 80) {                            // C: ballerina twirl, skirt flares
      const q = (p - 60) / 10;
      P = {wy: -Math.abs(Math.sin(q * TAU)) * 10, wr: 0, sx: Math.cos(q * TAU), hd: 0, sk: 0, ss: 1.18,
           ar: -158, fr: 115, al: 158, fl: 0, ll: 10, lr: -10};
    } else if (p < 95) {                            // D: shoulder shimmy + knee wiggle
      const f = Math.sin(t * TAU * 4);
      P = {wy: Math.abs(f) * 4, wr: f * 7, sx: 1, hd: -f * 9, sk: f * 14, ss: 1,
           ar: -70 + f * 12, fr: -20, al: 70 - f * 12, fl: 20, ll: f * 16, lr: f * 16};
    } else {                                         // ta-da!
      P = {wy: -6, wr: 0, sx: 1, hd: -8, sk: 0, ss: 1.08, ar: -160, fr: 115, al: 145, fl: 0, ll: 0, lr: 0};
    }
    const r = d => `rotate(${d.toFixed(1)}deg)`, pc = +p.toFixed(1);
    parts.tWhole.push([pc, `translate(0px,${P.wy.toFixed(1)}px) ${r(P.wr)} scale(${P.sx.toFixed(3)},1)`]);
    parts.tHead.push([pc, r(P.hd)]); parts.tSkirt.push([pc, `${r(P.sk)} scale(${P.ss.toFixed(2)},1)`]);
    parts.tArmL.push([pc, r(P.al)]); parts.tForeL.push([pc, r(P.fl)]); parts.tArmR.push([pc, r(P.ar)]); parts.tForeR.push([pc, r(P.fr)]);
    parts.tLegL.push([pc, r(P.ll)]); parts.tLegR.push([pc, r(P.lr)]);
  }
  let css = '';
  Object.entries(parts).forEach(([n, a]) => { css += `@keyframes tc_${n}{${a.map(([p, t]) => `${p}%{transform:${t}}`).join('')}}.teacher .${n}{animation:tc_${n} 8s linear both}`; });
  css += `.walk .tWhole{animation:tdBob var(--b2) ease-in-out infinite}@keyframes tdBob{0%,50%,100%{transform:translateY(0px) rotate(0deg)}25%{transform:translateY(-5px) rotate(-4deg)}75%{transform:translateY(-5px) rotate(4deg)}}`
    + `.walk .tLegL,.walk .tLegR{animation:tdLeg var(--b2) cubic-bezier(.45,0,.3,1) infinite}.walk .tLegR{animation-delay:calc(var(--beat,.5s) * -1)}@keyframes tdLeg{0%,50%,100%{transform:rotate(0deg) scale(1,1)}25%{transform:rotate(-3deg) scale(1,.62)}75%{transform:rotate(0deg) scale(1,1)}}`
    + `.walk .tArmL{animation:tdAL var(--b2) ease-in-out infinite}@keyframes tdAL{0%,100%{transform:rotate(-14deg)}50%{transform:rotate(16deg)}}`
    + `.walk .tArmR{animation:tdAR var(--b2) ease-in-out infinite}@keyframes tdAR{0%,100%{transform:rotate(-10deg)}50%{transform:rotate(8deg)}}`
    + `.walk .tSkirt{animation:tdSk var(--beat,.5s) ease-in-out infinite alternate}@keyframes tdSk{from{transform:rotate(4deg)}to{transform:rotate(-4deg)}}`
    + `.walk .tHead{animation:wkHd var(--beat,.5s) ease-in-out infinite}`
    + `.ted .blink{animation:tblink 3s infinite}@keyframes tblink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
})();
const ENTER = 4000, DANCE_DEFAULT = 8000, EXIT = 4000;
let SHOW_ON = false;
/* "마!" — the real ballpark cheer (3 shouts, 1.74 s apart), boosted and played on the fans' arm thrusts */
const MA_SRC = 'data:audio/mpeg;base64,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SDQmZlYYDoFRJHOCgQVTlo7UmyDQiDo4XDSYaInarQ1/7yXYW/yW//tixOsBDoSVN4wxFkHlGyadhg7ItclV8lVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQAAA5LoiFSbICggFQJqg1hxEqmAAmIKGrMDTQIK1mHHeglYVlr6stbi4iEpw29npQqZjLzFYzBqIINUhsEpOXPHJ7RcuXUXfWtvq6DUSh0JhpQVAVOoO6pZ8994iesYeu8s/kVlv9WtzG5Y3UYODY6j1NO2YQzVp5TFFoOMdOfU0SJUDcZcrOdA5Q6Wl8Ti7lONcynczF6ujAQqhMrSko0fZvzXCjUNjN5VTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/7YMTsgY+8nybMZS9BuhIj1YeayFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/7YMTcg81Yfwxk4YfA/ASAAe94VFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQ==', MA_LEAD = 200;   // first shout begins 0.2 s into the clip
let MA_BUF = null, MA_LOADING = null;
function loadMa() {
  if (MA_BUF || MA_LOADING || !ac()) return MA_LOADING;
  const bin = atob(MA_SRC.split(',')[1]), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  MA_LOADING = new Promise((ok, no) => AC.decodeAudioData(u8.buffer, ok, no))
    .then(buf => { MA_BUF = buf; return buf; }).catch(() => { MA_LOADING = null; });
  return MA_LOADING;
}
function playMa() {
  if (muted || !ac()) return;
  const go = () => { const src = AC.createBufferSource(), g = AC.createGain(); src.buffer = MA_BUF; g.gain.value = 1.8;
    src.connect(g); g.connect(MASTER); src.start(); if (MUS.gain) { const mg = MUS.gain.gain, v0 = mg.value, t = AC.currentTime; mg.setTargetAtTime(v0 * .3, t, .05); mg.setTargetAtTime(v0, t + 4.3, .3); } };
  if (MA_BUF) go(); else { const p = loadMa(); if (p) p.then(b => b && go()); else sayMa(); }
}
/* "마!" — one shout. Korean TTS voice if the device has one, otherwise a formant-synthesised "ma" */
let KO_VOICE = null;
const pickKo = () => { try { KO_VOICE = speechSynthesis.getVoices().find(x => /^ko/i.test(x.lang)) || KO_VOICE; } catch (e) {} };
try { pickKo(); speechSynthesis.onvoiceschanged = pickKo; } catch (e) {}
function sayMa() {
  if (muted) return;
  try {
    pickKo(); const v = KO_VOICE;
    if (v) { const u = new SpeechSynthesisUtterance('마!'); u.voice = v; u.lang = v.lang; u.rate = 1.2; u.pitch = .55; u.volume = 1; speechSynthesis.cancel(); speechSynthesis.speak(u); return; }
  } catch (e) {}
  if (!ac()) return;
  const t = AC.currentTime + .01, M = .14, src = AC.createOscillator(), out = AC.createGain();
  src.type = 'sawtooth'; src.frequency.setValueAtTime(150, t); src.frequency.linearRampToValueAtTime(175, t + M); src.frequency.linearRampToValueAtTime(205, t + M + .08); src.frequency.linearRampToValueAtTime(130, t + .62);
  out.gain.setValueAtTime(.0001, t); out.gain.exponentialRampToValueAtTime(1, t + .02); out.gain.setValueAtTime(1, t + .42); out.gain.exponentialRampToValueAtTime(.0001, t + .64); out.connect(MASTER);
  // [m] — lips closed: only a low nasal hum (~250 Hz) with a weak 2nd resonance
  const nas = AC.createBiquadFilter(), ng = AC.createGain(); nas.type = 'lowpass'; nas.frequency.value = 260; nas.Q.value = 4;
  ng.gain.setValueAtTime(1.1, t); ng.gain.setValueAtTime(1.1, t + M); ng.gain.linearRampToValueAtTime(.0001, t + M + .03); src.connect(nas); nas.connect(ng); ng.connect(out);
  // [a] — mouth snaps open: formants glide from the [m] position into a wide-open "아"
  [[300, 760, 1.2], [1000, 1250, .6], [2300, 2600, .3]].forEach(([f0, f1, gv]) => { const bp = AC.createBiquadFilter(), g = AC.createGain();
    bp.type = 'bandpass'; bp.Q.value = 6; bp.frequency.setValueAtTime(f0, t); bp.frequency.setValueAtTime(f0, t + M); bp.frequency.exponentialRampToValueAtTime(f1, t + M + .05);
    g.gain.setValueAtTime(.0001, t); g.gain.setValueAtTime(.0001, t + M - .01); g.gain.exponentialRampToValueAtTime(gv, t + M + .03);
    src.connect(bp); bp.connect(g); g.connect(out); });
  src.start(t); src.stop(t + .7);
}
function runShow(opt) {
  return new Promise(resolve => {
    SHOW_ON = true;
    const prevMusic = MUS.cur;
    const ov = document.createElement('div'); ov.id = 'show'; if (opt.theme) ov.classList.add('th-' + opt.theme);
    ov.innerHTML = `<div class="rays"></div><div class="floor"></div><div class="banner"><div class="n">${opt.banner[0]}</div><div class="s">${opt.banner[1]}</div><div class="k">${opt.banner[2]}</div></div><div class="skip">화면을 탭하면 건너뛰기</div>`;
    document.body.appendChild(ov);
    music(opt.music);
    if (opt.music && TRACKS[opt.music]) ov.style.setProperty('--beat', (60 / TRACKS[opt.music].bpm).toFixed(3) + 's');
    const timers = [], W = innerWidth, DANCE = opt.dance || DANCE_DEFAULT;
    if (opt.theme !== 'dark') { const top = Math.max(...opt.actors.map(a => a.dw * (a.cfg.ted ? 146 / 105 : 250 / 180) * (a.cfg.ted ? .95 : .9) + (a.tier || 0)));
      const bn = ov.querySelector('.banner'); bn.style.top = 'auto'; bn.style.bottom = Math.min(innerHeight - 90, 96 + top + 14 + (innerHeight - 96 - top) * .3) + 'px'; }
    const at = (ms, fn) => timers.push(setTimeout(fn, ms));
    (opt.hooks || []).forEach(([ms, fn]) => at(ENTER + ms, fn));
    opt.actors.forEach(a => {
      const dw = a.dw, tx = W * a.pct / 100 - dw / 2, out = -(dw + 80), delay = (a.delay || 0) * 1000;
      const k0 = a.cls.split(' ')[0], wk = ' wk-' + ({base: 'jog', mid: 'jog', top: 'jog'}[k0] || k0);
      const m = document.createElement('div'); m.className = 'mover walk' + wk + (a.back ? ' back' : '');
      const stride = 25 * dw / 180, beatFor = ms => Math.max(280, Math.min(900, stride / ((tx - out) / ms)));   // one step = one leg sweep
      m.style.setProperty('--dw', dw + 'px'); m.style.transform = `translate(${out}px,0)`;
      if (a.bottom) m.style.bottom = a.bottom;
      m.innerHTML = dancerSVG(a.cfg) + (a.bubble ? `<div class="bubble${a.bigBubble ? ' big' : ''}${a.pct > 70 ? ' bl' : ''}">${a.bubble}</div>` : '') + (a.pop ? `<div class="maPop${a.popL ? ' l' : ''}">${a.pop}</div>` : '') + (a.cls === 'ma' ? `<div class="maFront"><svg viewBox=\"-40 -40 84 84\"><g stroke=\"#1B2F4E\" stroke-width=\"3\" stroke-linejoin=\"round\"><path d=\"M-28 -8 Q-36 -2 -32 8 Q-38 14 -32 22 Q-34 32 -22 33 L12 33 Q30 30 32 12 Q34 -6 22 -14 L28 -26 Q30 -34 22 -34 Q16 -34 12 -24 L4 -12 Q-14 -18 -28 -8 Z\" fill=\"#fff\"/><circle cx=\"6\" cy=\"6\" r=\"16\" fill=\"#fff\"/></g><path d=\"M-32 8 Q-24 10 -18 7 M-32 22 Q-24 24 -18 21\" stroke=\"#AEB9C8\" stroke-width=\"2\" fill=\"none\" stroke-linecap=\"round\"/><circle cx=\"6\" cy=\"6\" r=\"10\" fill=\"#E3E9F1\"/><ellipse cx=\"2\" cy=\"1\" rx=\"4\" ry=\"3\" fill=\"#fff\"/><ellipse cx=\"-18\" cy=\"-6\" rx=\"6\" ry=\"3.5\" fill=\"#F4F7FB\" transform=\"rotate(-25 -18 -6)\"/></svg></div>` : '') 
      if (a.front) m.style.zIndex = 5;
      ov.appendChild(m);
      const setCls = c => { m.className = 'mover ' + c + (a.back ? ' back' : ''); };
      at(40 + delay, () => { m.style.transition = `transform ${ENTER - delay - 40}ms linear`; m.style.transform = `translate(${tx}px,0)`; });
      at(ENTER, () => { setCls(a.cls + ' dancing');
        if (a.tier) { m.style.transition = 'transform .7s cubic-bezier(.3,1.6,.5,1)'; m.style.transform = `translate(${tx}px,${-a.tier}px)`; } });
      at(ENTER + DANCE, () => { if (a.tier) { m.style.transition = 'transform .45s ease-in'; m.style.transform = `translate(${tx}px,0)`; } });
      at(ENTER + DANCE + (a.tier ? 450 : 0), () => { setCls('walk exit' + wk);
        m.style.transition = `transform ${EXIT - (a.tier ? 450 : 0) - 100}ms linear`; m.style.transform = `translate(${out}px,0)`; });
    });
    if (opt.confetti || opt.petals) {
      const cols = ['#E21E8C', '#2E9BDA', '#28A064', '#F2C14E', '#fff'];
      const n = opt.petals ? 90 : 70;
      for (let i = 0; i < n; i++) { const d = document.createElement('i');
        const petal = opt.petals && i % 2 === 0;
        d.className = petal ? 'petal' : 'conf';
        d.style.left = Math.random() * 100 + 'vw';
        d.style.background = petal ? ['#FFB3D1', '#FF8FB1', '#FFE3EE', '#FFD1E4'][i % 4] : cols[i % cols.length];
        d.style.animationDuration = (4 + Math.random() * 5) + 's'; d.style.animationDelay = (ENTER - 1500 + Math.random() * (DANCE + 1000)) + 'ms';
        ov.appendChild(d); }
    }
    if (opt.spots) [12, 50, 88].forEach((x, i) => { const s = document.createElement('div'); s.className = 'spot'; s.style.left = (x - 23) + 'vw';
      s.style.animation = `sway${i % 2} 3s ease-in-out infinite alternate`; ov.appendChild(s); });
    let done = false;
    const end = () => { if (done) return; done = true; timers.forEach(clearTimeout); ov.classList.add('out');
      setTimeout(() => { ov.remove(); SHOW_ON = false; music(prevMusic); resolve(); }, 400); };
    at(ENTER + DANCE + EXIT, end);
    ov.addEventListener('click', end);
  });
}
const st2 = document.createElement('style');
st2.textContent = '@keyframes sway0{from{transform:rotate(-14deg)}to{transform:rotate(14deg)}}@keyframes sway1{from{transform:rotate(12deg)}to{transform:rotate(-12deg)}}';
document.head.appendChild(st2);

function dance(kind, extra) {
  const W = innerWidth, solo = Math.min(200, W * .46), crew = Math.min(135, W / 4.9), pyr = Math.min(125, W * .28);
  const k = extra || '';
  switch (kind) {
    case 'disco': return runShow({music: 'disco', banner: ['FIVE!', 'DISCO FEVER', k || '정답 5개 돌파 🕺'], actors: [{cfg: C.disco, cls: 'disco', pct: 50, dw: solo}]});
    case 'break': return runShow({music: 'break', banner: ['THIRTEEN!', 'B-BOY BREAK', k || '정답 13개 돌파 🔥'], actors: [{cfg: C.bboy, cls: 'break', pct: 50, dw: solo}]});
    case 'rabbit': return runShow({music: 'disco', banner: ['TWENTY-SEVEN!', 'RABBIT DANCE', k || '정답 27개 돌파 🐰'], actors: [{cfg: C.latina, cls: 'rabbit', pct: 50, dw: solo}]});
    case 'pop': return runShow({music: 'pop', banner: ['TWENTY-FIVE!', "POPPIN' TIME", k || '정답 25개 돌파 🤖'], actors: [{cfg: C.popper, cls: 'pop', pct: 50, dw: solo}]});
    case 'crew': { const cw = Math.min(125, W / 4.8);
      return runShow({music: 'crew', banner: ['STAGE CLEAR!', 'CHALLENGE CREW', k || '크루 군무 👯'], confetti: true,
      actors: [C.perm, C.bboy, C.blond, C.braids, C.latina].map((c, i) => ({cfg: c, cls: 'crew', pct: [10, 30, 50, 70, 90][i], dw: cw, delay: i * .15}))}); }
    case 'teacher': return runShow({music: 'crew', banner: ['TED TIME!', "TEACHER'S DANCE", k || '선생님도 참을 수 없다 📚'],
      actors: [{cfg: C.teacher, cls: 'teacher', pct: 50, dw: solo}]});
    case 'pyramid': {
      const t1 = pyr * .70, t2 = pyr * 1.40, u = 41 * pyr / W;   // 74 svg-units between columns → hands meet feet
      return runShow({music: 'pyramid', banner: ['STAGE CLEAR!', 'HUMAN PYRAMID', k || '인간 피라미드 🔺'], confetti: true,
        actors: [
          {cfg: C.bboy, cls: 'base supR', pct: 50 - 2 * u, dw: pyr}, {cfg: C.braids, cls: 'base supL supR', pct: 50, dw: pyr, delay: .1}, {cfg: C.blond, cls: 'base supL', pct: 50 + 2 * u, dw: pyr, delay: .2},
          {cfg: C.perm, cls: 'mid supR', pct: 50 - u, dw: pyr, tier: t1, back: true, delay: .3}, {cfg: C.latina, cls: 'mid supL', pct: 50 + u, dw: pyr, tier: t1, back: true, delay: .4},
          {cfg: C.bun, cls: 'top', pct: 50, dw: pyr, tier: t2, back: true, delay: .5}]});
    }
    case 'finale': {
      const p = Math.min(122, W * .26), f = p, u = 41 * p / W;
      return runShow({music: 'finale', theme: 'dark', dance: 12000, banner: k && k.startsWith('🎉 ALL CLEAR!') ? ['ALL CLEAR!', 'GRAND FINALE', k.replace('🎉 ALL CLEAR! ', '') + ' 🎉'] : ['GRAND FINALE', 'STEP UP CREW', k || '최고의 무대! 🎉'], petals: true, confetti: true, spots: true,
        actors: [
          {cfg: C.disco, cls: 'disco', pct: 8, dw: f}, {cfg: C.popper, cls: 'pop', pct: 20, dw: f, delay: .1},
          {cfg: C.bboy, cls: 'base supR', pct: 44 - u, dw: p, delay: .2}, {cfg: C.braids, cls: 'base supL', pct: 44 + u, dw: p, delay: .3},
          {cfg: C.bun, cls: 'top', pct: 44, dw: p, tier: p * .7, back: true, delay: .4},
          {cfg: C.perm, cls: 'crew', pct: 65, dw: f, delay: .5}, {cfg: C.latina, cls: 'rabbit', pct: 77, dw: f, delay: .6},
          {cfg: C.teacher, cls: 'teacher', pct: 88, dw: Math.min(140, W * .30), delay: .7, front: true, bottom: 'calc(22vh - 24px - 6vh)'}]});
    }
    case 'ma': loadMa(); return runShow({music: 'ma', theme: 'ma', hooks: [[1253 - MA_LEAD, playMa]], banner: ['정신 차리라, 마!', '', k || '정신 차리라, 마! ⚾'],
      actors: [{cfg: C.fan2, cls: 'ma', pct: 40, dw: solo * .8}, {cfg: C.fan, cls: 'ma', pct: 57, dw: solo * .8, delay: .2, pop: '마!', popL: true}]});
    case 'boo': {
      const b = Math.min(170, W * .38);
      const g1 = withProp(C.booA, {propL: 'thumb', propR: 'thumb'}), g2 = withProp(C.booB, {propL: 'thumb', propR: 'thumb'});
      return runShow({music: 'boo', theme: 'boo', banner: ['BOO~', '오답 10개', k || '괜찮아, 다시 집중! 💪'],
        actors: [{cfg: g1, cls: 'boo', pct: 25, dw: b}, {cfg: g2, cls: 'boo', pct: 25 + b / W * 100 * .78, dw: b, delay: .1, bubble: '우~~ 👎'}]});
    }
  }
}

/* =====================================================================
   PRIZES — snack pouches & plush dolls (original designs) · claw machine
   ===================================================================== */
const PZ_ST = 'stroke="#1B2F4E" stroke-width="2.4" stroke-linejoin="round"';
const PRIZE_ART = {
  // chocolate snack-cake pouch (pillow pack, crimped ends)
  // 초코파이 — red single-serve pillow pouch, round marshmallow pie (logo-free)
  choco: () => `<svg viewBox="0 0 130 78">
    <path d="M14 9 Q65 3 116 9 L116 69 Q65 75 14 69 Z" fill="#E3202F" ${PZ_ST}/>
    <path d="M14 9 Q65 3 116 9 L116 22 Q65 16 14 22 Z" fill="#F2505A"/>
    <path d="M14 40 Q40 31 66 39 T116 36 L116 69 Q65 75 14 69 Z" fill="#EFD9AE"/>
    <path d="M14 62 Q65 56 116 62 L116 69 Q65 75 14 69 Z" fill="#D8B983"/>
    <path d="M14 40 Q40 31 66 39 T116 36" stroke="#FFF3DC" stroke-width="2.2" fill="none"/>
    <path d="M3 10 L14 9 L14 69 L3 68 L7 63 L3 58 L7 53 L3 48 L7 43 L3 38 L7 33 L3 28 L7 23 L3 18 L7 14 Z" fill="#B8121F" ${PZ_ST}/> <path d="M127 10 L116 9 L116 69 L127 68 L123 63 L127 58 L123 53 L127 48 L123 43 L127 38 L123 33 L127 28 L123 23 L127 18 L123 14 Z" fill="#B8121F" ${PZ_ST}/>
    <ellipse cx="89" cy="50" rx="23" ry="8.5" fill="#3E1C0B" stroke="#fff" stroke-width="1.8"/>
    <rect x="66" y="41" width="46" height="8" fill="#FFF6E8"/>
    <ellipse cx="89" cy="40" rx="23" ry="10.5" fill="#4A220E" stroke="#fff" stroke-width="1.8"/>
    <path d="M73 36 Q82 30 93 31" stroke="#8A5A3A" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <text x="39" y="31.2" text-anchor="middle" font-family="'Noto Sans KR',sans-serif" font-weight="900" font-size="13.5" fill="#8E0C18">초코파이</text><text x="38" y="30" text-anchor="middle" font-family="'Noto Sans KR',sans-serif" font-weight="900" font-size="13.5" fill="#FFFFFF">초코파이</text>
    <path d="M24 53 L56 53" stroke="#B5833F" stroke-width="1.4" stroke-linecap="round"/>
    <circle cx="40" cy="59" r="1.6" fill="#B5833F"/><circle cx="33" cy="59" r="1.2" fill="#B5833F"/><circle cx="47" cy="59" r="1.2" fill="#B5833F"/></svg>`,
  // OS — red pouch, cream wave, layered square cake, "OS" lettering
  cake: () => `<svg viewBox="0 0 130 78">
    <path d="M14 9 Q65 3 116 9 L116 69 Q65 75 14 69 Z" fill="#C9142B" ${PZ_ST}/>
    <path d="M14 9 Q65 3 116 9 L116 22 Q65 16 14 22 Z" fill="#E03648"/>
    <path d="M14 54 Q36 44 60 54 T116 50 L116 60 Q90 68 60 60 T14 64 Z" fill="#F6E3C6"/>
    <path d="M3 10 L14 9 L14 69 L3 68 L7 63 L3 58 L7 53 L3 48 L7 43 L3 38 L7 33 L3 28 L7 23 L3 18 L7 14 Z" fill="#9E0B1E" ${PZ_ST}/><path d="M127 10 L116 9 L116 69 L127 68 L123 63 L127 58 L123 53 L127 48 L123 43 L127 38 L123 33 L127 28 L123 23 L127 18 L123 14 Z" fill="#9E0B1E" ${PZ_ST}/>
    <rect x="70" y="26" width="36" height="27" rx="5" fill="#4E2410" stroke="#fff" stroke-width="1.8"/>
    <rect x="70" y="36.5" width="36" height="6" fill="#FFF6E8"/>
    <path d="M70 30 Q75 36 80 30 Q85 37 90 30 Q95 36 100 30 Q103 35 106 30 L106 26 L70 26 Z" fill="#2E1306"/>
    <text x="41.5" y="44.5" text-anchor="middle" font-family="'Noto Sans KR',sans-serif" font-weight="900" font-size="17" fill="#7A0816">오예스</text>
    <text x="40" y="43" text-anchor="middle" font-family="'Noto Sans KR',sans-serif" font-weight="900" font-size="17" fill="#FFFFFF">오예스</text>
    <path d="M60 18 l1.6 3.2 3.4 .6 -3.4 .6 -1.6 3.2 -1.6 -3.2 -3.4 -.6 3.4 -.6z" fill="#FFD43B"/></svg>`,
  // cookies & cream cake — blue pouch with cookie crumbs and a cream layer (logo-free)
  cookie: () => `<svg viewBox="0 0 130 78">
    <path d="M14 9 Q65 3 116 9 L116 69 Q65 75 14 69 Z" fill="#1F6FD1" ${PZ_ST}/>
    <path d="M14 9 Q65 3 116 9 L116 22 Q65 16 14 22 Z" fill="#3D8BE6"/>
    <path d="M14 56 Q38 47 62 56 T116 52 L116 62 Q90 69 60 62 T14 66 Z" fill="#FFFFFF"/>
    <path d="M3 10 L14 9 L14 69 L3 68 L7 63 L3 58 L7 53 L3 48 L7 43 L3 38 L7 33 L3 28 L7 23 L3 18 L7 14 Z" fill="#15529E" ${PZ_ST}/><path d="M127 10 L116 9 L116 69 L127 68 L123 63 L127 58 L123 53 L127 48 L123 43 L127 38 L123 33 L127 28 L123 23 L127 18 L123 14 Z" fill="#15529E" ${PZ_ST}/>
    <rect x="72" y="25" width="36" height="27" rx="5" fill="#2A2420" stroke="#fff" stroke-width="1.8"/>
    <rect x="72" y="35" width="36" height="7" fill="#FFFFFF"/>
    <circle cx="78" cy="38" r="1.6" fill="#2A2420"/><circle cx="86" cy="40" r="1.4" fill="#2A2420"/><circle cx="95" cy="37.5" r="1.6" fill="#2A2420"/><circle cx="102" cy="40" r="1.3" fill="#2A2420"/>
    <circle cx="66" cy="20" r="3" fill="#2A2420" stroke="#fff" stroke-width="1"/><circle cx="111" cy="58" r="2.6" fill="#2A2420" stroke="#fff" stroke-width="1"/>
    <text x="41" y="37" text-anchor="middle" font-family="'Noto Sans KR',sans-serif" font-weight="900" font-size="10.5" fill="#FFFFFF">쿠키 앤 크림</text>
    <text x="41" y="49" text-anchor="middle" font-family="Inter,Arial" font-weight="900" font-style="italic" font-size="8" fill="#BFE0FF">COOKIES &amp; CREAM</text></svg>`,
  bear: () => `<svg viewBox="0 0 80 86">
    <circle cx="20" cy="18" r="10" fill="#C68B59" ${PZ_ST}/><circle cx="60" cy="18" r="10" fill="#C68B59" ${PZ_ST}/>
    <circle cx="20" cy="18" r="4.5" fill="#F2C9A0"/><circle cx="60" cy="18" r="4.5" fill="#F2C9A0"/>
    <ellipse cx="40" cy="66" rx="22" ry="18" fill="#C68B59" ${PZ_ST}/><ellipse cx="40" cy="69" rx="12" ry="10" fill="#F2C9A0"/>
    <circle cx="40" cy="36" r="23" fill="#C68B59" ${PZ_ST}/><ellipse cx="40" cy="44" rx="10" ry="7.5" fill="#F2C9A0"/>
    <circle cx="31" cy="34" r="2.8" fill="#1B2F4E"/><circle cx="49" cy="34" r="2.8" fill="#1B2F4E"/>
    <ellipse cx="40" cy="41" rx="3.6" ry="2.6" fill="#1B2F4E"/><path d="M36 46 Q40 49 44 46" stroke="#1B2F4E" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    <circle cx="26" cy="42" r="3.4" fill="#FF8FB1" opacity=".6"/><circle cx="54" cy="42" r="3.4" fill="#FF8FB1" opacity=".6"/>
    <path d="M30 56 l10 4 10 -4 -3 8 -7 -3 -7 3z" fill="#E21E8C" stroke="#1B2F4E" stroke-width="1.5"/></svg>`,
  bunny: () => `<svg viewBox="0 0 80 86">
    <ellipse cx="29" cy="14" rx="7" ry="16" fill="#FFD3E4" ${PZ_ST} transform="rotate(-12 29 14)"/><ellipse cx="51" cy="14" rx="7" ry="16" fill="#FFD3E4" ${PZ_ST} transform="rotate(12 51 14)"/>
    <ellipse cx="29" cy="15" rx="3" ry="10" fill="#FF9EC4" transform="rotate(-12 29 15)"/><ellipse cx="51" cy="15" rx="3" ry="10" fill="#FF9EC4" transform="rotate(12 51 15)"/>
    <ellipse cx="40" cy="68" rx="20" ry="16" fill="#FFD3E4" ${PZ_ST}/>
    <circle cx="40" cy="42" r="21" fill="#FFD3E4" ${PZ_ST}/>
    <circle cx="32" cy="41" r="2.8" fill="#1B2F4E"/><circle cx="48" cy="41" r="2.8" fill="#1B2F4E"/>
    <path d="M37 47 Q40 50 43 47" stroke="#1B2F4E" stroke-width="1.8" fill="none" stroke-linecap="round"/><ellipse cx="40" cy="45.5" rx="2.4" ry="1.7" fill="#E21E8C"/>
    <circle cx="27" cy="48" r="3.4" fill="#FF8FB1" opacity=".7"/><circle cx="53" cy="48" r="3.4" fill="#FF8FB1" opacity=".7"/>
    <circle cx="60" cy="27" r="4.5" fill="#FFD43B" stroke="#1B2F4E" stroke-width="1.5"/></svg>`,
  chick: () => `<svg viewBox="0 0 80 86">
    <path d="M38 12 Q36 4 42 6 Q40 1 47 4" stroke="#1B2F4E" stroke-width="2.4" fill="#FFD43B" stroke-linecap="round"/>
    <ellipse cx="40" cy="52" rx="28" ry="29" fill="#FFD43B" ${PZ_ST}/>
    <path d="M14 56 Q6 50 12 44 Q18 48 18 56Z M66 56 Q74 50 68 44 Q62 48 62 56Z" fill="#F7B800" stroke="#1B2F4E" stroke-width="2"/>
    <circle cx="31" cy="42" r="3" fill="#1B2F4E"/><circle cx="49" cy="42" r="3" fill="#1B2F4E"/>
    <path d="M35 49 L45 49 L40 56 Z" fill="#FF8A1E" stroke="#1B2F4E" stroke-width="1.8" stroke-linejoin="round"/>
    <circle cx="25" cy="51" r="3.6" fill="#FF8FB1" opacity=".7"/><circle cx="55" cy="51" r="3.6" fill="#FF8FB1" opacity=".7"/>
    <path d="M30 80 l-3 5 M34 80 l0 5 M46 80 l0 5 M50 80 l3 5" stroke="#FF8A1E" stroke-width="2.6" stroke-linecap="round"/></svg>`,
  dino: () => `<svg viewBox="0 0 80 86">
    <path d="M22 26 l5 -9 5 8 5 -10 5 9 5 -9 4 10" fill="#7BD389" stroke="#1B2F4E" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="M58 70 Q76 70 74 56 Q70 64 60 62Z" fill="#5EC26F" ${PZ_ST}/>
    <ellipse cx="40" cy="64" rx="22" ry="19" fill="#5EC26F" ${PZ_ST}/><ellipse cx="40" cy="68" rx="12" ry="11" fill="#D9F5C8"/>
    <ellipse cx="40" cy="38" rx="22" ry="18" fill="#5EC26F" ${PZ_ST}/>
    <circle cx="32" cy="36" r="2.8" fill="#1B2F4E"/><circle cx="48" cy="36" r="2.8" fill="#1B2F4E"/>
    <path d="M33 45 Q40 50 47 45" stroke="#1B2F4E" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    <circle cx="27" cy="43" r="3.2" fill="#FF8FB1" opacity=".6"/><circle cx="53" cy="43" r="3.2" fill="#FF8FB1" opacity=".6"/>
    <path d="M22 60 q-6 2 -5 7 M58 60 q6 2 5 7" stroke="#1B2F4E" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>`,
};
const PRIZE_NAME = {choco: '초코파이', cake: '오예스', cookie: '오예스 쿠키앤크림', bear: '곰 인형', bunny: '토끼 인형', chick: '병아리 인형', dino: '공룡 인형'};
const PRIZE_SIZE = {choco: [50, 30], cake: [50, 30], cookie: [50, 30], bear: [42, 45], bunny: [42, 45], chick: [42, 45], dino: [42, 45]};
export { ac, AC, MASTER, mtof, osc, nz, I, CH, TRACKS, MUS, music, musicStop, sfx as legacySfx, sfxOk, sfxNo, setMuted as setLegacyMuted,
  dancerSVG, tedSVG, C, withProp, runShow, dance, playMa, sayMa, PRIZE_ART, PRIZE_NAME };
export const getAC = () => AC;
export const getMaster = () => MASTER;
