// 유형별 화면 — 각 렌더러는 (box, q, cfg) 를 받아 학생이 답하면
// { ok, mine, answerHTML, questionPlain, answerPlain } 으로 resolve 되는 Promise를 돌려준다.
import { TYPES, ROLES, POS, POS_ORDER } from './constants.js';
import {
  parseChunks, chunksToTokens, tokensToChunks, chunkHTML, chunksHTML, chunksPlain, chunkPlain, bracketHTML, esc,
} from './notation.js';
import {
  gradeChoice, gradeSplit, buildRepair, gradePuzzle, gradeTowerOrder, gradeTowerTyping,
} from './grade.js';
import { shuffle } from './bank.js';

const h = (html) => {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
};
const boldMd = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b class="hl">$1</b>');
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/* ---------------- 선택형 (1~7) ---------------- */
function choiceSpec(q) {
  switch (q.type) {
    case 1:
    case 2:
      return {
        help: '굵게 표시된 단어의 <em>품사</em>를 고르세요',
        stem: q.context ? `<div class="stem sent">${boldMd(q.context)}</div>` : `<div class="stem word">${esc(q.word)}</div>`,
        helpNoCtx: '이 단어의 <em>품사</em>를 고르세요',
        options: shuffle(q.options),
        plain: q.context ? q.context.replace(/\*\*/g, '') + ` (${q.word})` : q.word,
      };
    case 3:
      return {
        help: '빈칸에 <em>어울리는 짝꿍</em>을 고르세요',
        stem: `<div class="stem sent">${esc(q.prompt).replace('___', '<span class="blank">　?　</span>')}</div>`,
        options: shuffle(q.options),
        plain: q.prompt,
      };
    case 4:
      return {
        help: '빈칸에 알맞은 <em>관사</em>를 고르세요 <small>(X = 관사 없음)</small>',
        stem: `<div class="stem sent">${esc(q.sentence).replace('___', '<span class="blank">　?　</span>')}</div>`,
        options: ['a', 'an', 'the', 'X'],
        label: (o) => (o === 'X' ? 'X <small>관사 없음</small>' : esc(o)),
        plain: q.sentence,
      };
    case 5:
      return {
        help: '[ ] 부분의 <em>문장 성분</em>을 고르세요 <small>품사가 아니라 문장 속 「자리」!</small>',
        stem: `<div class="stem sent">${bracketHTML(q.sentence)}</div>`,
        options: Object.keys(ROLES),
        label: (o) => esc(ROLES[o]),
        plain: q.sentence,
      };
    case 6:
      return {
        help: '이 덩어리의 <em>품사 + 단위</em>를 고르세요 <small>예: 부사구 · 명사절</small>',
        stem: q.context ? `<div class="stem sent">${boldMd(q.context)}</div>` : `<div class="stem word">${esc(q.chunk)}</div>`,
        options: shuffle(q.options),
        plain: q.context ? q.context.replace(/\*\*/g, '') : q.chunk,
      };
    case 7:
      return {
        help: '[ ] 덩어리의 <em>품사 + 단위</em>를 고르세요 <small>문장 성분이 아니라 「품사」!</small>',
        stem: `<div class="stem sent">${bracketHTML(q.sentence)}</div>`,
        options: shuffle(q.options),
        plain: q.sentence,
      };
    default:
      throw new Error('choice type?');
  }
}

export function renderChoice(box, q) {
  const sp = choiceSpec(q);
  box._answerInfo = {
    answerHTML: `정답: <b>${esc(q.type === 5 ? ROLES[q.answer] : q.type === 4 && q.answer === 'X' ? 'X (관사 없음)' : q.answer)}</b>`,
    questionPlain: sp.plain,
    answerPlain: q.type === 5 ? ROLES[q.answer] : q.answer,
  };
  const help = (q.type === 1 || q.type === 2) && !q.context ? sp.helpNoCtx : sp.help;
  const label = sp.label || ((o) => esc(o));
  box.innerHTML = `<div class="qhelp">${help}</div>${sp.stem}
    <div class="opts ${q.type === 5 ? 'roles' : ''}">${sp.options.map((o) => `<button class="opt" data-v="${esc(o)}">${label(o)}</button>`).join('')}</div>`;
  return new Promise((res) => {
    box.querySelectorAll('.opt').forEach((b) => {
      b.onclick = () => {
        if (box.dataset.done) return;
        box.dataset.done = '1';
        const v = b.dataset.v;
        const ok = gradeChoice(q, v);
        box.querySelectorAll('.opt').forEach((x) => {
          x.disabled = true;
          if (x.dataset.v === q.answer) x.classList.add('right');
        });
        if (!ok) b.classList.add('wrong');
        const ansLabel = q.type === 5 ? ROLES[q.answer] : q.type === 4 && q.answer === 'X' ? 'X (관사 없음)' : q.answer;
        const mineLabel = q.type === 5 ? ROLES[v] : v;
        const out = { ok, mine: mineLabel, answerHTML: `정답: <b>${esc(ansLabel)}</b>`, questionPlain: sp.plain, answerPlain: ansLabel };
        if (q.type === 3 && q.pair) setTimeout(() => pairStep(box, q, out, res), ok ? 650 : 1100);
        else res(out);
      };
    });
  });
}

