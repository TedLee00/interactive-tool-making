// 청크 카트 — 기존 앱 「TED 카트 레이스」를 그대로 옮기고(5명 경주 · 악셀 게이지 · 바나나 · 공사중 벽 ·
// 영크크/늙크크 · 타코 · 응원단), 학습 요소를 더했다:
//   ❓ 퀴즈 존 — 지나가는 순간 경기가 「순간정지」되고 문제 1개. 맞히면 ⚡ 게이지 가득 + 부스터, 틀리면 게이지 감소.
// 아래 "legacy" 표시 부분은 legacy/index.html(2266~2540행)에서 자동으로 옮긴 코드다.
import { openGame, loadImage, asset, charSprite, pick, roundRect } from './engine.js';
import { drawMixed } from '../quiz/bank.js';
import { renderChoice } from '../quiz/renderers.js';
import { legacySfx as lsfx, sfxNo as lsfxNo } from '../fx/legacy.js';
import mg from '../../data/minigames.json';

const QUIZ_TYPES = [1, 2, 3, 4, 5, 6, 7];

async function kartImages(name) {
  const keys = ['ted', 'goddess', 'scooter', 'cart', 'skate', 'kick'];
  const IM = {};
  await Promise.all(keys.map(async (k) => {
    if (k === 'ted') {
      const nm = name.length > 6 ? name.slice(0, 6) : name;
      const fs = nm.length <= 3 ? 7.5 : nm.length <= 4 ? 6.8 : 5.6;
      const txt = (await (await fetch(asset('kart/ted.svg'))).text())
        .replace('font-size="7" fill="#FFD43B">Ted</text>', `font-size="${fs}" fill="#FFD43B">${nm.replace(/[<&>]/g, '')}</text>`);
      IM[k] = await loadImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(txt));
    } else IM[k] = await loadImage(asset(`kart/${k}.svg`));
  }));
  return IM;
}

