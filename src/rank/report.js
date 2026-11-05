// 📊 선생님용 구글 시트 기록 — 성적표(완주) · 퀴즈 기록(칸마다) · 과자 획득
// data/config.json 의 rankApi(구글 Apps Script 웹 앱 주소)가 있을 때만 보낸다. 실패해도 게임은 그대로 (조용히 넘어감)
import config from '../../data/config.json';
import { callApi } from './rank.js';
import { TYPES } from '../quiz/constants.js';

const send = (fn, row) => { if (!config.rankApi) return; callApi(fn, [row]).catch(() => {}); };

/** 퀴즈 칸 하나를 끝냈을 때 */
export function reportQuiz(S, type, r, where = '') {
  send('reportQuiz', {
    name: S.name, level: S.grade || S.level, run: S.run || 1, cell: S.pos, where,
    type, typeName: TYPES[type]?.name || '', correct: r.correct, total: r.total,
    wrongs: (r.wrongs || []).slice(0, 5).map((w) => `${w.question} → 내 답: ${w.mine} / 정답: ${w.answer}`).join('\n'),
  });
}

/** 과자를 받았을 때 */
export function reportSnack(S, snack) {
  send('reportSnack', { name: S.name, level: S.grade || S.level, run: S.run || 1, kind: snack.kind, how: snack.how, code: snack.code });
}

/** 원정을 끝냈을 때 (완주 성적표) */
export function reportRun(S, extra) {
  const byType = {};
  Object.entries(S.byType || {}).forEach(([t, v]) => { byType[t] = v.n ? Math.round((v.c / v.n) * 100) : ''; });
  const weak = Object.entries(S.byType || {}).filter(([, v]) => v.n >= 3).sort((a, b) => a[1].c / a[1].n - b[1].c / b[1].n).slice(0, 3)
    .map(([t, v]) => `${TYPES[t]?.short || t}(${Math.round((v.c / v.n) * 100)}%)`).join(', ');
  send('reportRun', {
    name: S.name, level: S.grade || S.level, run: S.run || 1, correct: S.correct, answered: S.answered,
    acc: S.answered ? Math.round((S.correct / S.answered) * 100) : 0, byType, weak,
    coins: S.coins, turns: S.turns || 0, total: extra.total, xp: extra.xp, careerLevel: extra.levelTitle,
    snacks: (S.snacks || []).map((s) => `${s.kind}(${s.how})`).join(', '), snackN: (S.snacks || []).length,
    pets: (S.pets || []).length, games: S.games || {}, honors: S.honors ? `${S.honors.correct}/${S.honors.total}` : '',
    minutes: S.startedAt ? Math.round((Date.now() - S.startedAt) / 60000) : '',
  });
}
