// 유형별 채점 — 순수 함수 (UI와 분리해 테스트한다)
import { parseChunks, chunksToTokens, tokensToChunks } from './notation.js';
import { matchesAny, nearMatch, closeSentence } from './normalize.js';

/** 선택형 (유형 1~7) */
export function gradeChoice(q, picked) {
  return picked === q.answer;
}

/**
 * 청크 나누기 (유형 8·9)
 * @param q        문제 (q.ko 또는 q.en 표기)
 * @param cuts     학생이 나눈 틈 번호 배열
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
  const fixes = ['N', 'V', 'A', 'D', 'C'].filter((p) => !wrongPos.includes(p)) /* △접속사도 보기에 (정답이 접속사인 문제가 있음) */.map((p) => ({ pos: p, text: target.text, words: target.words, merged: e.kind === 'split' }));
  return { correct, shown, wrongIdx, fixes, answerPos: target.pos };
}

export function gradeRepair(q, tappedIdx, fixPos) {
  const r = buildRepair(q);
  const found = r.wrongIdx.includes(tappedIdx);
  return { ok: found && fixPos === r.answerPos, found, ...r };
}

/** 청크 퍼즐 (유형 11): order = 학생이 놓은 청크 원래 번호 순서 */
export function gradePuzzle(q, order) {
  const chunks = parseChunks(q.en);
  const n = chunks.length;
  const allowed = [Array.from({ length: n }, (_, i) => i), ...(q.alts || [])];
  if (allowed.some((a) => a.length === order.length && a.every((v, i) => v === order[i]))) return true;
  // 맨 뒤 부사 덩어리들끼리 순서만 바뀐 것은 인정 (<어디서> <언제> 순서 차이)
  let tail = n;
  while (tail > 0 && chunks[tail - 1].pos === 'D') tail--;
  if (n - tail < 2) return false;
  return order.slice(0, tail).every((v, i) => v === i) && [...order.slice(tail)].sort((a, b) => a - b).every((v, k) => v === tail + k);
}

/** 번역의 탑 (유형 12)
 *  1단계: 한글 덩어리를 영어 어순으로 배열 → gradeTowerOrder
 *  2단계: 덩어리마다 영작 → gradeTowerTyping
 */
export function towerOrders(q) {
  return [q.order, ...(q.alts || [])];
}
export function gradeTowerOrder(q, order) {
  if (towerOrders(q).some((a) => a.length === order.length && a.every((v, i) => v === order[i]))) return true;
  // 뼈대(명사·동사·형용사) 순서가 같고 부사 덩어리 자리만 다르면 인정
  const chunks = parseChunks(q.ko);
  // (부사 덩어리는 문장 맨 앞이나 맨 뒤 쪽에만 올 수 있음: 주어와 동사 사이 X)
  const isD = (i) => chunks[i].pos === 'D';
  const core = (o) => o.filter((i) => !isD(i)).join(',');
  if (order.length !== q.order.length || core(order) !== core(q.order)) return false;
  const inner = (o) => {
    const f = o.findIndex((x) => !isD(x));
    const l = o.length - 1 - [...o].reverse().findIndex((x) => !isD(x));
    return o.slice(f, l + 1).join(',');
  };
  return inner(order) === inner(q.order); // 문장 안쪽은 그대로, 바깥(맨 앞/맨 뒤) 부사구만 자유
}
export function gradeTowerTyping(q, inputs /* 한글 덩어리 번호 → 입력 */) {
  const chunks = parseChunks(q.ko);
  const near = {};
  const each = chunks.map((c, i) => {
    const v = inputs[i] ?? '';
    if (matchesAny(v, c.answers || [])) return true;
    const n = nearMatch(v, c.answers || []);
    if (n) { near[i] = n; return true; } // 비슷한 답도 정답 (더 정확한 표현은 따로 보여 준다)
    return false;
  });
  // 덩어리 몇 개가 조금 달라도, 문장 전체로 보면 거의 같으면 정답 (뜻 · 문법이 맞으면 인정)
  if (!each.every(Boolean) && q.order) {
    const full = q.order.map((i) => inputs[i] ?? '').join(' ');
    const ans = q.order.map((i) => (chunks[i].answers || [''])[0]).join(' ');
    if (closeSentence(full, ans)) { chunks.forEach((c, i) => { if (!each[i]) { each[i] = true; near[i] = (c.answers || [''])[0]; } }); }
  }
  return { ok: each.every(Boolean), each, near };
}

/** 칸 보상 규칙 (기획서 2번) */
export function cellReward(correct, total, cfg) {
  const r = cfg.rewards;
  if (correct === total) return { move: r.perfect.move, coins: r.perfect.coins, perfect: true };
  if (correct === total - 1) return { move: r.good.move, coins: r.good.coins, perfect: false };
  return { move: 0, coins: correct * r.perCorrectCoin, perfect: false };
}
