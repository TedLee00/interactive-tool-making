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
export async function runCell(root, { type, questions, config, showIntro = true, hooks = {} }) {
  const T = TYPES[type];
  root.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'cell';
  root.appendChild(wrap);

  if (showIntro) {
    wrap.innerHTML = `<div class="intro card">
      <div class="kicker">유형 ${type} · 난이도 ${esc(T.level)}</div>
      <h2>${esc(T.name)}</h2>
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
      <div class="card q" id="qbox"></div><div id="fb"></div>`;
    const r = await renderQuestion(wrap.querySelector('#qbox'), q, config);
    if (r.ok) { correct++; if (!hooks.onAnswer) sfx('ok'); } else {
      if (!hooks.onAnswer) sfx('no');
      wrongs.push({ idx: i, type, id: q.id, question: r.questionPlain, mine: r.mine, answer: r.answerPlain });
    }
    const fb = wrap.querySelector('#fb');
    fb.innerHTML = `<div class="fb ${r.ok ? 'ok' : 'no'}">
      <h3>${r.ok ? '정답! 👏' : '아쉬워요!'}</h3>
      <div class="ans">${r.answerHTML}</div>
      <div class="why">💡 ${esc(q.explain)}</div>
      <div class="src">📖 ${esc(q.source)}</div>
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
