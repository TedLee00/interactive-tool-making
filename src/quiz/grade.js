// 유형별 채점 — 순수 함수 (UI와 분리해 테스트한다)
import { parseChunks, chunksToTokens, tokensToChunks } from './notation.js';
import { matchesAny } from './normalize.js';

/** 선택형 (유형 1~7) */
export function gradeChoice(q, picked) {
  return picked === q.answer;
}

/**
 * 청크 절단 (유형 8·9)
 * @param q        문제 (q.ko 또는 q.en 표기)
 * @param cuts     학생이 자른 틈 번호 배열
 * @param labels   학생이 붙인 품사 코드 배열 (청크 순서)
 * @param opts.mergeAdjacent  이 품사끼리 붙어 있으면 합쳐도·나눠도 정답 (기본: 부사 D)
 * @returns {{ok:boolean, chunkOk:boolean[], answer:Array}}
 */
export function gradeSplit(q, cuts, labels, opts = {}) {
  const merge = opts.mergeAdjacent ?? ['D'];
  const answer = parseChunks(q.ko ?? q.en);
  const { tokens } = chunksToTokens(answer);
  const mine = tokensToChunks(tokens, cuts, labels);
  const canon = (chs) => {
    const out = [];
    let start = 0;
    chs.forEach((c) => {
      const end = start + c.words.length - 1;
      const prev = out[out.length - 1];
      if (prev && prev.pos === c.pos && merge.includes(c.pos)) prev.end = end;
      else out.push({ pos: c.pos, start, end });
      start = end + 1;
    });
    return out;
  };
  const A = canon(answer);
  const M = canon(mine);
  const key = (c) => `${c.start}-${c.end}-${c.pos}`;
  const aKeys = new Set(A.map(key));
  // 학생 청크별 표시: 시작·끝이 정답 경계와 맞고, 덮는 단어의 정답 품사가 모두 같으면 OK
  const wordPos = [];
  const starts = new Set();
  const ends = new Set();
  let w = 0;
  answer.forEach((c) => {
    starts.add(w);
    c.words.forEach(() => wordPos.push(c.pos));
    w += c.words.length;
    ends.add(w - 1);
  });
  let s = 0;
  const chunkOk = mine.map((c) => {
    const e = s + c.words.length - 1;
    const span = wordPos.slice(s, e + 1);
    const okc = starts.has(s) && ends.has(e) && span.every((p) => p === c.pos)
      && (span.length === 1 || merge.includes(c.pos) || A.some((a) => a.start === s && a.end === e));
    s = e + 1;
    return okc;
  });
  const ok = A.length === M.length && M.every((c) => aKeys.has(key(c)));
  return { ok, chunkOk, answer, tokens };
}

/** 오류 수리점 (유형 10): 보여 줄(틀린) 청크 목록과 고치기 보기 만들기 */
export function buildRepair(q) {
  const correct = parseChunks(q.en);
  const e = q.error;
  const shown = [];
  let wrongIdx = [];
  correct.forEach((c, i) => {
    if (i !== e.chunk) return shown.push({ ...c });
    if (e.kind === 'label') {
      wrongIdx = [shown.length];
      shown.push({ ...c, pos: e.shown });
    } else if (e.kind === 'split') {
      const a = c.words.slice(0, e.after);
      const b = c.words.slice(e.after);
      wrongIdx = [shown.length, shown.length + 1];
      shown.push({ pos: e.shown[0], words: a, text: a.join(' ') });
      shown.push({ pos: e.shown[1], words: b, text: b.join(' ') });
    }
  });
  const target = correct[e.chunk];
  const wrongPos = e.kind === 'label' ? [e.shown] : [];
  const fixes = ['N', 'V', 'A', 'D'].filter((p) => !wrongPos.includes(p)).map((p) => ({ pos: p, text: target.text, words: target.words, merged: e.kind === 'split' }));
  return { correct, shown, wrongIdx, fixes, answerPos: target.pos };
}

export function gradeRepair(q, tappedIdx, fixPos) {
  const r = buildRepair(q);
  const found = r.wrongIdx.includes(tappedIdx);
  return { ok: found && fixPos === r.answerPos, found, ...r };
}

/** 청크 퍼즐 (유형 11): order = 학생이 놓은 청크 원래 번호 순서 */
export function gradePuzzle(q, order) {
  const n = parseChunks(q.en).length;
  const allowed = [Array.from({ length: n }, (_, i) => i), ...(q.alts || [])];
  return allowed.some((a) => a.length === order.length && a.every((v, i) => v === order[i]));
}

/** 번역의 탑 (유형 12)
 *  1단계: 한글 덩어리를 영어 어순으로 배열 → gradeTowerOrder
 *  2단계: 덩어리마다 영작 → gradeTowerTyping
 */
export function towerOrders(q) {
  return [q.order, ...(q.alts || [])];
}
export function gradeTowerOrder(q, order) {
  return towerOrders(q).some((a) => a.length === order.length && a.every((v, i) => v === order[i]));
}
export function gradeTowerTyping(q, inputs /* 한글 덩어리 번호 → 입력 */) {
  const chunks = parseChunks(q.ko);
  const each = chunks.map((c, i) => matchesAny(inputs[i] ?? '', c.answers || []));
  return { ok: each.every(Boolean), each };
}

/** 칸 보상 규칙 (기획서 2번) */
export function cellReward(correct, total, cfg) {
  const r = cfg.rewards;
  if (correct === total) return { move: r.perfect.move, coins: r.perfect.coins, perfect: true };
  if (correct === total - 1) return { move: r.good.move, coins: r.good.coins, perfect: false };
  return { move: 0, coins: correct * r.perCorrectCoin, perfect: false };
}
