// 한 칸 = 5문제 진행기: 시작 안내 → 문제 → 즉시 피드백(정답·교재식 해설) → 결과·보상
import { TYPES, CHUNK_RULE_HTML } from './constants.js';
import { renderQuestion } from './renderers.js';
import { cellReward } from './grade.js';
import { esc } from './notation.js';
import { sfx } from './sound.js';

const wait = (el, sel) => new Promise((r) => { el.querySelector(sel).onclick = r; });

/**
 * @param root   화면을 그릴 요소
 * @param opts   { type, questions, config, showIntro=true }
 * @returns Promise<{type, correct, total, reward, wrongs[]}>
 */
/** 해설을 읽기 쉽게: 문장마다 한 줄 · 청크 기호(○□( )< >)와 품사 이름에 교재 색 */
function explainHTML(text) {
  const parts = String(text).split(/(?<=[.!?])\s+(?=\S)|\s+·\s+/).filter(Boolean);
  const color = (h) => h
    .replace(/→/g, '<i class="ar">→</i>')
    .replace(/○\s?([^\s.,!?)]+(?:\s[a-z][^\s.,!?)]*)*)/g, '<b class="cN">○$1</b>')
    .replace(/□\s?([^\s.,!?]+)/g, '<b class="cV">□$1</b>')
    .replace(/\(\s?(형용사(?:구|절)?)\s?\)/g, '<b class="cA">( $1 )</b>')
    .replace(/&lt;\s?(부사(?:구|절)?)\s?&gt;/g, '<b class="cD">&lt; $1 &gt;</b>')
    .replace(/(법칙 [①②])/g, '<b class="rule">$1</b>')
    .replace(/(주어\(S\)|서술어\(동사\)\(V\)|목적어\(O\)|보어\(C\)|수식어\(M\))/g, '<b class="role">$1</b>');
  return `<ul>${parts.map((p) => `<li>${color(esc(p))}</li>`).join('')}</ul>`;
}

/** 문제당 제한시간(초) — 지역(마을)이 어려워질수록 길게. config.timeLimit 로 조정 */
export function timeLimitFor(type, region, config) {
  const tl = config?.timeLimit;
  if (!tl) return 0;
  if (tl.byType?.[type]) return tl.byType[type];
  return tl.byRegion?.[region] ?? tl.default ?? 0;
}

