// 원장님용 문제 검수 페이지 — 유형별 전체 목록, 자동 검사 결과, 오류 표시·메모, 직접 풀어 보기
import { TYPES, ROLES } from '../quiz/constants.js';
import { BANK, config } from '../quiz/bank.js';
import { validateQuestion } from '../quiz/validate.js';
import { parseChunks, chunksHTML, chunkHTML, bracketHTML, esc } from '../quiz/notation.js';
import { buildRepair } from '../quiz/grade.js';
import { renderQuestion } from '../quiz/renderers.js';

const KEY = 'cq.review.flags';
let flags = {};
try { flags = JSON.parse(localStorage.getItem(KEY)) || {}; } catch { /* 저장 불가 */ }
const saveFlags = () => {
  try { localStorage.setItem(KEY, JSON.stringify(flags)); } catch { /* 저장 불가 */ }
  countFlags();
};

const state = { type: 1, onlyFlagged: false, q: '' };
try { Object.assign(state, JSON.parse(sessionStorage.getItem('cq.review.ui')) || {}); } catch { /* */ }
const app = document.getElementById('app');
const boldMd = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b class="hl">$1</b>');
const stars = (lv) => '★'.repeat(lv) + '☆'.repeat(3 - lv);

function countFlags() {
  const n = Object.values(flags).filter((f) => f.flag).length;
  document.getElementById('flagCount').textContent = n ? `⚠ 오류 표시 ${n}개` : '';
}

/** 문제 한 개를 정적으로 보여 주기 (문제 + 정답) */
function staticView(q) {
  const opts = (list, ans, label = (x) => x) => `<div class="ropts">${list.map((o) => `<span class="${o === ans ? 'ans' : ''}">${esc(label(o))}</span>`).join('')}</div>`;
  switch (q.type) {
    case 1:
    case 2:
      return `<div class="rstem">${q.context ? boldMd(q.context) : `<b class="big">${esc(q.word)}</b>`}</div>${opts(q.options, q.answer)}`;
    case 3:
      return `<div class="rstem">${esc(q.prompt)}</div>${opts(q.options, q.answer)}`;
    case 4:
      return `<div class="rstem">${esc(q.sentence)}</div>${opts(['a', 'an', 'the', 'X'], q.answer)}`;
    case 5:
      return `<div class="rstem">${bracketHTML(q.sentence)}</div>${opts(Object.keys(ROLES), q.answer, (o) => ROLES[o])}`;
    case 6:
      return `<div class="rstem">${q.context ? boldMd(q.context) : `<b class="big">${esc(q.chunk)}</b>`}</div>${opts(q.options, q.answer)}`;
    case 7:
      return `<div class="rstem">${bracketHTML(q.sentence)}</div>${opts(q.options, q.answer)}`;
    case 8:
    case 9:
      return `<div class="rans">${chunksHTML(parseChunks(q.ko ?? q.en), q.end)}</div>`;
    case 10: {
      const r = buildRepair(q);
      return `<div class="rlab">학생에게 보이는 (틀린) 분석</div><div class="rans">${r.shown.map((c, i) => chunkHTML(c, r.wrongIdx.includes(i) ? 'bad' : '')).join(' ')}${esc(q.end || '')}</div>
        <div class="rlab">바르게 고친 분석</div><div class="rans">${chunksHTML(r.correct, q.end)}</div>`;
    }
    case 11:
      return `<div class="rstem">${esc(q.ko)}</div><div class="rans">${chunksHTML(parseChunks(q.en), q.end)}</div>${q.alts ? `<div class="rlab">다른 정답 순서 ${q.alts.length}개 허용</div>` : ''}`;
    case 12: {
      const ko = parseChunks(q.ko);
      return `<div class="rstem">${esc(ko.map((c) => c.text).join(' '))}.</div>
        <div class="rlab">영어 어순 (STEP 1 정답)${q.alts ? ` · 다른 순서 ${q.alts.length}개 허용` : ''}</div>
        <table class="rtower">${q.order.map((i) => `<tr><td>${chunkHTML(ko[i])}</td><td>${ko[i].answers.map(esc).join(' <span class="muted">/</span> ')}</td></tr>`).join('')}</table>`;
    }
    default:
      return '';
  }
}

function plainOf(q) {
  return [q.word, q.context, q.prompt, q.sentence, q.chunk, q.ko, q.en, q.explain, q.answer].filter(Boolean).join(' ').toLowerCase();
}

