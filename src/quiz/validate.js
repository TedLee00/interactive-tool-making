// 문제 은행 검사 — 빌드 전(scripts/validate.mjs)과 검수 페이지에서 함께 쓴다
import { EIGHT_POS, CHUNK_LABELS, ARTICLES, ROLES } from './constants.js';
import { parseChunks, chunksToTokens } from './notation.js';
import { buildRepair } from './grade.js';

const need = (q, keys, errs) => keys.forEach((k) => {
  if (q[k] === undefined || q[k] === '' || q[k] === null) errs.push(`${k} 없음`);
});

export function validateQuestion(q) {
  const errs = [];
  need(q, ['id', 'type', 'level', 'explain', 'source'], errs);
  if (![1, 2, 3].includes(q.level)) errs.push('level은 1~3');
  try {
    switch (q.type) {
      case 1:
      case 2: {
        need(q, ['word', 'answer', 'options'], errs);
        if (q.options?.length !== 5) errs.push('보기는 5개');
        if (!q.options?.includes(q.answer)) errs.push('정답이 보기에 없음');
        q.options?.forEach((o) => { if (!EIGHT_POS.includes(o)) errs.push(`8품사 아님: ${o}`); });
        if (new Set(q.options).size !== q.options?.length) errs.push('보기 중복');
        if (q.type === 2 && q.answer === '접속사') errs.push('한글 접속사는 출제하지 않음');
        if (q.context && !q.context.includes('**')) errs.push('context에 **단어** 표시 없음');
        break;
      }
      case 3:
        need(q, ['prompt', 'answer', 'options'], errs);
        if (!q.prompt?.includes('___')) errs.push('빈칸 ___ 없음');
        if (q.options?.length !== 4) errs.push('보기는 4개');
        if (!q.options?.includes(q.answer)) errs.push('정답이 보기에 없음');
        if (new Set(q.options).size !== q.options?.length) errs.push('보기 중복');
        break;
      case 4:
        need(q, ['sentence', 'answer'], errs);
        if ((q.sentence.match(/___/g) || []).length !== 1) errs.push('빈칸은 1개');
        if (!ARTICLES.includes(q.answer)) errs.push('정답은 a/an/the/X');
        break;
      case 5:
        need(q, ['sentence', 'answer'], errs);
        if ((q.sentence.match(/\[/g) || []).length !== 1) errs.push('[ ] 표시는 1개');
        if (!ROLES[q.answer]) errs.push('정답은 S/V/O/C/M');
        break;
      case 6:
      case 7:
        need(q, ['answer', 'options'], errs);
        if (q.type === 6) need(q, ['chunk'], errs);
        if (q.type === 7) {
          need(q, ['sentence'], errs);
          if ((q.sentence.match(/\[/g) || []).length !== 1) errs.push('[ ] 표시는 1개');
        }
        if (q.options?.length !== 5) errs.push('보기는 5개');
        if (!q.options?.includes(q.answer)) errs.push('정답이 보기에 없음');
        q.options?.forEach((o) => { if (!CHUNK_LABELS.includes(o)) errs.push(`라벨 아님: ${o}`); });
        if (new Set(q.options).size !== q.options?.length) errs.push('보기 중복');
        break;
      case 8:
      case 9: {
        const key = q.type === 8 ? 'ko' : 'en';
        need(q, [key], errs);
        const ch = parseChunks(q[key]);
        if (ch.length < 2) errs.push('청크가 2개 미만');
        if (!ch.some((c) => c.pos === 'V')) errs.push('동사 청크 없음');
        if (q.type === 8 && ch.some((c) => c.pos === 'C')) errs.push('한글 접속사 청크는 쓰지 않음 (부사절로)');
        break;
      }
      case 10: {
        need(q, ['en', 'error'], errs);
        const ch = parseChunks(q.en);
        const e = q.error;
        if (!ch[e.chunk]) errs.push('error.chunk 범위 밖');
        else if (e.kind === 'label') {
          if (e.shown === ch[e.chunk].pos) errs.push('틀린 라벨이 정답과 같음');
        } else if (e.kind === 'split') {
          if (!(e.after > 0 && e.after < ch[e.chunk].words.length)) errs.push('split 위치 오류');
          if (!Array.isArray(e.shown) || e.shown.length !== 2) errs.push('split shown은 2개');
        } else errs.push('error.kind는 label/split');
        buildRepair(q);
        break;
      }
      case 11: {
        need(q, ['ko', 'en'], errs);
        const ch = parseChunks(q.en);
        if (ch.length < 3) errs.push('조각이 3개 미만');
        const texts = ch.map((c) => c.text.toLowerCase());
        if (new Set(texts).size !== texts.length) errs.push('같은 조각이 2개 (순서 판정 모호)');
        (q.alts || []).forEach((a) => { if ([...a].sort((x, y) => x - y).join() !== ch.map((_, i) => i).join()) errs.push('alts 순서 오류'); });
        break;
      }
      case 12: {
        need(q, ['ko', 'order'], errs);
        const ch = parseChunks(q.ko);
        ch.forEach((c, i) => { if (!c.answers?.length) errs.push(`${i}번 덩어리 허용 답안 없음`); });
        const ok = (a) => [...a].sort((x, y) => x - y).join() === ch.map((_, i) => i).join();
        if (!ok(q.order)) errs.push('order 오류');
        (q.alts || []).forEach((a) => { if (!ok(a)) errs.push('alts 오류'); });
        break;
      }
      default:
        errs.push('알 수 없는 유형');
    }
  } catch (e) {
    errs.push(String(e.message || e));
  }
  return errs;
}

export function validateBank(bank) {
  const report = [];
  const ids = new Set();
  for (const [type, list] of Object.entries(bank)) {
    if (list.length < 40) report.push({ id: `type ${type}`, errs: [`문제 수 ${list.length} (40 미만)`] });
    const seen = new Set();
    list.forEach((q) => {
      const errs = validateQuestion(q);
      if (ids.has(q.id)) errs.push('id 중복');
      ids.add(q.id);
      if (String(q.type) !== String(type)) errs.push('파일과 유형 번호 다름');
      const sig = JSON.stringify([q.word, q.context, q.prompt, q.sentence, q.chunk, q.ko, q.en]);
      if (seen.has(sig)) errs.push('같은 문제 중복');
      seen.add(sig);
      if (errs.length) report.push({ id: q.id, errs });
    });
  }
  return report;
}

export { chunksToTokens };