export function playKart({ charId = 'bboy', name = '나', used } = {}) {
  return openGame({
    id: 'kart',
    title: '🏎️ 청크 카트',
    subtitle: '6명이 겨루는 레이스! 퀴즈 존에서 게이지를 채워라',
    music: 'mgKart',
    howto: [
      '왼손 <b>◀ ▶ 핸들</b> · 오른발 <b>악셀 페달</b> (꾹 2초 ↑ 2단 가속, 게이지가 줄어요)',
      '<b>❓ 퀴즈 존</b>을 지나면 <b>순간정지!</b> 맞히면 ⚡ 게이지 가득 + 부스터',
      '<b class="red">🛣️ 품사 레인</b>: 화면 위 단어의 품사가 적힌 <b>레인으로 달리면 부스터!</b> 틀린 레인은 감속',
      '<b class="red">🌧️ 빗길</b>에서는 길이 미끄러워요 — 악셀을 밟으면 차가 흔들려요. <b>악셀을 떼고</b> 지나가기!',
      '🌮 타코 = 게이지 가득 · 🍌 바나나 · 🚧 공사중 벽 · 🚶 영크크·늙크크 조심!',
      '라이벌 5명: <b>보강 여신 · 묵언수행 · 보강대장 · B-BOY · 퀵보드 태오</b> — 1등이면 쿠키앤크림!',
    ],
    async setup(E) {
      const ctx = E.g;
      let W = E.W;
      let H = E.H;
      const MYNAME = name || '나';
      const [IM, face] = await Promise.all([kartImages(MYNAME), charSprite(charId)]);
      const imgOK = (im) => im && im.complete && im.naturalWidth > 0;
      const msgEl = document.createElement('div');
      msgEl.className = 'mg-mission kmsg';
      E.layer.appendChild(msgEl);
      let lastMsg = '';
      const MSG = { set textContent(v) { if (v === lastMsg) return; lastMsg = v; msgEl.innerHTML = `<b>${v}</b>`; msgEl.classList.remove('pop'); void msgEl.offsetWidth; msgEl.classList.add('pop'); } };
      MSG.textContent = '왼손 핸들 ◀ ▶ · 오른발 악셀 페달';

      // ---- 코스 (legacy 값 그대로) ----
      const L = 42000; // 원래 22100 → 약 3분 넘게 달리도록 늘림
      const LS = L / 22100;
      const RW = Math.min(310, W * 0.76); // 도로를 넓게 (원래 232 / 58%)
      const AMP = Math.max(26, (W - RW) / 2 - 10);
      let PY = H * 0.74;
      const START = 120;
      const cx = (d) => { const e = Math.min(1, Math.max(0, (d - 380) / 520)), f = Math.min(1, Math.max(0, (L + 260 - d) / 420));
        return W / 2 + AMP * e * f * (0.62 * Math.sin(d / 430) + 0.38 * Math.sin(d / 190 + 1.3)); };
      let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      const BAN = [], TAC = [];
      const WALL = { d: Math.round(L / 3), k: -0.05, w: RW * 0.26, th: 16 };
      const PEDS = [{ d: Math.round(L * 0.27), kind: 'young', sp: 235, x: -30, on: false, wait: false, done: false, dir: 1 },
        { d: Math.round(L * 2 / 3), kind: 'old', sp: 120, x: -30, on: false, wait: false, done: false, dir: 1 }];
      // legacy ↓
      for (let d = 950; d < L - 450; d += 300 + rnd() * 160) { const k = (rnd() * 2 - 1) * .36; BAN.push({d, k, gone: false}); if (rnd() < .35) BAN.push({d: d + 26, k: k + (k > 0 ? -.2 : .2), gone: false}); }
    [2300, 5000, 7700, 10200, 12800, 15900, 18400, 20500].forEach((d, i) => TAC.push({d: Math.round(d * LS), k: [-.28, .3, -.05, .26, -.2, .12, -.3, .22][i], gone: false}));
    BAN.forEach(b => { if (Math.abs(b.d - WALL.d) < 260 || PEDS.some(q => Math.abs(b.d - q.d) < 220)) b.gone = true; });
    // keep tacos clear of bananas
    TAC.forEach(t => BAN.forEach(b => { if (Math.abs(b.d - t.d) < 70 && Math.abs(b.k - t.k) < .22) b.gone = true; }));
      // legacy ↑

      // ❓ 퀴즈 존 (벽·보행자와 떨어진 곳)
      const QZ = [0.08, 0.22, 0.4, 0.53, 0.7, 0.88].map((f) => ({ d: Math.round(L * f), done: false }));
      BAN.forEach((b) => { if (QZ.some((z) => Math.abs(b.d - z.d) < 240)) b.gone = true; });
      // 🛣️ 품사 레인: 길이 3줄로 나뉘고 줄마다 품사 이름. 위에 나온 단어의 품사 레인으로 지나가면 부스터!
      // 🌧️ 빗길 구간: 길이 미끄러워 악셀을 밟으면 차가 흔들리고 미끄러진다 → 악셀을 떼는 게 안전
      const RAIN = { d0: Math.round(L * 0.355), d1: Math.round(L * 0.425) };
      const inRain = (d) => d > RAIN.d0 && d < RAIN.d1;
      let rainShown = false;
      const LANE_LEN = 900;
      const LZ = [0.15, 0.45, 0.6, 0.78, 0.95].map((f) => {
        const target = pick(['명사', '동사', '형용사', '부사']);
        const word = pick(mg.pos[target]);
        const others = ['명사', '동사', '형용사', '부사'].filter((x) => x !== target);
        const labels = [target, ...others.sort(() => Math.random() - 0.5).slice(0, 2)].sort(() => Math.random() - 0.5);
        return { d: Math.round(L * f), target, word, labels, done: false, shown: false };
      });
      BAN.forEach((b) => { if (LZ.some((z) => b.d > z.d - LANE_LEN - 120 && b.d < z.d + 80)) b.gone = true; });
      TAC.forEach((o) => { if (LZ.some((z) => o.d > z.d - LANE_LEN - 120 && o.d < z.d + 80)) o.d += LANE_LEN + 300; });

      const KW = Math.max(36, Math.min(46, W * 0.115)), KH = KW * 84 / 60;
      const mk = (o) => Object.assign({ v: 0, spin: 0, boost: 0, head: 0, fin: 0, steerX: 0, lane: o.lane0 || 0, laneT: 0 }, o);
      const R = [
        mk({ id: 'ted', name: MYNAME, col: '#751A19', img: 'ted', base: 238, x: W / 2, d: START - 140, me: true }),
        mk({ id: 'g', name: '보강 여신', col: '#9B6BE0', img: 'goddess', base: 258, x: W / 2 - RW * 0.2, d: START, lane0: -0.2, hits: 1 }),
        mk({ id: 'm', name: '묵언수행', col: '#1B2F4E', img: 'scooter', base: 254, x: W / 2 + RW * 0.2, d: START, lane0: 0.2, hits: 1 }),
        mk({ id: 'b', name: '보강대장', col: '#E0453A', img: 'cart', base: 250, x: W / 2 - RW * 0.2, d: START - 70, lane0: -0.15, hits: 1 }),
        mk({ id: 's', name: 'B-BOY', col: '#28A064', img: 'skate', base: 253, x: W / 2 + RW * 0.2, d: START - 70, lane0: 0.15, hits: 1 }),
        // 6번째 라이벌: 퀵보드 타는 디스코 태오 (작고 날쌔서 출발이 빠름)
        mk({ id: 'k', name: '퀵보드 태오', col: '#7B5CD6', img: 'kick', base: 251, x: W / 2, d: START - 200, lane0: 0, hits: 1 })];
      const ME = R[0];
      let gauge = 1, accel = false;
      const FUEL_SEC = 10, REGEN_SEC = 9, // 악셀 게이지: 10초 동안 쓸 수 있음 (지난번 7초보다 30% 더 천천히) // 게이지가 천천히 줄고 조금 더 빨리 참 (원래 3.36초 / 12초)
        _unused = 0, ACC1 = 1.3, ACC2 = 1.5, ACC_T2 = 2;
      let holdT = 0;
      let mode = 'count', t = 0, steer = 0, order = [], place = 6, quizzes = { ok: 0, n: 0 }, lanes = { ok: 0, n: 0 }, streak = 0, finished = false;
      const FX = [];
      const say = (txt, x, y, col) => FX.push({ txt, x, y, life: 1.1, col });

      // ---- 조작 ----
      const hold = (v) => ({ onDown: () => { steer = v; }, onUp: () => { if (steer === v) steer = 0; } });
      // 왼쪽: 자동차 핸들 모양 테두리 안에 ◀ ▶ (딱 붙여서 엄지 하나로)
      const wheel = document.createElement('div');
      wheel.className = 'kwheel';
      wheel.innerHTML = `<svg class="wsvg" viewBox="0 0 200 200" aria-hidden="true">
        <defs><radialGradient id="kwG" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="#4A4466"/><stop offset="1" stop-color="#1B1730"/></radialGradient></defs>
        <circle cx="100" cy="100" r="92" fill="none" stroke="url(#kwG)" stroke-width="18"/>
        <circle cx="100" cy="100" r="92" fill="none" stroke="#6B6488" stroke-width="2" stroke-dasharray="6 7"/>
        <rect x="94" y="4" width="12" height="20" rx="3" fill="#FFD43B"/>
        <path d="M14 112 L72 104 M186 112 L128 104 M100 132 L100 190" stroke="url(#kwG)" stroke-width="20" stroke-linecap="round"/>
        <circle cx="100" cy="106" r="30" fill="url(#kwG)" stroke="#FFD43B" stroke-width="4"/>
        <text x="100" y="113" text-anchor="middle" font-family="Jua, sans-serif" font-size="20" fill="#FFD43B">TED</text>
        <!-- 운전자 시점(위에서 내려다봄): 팔은 아래쪽으로 뻗고, 손은 동그랗게 — 핸들 림을 덮어 꼭 잡은 느낌 -->
        <defs><linearGradient id="kwSkin" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFE6CC"/><stop offset="1" stop-color="#EDB98C"/></linearGradient>
        <linearGradient id="kwSkin2" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#F6CDA6"/><stop offset="1" stop-color="#FFE6CC"/></linearGradient></defs>
        <g transform="translate(9 100) rotate(-6)"><g stroke="#5A3A2A" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round">
            <path d="M-16 4 L-44 80 L-12 90 L8 14 Z" fill="#2E7BC4" stroke="#1B2F4E" stroke-width="2.2"/>
            <path d="M-16 4 L-12 0 L10 8 L8 14 Z" fill="#1F5C99" stroke="none"/>
            <ellipse cx="1" cy="1" rx="17" ry="19" fill="url(#kwSkin)"/>
            <ellipse cx="-5" cy="-7" rx="6" ry="4" fill="#fff" opacity=".45" stroke="none"/>
          </g></g>
        <g transform="translate(191 100) scale(-1 1) rotate(-6)"><g stroke="#5A3A2A" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round">
            <path d="M-16 4 L-44 80 L-12 90 L8 14 Z" fill="#2E7BC4" stroke="#1B2F4E" stroke-width="2.2"/>
            <path d="M-16 4 L-12 0 L10 8 L8 14 Z" fill="#1F5C99" stroke="none"/>
            <ellipse cx="1" cy="1" rx="17" ry="19" fill="url(#kwSkin)"/>
            <ellipse cx="-5" cy="-7" rx="6" ry="4" fill="#fff" opacity=".45" stroke="none"/>
          </g></g>
      </svg>`;
      E.ctrl.appendChild(wheel);
      wheel.appendChild(E.button('◀', 'left', hold(-1)));
      wheel.appendChild(E.button('▶', 'right', hold(1)));
      // 오른쪽: 큰 악셀 게이지(버튼 위) + 악셀
      const wsvg = wheel.querySelector('.wsvg');
      let wheelRot = 0;
      const pcol = document.createElement('div');
      pcol.className = 'kpcol';
      pcol.innerHTML = '<div class="kgauge"><div class="bar"><i id="pgFill"></i><b id="pgTxt">100%</b></div></div>';
      E.ctrl.appendChild(pcol);
      const pedal = E.button(`<svg class="pdsvg" viewBox="0 0 70 100" aria-hidden="true"><g stroke="#2B2350" stroke-linejoin="round">
        <rect x="27" y="86" width="16" height="12" rx="3" fill="#55507A" stroke-width="2.5"/>
        <g class="pdp"><path d="M12 6 Q35 0 58 6 L54 88 Q35 92 16 88 Z" fill="#3A3550" stroke-width="3"/><path d="M16 9 Q35 4 54 9 L51 85 Q35 88 19 85 Z" fill="#6B6590" stroke="none"/>
        ${[16, 27, 38, 49, 60, 71].map((y) => `<rect x="20" y="${y}" width="30" height="5" rx="2.5" fill="#2B2350" stroke="none" opacity=".7"/>`).join('')}</g>
        <g class="pdf">
        <path d="M22 100 L23 88 L47 88 L48 100 Z" fill="#3A5FA8" stroke-width="2.5"/>
        <path d="M35 30 Q52 32 53 54 Q54 74 49 90 Q35 96 21 90 Q16 74 17 54 Q18 32 35 30 Z" fill="#E0453A" stroke-width="3"/>
        <path d="M35 33 Q49 35 50 54 Q51 72 47 87 Q35 92 23 87 Q19 72 20 54 Q21 35 35 33 Z" fill="#fff" stroke="none"/>
        <path d="M35 33 Q47 34 49 46 Q35 42 21 46 Q23 34 35 33 Z" fill="#D9D4E6" stroke="#2B2350" stroke-width="1.6"/>
        <path d="M27 50 L43 58 M43 50 L27 58 M27 60 L43 68 M43 60 L27 68" stroke="#4F7CC4" stroke-width="2.6" stroke-linecap="round"/>
        <path d="M28 72 Q35 70 42 72 L41 84 Q35 87 29 84 Z" fill="#2B2350" stroke-width="1.6"/>
        <path d="M20 60 Q30 66 22 78" fill="none" stroke="#FFD43B" stroke-width="3" stroke-linecap="round"/>
        <path d="M30 36 Q24 40 23 48" fill="none" stroke="#fff" stroke-width="2" opacity=".9"/></g>
      </g></svg><span class="pdt">악셀<small>꾹 밟기</small></span>`, 'drop pedal', { onDown: () => { accel = true; }, onUp: () => { accel = false; } });
      pcol.appendChild(pedal);
      const laneEl = document.createElement('div');
      laneEl.className = 'klane';
      E.layer.appendChild(laneEl);
      let laneShown = null;
      const pgFill = pcol.querySelector('#pgFill');
      const pgTxt = pcol.querySelector('#pgTxt');

      const onRoad = r => Math.abs(r.x - cx(r.d)) < RW / 2 - 6;
    function spinOut(r) { r.nSpin = (r.nSpin || 0) + 1; (r.spinD = r.spinD || []).push(Math.round(r.d)); r.spin = 1.15; r.boost = 0; r.v *= .6; say('빙글!', r.x, PY - (r.d - ME.d) - KH * .7, '#F2A01E');
      if (r.me) { lsfxNo(); MSG.textContent = '🍌 바나나! 빙글빙글~ 다음엔 피해요!'; } }
    function boost(r) { gauge = 1; say('타코! 게이지 FULL!', r.x, PY - KH * .8, '#E21E8C');
      lsfx([392, 523, 659, 784, 1047], 'square', .09, .04); MSG.textContent = '🌮 타코! 악셀 게이지가 가득 찼어요!'; }
    function stepRacer(r, dt) {
      if (r.fin && !r.me) { r.v += (r.base * .55 - r.v) * dt; r.d += r.v * dt; return; }
      if (r.fin && r.me) { r.v -= r.v * Math.min(1, dt * 2.2); r.d += r.v * dt; r.x += (cx(r.d) - r.x) * Math.min(1, dt * 2); r.head *= .9; return; }   // brake past the finish line
      let tgt = r.base;
      if (!onRoad(r)) { tgt *= .55; r.gT = (r.gT || 0) + dt; }
      if (r.boost > 0) { tgt *= r.me ? 1.6 : 1.25; r.boost -= dt; }
      if (r.me) { const on = accel && gauge > 0 && !(r.spin > 0) && mode === 'race';
        holdT = on ? holdT + dt : 0; const lv = !on ? 0 : holdT >= ACC_T2 ? 2 : 1;
        if (lv === 2 && r.acc === 1) { say('⚡⚡ 2단 가속!', r.x, PY - KH * .9, '#2E9BDA'); lsfx([523, 784, 1047, 1568], 'square', .08, .04); }
        r.acc = lv;
        if (!r.acc && mode === 'race') gauge = Math.min(1, gauge + dt / REGEN_SEC);   // refills slowly by itself while the pedal is up
        if (r.acc) { tgt *= lv === 2 ? ACC2 : ACC1; gauge = Math.max(0, gauge - dt / FUEL_SEC); if (gauge === 0) MSG.textContent = '⚡ 게이지 바닥! 손을 떼면 천천히 차요 · 🌮 타코 = 가득!'; } }
      if (r.spin > 0) { tgt *= .3; r.spin -= dt; }
      if (inRain(r.d)) {
        tgt *= r.me ? (r.acc ? 1 : 0.92) : 0.86; // 빗길에서는 모두 조심조심
        if (r.me && r.acc) {
          r.slip = (r.slip || 0) + dt;
          if (r.slip > 1.6 && Math.random() < dt * 0.9 && !(r.spin > 0)) { spinOut(r); MSG.textContent = '🌧️ 빗길에서 악셀! 미끄러졌어요 — 악셀을 떼요!'; r.slip = 0; }
        } else if (r.me) r.slip = 0;
      }
      if (!r.me && !r.fin) {   // light rubber-band so the race stays close
        const gap = ME.d - r.d; if (gap > 300) tgt *= 1.2; else if (gap > 120) tgt *= 1.08; else if (gap < -600) tgt *= .96; } // 라이벌이 끝까지 따라붙게
      r.v += (tgt - r.v) * Math.min(1, dt * (r.v < tgt * .5 ? 1.6 : 3.2));
      r.d += r.v * dt;
      let vx;
      if (r.me) {
        vx = r.fin ? (cx(r.d + 60) - r.x) * 2 : steer * 150;
        // 빗길 + 악셀: 핸들이 잘 안 먹고 차가 좌우로 미끄러짐
        if (inRain(r.d) && r.acc) vx = vx * 0.45 + Math.sin(t * 5.3) * 95 + Math.sin(t * 13.1) * 40;
      }
      else {   // AI: follow its lane, dodge bananas (except the one it is scripted to hit)
        r.laneT -= dt; if (r.laneT <= 0) { r.laneT = 1.3 + rnd() * 1.4; r.lane = (rnd() * 2 - 1) * .3; }
        let lane = r.lane;
        if (r.aim && r.aim.gone) r.aim = null;
        BAN.forEach((b, i) => { if (b.gone || b.d < r.d + 10 || b.d > r.d + 240) return;
          if (r.hits && b.d > L * (r.id === 'g' ? .55 : r.id === 'm' ? .38 : r.id === 's' ? .46 : r.id === 'k' ? .62 : .7) && !r.aim) r.aim = b;
          if (r.aim === b) { lane = b.k; return; }
          if (Math.abs(b.k - lane) < .22) lane = b.k + (b.k > 0 ? -.28 : .28); });
        const tc = TAC.find(o => !o.gone && o.d > r.d + 20 && o.d < r.d + 320); if (tc && r.d < ME.d + 150 && Math.abs(tc.k - lane) < .26 && (tc.d / 97 + r.base) % 2 < 1) lane = tc.k;   // sometimes go for the taco (not when far ahead)
        if (Math.abs(ME.d - r.d) < 130 && !ME.fin && !r.aim) lane = (ME.x - cx(r.d)) / RW + (r.x < ME.x ? -.08 : .08);   // side by side → lean on the player
        if (WALL.d > r.d && WALL.d - r.d < 340) { const wl = WALL.k - WALL.w / RW / 2 - .12, wr = WALL.k + WALL.w / RW / 2 + .12;
          if (lane > wl && lane < wr) lane = (lane - WALL.k) < 0 ? wl - .02 : wr + .02; }
        lane = Math.max(-.4, Math.min(.4, lane));
        const tx = cx(r.d + 50) + lane * RW; vx = Math.max(-170, Math.min(170, (tx - r.x) * 3.6));
      }
      if (r.spin > 0) vx *= .3;
      r.x = Math.max(12, Math.min(W - 12, r.x + vx * dt));
      r.head += ((r.spin > 0 ? 0 : vx / 150 * .32) - r.head) * Math.min(1, dt * 10);
      // items
      BAN.forEach(b => { if (b.gone || r.spin > 0 || (!r.me && r.aim !== b)) return; const bx = cx(b.d) + b.k * RW;
        if (Math.abs(b.d - r.d) < KH * .42 && Math.abs(bx - r.x) < KW * .5) { b.gone = true; if (r.aim === b) { r.aim = null; r.hits = 0; } spinOut(r); } });
      TAC.forEach(o => { if (o.gone) return; const ox = cx(o.d) + o.k * RW;
        if (Math.abs(o.d - r.d) < KH * .5 && Math.abs(ox - r.x) < KW * .62) { o.gone = true; r.tacos = (r.tacos || 0) + 1;
          if (r.me) boost(r); else { r.boost = 2.2; say(r.name.split(' ')[0] + ' 타코!', r.x, sy(r.d) - KH * .7, '#F2A01E'); if (!ME.fin) MSG.textContent = `🌮 ${r.name}가 타코를 먹었어요!`; } } });
      { const wx = cx(WALL.d) + WALL.k * RW;   // wall: a dead stop — steer sideways to get out
        if (r.d < WALL.d && r.d + KH * .45 > WALL.d - WALL.th / 2 && Math.abs(r.x - wx) < WALL.w / 2 + KW * .38) {
          r.d = WALL.d - WALL.th / 2 - KH * .45; r.v = 0; r.boost = 0;
          if (!r.wallT || t - r.wallT > 1) { r.wallT = t; say('쿵!', r.x, sy(r.d) - KH * .6, '#E0453A');
            if (r.me) { lsfxNo(); MSG.textContent = '쿵! 벽에 막혔어요 — ◀ ▶ 로 옆으로 빠져나가요!'; } } } }
      PEDS.forEach(q => { if (q.on && !(r.pedHit || {})[q.kind] && r.spin <= 0 && Math.abs(r.d - q.d) < KH * .5 && Math.abs(r.x - q.x) < KW * .5 + 8) {
        (r.pedHit = r.pedHit || {})[q.kind] = true; spinOut(r); say(q.kind === 'old' ? '어이쿠!' : '앗 죄송!', q.x, sy(q.d) - 46, '#1B2F4E');
        if (r.me) MSG.textContent = q.kind === 'old' ? '앗! 눈치 없는 늙크크 아저씨! 다음엔 피해요 😵' : '앗! 영크크가 뛰어들었어요! 😵'; } });
      if (!r.fin && r.d >= L) { r.fin = t; order.push(r); if (r.me) finishRace(); else if (!ME.fin) MSG.textContent = `🏁 ${r.name.split(' ·')[0]} 골인! 서둘러요!`; }
    }
    function bump() {   // karts push each other sideways
      for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) { const a = R[i], b = R[j];
        const dd = a.d - b.d, dx = a.x - b.x;
        if (Math.abs(dd) < KH * .8 && Math.abs(dx) < KW * .9) { const push = (KW * .9 - Math.abs(dx)) / 2 * (dx >= 0 ? 1 : -1);
          a.x += push * 1.25; b.x -= push * 1.25; const back = dd < 0 ? a : b; back.v *= .995; if (a.me || b.me) { if (!bump.t || t - bump.t > .5) { bump.t = t; lsfx([140, 110], 'square', .06, .05); } } } }
    }
    const placeOf = r => r.fin ? order.indexOf(r) + 1 : order.length + 1 + R.filter(o => !o.fin && o !== r && o.d > r.d).length;
    // ---- drawing ----
    const rr = (X, Y, w, h, r, f) => { ctx.fillStyle = f; roundRect(ctx, X, Y, w, h, Math.min(r, w / 2, h / 2)); ctx.fill(); };
      const sy = d => PY - (d - ME.d);
    function palmTop(x, y, s, a) {
      ctx.fillStyle = 'rgba(0,0,0,.16)'; ctx.beginPath(); ctx.ellipse(x + 8 * s, y + 8 * s, 22 * s, 14 * s, 0, 0, 7); ctx.fill();
      for (let k = 0; k < 7; k++) { ctx.save(); ctx.translate(x, y); ctx.rotate(a + k * .9); ctx.fillStyle = k % 2 ? '#1F8A4C' : '#2EA35C';
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(12 * s, -9 * s, 26 * s, -2 * s); ctx.quadraticCurveTo(12 * s, 2 * s, 0, 0); ctx.fill(); ctx.restore(); }
      ctx.fillStyle = '#8A5A2B'; ctx.beginPath(); ctx.arc(x, y, 3.5 * s, 0, 7); ctx.fill();
    }
    function fans(x, y, side, k) {   // a little cheering crowd (top view), arms waving, one holds a sign
      const tm = performance.now() / 1000, n = 5;
      for (let i = 0; i < n; i++) { const py = y - i * 15, px = x + ((i * 7) % 3 - 1) * 4 * side, ph = tm * 9 + i + k;
        const shirt = ['#E21E8C', '#2E9BDA', '#FFD43B', '#28A064', '#fff', '#7B5CD6'][(i + k * 2) % 6], hair = ['#1E1714', '#5A3A22', '#C8955A', '#2B2724', '#E7B85A'][(i + k) % 5];
        ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.beginPath(); ctx.ellipse(px + 3, py + 3, 9, 7, 0, 0, 7); ctx.fill();
        [-1, 1].forEach(a => { const ex = px + a * (9 + Math.sin(ph) * 3), ey = py - 9 - Math.abs(Math.sin(ph)) * 5;
          ctx.strokeStyle = '#1B2F4E'; ctx.lineWidth = 4.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(px + a * 6, py); ctx.lineTo(ex, ey); ctx.stroke();
          ctx.strokeStyle = '#F2C9A0'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(px + a * 6, py); ctx.lineTo(ex, ey); ctx.stroke(); });
        ctx.fillStyle = shirt; ctx.strokeStyle = '#1B2F4E'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(px, py, 8, 5.5, 0, 0, 7); ctx.fill(); ctx.stroke();
        ctx.fillStyle = hair; ctx.beginPath(); ctx.arc(px, py - 1, 4.6, 0, 7); ctx.fill(); }
      const sx = x + side * 4, sy2 = y - n * 15 - 4, txt = ['GO!', '화이팅!', '⚡GO⚡', MYNAME + ' 화이팅!'][k % 4];
      ctx.font = "900 9px 'Noto Sans KR',sans-serif"; const tw = ctx.measureText(txt).width + 8;
      const bx = Math.max(2, Math.min(W - tw - 2, sx - tw / 2)); rr(bx, sy2 - 11, tw, 13, 3, '#fff');
      ctx.strokeStyle = '#E21E8C'; ctx.lineWidth = 1.5; ctx.strokeRect(bx, sy2 - 11, tw, 13); ctx.fillStyle = '#E21E8C'; ctx.fillText(txt, bx + 4, sy2 - 1.5);
    }
    function umbrellaTop(x, y, k) {
      const c = [['#E21E8C', '#fff'], ['#2E9BDA', '#fff'], ['#F2A01E', '#fff']][((k % 3) + 3) % 3];
      ctx.fillStyle = c[0]; ctx.fillRect(x - 6, y + 10, 12, 20); ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(x - 6, y + 14, 12, 2);   // towel
      ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.beginPath(); ctx.arc(x + 4, y + 4, 15, 0, 7); ctx.fill();
      for (let i = 0; i < 8; i++) { ctx.fillStyle = c[i % 2]; ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, 15, i * Math.PI / 4, (i + 1) * Math.PI / 4); ctx.closePath(); ctx.fill(); }
      ctx.strokeStyle = '#1B2F4E'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x, y, 15, 0, 7); ctx.stroke(); ctx.fillStyle = '#1B2F4E'; ctx.beginPath(); ctx.arc(x, y, 2, 0, 7); ctx.fill();
    }
    function tires(x, y) { ['#E0453A', '#fff', '#2E9BDA'].forEach((c, i) => { ctx.fillStyle = '#26262C'; ctx.beginPath(); ctx.arc(x, y - i * 12, 7.5, 0, 7); ctx.fill(); ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y - i * 12, 3.6, 0, 7); ctx.fill(); }); }
    function banana(x, y) {   // banana PEEL: four floppy flaps splayed out from the stem
      ctx.save(); ctx.translate(x, y); ctx.rotate(.15);
      ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(2, 9, 17, 8, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = '#1B2F4E'; ctx.lineWidth = 1.8; ctx.lineJoin = 'round';
      [[-2.2, 16], [3.14, 14], [2.2, 16]].forEach(([a, l], i) => { ctx.save(); ctx.rotate(a);
        ctx.fillStyle = i % 2 ? '#FFD43B' : '#F7C531'; ctx.beginPath(); ctx.moveTo(-4, 0); ctx.quadraticCurveTo(-5, -l * .6, -1, -l); ctx.quadraticCurveTo(2, -l - 2, 4, -l + 2); ctx.quadraticCurveTo(5, -l * .5, 4, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#FFF4C2'; ctx.beginPath(); ctx.ellipse(0, -l * .45, 1.4, l * .3, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#6B4A1E'; ctx.beginPath(); ctx.arc(1.5, -l, 1.6, 0, 7); ctx.fill(); ctx.restore(); });
      ctx.fillStyle = '#F7C531'; ctx.beginPath(); ctx.moveTo(-5, 2); ctx.quadraticCurveTo(-5, -9, 0, -11); ctx.quadraticCurveTo(5, -9, 5, 2); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#6B4A1E'; ctx.fillRect(-1.6, -15, 3.2, 5); ctx.restore();
    }
    function wall() {
      const y = sy(WALL.d); if (y < -40 || y > H + 40) return; const x = cx(WALL.d) + WALL.k * RW, w = WALL.w, h = WALL.th;
      ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fillRect(x - w / 2 + 4, y - h / 2 + 5, w, h);
      rr(x - w / 2, y - h / 2, w, h, 3, '#C9CED6'); ctx.save(); ctx.beginPath(); ctx.rect(x - w / 2, y - h / 2, w, h); ctx.clip();
      for (let i = -2; i < w / 12 + 2; i++) { ctx.fillStyle = i % 2 ? '#E0453A' : '#fff'; ctx.beginPath(); const X = x - w / 2 + i * 12;
        ctx.moveTo(X, y + h / 2); ctx.lineTo(X + 12, y + h / 2); ctx.lineTo(X + 24, y - h / 2); ctx.lineTo(X + 12, y - h / 2); ctx.fill(); }
      ctx.restore(); ctx.strokeStyle = '#1B2F4E'; ctx.lineWidth = 2; ctx.strokeRect(x - w / 2, y - h / 2, w, h);
      ctx.font = "900 10px 'Noto Sans KR',sans-serif"; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = '#1B2F4E'; ctx.strokeText('⚠ 공사중', x, y - h / 2 - 5); ctx.fillStyle = '#FFD43B'; ctx.fillText('⚠ 공사중', x, y - h / 2 - 5); ctx.textAlign = 'left';
    }
    function ajussi(PED) {   // a pedestrian crossing the track, looking left and right (old: 늙크크 ajussi · young: 영크크 teen)
      if (!PED.on && !PED.wait) return; const y = sy(PED.d); if (y < -60 || y > H + 60) return; const x = PED.x, tm = performance.now() / 1000, look = Math.sin(tm * (PED.on ? 6 : 3)) > 0 ? 1 : -1, step = PED.on ? Math.sin(tm * (PED.kind === 'old' ? 18 : 30)) * 1.6 : 0;
      if (PED.kind === 'young') return teen(PED, x, y, tm, look, step);
      ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(x + 2, y + 18, 12, 4, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = '#1B2F4E'; ctx.lineWidth = 1.8; ctx.lineJoin = 'round';
      [[-4, step], [4, -step]].forEach(([o, s2]) => { ctx.fillStyle = '#5A5F6B'; ctx.fillRect(x + o - 2.5, y + 4, 5, 11 + s2 * 2); ctx.strokeRect(x + o - 2.5, y + 4, 5, 11 + s2 * 2);
        ctx.fillStyle = '#2A2A30'; ctx.beginPath(); ctx.ellipse(x + o + 1, y + 16 + s2 * 2, 4, 2.4, 0, 0, 7); ctx.fill(); });
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(x - 9, y - 9); ctx.lineTo(x + 9, y - 9); ctx.lineTo(x + 8, y + 6); ctx.lineTo(x - 8, y + 6); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#1B2F4E'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(x + 9, y - 7); ctx.lineTo(x + 14, y + 2 + step * 2); ctx.stroke();
      ctx.strokeStyle = '#F2C9A0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 9, y - 7); ctx.lineTo(x + 14, y + 2 + step * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.strokeStyle = '#1B2F4E'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(x + 15, y + 8 + step * 2, 4.5, 6, 0, 0, 7); ctx.fill(); ctx.stroke();   // plastic bag
      ctx.fillStyle = '#F2C9A0'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(x, y - 17, 9, 0, 7); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#3A332E'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x - 6, y - 23); ctx.quadraticCurveTo(x, y - 28, x + 7, y - 22); ctx.stroke();   // comb-over
      ctx.fillStyle = '#1B2F4E'; ctx.beginPath(); ctx.arc(x - 3 + look * 2.4, y - 18, 1.3, 0, 7); ctx.arc(x + 3 + look * 2.4, y - 18, 1.3, 0, 7); ctx.fill();
      ctx.strokeStyle = '#3A332E'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 4 + look * 1.5, y - 13.5); ctx.lineTo(x + 4 + look * 1.5, y - 13.5); ctx.stroke();   // mustache
      ctx.font = "900 11px 'Noto Sans KR',sans-serif"; ctx.textAlign = 'center'; const bw = 48;
      rr(x - bw / 2, y - 45, bw, 15, 7, '#fff'); ctx.strokeStyle = '#1B2F4E'; ctx.lineWidth = 1.4; ctx.strokeRect(x - bw / 2 + 1, y - 45, bw - 2, 15);
      ctx.fillStyle = '#1B2F4E'; ctx.fillText('늙크크', x, y - 34); ctx.textAlign = 'left';
    }
    function teen(PED, x, y, tm, look, step) {   // 영크크: hoodie, backwards cap, backpack, sprinting
      ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(x + 2, y + 18, 12, 4, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = '#1B2F4E'; ctx.lineWidth = 1.8; ctx.lineJoin = 'round';
      [[-4, step], [4, -step]].forEach(([o, s2]) => { ctx.fillStyle = '#2E4A78'; ctx.fillRect(x + o - 2.5, y + 3, 5, 11 + s2 * 2.5); ctx.strokeRect(x + o - 2.5, y + 3, 5, 11 + s2 * 2.5);
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(x + o + 1, y + 15 + s2 * 2.5, 4.2, 2.6, 0, 0, 7); ctx.fill(); ctx.stroke(); });
      ctx.fillStyle = '#28A064'; ctx.beginPath(); ctx.moveTo(x - 9, y - 9); ctx.lineTo(x + 9, y - 9); ctx.lineTo(x + 8, y + 5); ctx.lineTo(x - 8, y + 5); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#F2A01E'; ctx.fillRect(x - PED.dir * 12 - 3, y - 8, 6, 11); ctx.strokeRect(x - PED.dir * 12 - 3, y - 8, 6, 11);   // backpack
      [-1, 1].forEach(a => { ctx.strokeStyle = '#1B2F4E'; ctx.lineWidth = 3.6; ctx.beginPath(); ctx.moveTo(x + a * 8, y - 6); ctx.lineTo(x + a * 12, y + 1 + a * step * 3); ctx.stroke();
        ctx.strokeStyle = '#28A064'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(x + a * 8, y - 6); ctx.lineTo(x + a * 12, y + 1 + a * step * 3); ctx.stroke(); });
      ctx.strokeStyle = '#1B2F4E'; ctx.lineWidth = 1.8; ctx.fillStyle = '#FFE0C2'; ctx.beginPath(); ctx.arc(x, y - 17, 8.5, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#E0453A'; ctx.beginPath(); ctx.arc(x, y - 20, 8.6, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - PED.dir * 6, y - 21); ctx.lineTo(x - PED.dir * 15, y - 19); ctx.lineTo(x - PED.dir * 6, y - 17); ctx.closePath(); ctx.fill(); ctx.stroke();   // brim backwards
      ctx.fillStyle = '#1B2F4E'; ctx.beginPath(); ctx.arc(x - 3 + look * 2.2, y - 16, 1.3, 0, 7); ctx.arc(x + 3 + look * 2.2, y - 16, 1.3, 0, 7); ctx.fill();
      ctx.strokeStyle = '#1B2F4E'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(x + look * 1.5, y - 12.5, 2.6, .1 * Math.PI, .9 * Math.PI); ctx.stroke();
      ctx.font = "900 11px 'Noto Sans KR',sans-serif"; ctx.textAlign = 'center'; const bw = 48;
      rr(x - bw / 2, y - 45, bw, 15, 7, '#fff'); ctx.strokeStyle = '#28A064'; ctx.lineWidth = 1.4; ctx.strokeRect(x - bw / 2 + 1, y - 45, bw - 2, 15);
      ctx.fillStyle = '#28A064'; ctx.fillText('영크크', x, y - 34); ctx.textAlign = 'left';
    }
    function taco(x, y) {
      const tm = performance.now() / 1000, pulse = .5 + .5 * Math.sin(tm * 8);
      ctx.fillStyle = `rgba(255,212,59,${.3 + .35 * pulse})`; ctx.beginPath(); ctx.arc(x, y, 20 + pulse * 5, 0, 7); ctx.fill();
      for (let k = 0; k < 4; k++) { const a = tm * 2.4 + k * 1.57; ctx.fillStyle = k % 2 ? '#fff' : '#FFD43B'; ctx.beginPath(); ctx.arc(x + Math.cos(a) * 26, y + Math.sin(a) * 20, 2.6, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#6FBF3A'; ctx.beginPath(); ctx.ellipse(x, y - 3, 14, 5.5, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#E0453A'; ctx.beginPath(); ctx.arc(x - 5, y - 4, 2.8, 0, 7); ctx.arc(x + 5, y - 5, 2.8, 0, 7); ctx.fill();
      ctx.fillStyle = '#F2B740'; ctx.strokeStyle = '#B97A1C'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y - 2, 15, 0, Math.PI); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.font = "900 11px 'Noto Sans KR',sans-serif"; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = '#1B2F4E'; ctx.strokeText('타코', x, y + 26); ctx.fillStyle = '#FFD43B'; ctx.fillText('타코', x, y + 26); ctx.textAlign = 'left';
    }
    function checker(d, label) {
      const y = sy(d); if (y < -60 || y > H + 20) return; const c = cx(d), l = c - RW / 2, n = 12, cw = RW / n;
      for (let r = 0; r < 2; r++) for (let i = 0; i < n; i++) { ctx.fillStyle = (i + r) % 2 ? '#1B2F4E' : '#fff'; ctx.fillRect(l + i * cw, y - 8 + r * 8, cw + .5, 8); }
      // arch
      ctx.fillStyle = '#1B2F4E'; ctx.fillRect(l - 16, y - 46, 6, 46); ctx.fillRect(l + RW + 10, y - 46, 6, 46);
      rr(l - 18, y - 60, RW + 36, 22, 6, '#E21E8C'); ctx.fillStyle = '#fff'; ctx.font = "400 15px Jua, 'Noto Sans KR', sans-serif"; ctx.textAlign = 'center'; ctx.fillText(label, c, y - 44); ctx.textAlign = 'left';
    }
    function racer(r) {
      const y = sy(r.d); if (y < -80 || y > H + 80 || r.hide) return;
      ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(r.x + 3, y + 4, KW * .48, KH * .42, 0, 0, 7); ctx.fill();
      if (r.boost > 0 || r.acc) {   // exhaust flames (stage 2: bigger, with a blue core)
        const big = r.acc === 2, fl = (10 + Math.random() * 10) * (big ? 2.1 : 1), fw = big ? 8 : 5;
        if (big) [-.22, .22].forEach(o => { ctx.fillStyle = 'rgba(255,122,26,.55)'; ctx.beginPath(); ctx.moveTo(r.x + o * KW - fw - 3, y + KH * .48); ctx.lineTo(r.x + o * KW, y + KH * .48 + fl * 1.15); ctx.lineTo(r.x + o * KW + fw + 3, y + KH * .48); ctx.fill(); });
        [-.22, .22].forEach(o => { ctx.fillStyle = '#FFD43B'; ctx.beginPath(); ctx.moveTo(r.x + o * KW - fw, y + KH * .48); ctx.lineTo(r.x + o * KW, y + KH * .48 + fl); ctx.lineTo(r.x + o * KW + fw, y + KH * .48); ctx.fill();
          ctx.fillStyle = big ? '#7FD3FF' : '#FF7A1A'; ctx.beginPath(); ctx.moveTo(r.x + o * KW - fw * .6, y + KH * .48); ctx.lineTo(r.x + o * KW, y + KH * .48 + fl * .6); ctx.lineTo(r.x + o * KW + fw * .6, y + KH * .48); ctx.fill(); }); }
      const ang = r.spin > 0 ? (1.15 - r.spin) * Math.PI * 3.5 : r.head;
      ctx.save(); ctx.translate(r.x, y); ctx.rotate(ang); if (imgOK(IM[r.img])) ctx.drawImage(IM[r.img], -KW / 2, -KH / 2, KW, KH); ctx.restore();
      // name tag
      ctx.font = "900 10.5px 'Noto Sans KR',sans-serif"; const nm = r.name, tw = ctx.measureText(nm).width + 12, ty = y - KH / 2 - 8;
      rr(r.x - tw / 2, ty - 13, tw, 16, 8, r.col); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(nm, r.x, ty - 1.5); ctx.textAlign = 'left';
      if (r.me) { ctx.fillStyle = r.col; ctx.beginPath(); ctx.moveTo(r.x - 5, ty + 3); ctx.lineTo(r.x + 5, ty + 3); ctx.lineTo(r.x, ty + 8); ctx.fill(); }
    }
    function draw() {
      // grass with scrolling stripes
      ctx.fillStyle = '#66BE45'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#74C953'; const st = 46; for (let k = Math.floor((ME.d - PY) / st) - 1; k * st < ME.d + (H - PY) + st * 2; k++) if (k % 2 === 0) { const y = sy(k * st); ctx.fillRect(0, y - st, W, st); }
      // Miami beach on the right: sand → wavy shoreline → sea with rolling waves
      { const tm = performance.now() / 1000;
        for (let y = -6; y <= H + 6; y += 6) { const d = ME.d + PY - y, e = cx(d) + RW / 2;
          ctx.fillStyle = '#F4E0A8'; ctx.fillRect(e + 8, y, W, 6.5);
          const sea = e + 40 + Math.sin(d / 80) * 7;
          ctx.fillStyle = '#4FC1E8'; ctx.fillRect(sea, y, W, 6.5);
          ctx.fillStyle = Math.floor((d + tm * 60) / 30) % 3 === 0 ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,0)'; ctx.fillRect(sea + 14, y, W, 3);
          ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillRect(sea - 2 + Math.sin(tm * 2 + d / 50) * 2, y, 4, 6.5); } }
      // road + curbs
      const step = 6; ctx.fillStyle = '#8B9199'; ctx.beginPath();
      for (let y = -step; y <= H + step; y += step) { const d = ME.d + PY - y; ctx.lineTo(cx(d) - RW / 2, y); }
      for (let y = H + step; y >= -step; y -= step) { const d = ME.d + PY - y; ctx.lineTo(cx(d) + RW / 2, y); }
      ctx.fill();
      for (let y = -step; y <= H + step; y += step) { const d = ME.d + PY - y, c = cx(d), band = Math.floor(d / 22) % 2;
        ctx.fillStyle = Math.floor(d / 70) % 2 ? 'rgba(255,255,255,.035)' : 'rgba(0,0,0,.03)'; ctx.fillRect(c - RW / 2, y, RW, step + .5);
        ctx.fillStyle = band ? '#E0453A' : '#fff'; ctx.fillRect(c - RW / 2 - 9, y, 10, step + .5); ctx.fillRect(c + RW / 2 - 1, y, 10, step + .5);
        if (Math.floor(d / 34) % 2 === 0) { ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillRect(c - 2, y, 4, step + .5); } }
      // roadside props: palms & tyre stacks on the grass (left), umbrellas & towels on the beach (right), cheering crowds on both sides
      const k0 = Math.floor((ME.d - (H - PY) - 120) / 150), k1 = Math.ceil((ME.d + PY + 120) / 150);
      for (let k = k0; k <= k1; k++) { if (k < -2) continue; const d = k * 150, y = sy(d), c = cx(d), crowd = k % 4 === 2;
        if (!crowd) { const px = c - (RW / 2 + 34 + (((k * 37) % 3) + 3) % 3 * 10); if (px > 6) { if (k % 7 === 0) tires(px, y); else palmTop(px, y, .95, k); } }
        else fans(c - RW / 2 - 22, y, -1, k);
        if (k % 4 === 0) fans(c + RW / 2 + 20, y + 60, 1, k + 1);
        else if (k % 2) { const ux = c + RW / 2 + 30 + (k % 3) * 6; if (ux < W - 20) umbrellaTop(ux, y + 20, k); }
        if (k % 3 === 0) palmTop(c + RW / 2 + 40, y - 40, .8, k + 2); }
      checker(START, 'CHUNK KART · START'); checker(L, '🏁 FINISH');
      BAN.forEach(b => { if (b.gone) return; const y = sy(b.d); if (y > -20 && y < H + 20) banana(cx(b.d) + b.k * RW, y); });
      TAC.forEach(o => { if (o.gone) return; const y = sy(o.d); if (y > -30 && y < H + 30) taco(cx(o.d) + o.k * RW, y); });
      // speed lines while boosting
      wall();
      // 🌧️ 빗길: 젖은 도로 + 표지판
      { const y0 = sy(RAIN.d0); const y1 = sy(RAIN.d1);
        if (y1 < H + 20 && y0 > -20) {
          for (let yy = Math.max(-6, y1); yy <= Math.min(H + 6, y0); yy += 6) { const d = ME.d + PY - yy; const c = cx(d); ctx.fillStyle = 'rgba(40,70,120,.28)'; ctx.fillRect(c - RW / 2, yy, RW, 6.5); if (Math.floor(d / 40) % 5 === 0) { ctx.fillStyle = 'rgba(200,230,255,.35)'; ctx.fillRect(c - RW / 4, yy, RW / 2, 2); } }
          const ys = sy(RAIN.d0 - 80); if (ys > -30 && ys < H + 30) { const c = cx(RAIN.d0 - 80); rr(c - 80, ys - 16, 160, 30, 10, '#FFD43B'); ctx.font = "400 16px Jua, 'Noto Sans KR', sans-serif"; ctx.textAlign = 'center'; ctx.fillStyle = '#2B2350'; ctx.fillText('🌧️ 빗길 · 악셀 조심!', c, ys + 5); ctx.textAlign = 'left'; }
        } }
      R.slice().sort((a, b) => b.d - a.d).forEach(racer);
      PEDS.forEach(ajussi);
      FX.forEach(f => { ctx.globalAlpha = Math.max(0, Math.min(1, f.life * 1.5)); ctx.font = "900 20px 'Noto Sans KR',sans-serif"; ctx.textAlign = 'center';
        ctx.lineWidth = 5; ctx.strokeStyle = '#fff'; ctx.strokeText(f.txt, f.x, f.y); ctx.fillStyle = f.col; ctx.fillText(f.txt, f.x, f.y); ctx.textAlign = 'left'; ctx.globalAlpha = 1; });
      // progress bar (right edge) with racer dots
      const bt = 46, bb = H - 46, bx = W - 16; rr(bx - 6, bt, 12, bb - bt, 6, 'rgba(27,47,78,.6)');
      ctx.fillStyle = '#fff'; ctx.font = "12px 'Noto Sans KR', sans-serif"; ctx.textAlign = 'center'; ctx.fillText('🏁', bx, bt - 6); ctx.textAlign = 'left';
      R.slice().reverse().forEach(r => { const k = Math.max(0, Math.min(1, (r.d - START) / (L - START))), y = bb - k * (bb - bt);
        ctx.fillStyle = r.col; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(bx, y, r.me ? 9 : 7, 0, 7); ctx.fill(); ctx.stroke(); });
    }

      // ---- 퀴즈 존: 순간정지 ----
      function quizStop(z) {
        mode = 'quiz';
        accel = false;
        lsfx([880, 660, 880], 'square', 0.08, 0.06);
        const q = drawMixed(QUIZ_TYPES, used);
        const box = document.createElement('div');
        box.className = 'mg-freeze';
        box.innerHTML = `<div class="fz-head"><b>❓ 퀴즈 존 · 순간정지!</b><span>맞히면 ⚡ 게이지 가득</span></div><div class="card q" id="fzq"></div><i class="fz-bar"></i>`;
        E.layer.appendChild(box);
        let settled = false;
        const settle = (ok, answerHTML) => {
          if (settled) return; settled = true;
          quizzes.n++;
          box.querySelectorAll('.opt').forEach((b) => { b.disabled = true; });
          const fb = document.createElement('div');
          fb.className = `fz-fb ${ok ? 'ok' : 'no'}`;
          fb.innerHTML = ok ? '<b>정답! ⚡ 게이지 가득!</b>' : `<b>${answerHTML ? '아쉬워요!' : '⏰ 시간 초과!'}</b> ${answerHTML || `정답: <b>${q.answer}</b>`}<small>💡 ${q.explain}</small>`;
          box.appendChild(fb);
          if (ok) {
            quizzes.ok++; streak++;
            gauge = 1; ME.boost = 1.3;
            E.callout(streak >= 3 ? 'yar' : 'easy', streak >= 3 ? `퀴즈 ${streak}연속!` : '게이지 FULL!');
          } else {
            streak = 0;
            gauge = Math.max(0, gauge - 0.35);
            lsfxNo();
          }
          setTimeout(() => { box.remove(); MSG.textContent = ok ? '⚡ 게이지 가득! 악셀을 꾹!' : '다음 퀴즈 존에서 만회하자!'; mode = 'race'; }, ok ? 1100 : 2600);
        };
        renderChoice(box.querySelector('#fzq'), q).then((r) => settle(r.ok, r.ok ? '' : r.answerHTML));
        setTimeout(() => settle(false, ''), 10000);
      }

      function finishRace() {
        if (finished) return;
        finished = true;
        mode = 'after';
        place = order.indexOf(ME) + 1;
        const rows = R.slice().sort((a, b) => placeOf(a) - placeOf(b)).map((r) => `${placeOf(r)}. ${r.me ? `<b>${r.name}</b>` : r.name}`).join(' · ');
        setTimeout(() => E.end({
          score: Math.max(0, 1500 - (place - 1) * 300) + quizzes.ok * 200 + lanes.ok * 150, cleared: place <= 3,
          coins: [0, 20, 14, 10, 6, 4, 2][place], snack: place === 1 ? 'cookie' : null,
          headline: place === 1 ? '🏆 1등 골인!' : `${place}등 골인!`, legendAt: 2400,
          lines: [`❓ 퀴즈 존 <b>${quizzes.ok}</b>/${quizzes.n} 정답 · 🛣️ 품사 레인 <b>${lanes.ok}</b>/${lanes.n}`, rows],
        }), 1600);
      }

      window.__KG = { R, QZ, LZ, PEDS, WALL, L, get gauge() { return gauge; }, get mode() { return mode; } }; // 테스트용
      return {
        start() { mode = 'race'; },
        update(dt) {
          W = E.W; H = E.H; PY = H * 0.74;
          if (E.input.down && E.input.y < H * 0.9) steer = E.input.x < W / 2 ? -1 : 1;
          else if (!E.ctrl.querySelector('.mg-btn.on')) steer = (E.input.keys.ArrowRight ? 1 : 0) - (E.input.keys.ArrowLeft ? 1 : 0);
          if (E.input.keys.ArrowUp || E.input.keys[' ']) accel = true; else if (!E.ctrl.querySelector('.pedal.on')) accel = false;
          if (mode === 'quiz' || mode === 'count') return;
          t += dt;
          R.forEach((r) => stepRacer(r, dt));
          bump();
          PEDS.forEach((Q) => {
            if (!Q.wait && !Q.on && !Q.done && ME.d > Q.d - (PY + 60)) { Q.wait = true; Q.dir = ME.x < cx(Q.d) ? -1 : 1; Q.x = cx(Q.d) - Q.dir * (RW / 2 + 26); }
            if (Q.wait && !Q.on) { const dist = Q.d - ME.d, need = Math.abs(ME.x - Q.x) / Q.sp;
              if (dist < Math.max(60, ME.v * need)) { Q.on = true; Q.wait = false; lsfx(Q.kind === 'old' ? [660, 520] : [880, 1100], 'square', 0.05, 0.06); } }
            if (Q.on) { Q.x += Q.dir * Q.sp * dt; if (Math.abs(Q.x - cx(Q.d)) > RW / 2 + 60 && Math.sign(Q.x - cx(Q.d)) === Q.dir) { Q.on = false; Q.done = true; } }
            if (Q.wait && ME.d > Q.d + 40) { Q.wait = false; Q.done = true; }
          });
          for (let i = FX.length - 1; i >= 0; i--) { FX[i].life -= dt; FX[i].y -= 34 * dt; if (FX[i].life <= 0) FX.splice(i, 1); }
          if (!finished) {
            // 품사 레인 안내: 레인 한참 전부터 단어를 보여 주고 → 레인 바로 앞에서 단어만 빨갛게 반짝 → 레인에 들어서면 사라짐 (다시 안 나옴)
            {
              const z = LZ.find((q) => !q.bannerDone && ME.d > q.d - LANE_LEN - 1700);
              const start = z ? z.d - LANE_LEN : 0;
              if (z && ME.d >= start) z.bannerDone = true;
              const show = z && ME.d < start;
              if (show && laneShown !== z) {
                laneShown = z;
                laneEl.innerHTML = `<small>🛣️ 곧 품사 레인! 이 단어의 품사는?</small><b>${z.word}</b><em>${z.labels.map((l) => `<i>${l}</i>`).join('')}</em><u id="lzDist"></u>`;
              }
              if (!show) laneShown = null;
              laneEl.className = `klane${show ? ' on' : ''}${show && start - ME.d < 300 ? ' flash' : ''}`;
              if (show) { const dEl = laneEl.querySelector('#lzDist'); if (dEl) dEl.textContent = `레인까지 ${Math.ceil((start - ME.d) / 10)}m — 미리 정해 두세요!`; }
            }
            LZ.forEach((z) => {
              if (!z.shown && ME.d > z.d - LANE_LEN - 1700) { z.shown = true; MSG.textContent = `🛣️ 품사 레인! 「<span class="tg">${z.word}</span>」의 품사 레인으로 달려라!`; lsfx([660, 880], 'square', 0.06, 0.05); }
              if (!z.done && ME.d >= z.d) {
                z.done = true;
                const c = cx(z.d);
                const k = Math.max(0, Math.min(2, Math.floor((ME.x - (c - RW / 2)) / (RW / 3))));
                if (z.labels[k] === z.target) {
                  ME.boost = 2.2; gauge = Math.min(1, gauge + 0.35); lanes.ok++;
                  say(`⚡ ${z.word} = ${z.target}! 부스터!`, ME.x, PY - KH, '#1E9B5B');
                  E.callout('easy', `${z.target} 레인 정답!`); MSG.textContent = `⚡ 정답! ${z.word} = <span class="tg">${z.target}</span> · 부스터!`;
                  lsfx([523, 659, 784, 1047], 'square', 0.08, 0.04);
                } else {
                  ME.v *= 0.55; ME.boost = 0;
                  say(`✘ ${z.word}는 ${z.target}!`, ME.x, PY - KH, '#E0453A');
                  MSG.textContent = `✘ 아쉬워요! ${z.word}는 <span class="tg">${z.target}</span>예요`;
                  lsfxNo();
                }
                lanes.n++;
              }
            });
            if (!rainShown && ME.d > RAIN.d0 - 500) { rainShown = true; MSG.textContent = '🌧️ 곧 빗길! 미끄러우니 <span class="tg">악셀을 떼고</span> 천천히!'; }
            const z = QZ.find((q) => !q.done && ME.d >= q.d);
            if (z) { z.done = true; quizStop(z); }
            place = placeOf(ME);
          }
          const kmh = Math.round(ME.v * 0.4);
          E.hud(`<b>${place}</b>/6등 · ${kmh}km/h`);
          wheelRot += ((steer * 32) - wheelRot) * Math.min(1, (1 / 60) * 10);
          wsvg.style.transform = `rotate(${wheelRot.toFixed(1)}deg)`;
          pgFill.style.width = `${Math.round(gauge * 100)}%`;
          pgTxt.textContent = `${Math.round(gauge * 100)}%`;
          pcol.classList.toggle('low', gauge < 0.2);
        },
        draw() {
          W = E.W; H = E.H; PY = H * 0.74;
          draw();
          // 🛣️ 품사 레인 그리기
          LZ.forEach((z) => {
            const y0 = sy(z.d - LANE_LEN); const y1 = sy(z.d);
            if (y1 > H + 40 || y0 < -60) return;
            const cols = ['rgba(224,69,58,.22)', 'rgba(46,123,196,.22)', 'rgba(40,160,100,.22)'];
            for (let yy = Math.max(-6, y1); yy <= Math.min(H + 6, y0); yy += 6) {
              const d = ME.d + PY - yy; const c = cx(d); const lw = RW / 3;
              for (let k = 0; k < 3; k++) { ctx.fillStyle = z.done ? 'rgba(200,200,200,.15)' : cols[k]; ctx.fillRect(c - RW / 2 + k * lw, yy, lw, 6.5); }
              if (Math.floor(d / 30) % 2 === 0) { ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillRect(c - RW / 2 + lw - 2, yy, 4, 6.5); ctx.fillRect(c - RW / 2 + 2 * lw - 2, yy, 4, 6.5); }
            }
            // 레인 이름 (여러 번 되풀이)
            for (let dd = z.d - LANE_LEN + 120; dd < z.d; dd += 260) {
              const y = sy(dd); if (y < -20 || y > H + 20) continue;
              const c = cx(dd); const lw = RW / 3;
              z.labels.forEach((lab, k) => {
                const x = c - RW / 2 + lw * (k + 0.5);
                rr(x - lw / 2 + 4, y - 13, lw - 8, 24, 8, z.done ? '#B9B9C6' : ['#E0453A', '#2E7BC4', '#28A064'][k]);
                ctx.font = "400 15px Jua, 'Noto Sans KR', sans-serif"; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText(lab, x, y + 5);
              });
              ctx.textAlign = 'left';
            }
            // 시작 표지: 단어
            const ys = sy(z.d - LANE_LEN - 60);
            if (ys > -30 && ys < H + 30) {
              const c = cx(z.d - LANE_LEN - 60);
              rr(c - 92, ys - 20, 184, 34, 12, '#FFFBF0');
              ctx.strokeStyle = '#E0453A'; ctx.lineWidth = 3; roundRect(ctx, c - 92, ys - 20, 184, 34, 12); ctx.stroke();
              ctx.font = "400 18px Jua, 'Noto Sans KR', sans-serif"; ctx.textAlign = 'center'; ctx.fillStyle = '#E0453A';
              ctx.fillText(`「${z.word}」 품사 레인으로!`, c, ys + 3); ctx.textAlign = 'left';
            }
            // 끝 판정선
            if (y1 > -10 && y1 < H + 10) { const c = cx(z.d); ctx.fillStyle = '#FFD43B'; ctx.fillRect(c - RW / 2, y1 - 3, RW, 6); }
          });
          // 퀴즈 존 띠
          QZ.forEach((z) => {
            const y = sy(z.d); if (y < -40 || y > H + 40) return;
            const c = cx(z.d), l = c - RW / 2;
            for (let i = 0; i < 12; i++) { ctx.fillStyle = (i % 2) ? (z.done ? '#C9B8F0' : '#9B6BE0') : '#fff'; ctx.fillRect(l + (i * RW) / 12, y - 7, RW / 12 + 0.5, 14); }
            rr(c - 64, y - 34, 128, 22, 11, z.done ? '#C9B8F0' : '#9B6BE0');
            ctx.font = "400 14px Jua, 'Noto Sans KR', sans-serif"; ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
            ctx.fillText(z.done ? '퀴즈 완료' : '❓ 퀴즈 존 · 정지!', c, y - 19); ctx.textAlign = 'left';
          });
          // 빗줄기 (내가 빗길에 있을 때 화면 전체)
          if (inRain(ME.d)) {
            ctx.strokeStyle = 'rgba(210,230,255,.55)'; ctx.lineWidth = 1.5;
            const tm = performance.now() / 1000;
            for (let k = 0; k < 70; k++) { const rx = ((k * 53.7 + tm * 40) % W); const ry = ((k * 97.3 + tm * 620) % (H + 40)) - 20; ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx - 4, ry + 16); ctx.stroke(); }
            ctx.fillStyle = 'rgba(30,50,90,.12)'; ctx.fillRect(0, 0, W, H);
          }
          // 내 카트 운전석에 내 캐릭터 얼굴
          if (face && !ME.hide) {
            const y = sy(ME.d);
            const ang = ME.spin > 0 ? (1.15 - ME.spin) * Math.PI * 3.5 : ME.head;
            ctx.save(); ctx.translate(ME.x, y); ctx.rotate(ang);
            ctx.beginPath(); ctx.arc(0, -2, KW * 0.24, 0, 7); ctx.clip();
            const fw = KW * 0.6; ctx.drawImage(face, -fw / 2, -2 - KW * 0.24, fw, (face.height / face.width) * fw);
            ctx.restore();
          }
        },
      };
    },
  });
}
