// 청크 카트 — 위에서 내려다보는 레이싱. 품사 게이트(맞는 레인 → 부스터), 아이템 박스(퀴즈 1문제), 라이벌 3대
import { openGame, loadImage, asset, charSprite, rand, pick, shuffle, clamp, roundRect, tag } from './engine.js';
import { BANK } from '../quiz/bank.js';
import data from '../../data/minigames.json';

const L = 15000; // 코스 길이
const POS4 = ['명사', '동사', '형용사', '부사'];

export function playKart({ charId = 'bboy' } = {}) {
  return openGame({
    id: 'kart',
    title: '🏎️ 청크 카트',
    subtitle: '품사 게이트로 부스터를 모아 1등으로 골인!',
    music: 'mgKart',
    howto: [
      '<b>◀ ▶</b>를 꾹 눌러 핸들 조작 (카트는 저절로 달려요)',
      '<b>품사 게이트</b>: 위에 뜬 단어의 품사 레인으로 통과하면 <b>부스터!</b> 틀리면 빙글~',
      '<b>❓ 아이템 박스</b>: 퀴즈 1문제! 맞히면 실드 + 부스터',
      '🍌 바나나는 피하기 · 라이벌은 <b>보강 여신 · 보강대장 · 묵언수행</b>',
    ],
    async setup(ctx) {
      const [kTed, kGod, kCart, kScoot, face, banana] = await Promise.all([
        loadImage(asset('kart/ted.svg')), loadImage(asset('kart/goddess.svg')), loadImage(asset('kart/cart.svg')), loadImage(asset('kart/scooter.svg')),
        charSprite(charId), Promise.resolve(null),
      ]);
      void banana;
      const W = () => ctx.W;
      const RW = 230;
      const AMP = () => Math.max(20, (W() - RW) / 2 - 8);
      const cx = (d) => W() / 2 + AMP() * Math.min(1, d / 600) * (0.6 * Math.sin(d / 520) + 0.4 * Math.sin(d / 230 + 1.2));
      const PY = () => ctx.H * 0.76;

      const mk = (o) => ({ d: 0, x: 0, v: 0, boost: 0, spin: 0, shield: 0, lane: 0, fin: 0, ...o });
      const me = mk({ id: 'me', name: '나', img: kTed, base: 270, me: true });
      const R = [me,
        mk({ id: 'g', name: '보강 여신', img: kGod, base: 262, lane: -0.25, d: 60 }),
        mk({ id: 'c', name: '보강대장', img: kCart, base: 258, lane: 0.25, d: 40 }),
        mk({ id: 's', name: '묵언수행', img: kScoot, base: 264, lane: 0, d: 90 })];
      R.forEach((r) => { r.x = cx(r.d) + r.lane * RW; });

      // 코스 물체
      const gates = [];
      for (let d = 1300; d < L - 900; d += 1700) {
        const prompt = pick(POS4);
        const word = pick(data.pos[prompt]);
        const lanes = shuffle([prompt, ...shuffle(POS4.filter((p) => p !== prompt)).slice(0, 2)]);
        gates.push({ d, word, answer: prompt, lanes, done: false });
      }
      const boxes = [];
      for (let d = 2100; d < L - 600; d += 1700) boxes.push({ d, k: rand(-0.3, 0.3), got: false });
      const bananas = [];
      for (let d = 900; d < L - 400; d += rand(380, 620)) if (!gates.some((gt) => Math.abs(gt.d - d) < 250)) bananas.push({ d, k: rand(-0.38, 0.38), hit: false });

      let steer = 0;
      ctx.button('◀', 'left', { onDown: () => { steer = -1; }, onUp: () => { if (steer < 0) steer = 0; } });
      const boostBtn = ctx.button('⚡<small>부스터</small>', 'drop', { onDown: () => useBoost() });
      ctx.button('▶', 'right', { onDown: () => { steer = 1; }, onUp: () => { if (steer > 0) steer = 0; } });
      let stock = 0; // 모아 둔 부스터
      function useBoost() { if (stock > 0 && !me.fin) { stock--; me.boost = 1.6; ctx.sfx('reveal'); ctx.callout('nice', '부스터!'); } }

      const S = { t: 0, slow: 1, quiz: null, order: [], finished: false, gate: null };

      function quiz() {
        const q = pick([...BANK[3], ...BANK[1].filter((x) => !x.context)]);
        const right = q.answer;
        const wrong = pick(q.options.filter((o) => o !== right));
        const opts = shuffle([right, wrong]);
        const box = document.createElement('div');
        box.className = 'mg-quiz';
        box.innerHTML = `<div class="qq">${q.prompt ? q.prompt.replace('___', '<u>　?　</u>') : `<b>${q.word}</b>의 품사는?`}</div>
          <div class="qo">${opts.map((o) => `<button>${o}</button>`).join('')}</div><i class="bar"></i>`;
        ctx.layer.appendChild(box);
        S.slow = 0.35;
        let done = false;
        const close = (ok) => {
          if (done) return; done = true;
          S.slow = 1; box.remove();
          if (ok) { me.shield = 6; stock = Math.min(3, stock + 1); ctx.callout('easy', '실드 + 부스터 1개'); }
          else { me.v *= 0.6; ctx.floatText(`정답: ${right}`, me.x, PY() - 70, '#E0453A', 16); ctx.sfx('no'); }
        };
        box.querySelectorAll('button').forEach((b) => { b.onclick = () => close(b.textContent === right); });
        setTimeout(() => close(false), 4500);
      }

      function stepRacer(r, dt) {
        if (r.fin) { r.v *= 1 - dt * 1.5; r.d += r.v * dt; return; }
        let tgt = r.base;
        if (r.boost > 0) { r.boost -= dt; tgt *= 1.6; }
        if (r.spin > 0) { r.spin -= dt; tgt *= 0.35; }
        if (!r.me) {
          // AI: 길 중앙 + 자기 레인, 가끔 부스터, 플레이어와 비슷한 거리 유지(러버밴드)
          const lead = r.d - me.d;
          tgt *= lead > 500 ? 0.9 : lead < -500 ? 1.12 : 1;
          if (Math.random() < dt * 0.12) r.boost = 1.1;
          const want = cx(r.d + 120) + r.lane * RW;
          r.x += clamp(want - r.x, -140 * dt, 140 * dt);
        } else {
          const st = steer || (ctx.input.keys.ArrowLeft ? -1 : ctx.input.keys.ArrowRight ? 1 : 0);
          r.x += st * 210 * dt;
          if (ctx.input.down) r.x += clamp(ctx.input.x - r.x, -210 * dt, 210 * dt);
          const off = Math.abs(r.x - cx(r.d)) > RW / 2 - 14;
          if (off) tgt *= 0.55; // 잔디
          r.x = clamp(r.x, cx(r.d) - RW / 2 - 30, cx(r.d) + RW / 2 + 30);
        }
        r.v += (tgt - r.v) * Math.min(1, dt * 2.2);
        r.d += r.v * dt * (r.me ? 1 : 1);
        if (r.d >= L && !r.fin) { r.fin = S.t; S.order.push(r); if (r.me) finish(); }
      }

      function finish() {
        const place = S.order.indexOf(me) + 1;
        S.finished = true;
        boostBtn.disabled = true;
        setTimeout(() => {
          ctx.end({
            score: Math.max(0, 1600 - place * 300) + S.gateOk * 150, cleared: place <= 2,
            coins: [0, 20, 12, 7, 4][place], snack: place === 1 ? 'cookie' : null,
            headline: place === 1 ? '🏆 1등 골인!' : `${place}등 골인!`, legendAt: 2100,
            lines: [`품사 게이트 <b>${S.gateOk}</b>/${gates.length} 통과`, R.slice().sort((a, b) => (a.fin || 1e9) - (b.fin || 1e9) || b.d - a.d).map((r, i) => `${i + 1}. ${r.me ? '<b>나</b>' : r.name}`).join(' · ')],
          });
        }, 1200);
      }
      S.gateOk = 0;

      return {
        update(dt0) {
          const dt = dt0 * S.slow;
          S.t += dt;
          R.forEach((r) => stepRacer(r, dt));
          if (S.finished) return;
          me.shield = Math.max(0, me.shield - dt);
          // 게이트: 다가오면 위쪽에 문제 표시
          const next = gates.find((gt) => !gt.done && gt.d > me.d);
          if (next !== S.gate) S.gate = next;
          gates.forEach((gt) => {
            if (gt.done || me.d < gt.d) return;
            gt.done = true;
            const rel = (me.x - (cx(gt.d) - RW / 2)) / RW;
            const lane = clamp(Math.floor(rel * 3), 0, 2);
            if (gt.lanes[lane] === gt.answer) {
              S.gateOk++; me.boost = 1.8; stock = Math.min(3, stock + 1);
              ctx.callout(S.gateOk >= 3 ? 'yar' : 'easy', `${gt.word} = ${gt.answer}`);
              ctx.burst(me.x, PY() - 20, 22);
            } else {
              me.spin = 1; ctx.shake(7); ctx.sfx('no');
              ctx.floatText(`${gt.word} → ${gt.answer}!`, me.x, PY() - 80, '#E0453A', 18);
            }
          });
          boxes.forEach((b) => {
            if (b.got || Math.abs(b.d - me.d) > 24) return;
            if (Math.abs(cx(b.d) + b.k * RW - me.x) < 26) { b.got = true; ctx.sfx('reveal'); quiz(); }
          });
          bananas.forEach((b) => {
            if (b.hit || Math.abs(b.d - me.d) > 18) return;
            if (Math.abs(cx(b.d) + b.k * RW - me.x) < 20) {
              b.hit = true;
              if (me.shield > 0) { me.shield = 0; ctx.floatText('실드로 막았다!', me.x, PY() - 70, '#2E7BC4', 16); }
              else { me.spin = 1.1; ctx.shake(6); ctx.sfx('no'); ctx.floatText('🍌 빙글!', me.x, PY() - 70, '#F2A01E', 18); }
            }
          });
          const place = R.filter((r) => r.d > me.d).length + 1;
          ctx.hud(`<b>${place}</b>등 · ${Math.min(100, Math.round((me.d / L) * 100))}% · ⚡${'●'.repeat(stock)}${'○'.repeat(3 - stock)}`);
        },
        draw(g) {
          const w = W();
          const H = ctx.H;
          const py = PY();
          const toY = (d) => py - (d - me.d);
          g.fillStyle = '#B6E88E'; g.fillRect(0, 0, w, H);
          // 잔디 무늬 + 꽃
          for (let d = Math.floor((me.d - 200) / 80) * 80; d < me.d + H; d += 80) {
            const y = toY(d);
            g.fillStyle = (d / 80) % 2 ? '#A8E07A' : '#BFEA94';
            g.fillRect(0, y - 80, w, 80);
            g.fillStyle = ['#FF9ECB', '#FFE36B', '#fff'][Math.abs(d / 80) % 3 | 0];
            g.beginPath(); g.arc((d * 7) % w, y - 30, 4, 0, 7); g.arc((d * 13 + 90) % w, y - 60, 4, 0, 7); g.fill();
          }
          // 도로
          g.fillStyle = '#F6E7CF';
          g.beginPath();
          for (let y = -20; y <= H + 20; y += 10) { const d = me.d + (py - y); g.lineTo(cx(d) - RW / 2, y); }
          for (let y = H + 20; y >= -20; y -= 10) { const d = me.d + (py - y); g.lineTo(cx(d) + RW / 2, y); }
          g.fill();
          // 연석
          for (let y = -20; y <= H + 20; y += 20) {
            const d = me.d + (py - y);
            g.fillStyle = Math.floor(d / 40) % 2 ? '#FF8A8A' : '#fff';
            g.fillRect(cx(d) - RW / 2 - 8, y, 8, 20); g.fillRect(cx(d) + RW / 2, y, 8, 20);
          }
          // 결승선
          const fy = toY(L);
          if (fy > -40 && fy < H + 40) {
            for (let k = 0; k < 12; k++) for (let r = 0; r < 2; r++) { g.fillStyle = (k + r) % 2 ? '#2B2350' : '#fff'; g.fillRect(cx(L) - RW / 2 + (k * RW) / 12, fy - r * 12, RW / 12, 12); }
            tag(g, 'FINISH', cx(L), fy - 34, { bg: '#FFD43B' });
          }
          // 게이트
          gates.forEach((gt) => {
            const y = toY(gt.d);
            if (y < -60 || y > H + 40) return;
            const x0 = cx(gt.d) - RW / 2;
            gt.lanes.forEach((ln, i) => {
              const done = gt.done;
              g.fillStyle = done ? (ln === gt.answer ? 'rgba(143,224,138,.7)' : 'rgba(255,138,138,.5)') : ['rgba(255,158,203,.75)', 'rgba(143,216,255,.75)', 'rgba(255,211,107,.75)'][i];
              g.fillRect(x0 + (i * RW) / 3 + 2, y - 26, RW / 3 - 4, 26);
              g.font = '400 15px Jua, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#2B2350';
              g.fillText(ln, x0 + ((i + 0.5) * RW) / 3, y - 12);
            });
            g.fillStyle = '#2B2350'; g.fillRect(x0 - 10, y - 46, 6, 46); g.fillRect(x0 + RW + 4, y - 46, 6, 46);
            roundRect(g, x0 - 10, y - 50, RW + 20, 10, 4); g.fill();
          });
          // 아이템 박스 · 바나나
          boxes.forEach((b) => {
            if (b.got) return;
            const y = toY(b.d); if (y < -40 || y > H + 40) return;
            const x = cx(b.d) + b.k * RW;
            g.save(); g.translate(x, y); g.rotate(S.t * 2);
            roundRect(g, -14, -14, 28, 28, 6); g.fillStyle = `hsl(${(S.t * 120) % 360},85%,70%)`; g.fill(); g.lineWidth = 3; g.strokeStyle = '#fff'; g.stroke();
            g.restore();
            g.font = '400 18px Jua, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#2B2350'; g.fillText('?', x, y + 1);
          });
          bananas.forEach((b) => {
            if (b.hit) return;
            const y = toY(b.d); if (y < -30 || y > H + 30) return;
            const x = cx(b.d) + b.k * RW;
            g.fillStyle = '#FFD43B'; g.beginPath(); g.ellipse(x, y, 11, 6, 0.5, 0, 7); g.fill();
            g.strokeStyle = '#B07A4F'; g.lineWidth = 2; g.stroke();
          });
          // 카트
          [...R].sort((a, b) => a.d - b.d).forEach((r) => {
            const y = toY(r.d); if (y < -60 || y > H + 60) return;
            g.save(); g.translate(r.x, y);
            if (r.spin > 0) g.rotate(r.spin * 12);
            if (r.boost > 0) { g.fillStyle = 'rgba(255,170,60,.8)'; g.beginPath(); g.moveTo(-8, 30); g.lineTo(0, 30 + 24 + Math.random() * 10); g.lineTo(8, 30); g.fill(); }
            if (r.img) g.drawImage(r.img, -21, -30, 42, 59);
            if (r.me && face) {
              const fw = 26; const fh = (face.height / face.width) * fw;
              g.save(); g.beginPath(); g.arc(0, 2, 12, 0, 7); g.clip(); g.drawImage(face, -fw / 2, -2, fw, fh); g.restore();
              g.strokeStyle = '#fff'; g.lineWidth = 2.5; g.beginPath(); g.arc(0, 2, 12, 0, 7); g.stroke();
            }
            if (r.shield > 0) { g.strokeStyle = 'rgba(143,216,255,.9)'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 34, 0, 7); g.stroke(); }
            g.restore();
            if (!r.me) tag(g, r.name, r.x, y - 42, { size: 11, bg: '#fff' });
          });
          // 다가오는 게이트 문제
          if (S.gate && S.gate.d - me.d < 700) {
            roundRect(g, w / 2 - 120, 12, 240, 46, 23);
            g.fillStyle = 'rgba(255,251,240,.95)'; g.fill(); g.lineWidth = 3; g.strokeStyle = '#F2B84B'; g.stroke();
            g.font = '400 20px Jua, sans-serif'; g.fillStyle = '#2B2350'; g.textAlign = 'center'; g.textBaseline = 'middle';
            g.fillText(`「${S.gate.word}」 의 품사 레인은?`, w / 2, 36);
          }
        },
      };
    },
  });
}
