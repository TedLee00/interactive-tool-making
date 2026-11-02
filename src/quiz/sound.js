// 효과음 — 기존 앱처럼 Web Audio로 직접 합성 (음원 파일 없음)
let AC = null;
let muted = false;
try { muted = localStorage.getItem('cq.muted') === '1'; } catch { /* 저장 불가 */ }

function ac() {
  if (!AC) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    AC = new C();
  }
  if (AC.state === 'suspended') AC.resume();
  return AC;
}

function tone(freqs, type = 'triangle', vol = 0.12, step = 0.08, len = 0.14) {
  const a = ac();
  if (!a || muted) return;
  const t0 = a.currentTime + 0.01;
  freqs.forEach((f, i) => {
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type;
    o.frequency.value = f;
    const t = t0 + i * step;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g).connect(a.destination);
    o.start(t);
    o.stop(t + len + 0.02);
  });
}

export function sfx(kind) {
  if (kind === 'ok') tone([660, 880]);
  else if (kind === 'no') tone([220, 175], 'square', 0.06, 0.12, 0.18);
  else if (kind === 'perfect') tone([523, 659, 784, 1047, 1319], 'triangle', 0.14, 0.09, 0.22);
  else if (kind === 'end') tone([392, 330], 'triangle', 0.08, 0.12, 0.2);
  else if (kind === 'tap') tone([880], 'sine', 0.04, 0, 0.05);
  else if (kind === 'hop') tone([520, 780], 'sine', 0.05, 0.05, 0.08);
  else if (kind === 'bounce') tone([140 + Math.random() * 40], 'square', 0.05, 0, 0.06);
  else if (kind === 'reveal') tone([784, 1047], 'triangle', 0.1, 0.07, 0.16);
  else if (kind === 'whoosh') tone([300, 420, 560], 'sawtooth', 0.025, 0.03, 0.1);
}

export function setMuted(m) {
  muted = m;
  try { localStorage.setItem('cq.muted', m ? '1' : '0'); } catch { /* 저장 불가 */ }
}
export const isMuted = () => muted;