/* 짝꿍 찾기 ② — 두 짝꿍의 품사 고르기 (형용사↔명사, 부사↔동사) */
const PAIR_POS = ['N', 'V', 'A', 'D'];
const PNAME = { N: '명사', V: '동사', A: '형용사', D: '부사' };
function pairStep(box, q, first, res) {
  const P = q.pair;
  const picks = { mod: null, head: null };
  const rule = P.modPos === 'A' ? '형용사는 <b>명사</b>와 짝꿍! 형용사 뒤에는 명사가 와요' : '부사는 <b>동사</b>와 짝꿍! 부사는 동사를 꾸며요';
  const draw = () => {
    box.innerHTML = `<div class="qhelp">② 두 짝꿍의 <em>품사</em>를 각각 고르세요 <small>${first.ok ? '짝꿍 정답! 이제 품사까지!' : `짝꿍 정답은 「${esc(q.answer)}」 — 이제 품사를 골라 봐요`}</small></div>
      <div class="stem sent pairline">${esc(q.prompt.replace(/\s*\(.*\)\s*$/, '')).replace('___', `<b class="hl">${esc(q.answer)}</b>`)}</div>
      ${['mod', 'head'].map((k) => `<div class="pairrow"><span class="pw">${esc(P[k])}</span><div class="opts pos4">${PAIR_POS.map((p) => `<button class="opt ${picks[k] === p ? 'on' : ''}" data-k="${k}" data-p="${p}">${PNAME[p]}</button>`).join('')}</div></div>`).join('')}
      <div class="row center"><button class="primary" id="pairGo" ${picks.mod && picks.head ? '' : 'disabled'}>확인</button></div>`;
    box.querySelectorAll('[data-k]').forEach((b) => { b.onclick = () => { picks[b.dataset.k] = b.dataset.p; draw(); }; });
    box.querySelector('#pairGo').onclick = () => {
      const ok2 = picks.mod === P.modPos && picks.head === P.headPos;
      box.querySelectorAll('[data-k]').forEach((b) => {
        b.disabled = true;
        if (b.dataset.p === P[b.dataset.k === 'mod' ? 'modPos' : 'headPos']) b.classList.add('right');
        else if (b.classList.contains('on')) b.classList.add('wrong');
      });
      box.querySelector('#pairGo').remove();
      res({
        ...first,
        ok: first.ok && ok2,
        mine: `${first.mine} · ${P.mod}=${PNAME[picks.mod]}, ${P.head}=${PNAME[picks.head]}`,
        answerHTML: `${first.answerHTML}<div class="pairrule">${esc(P.mod)} = <b>${PNAME[P.modPos]}</b> · ${esc(P.head)} = <b>${PNAME[P.headPos]}</b><br>👉 ${rule}</div>`,
        answerPlain: `${first.answerPlain} (${P.mod}=${PNAME[P.modPos]}, ${P.head}=${PNAME[P.headPos]})`,
      });
    };
  };
  box._answerInfo = { ...box._answerInfo, answerHTML: `${first.answerHTML}<div class="pairrule">${esc(P.mod)} = <b>${PNAME[P.modPos]}</b> · ${esc(P.head)} = <b>${PNAME[P.headPos]}</b><br>👉 ${rule}</div>` };
  draw();
}