/** 제한시간 막대 — 다 되면 resolve('timeout') */
function startTimer(el, sec) {
  let stop;
  const p = new Promise((res) => {
    const t0 = performance.now();
    let lastSec = sec;
    const bar = el.querySelector('i');
    const num = el.querySelector('b');
    let raf = 0;
    const step = (now) => {
      const left = Math.max(0, sec - (now - t0) / 1000);
      bar.style.width = `${(left / sec) * 100}%`;
      const s = Math.ceil(left);
      num.textContent = s;
      el.classList.toggle('hurry', left <= 5);
      if (s !== lastSec && s <= 5 && s > 0) sfx('tick');
      lastSec = s;
      if (left <= 0) { res('timeout'); return; }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    stop = () => cancelAnimationFrame(raf);
  });
  return { p, stop: () => stop() };
}

export async function runCell(root, { type, questions, config, showIntro = true, hooks = {}, timeLimit = 0 }) {
  const T = TYPES[type];
  root.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'cell';
  root.appendChild(wrap);

  if (showIntro) {
    wrap.innerHTML = `<div class="intro card">
      <div class="kicker">유형 ${type} · 난이도 ${esc(T.level)}</div>
      <h2>${esc(T.name)}</h2>
      <div class="how">✏️ 이렇게 풀어요<b>${T.how}</b></div>
      ${timeLimit ? `<div class="tl-note">⏰ 문제마다 제한시간 <b>${timeLimit}초</b>!</div>` : ''}
      <p>${questions.length}문제 · 5개 다 맞히면 <b>2칸 전진 + PERFECT!</b><br>4개 맞히면 1칸 전진</p>
      ${T.chunkRule ? `<div class="rule">${CHUNK_RULE_HTML}</div>` : ''}
      <button class="primary big" id="go">시작 ▶</button></div>`;
    await wait(wrap, '#go');
  }

  let correct = 0;
  const wrongs = [];
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    wrap.innerHTML = `<div class="qhead"><span class="chip">${esc(T.short)}</span>
        <span class="dots">${questions.map((_, k) => `<i class="${k < i ? (wrongs.some((w) => w.idx === k) ? 'no' : 'ok') : k === i ? 'now' : ''}"></i>`).join('')}</span>
        <span class="prog">${i + 1} / ${questions.length}</span></div>
      ${timeLimit ? '<div class="qtimer"><i></i><b></b><span>초</span></div>' : ''}
      <div class="card q" id="qbox"></div><div id="fb"></div>`;
    const box = wrap.querySelector('#qbox');
    const rp = renderQuestion(box, q, config);
    let r;
    if (timeLimit) {
      const tm = startTimer(wrap.querySelector('.qtimer'), timeLimit);
      r = await Promise.race([rp, tm.p]);
      tm.stop();
      if (r === 'timeout') {
        sfx('timeup');
        box.classList.add('timeup');
        box.querySelectorAll('button, input').forEach((x) => { x.disabled = true; });
        r = { ok: false, mine: '⏰ 시간 초과', ...(box._answerInfo || { answerHTML: '', questionPlain: '', answerPlain: '' }), timeout: true };
      }
    } else r = await rp;
    if (r.ok) { correct++; if (!hooks.onAnswer) sfx('ok'); } else {
      if (!hooks.onAnswer) sfx('no');
      wrongs.push({ idx: i, type, id: q.id, question: r.questionPlain, mine: r.mine, answer: r.answerPlain });
    }
    const fb = wrap.querySelector('#fb');
    fb.innerHTML = `<div class="fb ${r.ok ? 'ok' : 'no'}">
      <div class="fb-head"><span class="ico">${r.ok ? '👏' : r.timeout ? '⏰' : '😅'}</span><h3>${r.ok ? '정답!' : r.timeout ? '시간 초과!' : '아쉬워요!'}</h3>
        ${!r.ok && r.mine && !r.timeout ? `<span class="mine">내 답 <s>${esc(r.mine)}</s></span>` : ''}</div>
      <div class="fb-box ans"><div class="lab">✅ 정답</div>${r.answerHTML}</div>
      <div class="fb-box why"><div class="lab">💡 왜 그럴까?</div>${explainHTML(q.explain)}</div>
      <button class="primary" id="next">${i === questions.length - 1 ? '결과 보기 ▶' : '다음 ▶'}</button></div>`;
    fb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    const nextClick = wait(fb, '#next');
    if (hooks.onAnswer) await hooks.onAnswer(r.ok, { index: i, last: i === questions.length - 1 });
    await nextClick;
  }

  const reward = cellReward(correct, questions.length, config);
  if (!hooks.onResult) sfx(reward.perfect ? 'perfect' : correct >= questions.length - 1 ? 'ok' : 'end');
  wrap.innerHTML = `<div class="result card ${reward.perfect ? 'perfect' : ''}">
    ${reward.perfect ? '<div class="perfect-banner">PERFECT!</div>' : ''}
    <div class="score">${correct}<small>/${questions.length}</small></div>
    <div class="reward">${reward.move ? `🎲 <b>${reward.move}칸 전진</b>` : '이동 없음'} · 🪙 코인 <b>+${reward.coins}</b></div>
    ${wrongs.length ? `<div class="wrong-note"><h4>📒 오답노트</h4>${wrongs.map((w) => `<div class="wn"><div class="wq">${esc(w.question)}</div><div class="wm">내 답: ${esc(w.mine)}</div><div class="wa">정답: ${esc(w.answer)}</div></div>`).join('')}</div>` : '<p class="muted">틀린 문제가 없어요!</p>'}
    <p class="sign">— ${esc(config.signature || 'Ted')}</p>
    <button class="primary big" id="done">계속 ▶</button></div>`;
  if (hooks.onResult) hooks.onResult(reward, correct);
  await wait(wrap, '#done');
  return { type, correct, total: questions.length, reward, wrongs: wrongs.map(({ idx, ...w }) => w) };
}