function render() {
  try { sessionStorage.setItem('cq.review.ui', JSON.stringify(state)); } catch { /* */ }
  const list = (BANK[state.type] || []).filter((q) => (!state.onlyFlagged || flags[q.id]?.flag) && (!state.q || plainOf(q).includes(state.q.toLowerCase())));
  const allErr = Object.values(BANK).flat().filter((q) => validateQuestion(q).length).length;
  app.innerHTML = `
    <div class="tabs">${Object.keys(TYPES).map((t) => {
      const nf = (BANK[t] || []).filter((q) => flags[q.id]?.flag).length;
      return `<button class="tab ${+t === state.type ? 'on' : ''}" data-t="${t}">${t}<small>${(BANK[t] || []).length}</small>${nf ? `<i>${nf}</i>` : ''}</button>`;
    }).join('')}</div>
    <div class="thead card">
      <div><b>유형 ${state.type}. ${esc(TYPES[state.type].name)}</b> <span class="muted">난이도 ${esc(TYPES[state.type].level)} · ${list.length}문제 표시</span></div>
      <div class="tools">
        <input id="search" placeholder="🔍 문제·해설 검색" value="${esc(state.q)}">
        <label class="chk"><input type="checkbox" id="only" ${state.onlyFlagged ? 'checked' : ''}> 오류 표시만</label>
      </div>
      <div class="tools">
        <button class="ghost" id="copy">📋 검수 결과 복사</button>
        <button class="ghost" id="csv">⬇ CSV 저장</button>
      </div>
      <div class="muted">자동 검사: ${allErr ? `<b style="color:var(--no)">${allErr}문제 오류</b>` : '전체 529문제 통과 ✔'.replace('529', Object.values(BANK).flat().length)}</div>
    </div>
    <div class="qlist">${list.map((q) => {
      const errs = validateQuestion(q);
      const f = flags[q.id] || {};
      return `<article class="rq card ${f.flag ? 'flagged' : ''}" data-id="${q.id}">
        <header><b>${q.id}</b><span class="lv" title="난이도">${stars(q.level)}</span><span class="src">${esc(q.source)}</span></header>
        ${staticView(q)}
        <div class="rexp">💡 ${esc(q.explain)}</div>
        ${errs.length ? `<div class="rerr">⚠ 자동 검사: ${errs.map(esc).join(' / ')}</div>` : ''}
        <footer>
          <button class="flag ${f.flag ? 'on' : ''}">${f.flag ? '⚠ 오류 표시됨' : '⚐ 오류 표시'}</button>
          <button class="tryq">▶ 풀어 보기</button>
        </footer>
        <textarea class="memo ${f.flag || f.memo ? '' : 'hide'}" placeholder="무엇이 잘못됐는지 메모 (예: 정답이 부사구가 아니라 형용사구)">${esc(f.memo || '')}</textarea>
      </article>`;
    }).join('') || '<p class="muted">표시할 문제가 없어요.</p>'}</div>`;

  app.querySelectorAll('.tab').forEach((b) => { b.onclick = () => { state.type = +b.dataset.t; render(); window.scrollTo(0, 0); }; });
  const s = app.querySelector('#search');
  s.oninput = () => { state.q = s.value; clearTimeout(s._t); s._t = setTimeout(() => { render(); const n = app.querySelector('#search'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 250); };
  app.querySelector('#only').onchange = (e) => { state.onlyFlagged = e.target.checked; render(); };
  app.querySelector('#copy').onclick = copyReport;
  app.querySelector('#csv').onclick = downloadCSV;
  app.querySelectorAll('.rq').forEach((el) => {
    const id = el.dataset.id;
    const memo = el.querySelector('.memo');
    el.querySelector('.flag').onclick = () => {
      const f = flags[id] || {};
      f.flag = !f.flag;
      flags[id] = f;
      saveFlags();
      el.classList.toggle('flagged', f.flag);
      el.querySelector('.flag').classList.toggle('on', f.flag);
      el.querySelector('.flag').textContent = f.flag ? '⚠ 오류 표시됨' : '⚐ 오류 표시';
      if (f.flag) { memo.classList.remove('hide'); memo.focus(); }
    };
    memo.oninput = () => { flags[id] = { ...(flags[id] || {}), memo: memo.value }; saveFlags(); };
    el.querySelector('.tryq').onclick = () => tryQuestion(id);
  });
}

function findQ(id) { return Object.values(BANK).flat().find((q) => q.id === id); }

async function tryQuestion(id) {
  const q = findQ(id);
  const ov = document.createElement('div');
  ov.className = 'modal';
  ov.innerHTML = `<div class="mbox"><div class="row" style="margin:0 0 10px"><b>${id} 풀어 보기</b><button class="ghost" id="x">닫기 ✕</button></div><div class="card q" id="qbox"></div><div id="fb"></div></div>`;
  document.body.appendChild(ov);
  ov.querySelector('#x').onclick = () => ov.remove();
  const r = await renderQuestion(ov.querySelector('#qbox'), q, config);
  if (!ov.isConnected) return;
  ov.querySelector('#fb').innerHTML = `<div class="fb ${r.ok ? 'ok' : 'no'}"><h3>${r.ok ? '정답! 👏' : '아쉬워요!'}</h3><div class="ans">${r.answerHTML}</div><div class="why">💡 ${esc(q.explain)}</div></div>`;
}

function flaggedRows() {
  return Object.entries(flags).filter(([, f]) => f.flag || f.memo).map(([id, f]) => {
    const q = findQ(id) || {};
    return { id, type: q.type, flag: !!f.flag, memo: f.memo || '', question: q.word || q.prompt || q.sentence || q.chunk || q.ko || q.en || '', answer: q.answer || '' };
  });
}

async function copyReport() {
  const rows = flaggedRows();
  const text = rows.length ? `품사 원정대 문제 검수 결과 (${rows.length}개)\n` + rows.map((r) => `[${r.id}] ${r.flag ? '⚠' : '메모'} ${r.memo}\n   문제: ${r.question}${r.answer ? ` / 정답: ${r.answer}` : ''}`).join('\n') : '오류 표시한 문제가 없습니다.';
  try { await navigator.clipboard.writeText(text); alert('복사했어요. 대화창에 붙여 넣어 보내 주세요.'); } catch { prompt('아래 내용을 복사하세요', text); }
}

function downloadCSV() {
  const rows = flaggedRows();
  const q = (s) => `"${String(s).replace(/"/g, '""')}"`;
  const csv = '﻿' + ['id,유형,오류,메모,문제,정답', ...rows.map((r) => [r.id, r.type, r.flag ? 'O' : '', r.memo, r.question, r.answer].map(q).join(','))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = '문제검수.csv';
  a.click();
}

countFlags();
render();