/* 기호 범례 (청크 유형 맨 위): ○명사 · □동사 · ( )형용사 · < >부사 · △접속사 — 예시와 함께 */
function legendHTML(withC = true) {
  // ① 기호 약속: 기호 = 품사 (기호만 보여 주기)  ② 예문: 문장 속 덩어리에 기호를 친 모습
  const key = (p) => `<span class="lk lk-${p}"><b>${esc(p === 'C' ? '△' : POS[p].sym)}</b>${POS[p].name}</span>`;
  const ex = withC ? 'N:The tall boy | V:is | A:very happy | C:and | N:he | V:plays | N:soccer | D:after school' : 'N:My little sister | V:looks | A:very happy | D:after school';
  return `<div class="sym-legend"><div class="lg-key">${['N', 'V', 'A', 'D', ...(withC ? ['C'] : [])].map(key).join('')}</div>
    <div class="lg-ex"><span class="lg-tag">예</span>${parseChunks(ex).map((c) => chunkHTML(c)).join(' ')}</div></div>`;
}
/** 순서 문제 보기 섞기: 원래 순서 · 정답 순서와 같지 않게 */
function shuffleNot(list, ...bad) {
  let out = shuffle(list);
  for (let k = 0; k < 12 && list.length > 1 && bad.some((b) => b.every((v, i) => out[i] === v)); k++) out = shuffle(list);
  return out;
}

/* ---------------- 청크 나눔터 (8·9) ---------------- */
export function renderSplit(box, q, cfg) {
  const answer = parseChunks(q.ko ?? q.en);
  const { tokens } = chunksToTokens(answer);
  const cuts = new Set();
  const palette = q.type === 9 ? POS_ORDER : ['N', 'V', 'A', 'D'];
  let labels = [];
  let brush = 'N';
  let phase = 1;
  box._answerInfo = { answerHTML: `정답<div class="ans-line">${chunksHTML(answer, q.end)}</div>`, questionPlain: tokens.join(' ') + (q.end || ''), answerPlain: chunksPlain(answer) + (q.end || '') };

  const draw = () => {
    if (phase === 1) {
      box.innerHTML = `${legendHTML(q.type === 9)}<div class="qhelp">① 단어 사이 틈을 눌러 <em>덩어리로 나누세요</em></div>
        <div class="split-line">${tokens.map((t, i) => `<span class="tk">${esc(t)}</span>${i < tokens.length - 1 ? `<button class="gap ${cuts.has(i) ? 'cut' : ''}" data-g="${i}" aria-label="나누기"><i></i></button>` : ''}`).join('')}<span class="end">${esc(q.end || '')}</span></div>
        <div class="row"><span class="muted">덩어리 ${cuts.size + 1}개</span><button class="primary" id="toPaint">② 품사 칠하기 ▶</button></div>`;
      box.querySelectorAll('.gap').forEach((g) => {
        g.onclick = () => {
          const i = +g.dataset.g;
          cuts.has(i) ? cuts.delete(i) : cuts.add(i);
          draw();
        };
      });
      box.querySelector('#toPaint').onclick = () => {
        const n = cuts.size + 1;
        if (labels.length !== n) labels = Array(n).fill(null);
        phase = 2;
        draw();
      };
      return;
    }
    const chunks = tokensToChunks(tokens, [...cuts], labels);
    box.innerHTML = `${legendHTML(q.type === 9)}<div class="qhelp">② 붓을 고르고 덩어리마다 <em>품사를 칠하세요</em></div>
      <div class="split-line painted">${chunks.map((c, i) => `<button class="pchunk" data-i="${i}">${chunkHTML(c)}</button>`).join('')}<span class="end">${esc(q.end || '')}</span></div>
      <div class="palette">${palette.map((p) => `<button class="brush ${POS[p].cls} ${p === brush ? 'on' : ''}" data-p="${p}"><b>${esc(POS[p].sym)}</b><small>${POS[p].name}</small></button>`).join('')}</div>
      <div class="row center sub-row"><button class="ghost" id="back">◀ 다시 나누기</button><button class="primary big" id="submit" ${labels.every(Boolean) ? '' : 'disabled'}>제출</button></div>`;
    box.querySelectorAll('.brush').forEach((b) => { b.onclick = () => { brush = b.dataset.p; draw(); }; });
    box.querySelectorAll('.pchunk').forEach((b) => { b.onclick = () => { labels[+b.dataset.i] = brush; draw(); }; });
    box.querySelector('#back').onclick = () => { phase = 1; draw(); };
    box.querySelector('#submit').onclick = () => box._submit?.();
  };

  return new Promise((res) => {
    box._submit = () => {
      const r = gradeSplit(q, [...cuts], labels, { mergeAdjacent: cfg?.grading?.mergeAdjacent });
      const mine = tokensToChunks(tokens, [...cuts], labels);
      box.innerHTML = `<div class="qhelp">내 답</div>
        <div class="split-line painted">${mine.map((c, i) => chunkHTML(c, r.chunkOk[i] ? 'ok' : 'bad')).join(' ')}<span class="end">${esc(q.end || '')}</span></div>`;
      res({
        ok: r.ok,
        mine: chunksPlain(mine),
        answerHTML: `정답<div class="ans-line">${chunksHTML(answer, q.end)}</div>`,
        questionPlain: tokens.join(' ') + (q.end || ''),
        answerPlain: chunksPlain(answer) + (q.end || ''),
      });
    };
    draw();
  });
}

