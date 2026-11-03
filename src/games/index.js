// 미니게임 4종 (기획서 4번: 청크런 → 크레인 → 카트 → 아레나)
export { playRun } from './run.js';
export { playCrane } from './crane.js';
export { playKart } from './kart.js';
export { playArena } from './arena.js';

export const GAMES = {
  run: { title: '청크런', icon: '🏃', desc: '바르게 꾸민 음식만 먹으며 달리기' },
  crane: { title: '청크 크레인', icon: '🧸', desc: '지시된 품사 인형 뽑기 · 문장 완성' },
  kart: { title: '청크 카트', icon: '🏎️', desc: '품사 게이트 레이싱' },
  arena: { title: '청크 배틀 아레나', icon: '⚔️', desc: '지시된 품사만 공격하는 3분 생존전' },
};
