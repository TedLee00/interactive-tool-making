// 미니게임 4종: 청크 크레인 · 청크 사격장 · 청크런 · 청크 카트
export { playRun } from './run.js';
export { playCrane } from './crane.js';
export { playKart } from './kart.js';
export { playShoot } from './shoot.js';

// 보드에서 만나는 순서: 크레인(10칸) → 사격장(20칸) → 청크런(30칸) → 카트(39칸)
export const GAMES = {
  crane: { title: '청크 크레인', icon: '🧸', desc: '집게가 저절로! STOP·집기로 품사 인형 뽑기' },
  shoot: { title: '청크 사격장', icon: '🎯', desc: '지시된 품사 과녁만 정확히 맞히기' },
  run: { title: '청크런', icon: '🏃', desc: '바르게 꾸민 음식만 먹으며 달리기' },
  kart: { title: '청크 카트', icon: '🏎️', desc: '5명 레이스 · 퀴즈 존 · 품사 레인' },
};