/* ---------------- 오류 수리점 (10) ---------------- */
export function renderRepair(box, q) {
  const r = buildRepair(q);
  box._answerInfo = { answerHTML: `바르게 고친 분석<div class="ans-line">${chunksHTML(r.correct, q.end)}</div>`, questionPlain: chunksPlain(r.shown) + (q.end || ''), answerPlain: chunksPlain(r.correct) + (q.end || '') };
  return new Promise((res) => {
    const step1 = () => {
      box.innerHTML = `${legendHTML()}<div class="qhelp">① <em>잘못 분석된 덩어리</em>를 찾아 누르세요</div>
        <div class="split-line painted">${r.shown.map((c, i) => `<button class="pchunk" data-i="${i}">${chunkHTML(c)}</button>`).join('')}<span class="end">${esc(q.end || '')}</span></div>`;
      box.querySelectorAll('.pchunk').forEach((b) => { b.onclick = () => step2(+b.dataset.i); });
    };
    const step2 = (ti) => {
      const found = r.wrongIdx.includes(ti);
      const tapped = r.shown[ti];
      // 찾은 경우: 정답 덩어리 기준 보기 / 못 찾은 경우: 누른 덩어리의 다른 라벨 보기
      const opts = found
        ? shuffle(r.fixes)
        : shuffle(['N', 'V', 'A', 'D', 'C'].filter((p) => p !== tapped.pos).map((p) => ({ pos: p, text: tapped.text, words: tapped.words })));
      box.innerHTML = `${legendHTML()}<div class="qhelp">② <em>바르게 고친 것</em>을 고르세요</div>
        <div class="split-line painted">${r.shown.map((c, i) => chunkHTML(c, i === ti || (found && r.wrongIdx.includes(i)) ? 'sel' : 'dim')).join(' ')}<span class="end">${esc(q.end || '')}</span></div>
        <div class="opts fixes">${opts.map((o, k) => `<button class="opt" data-k="${k}">${chunkHTML(o)}</button>`).join('')}</div>
        <div class="row"><button class="ghost" id="re">◀ 다시 찾기</button></div>`;
      box.querySelector('#re').onclick = step1;
      box.querySelectorAll('.opt').forEach((b) => {
        b.onclick = () => {
          const pick = opts[+b.dataset.k];
          const ok = found && pick.pos === r.answerPos;
          box.querySelectorAll('.opt').forEach((x) => { x.disabled = true; });
          b.classList.add(ok ? 'right' : 'wrong');
          box.querySelector('#re').remove();
          res({
            ok,
            mine: `${chunkPlain(tapped)} → ${chunkPlain(pick)}`,
            answerHTML: `바르게 고친 분석<div class="ans-line">${chunksHTML(r.correct, q.end)}</div>`,
            questionPlain: chunksPlain(r.shown) + (q.end || ''),
            answerPlain: chunksPlain(r.correct) + (q.end || ''),
          });
        };
      });
    };
    step1();
  });
}

/* ---------------- 청크 퍼즐 광장 (11) ---------------- */
const KEEP_LOWER = new Set(['the', 'a', 'an', 'my', 'our', 'your', 'his', 'her', 'their', 'this', 'that', 'many', 'some', 'we', 'you', 'they', 'he', 'she', 'it', 'when', 'before', 'after', 'because', 'every', 'in', 'on', 'at', 'to', 'playing', 'reading', 'swimming', 'watching', 'all', 'mom']);
function puzzleText(t) {
  const [w, ...rest] = t.split(' ');
  return KEEP_LOWER.has(w.toLowerCase()) && w !== 'I' ? [w.toLowerCase(), ...rest].join(' ') : t;
}

