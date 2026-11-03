// 미니게임 4종: 청크런 · 청크 크레인 · 청크 카트 · 청크 사격장
export { playRun } from './run.js';
export { playCrane } from './crane.js';
export { playKart } from './kart.js';
export { playShoot } from './shoot.js';

export const GAMES = {
  run: { title: '청크런', icon: '🏃', desc: '바르게 꾸민 음식만 먹으며 달리기' },
  crane: { title: '청크 크레인', icon: '🧸', desc: '지시된 품사 인형 뽑기 · 문장 완성' },
  kart: { title: '청크 카트', icon: '🏎️', desc: '5명 레이스 · 퀴즈 존 순간정지' },
  shoot: { title: '청크 사격장', icon: '🎯', desc: '지시된 품사 과녁만 정확히 맞히기' },
};
