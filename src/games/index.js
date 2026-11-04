// 미니게임 4종: 청크 사격장 · 청크런 · 청크 크레인 · 청크 카트
export { playRun } from './run.js';
export { playCrane } from './crane.js';
export { playKart } from './kart.js';
export { playShoot } from './shoot.js';
export { playDrum } from './drum.js';

// 보드에서 만나는 순서: 사격장(10칸) → 청크런(20칸) → 크레인(30칸) → 카트(39칸)
export const GAMES = {
  shoot: { title: '청크 사격장', icon: '🎯', desc: '지시된 품사 과녁만 정확히 맞히기' },
  run: { title: '청크런', icon: '🏃', desc: '바르게 꾸민 음식만 먹으며 달리기' },
  crane: { title: '청크 크레인', icon: '🧸', desc: 'STOP·HOLD로 품사 인형 뽑기' },
  kart: { title: '청크 카트', icon: '🏎️', desc: '6명 레이스 · 퀴즈 존 · 품사 레인' },
  drum: { title: '품사 드럼', icon: '🥁', desc: '박자에 맞춰 떨어지는 단어의 품사 북 치기' },
};