export function renderPuzzle(box, q) {
  const chunks = parseChunks(q.en).map((c, i) => ({ ...c, i, text: puzzleText(c.text) }));
  let pool = shuffleNot(chunks, chunks); // 정답 순서 그대로 나오지 않게
  const placed = [];
  { const answer = parseChunks(q.en); box._answerInfo = { answerHTML: `정답<div class="ans-line">${chunksHTML(answer, q.end)}</div>`, questionPlain: q.ko, answerPlain: answer.map((c) => c.text).join(' / ') + (q.end || '') }; }
  return new Promise((res) => {
    const draw = () => {
      const shownPlaced = placed.map((c, k) => ({ ...c, text: k === 0 ? cap(c.text) : c.text }));
      box.innerHTML = `${legendHTML()}<div class="qhelp">우리말에 맞게 <em>영어 덩어리를 순서대로</em> 누르세요</div>
        <div class="ko-prompt">${esc(q.ko)}</div>
        <div class="ansbox">${placed.length ? shownPlaced.map((c, k) => `<button class="pchunk" data-k="${k}">${chunkHTML(c)}</button>`).join('') + `<span class="end">${esc(q.end || '')}</span>` : '<span class="ph">여기에 문장이 만들어져요</span>'}</div>
        <div class="pool">${pool.map((c, k) => `<button class="pchunk" data-p="${k}">${chunkHTML(c)}</button>`).join('')}</div>
        <div class="row center sub-row"><button class="ghost" id="reset">↺ 다시</button><button class="primary big" id="submit" ${pool.length ? 'disabled' : ''}>제출</button></div>`;
      box.querySelectorAll('[data-p]').forEach((b) => { b.onclick = () => { placed.push(pool.splice(+b.dataset.p, 1)[0]); draw(); }; });
      box.querySelectorAll('[data-k]').forEach((b) => { b.onclick = () => { pool.push(placed.splice(+b.dataset.k, 1)[0]); draw(); }; });
      box.querySelector('#reset').onclick = () => { pool = shuffle(chunks); placed.length = 0; draw(); };
      box.querySelector('#submit').onclick = () => {
        const order = placed.map((c) => c.i);
        const ok = gradePuzzle(q, order);
        const answer = parseChunks(q.en);
        box.querySelectorAll('button').forEach((b) => { b.disabled = true; });
        res({
          ok,
          mine: placed.map((c, k) => (k === 0 ? cap(c.text) : c.text)).join(' / '),
          answerHTML: `정답<div class="ans-line">${chunksHTML(answer, q.end)}</div>`,
          questionPlain: q.ko,
          answerPlain: answer.map((c) => c.text).join(' / ') + (q.end || ''),
        });
      };
    };
    draw();
  });
}

/* ---------------- 번역의 탑 (12) ---------------- */
export function renderTower(box, q, cfg) {
  const ko = parseChunks(q.ko).map((c, i) => ({ ...c, i }));
  const mode = cfg?.grading?.type12Mode || 'typing';
  const placed = [];
  let orderOk = false;
  const poolOrder = shuffleNot(ko, ko, q.order.map((i) => ko[i])); // 한글 순서 그대로 · 정답 순서 그대로 나오지 않게 섞기
  { const sentence = cap(q.order.map((i) => ko[i].answers[0]).join(' ')) + (q.end || ''); box._answerInfo = { answerHTML: `정답<div class="ans-line en">${esc(sentence)}</div><div class="ans-line">${q.order.map((i) => `${chunkHTML(ko[i])} = <b>${esc(ko[i].answers.join(' / '))}</b>`).join('<br>')}</div>`, questionPlain: ko.map((c) => c.text).join(' ') + '.', answerPlain: sentence }; }
  return new Promise((res) => {
    const step1 = () => {
      box.innerHTML = `${legendHTML()}<div class="qhelp"><b>STEP 1</b> 한글 덩어리를 <em>영어 어순</em>으로 놓으세요 <small>주어 → 동사 → 목적어/보어 → &lt;어디서&gt; → &lt;언제&gt;</small></div>
        <div class="ko-prompt">${esc(ko.map((c) => c.text).join(' '))}.</div>
        <div class="ansbox">${placed.length ? placed.map((c, k) => `<button class="pchunk" data-k="${k}">${chunkHTML(c)}</button>`).join('') : '<span class="ph">영어 어순으로 놓아 보세요</span>'}</div>
        <div class="pool">${poolOrder.filter((c) => !placed.includes(c)).map((c) => `<button class="pchunk" data-i="${c.i}">${chunkHTML(c)}</button>`).join('')}</div>
        <div class="row center"><button class="primary" id="next" ${placed.length === ko.length ? '' : 'disabled'}>STEP 2 영작하기 ▶</button></div>`;
      box.querySelectorAll('[data-i]').forEach((b) => { b.onclick = () => { placed.push(ko[+b.dataset.i]); step1(); }; });
      box.querySelectorAll('[data-k]').forEach((b) => { b.onclick = () => { placed.splice(+b.dataset.k, 1); step1(); }; });
      box.querySelector('#next').onclick = () => {
        const order = placed.map((c) => c.i);
        orderOk = gradeTowerOrder(q, order);
        step2(orderOk ? order : q.order);
      };
    };
    const step2 = (order) => {
      const rows = order.map((i) => ko[i]);
      box.innerHTML = `<div class="qhelp"><b>STEP 2</b> 덩어리마다 <em>영어로 쓰세요</em> <small>비슷하게 맞으면 정답으로 인정해요</small></div>
        ${orderOk ? '<div class="note ok">✔ 어순 정답!</div>' : `<div class="note no">✘ 어순은 이렇게! <div class="ans-line">${rows.map((c) => chunkHTML(c)).join(' → ')}</div></div>`}
        <div class="tower row-flow">${rows.map((c) => `<label class="trow"><span class="tko">${chunkHTML(c)}</span>
          <input data-i="${c.i}" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="영어로" style="width:${Math.min(220, Math.max(84, (c.answers[0] || '').length * 9 + 30))}px">
          ${mode === 'tiles' ? `<span class="tiles">${shuffle(c.answers[0].split(' ')).map((w) => `<button type="button" class="tile" data-for="${c.i}">${esc(w)}</button>`).join('')}</span>` : ''}</label>`).join('')}</div>
        <div class="row center"><button class="primary" id="submit">제출</button></div>`;
      box.querySelectorAll('.tile').forEach((t) => {
        t.onclick = () => {
          const inp = box.querySelector(`input[data-i="${t.dataset.for}"]`);
          inp.value = (inp.value ? inp.value + ' ' : '') + t.textContent;
          t.disabled = true;
        };
      });
      box.querySelector('input')?.focus();
      box.querySelector('#submit').onclick = () => {
        const inputs = {};
        box.querySelectorAll('input[data-i]').forEach((inp) => { inputs[+inp.dataset.i] = inp.value; });
        const r = gradeTowerTyping(q, inputs);
        box.querySelectorAll('input[data-i]').forEach((inp) => {
          const i = +inp.dataset.i;
          inp.disabled = true;
          inp.classList.add(r.each[i] ? 'ok' : 'bad');
          if (r.near[i]) inp.insertAdjacentHTML('afterend', `<small class="near">✔ 비슷한 답도 정답! 더 정확하게: <b>${esc(r.near[i])}</b></small>`);
        });
        box.querySelector('#submit').remove();
        const sentence = cap(q.order.map((i) => ko[i].answers[0]).join(' ')) + (q.end || '');
        res({
          ok: orderOk && r.ok,
          mine: order.map((i) => inputs[i] || '…').join(' / '),
          answerHTML: `정답<div class="ans-line en">${esc(sentence)}</div><div class="ans-line">${q.order.map((i) => `${chunkHTML(ko[i])} = <b>${esc(ko[i].answers.join(' / '))}</b>`).join('<br>')}</div>`,
          questionPlain: ko.map((c) => c.text).join(' ') + '.',
          answerPlain: sentence,
        });
      };
    };
    step1();
  });
}

export function renderQuestion(box, q, cfg) {
  box.dataset.done = '';
  const kind = TYPES[q.type].kind;
  if (kind === 'choice') return renderChoice(box, q, cfg);
  if (kind === 'split') return renderSplit(box, q, cfg);
  if (kind === 'repair') return renderRepair(box, q, cfg);
  if (kind === 'puzzle') return renderPuzzle(box, q, cfg);
  return renderTower(box, q, cfg);
}

export { h };
