// 청크런 — 횡스크롤 러너. 미션에 맞는 "바르게 꾸민" 음식만 먹고, 장애물은 점프·슬라이드로 피한다.
import { openGame, loadImage, asset, charSprite, rand, pick, clamp, roundRect, tag } from './engine.js';
import data from '../../data/minigames.json';
import chars from '../../data/characters.json';
import { sideSVG, tedSVG } from './runner-art.js';
import '../fx/legacy-run.css';

const iconFor = (label) => { const I = data.run.icons; const k = Object.keys(I).sort((a, b) => b.length - a.length).find((n) => label.endsWith(n)); return k ? I[k] : '🍽️'; };

const MISSION_SEC = 30; // 미션 하나 30초 × 6 + 보스 30초 ≈ 3분 30초
const BOSS_SEC = 30;

export function playRun({ charId = 'bboy' } = {}) {
  return openGame({
    id: 'run',
    title: '🏃 청크런',
    subtitle: '바르게 꾸민 음식만 먹으며 끝까지 달려라!',
    music: 'mgRun',
    howto: [
      '화면 위 <b class="red">미션에 맞게 바르게 쓴 음식만</b> 먹어요 — <b>sweet cake</b> ⭕ / <b class="red">sweetly cake ❌ 불량식품!</b>',
      '<b class="red">⬆ 점프</b> 버튼 · 공중에서 한 번 더 누르면 <b class="red">2단 점프!</b>',
      '<b class="red">⬇ 슬라이드</b> 버튼 · 축구 슬라이딩처럼 쭉 누워서 지나가요',
      '💧 <b>물웅덩이</b>는 점프로 건너요 — 웅덩이가 <b class="red">여러 개 이어지면 연속 점프!</b>',
      '불량식품이 <b>땅</b>에 있으면 <b class="red">점프로 넘고</b>, <b>머리 높이</b>에 있으면 <b class="red">슬라이드로 밑으로!</b>',
      '<b>보강 여신 · 묵언수행 · 보강대장</b>이 길을 막아요 — 점프로 피하기!',
      '🌮 <b>타코</b> = Ted 선생님 변신(잠깐 무적) · 💗 하트 회복 · 하트 5개 · 미션 6개 → 보스 → 🏁 깃발',
    ],
    async setup(ctx) {
      const { g } = ctx;
      const [me, ted, choco] = await Promise.all([charSprite(charId), charSprite('ted'), loadImage(asset('snacks/choco.svg'))]);
      // 방해 캐릭터: 게임 속 친구들 전부 + 익살 캐릭터들. 「주머니 뽑기」로 골고루 (모두 한 번씩 나온 뒤에 다시 섞기)
      const SAYS = { daejang: '보강 와라!', mukeon: '…(묵묵)', yeosin: '반짝!', bboy: '윈드밀!', perm: '머리 망가져!', disco: '디스코 타임~', popper: '삐걱삐걱', latina: '올레!', braids: '비켜 줘~', blond: '스케이트 간다!', bun: '숙제 다 했어?' };
      const friends = chars.players.filter((p) => p.id !== charId);
      const imgs = await Promise.all(friends.map((p) => charSprite(p.id).catch(() => null)));
      const KIDS = friends.map((p, k) => ({ kind: 'kid', img: imgs[k], say: SAYS[p.id] || '앗!', name: p.name })).filter((k) => k.img);
      // 익살 캐릭터 (그림으로 그림): 늙크크 아저씨 · 영크크 · 숙제 괴물 · 졸린 판다 · 비둘기 떼
      ['oldman', 'teen', 'hwmon', 'panda', 'pigeon'].forEach((f) => KIDS.push({ kind: 'funny', f, name: { oldman: '늙크크 아저씨', teen: '영크크', hwmon: '숙제 괴물', panda: '졸린 판다', pigeon: '비둘기 떼' }[f], say: { oldman: '어이쿠!', teen: '앗 죄송!', hwmon: '숙제 내놔~', panda: 'zzz…', pigeon: '구구구!' }[f] }));
      let bag = [];
      const nextKid = () => { if (!bag.length) bag = [...KIDS].sort(() => Math.random() - 0.5); return bag.pop(); };
      const POSC = { 명사: '#E0453A', 동사: '#2E7BC4', 형용사: '#28A064', 부사: '#D9822B' };
      const POSAB = { 명사: 'n.', 동사: 'v.', 형용사: 'adj.', 부사: 'adv.' };
      // 배경 집 간판: 영어 단어 + 품사
      const SIGNS = Object.entries(data.pos).flatMap(([p, ws]) => ws.slice(0, 6).map((w) => ({ w, p })));
      const missions = data.run.missions;
      const GY = () => ctx.H * 0.74; // 땅 높이
      const S = {
        x: 0, speed: 198, y: 0, vy: 0, jumps: 0, slide: 0, hearts: 5, inv: 0, score: 0, combo: 0, best: 0,
        good: 0, bad: 0, mission: 0, phase: 'run', t: 0, taco: 0, ents: [], nextSpawn: 1.2, bossHP: 0, goalX: 0, finished: false, msgT: 0,
      };
      const PX = 86;
      // Ted 선생님이 가끔 수풀 뒤에서 빼꼼
      const peek = { t: 12 + Math.random() * 8, on: 0, x: 0, say: '' };
      const PEEK_SAY = ['열심히!', '오~ 잘하는데?', '단어 잘 봐!', '불량식품 조심!', '야르!', '점프 점프!'];
      const PH = 74; // 캐릭터 키

      const banner = document.createElement('div');
      banner.className = 'mg-mission';
      ctx.layer.appendChild(banner);
      // 기존 앱 쿠키런의 옆모습 달리기 캐릭터 (팔다리가 움직인다)
      const P = document.createElement('div');
      P.className = 'rg-p sv run';
      P.innerHTML = sideSVG('bboy');
      ctx.layer.appendChild(P);
      let form = 'bboy';
      const setForm = (f) => { form = f; P.className = f === 'ted' ? 'rg-p ted tr' : 'rg-p sv run'; P.innerHTML = f === 'ted' ? tedSVG() : sideSVG('bboy'); };
      function setMission(i) {
        S.mission = i;
        const m = missions[i];
        banner.innerHTML = `<small>미션 ${i + 1}/${missions.length}</small><b>${m.title}</b><em>💡 ${m.hint}</em>`;
        banner.classList.remove('pop'); void banner.offsetWidth; banner.classList.add('pop');
      }
      setMission(0);

      const jump = () => {
        if (S.finished) return;
        if (S.y === 0 && S.slide <= 0) { S.vy = -560; S.jumps = 1; ctx.sfx('hop'); }
        else if (S.jumps === 1) { S.vy = -500; S.jumps = 2; ctx.sfx('hop'); ctx.burst(PX, GY() + S.y - 20, 8, ['#fff', '#8FD8FF']); }
      };
      ctx.button('⬇<small>슬라이드</small>', 'slide', { onDown: () => { if (S.y === 0) { S.slide = 0.875; ctx.sfx('whoosh'); } } }); // 슬라이딩 25% 더 길게
      ctx.button('⬆<small>점프</small>', 'jump', { onDown: jump });

      function spawn() {
        const gy = GY();
        const r = Math.random();
        const m = missions[S.mission];
        if (S.phase === 'boss') return; // 보스 구간은 보스가 던진다
        if (r < 0.52) {
          const good = Math.random() < 0.55;
          // 좋은 음식: 땅 또는 공중(점프해서 먹기) · 불량식품: 땅(점프로 넘기) 또는 머리 높이(슬라이드로 지나가기)
          const y = good ? (Math.random() < 0.4 ? gy - 120 : gy - 30) : (Math.random() < 0.5 ? gy - 52 : gy - 4);
          { const label = pick(good ? m.good : m.bad); S.ents.push({ kind: 'food', good, label, icon: iconFor(label), x: ctx.W + 40, y, w: 46, h: 38, head: !good && y < gy - 20 }); }
        } else if (r < 0.68) {
          const k = nextKid();
          S.ents.push({ ...k, kind: 'kid', x: ctx.W + 40, y: gy, w: k.f === 'pigeon' ? 54 : 40, h: k.f === 'pigeon' ? 36 : 62 });
        } else if (r < 0.8) {
          // 💧 물웅덩이: 점프로 건너기 (가끔 2~3개가 이어지는 연속 점프 구간)
          const n = S.t > 25 && Math.random() < 0.4 ? 2 + Math.floor(Math.random() * 2) : 1;
          for (let k = 0; k < n; k++) S.ents.push({ kind: 'puddle', x: ctx.W + 50 + k * 150, y: gy + 4, w: 62, h: 8 });
          if (n > 1) S.nextSpawn += 0.9;
        } else if (r < 0.9) {
          S.ents.push({ kind: Math.random() < 0.5 ? 'cone' : 'crate', x: ctx.W + 40, y: gy, w: 30, h: 32 });
        } else if (r < 0.97) {
          S.ents.push({ kind: 'bar', x: ctx.W + 40, y: gy - 70, w: 70, h: 18 }); // 슬라이드로 통과
        } else if (S.hearts < 5 && Math.random() < 0.7) {
          S.ents.push({ kind: 'heart', x: ctx.W + 40, y: gy - 100, w: 30, h: 28 });
        } else if (!S.taco) {
          S.ents.push({ kind: 'taco', x: ctx.W + 40, y: gy - 110, w: 34, h: 26 });
        }
      }

      function hurt(msg) {
        if (S.inv > 0 || S.taco > 0) return;
        S.hearts--; S.inv = 1.3; S.combo = 0;
        ctx.shake(8); ctx.sfx('no'); ctx.floatText(msg, PX + 30, GY() - 100, '#E0453A', 18);
        if (S.hearts <= 0) { S.finished = true; ctx.end(result(false)); }
      }

      function result(cleared) {
        const coins = Math.min(30, Math.round(S.score / 300)) + (cleared ? 10 : 0);
        return {
          score: S.score, cleared, coins,
          snack: cleared && S.good >= 25 ? 'choco' : null,
          headline: cleared ? (S.bad === 0 ? '노 미스 클리어!' : '청크런 완주!') : '하트를 모두 잃었어요',
          legendAt: 3200,
          lines: [`바른 음식 <b>${S.good}</b>개 · 잘못 꾸민 음식 ${S.bad}개`, `최고 콤보 <b>${S.best}</b>`],
        };
      }

      window.__RUN = () => S.ents.filter((e) => e.kind === 'kid').map((e) => e.name); // 테스트용
      window.__RUNP = () => S.ents.some((e) => e.kind === 'puddle' && e.x < ctx.W - 20); // 테스트용
      window.__RUNK = () => S.ents.map((e) => e.kind); // 테스트용
      const hit = (a, px, py, pw, ph) => px < a.x + a.w / 2 && px + pw > a.x - a.w / 2 && py < a.y && py + ph > a.y - a.h;

      return {
        update(dt) {
          if (S.finished && S.phase !== 'goal') return;
          S.t += dt;
          if (ctx.input.taps.some((p) => p.y < ctx.H * 0.72)) jump();
          if (ctx.input.keys.ArrowUp || ctx.input.keys[' ']) { if (!S.kh) jump(); S.kh = true; } else S.kh = false;
          if (ctx.input.keys.ArrowDown && S.y === 0) S.slide = 0.5;

          // 구간 진행
          const total = missions.length * MISSION_SEC;
          if (S.phase === 'run') {
            const mi = Math.min(missions.length - 1, Math.floor(S.t / MISSION_SEC));
            if (mi !== S.mission) { setMission(mi); ctx.callout('nice', `미션 ${mi + 1}`); }
            if (S.t > total) {
              S.phase = 'boss'; S.bossHP = BOSS_SEC; S.bossT = 0;
              banner.innerHTML = '<small>BOSS</small><b>오답 몬스터 등장! <span class="tg">잘못 꾸민 음식을 피해라!</span></b><em>💡 날아오는 음식은 모두 오답이에요</em>';
              banner.classList.remove('pop'); void banner.offsetWidth; banner.classList.add('pop');
              ctx.shake(10, 0.5);
            }
          } else if (S.phase === 'boss') {
            S.bossT += dt;
            if (S.bossT > BOSS_SEC) { S.phase = 'goal'; S.goalX = ctx.W + 60; }
            if (Math.random() < dt * 1.6) {
              const m = missions[Math.floor(Math.random() * missions.length)];
              { const label = pick(m.bad); S.ents.push({ kind: 'shot', good: false, label, icon: iconFor(label), x: ctx.W - 60, y: GY() - 170, vx: -rand(160, 240), vy: rand(-80, 40), w: 46, h: 38 }); }
            }
            if (Math.random() < dt * 0.5) {
              const m = missions[Math.floor(Math.random() * missions.length)];
              { const label = pick(m.good); S.ents.push({ kind: 'food', good: true, label, icon: iconFor(label), x: ctx.W + 40, y: GY() - (Math.random() < 0.5 ? 30 : 120), w: 50, h: 40 }); }
            }
          }

          // Ted 빼꼼
          peek.t -= dt;
          if (peek.t <= 0 && !peek.on) { peek.on = 2.6; peek.x = rand(ctx.W * 0.45, ctx.W - 50); peek.say = pick(PEEK_SAY); }
          if (peek.on) { peek.on = Math.max(0, peek.on - dt); if (!peek.on) peek.t = 20 + Math.random() * 12; }
          // 속도·위치
          // 앞 2/3 구간은 30% 느리게 (단어를 충분히 읽게), 마지막 1/3만 원래 속도로 (3초에 걸쳐 부드럽게)
          const fastAt = (missions.length * MISSION_SEC + BOSS_SEC) * 2 / 3;
          const slowK = 0.7 + 0.3 * clamp((S.t - fastAt) / 3, 0, 1);
          S.speed = Math.min(297, 198 + S.t * 1.1) * slowK * (S.taco > 0 ? 1.15 : 1);
          const move = S.speed * dt;
          S.x += move;
          S.vy += 1500 * dt;
          S.y = Math.min(0, S.y + S.vy * dt);
          if (S.y === 0) { S.vy = 0; S.jumps = 0; }
          S.slide = Math.max(0, S.slide - dt);
          S.inv = Math.max(0, S.inv - dt);
          if (S.taco > 0) { S.taco -= dt; if (S.taco <= 0) { setForm('bboy'); ctx.floatText('변신 끝!', PX, GY() - 120, '#6B5F8A'); } }

          S.nextSpawn -= dt;
          if (S.nextSpawn <= 0 && S.phase === 'run') { spawn(); const ease = S.t < MISSION_SEC ? 1.35 : 1; S.nextSpawn = rand(0.75, 1.25) * ease * (220 / S.speed); }

          const gy = GY();
          const ph = S.slide > 0 ? PH * 0.5 : PH;
          const px = PX - 18;
          const py = gy + S.y - ph;
          for (let k = S.ents.length - 1; k >= 0; k--) {
            const e = S.ents[k];
            if (e.kind === 'shot') { e.x += e.vx * dt - move; e.vy += 200 * dt; e.y = Math.min(gy - 20, e.y + e.vy * dt); } else e.x -= move;
            if (S.taco > 0 && (e.kind === 'food' && e.good)) { e.x += (PX - e.x) * dt * 4; e.y += (gy + S.y - 40 - e.y) * dt * 4; }
            if (e.x < -80) { S.ents.splice(k, 1); continue; }
            if (e.done || !hit(e, px, py, 36, ph)) continue;
            if (e.kind === 'food' || e.kind === 'shot') {
              e.done = true;
              if (e.good) {
                S.good++; S.combo++; S.best = Math.max(S.best, S.combo);
                const pts = 100 + Math.min(10, S.combo) * 20;
                S.score += pts;
                ctx.burst(e.x, e.y - 15, 14);
                ctx.floatText(`+${pts} ${e.label}`, e.x, e.y - 40, '#1E9B5B', 16);
                ctx.sfx('ok');
                if (S.combo % 5 === 0) ctx.callout('yar', `${S.combo} 콤보!`);
              } else {
                S.bad++;
                ctx.floatText(`✘ ${e.label}`, e.x, e.y - 40, '#E0453A', 16);
                hurt('잘못 꾸민 음식!');
              }
              S.ents.splice(k, 1);
            } else if (e.kind === 'heart') {
              S.hearts = Math.min(5, S.hearts + 1); S.ents.splice(k, 1); ctx.sfx('reveal'); ctx.floatText('💗 +1', PX, gy - 110, '#E21E8C', 20);
            } else if (e.kind === 'taco') {
              S.taco = 6; S.ents.splice(k, 1); setForm('ted'); ctx.burst(PX, gy - 60, 30, ['#FFD43B', '#E21E8C', '#fff']);
              ctx.callout('yar', 'Ted 선생님 변신!'); S.score += 200;
            } else if (e.kind === 'bar') {
              if (S.slide <= 0) { e.done = true; hurt('쿵! 슬라이드!'); }
            } else if (e.kind === 'puddle') {
              if (S.y > -6) { e.done = true; ctx.burst(e.x, gy, 14, ['#8FD8FF', '#fff', '#4FA3E8']); hurt('풍덩! 점프!'); }
            } else {
              e.done = true;
              hurt(e.kind === 'kid' ? `${e.say} 부딪혔다!` : '쿵!');
            }
          }

          if (S.phase === 'goal') {
            S.goalX -= move;
            if (S.goalX < PX + 10 && !S.finished) {
              S.finished = true; S.score += 500 + S.hearts * 300;
              ctx.burst(PX, gy - 60, 40); ctx.end(result(true));
            }
          }
          ctx.hud(`❤️×${Math.max(0, S.hearts)} <b>${S.score}</b>${S.combo > 1 ? ` <i>🔥${S.combo}</i>` : ''}`);
        },
        draw(gc) {
          const { W, H } = ctx;
          const gy = GY();
          const sky = gc.createLinearGradient(0, 0, 0, gy);
          sky.addColorStop(0, S.phase === 'boss' ? '#C9A2FF' : '#8FD3FF');
          sky.addColorStop(1, S.phase === 'boss' ? '#FFD0E6' : '#FFE9F3');
          gc.fillStyle = sky; gc.fillRect(0, 0, W, gy);
          // 구름 · 언덕 (시차 스크롤)
          gc.fillStyle = 'rgba(255,255,255,.9)';
          for (let k = 0; k < 5; k++) {
            const x = ((k * 160 - S.x * 0.15) % (W + 160) + W + 160) % (W + 160) - 80;
            const y = 60 + (k % 3) * 40;
            gc.beginPath(); gc.arc(x, y, 22, 0, 7); gc.arc(x + 24, y - 8, 26, 0, 7); gc.arc(x + 50, y, 20, 0, 7); gc.fill();
          }
          ['#B6E88E', '#9BDB7A'].forEach((c, layerI) => {
            gc.fillStyle = c;
            gc.beginPath(); gc.moveTo(0, gy);
            for (let x = 0; x <= W + 10; x += 10) gc.lineTo(x, gy - 50 - layerI * -20 - 30 * Math.sin((x + S.x * (0.3 + layerI * 0.2)) / (90 - layerI * 20)));
            gc.lineTo(W, gy); gc.fill();
          });
          // 품사 마을: 집과 영어 단어 간판 (시차 스크롤)
          for (let k = 0; k < 5; k++) {
            const span = 210;
            const raw = k * span - S.x * 0.45;
            const n = Math.floor(-raw / (span * 5));
            const x = ((raw % (span * 5)) + span * 5) % (span * 5) - 90;
            const idx = Math.abs(k + n * 5);
            const sign = SIGNS[(idx * 7) % SIGNS.length];
            const hw = 92; const hh = 70; const hy = gy - 26;
            gc.fillStyle = ['#FFF1D0', '#FFE3F0', '#E2F4FF', '#EAFBE0'][idx % 4]; gc.fillRect(x, hy - hh, hw, hh);
            gc.strokeStyle = '#2B2350'; gc.lineWidth = 2; gc.strokeRect(x, hy - hh, hw, hh);
            gc.fillStyle = ['#E0453A', '#9B6BE0', '#2E7BC4', '#F2A01E'][idx % 4];
            gc.beginPath(); gc.moveTo(x - 8, hy - hh); gc.lineTo(x + hw / 2, hy - hh - 34); gc.lineTo(x + hw + 8, hy - hh); gc.closePath(); gc.fill(); gc.stroke();
            gc.fillStyle = '#8FD8FF'; gc.fillRect(x + 10, hy - hh + 22, 18, 16); gc.strokeRect(x + 10, hy - hh + 22, 18, 16);
            gc.fillStyle = '#B07A4F'; gc.fillRect(x + hw - 30, hy - 30, 20, 30); gc.strokeRect(x + hw - 30, hy - 30, 20, 30);
            // 간판: 단어 + 품사
            const c = POSC[sign.p];
            gc.font = "400 13px Jua, 'Noto Sans KR', sans-serif";
            const tw2 = Math.max(70, gc.measureText(sign.w).width + 18);
            roundRect(gc, x + hw / 2 - tw2 / 2, hy - hh - 6, tw2, 30, 7); gc.fillStyle = '#fff'; gc.fill(); gc.lineWidth = 2.5; gc.strokeStyle = c; gc.stroke();
            gc.fillStyle = '#2B2350'; gc.textAlign = 'center'; gc.textBaseline = 'middle'; gc.fillText(sign.w, x + hw / 2, hy - hh + 4);
            gc.font = "900 9px 'Noto Sans KR', sans-serif"; gc.fillStyle = c; gc.fillText(`${POSAB[sign.p]} ${sign.p}`, x + hw / 2, hy - hh + 17);
          }
          // 마을 입구 아치 (가끔 지나감)
          {
            const ax = ((900 - S.x * 0.6) % 1800 + 1800) % 1800 - 200;
            if (ax < W + 60) {
              gc.fillStyle = '#4FA65B'; gc.fillRect(ax, gy - 120, 10, 120); gc.fillRect(ax + 150, gy - 120, 10, 120);
              roundRect(gc, ax - 14, gy - 150, 188, 40, 12); gc.fillStyle = '#FFD36B'; gc.fill(); gc.strokeStyle = '#2B2350'; gc.lineWidth = 3; gc.stroke();
              gc.font = "400 20px Jua, 'Noto Sans KR', sans-serif"; gc.fillStyle = '#2B2350'; gc.textAlign = 'center'; gc.fillText('품사 마을 POS VILLAGE', ax + 80, gy - 129);
            }
          }
          // 나무
          for (let k = 0; k < 6; k++) {
            const x = ((k * 130 - S.x * 0.6) % (W + 130) + W + 130) % (W + 130) - 50;
            gc.fillStyle = '#B07A4F'; gc.fillRect(x - 3, gy - 46, 6, 46);
            gc.fillStyle = k % 2 ? '#FFB7D5' : '#7ED07A';
            gc.beginPath(); gc.arc(x, gy - 56, 22, 0, 7); gc.fill();
          }
          // 땅 (사탕 줄무늬)
          gc.fillStyle = '#FFE1B8'; gc.fillRect(0, gy, W, H - gy);
          gc.fillStyle = '#FFC98A';
          for (let x = -((S.x) % 40); x < W; x += 40) gc.fillRect(x, gy, 20, 10);
          gc.fillStyle = '#F2B84B'; gc.fillRect(0, gy, W, 3);

          // 결승 깃발 + 초코파이
          if (S.phase === 'goal') {
            gc.fillStyle = '#6B4F2A'; gc.fillRect(S.goalX, gy - 140, 6, 140);
            gc.fillStyle = '#FF9ECB'; gc.beginPath(); gc.moveTo(S.goalX + 6, gy - 140); gc.lineTo(S.goalX + 60, gy - 122); gc.lineTo(S.goalX + 6, gy - 104); gc.fill();
            if (choco) gc.drawImage(choco, S.goalX + 14, gy - 80, 80, 48);
            tag(gc, 'GOAL!', S.goalX + 40, gy - 160, { bg: '#FFD43B' });
          }
          // 보스
          if (S.phase === 'boss') {
            const bx = W - 70;
            const by = gy - 190 + Math.sin(S.t * 3) * 14;
            gc.fillStyle = '#7A3FA8'; gc.beginPath(); gc.ellipse(bx, by, 52, 46, 0, 0, 7); gc.fill();
            gc.fillStyle = '#9B6BE0'; gc.beginPath(); gc.ellipse(bx - 8, by - 10, 30, 22, 0, 0, 7); gc.fill();
            gc.fillStyle = '#fff'; [-16, 14].forEach((dx) => { gc.beginPath(); gc.arc(bx + dx, by - 6, 11, 0, 7); gc.fill(); });
            gc.fillStyle = '#2B2350'; [-14, 16].forEach((dx) => { gc.beginPath(); gc.arc(bx + dx - 4, by - 4, 5, 0, 7); gc.fill(); });
            gc.strokeStyle = '#2B2350'; gc.lineWidth = 4; gc.beginPath(); gc.arc(bx, by + 18, 14, 3.4, 6); gc.stroke();
            tag(gc, '오답 몬스터', bx, by - 62, { bg: '#FF8A8A', fg: '#fff', border: '#7A1F1F', size: 13 });
            const left = Math.max(0, 1 - S.bossT / BOSS_SEC);
            roundRect(gc, 20, 70, W - 40, 10, 5); gc.fillStyle = 'rgba(255,255,255,.6)'; gc.fill();
            roundRect(gc, 20, 70, (W - 40) * left, 10, 5); gc.fillStyle = '#E0453A'; gc.fill();
          }

          // 물체
          for (const e of S.ents) {
            if (e.kind === 'food' || e.kind === 'shot') {
              gc.fillStyle = 'rgba(255,255,255,.85)'; gc.beginPath(); gc.arc(e.x, e.y - e.h / 2, 22, 0, 7); gc.fill();
              gc.font = "30px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif"; gc.textAlign = 'center'; gc.textBaseline = 'middle';
              gc.fillText(e.icon, e.x, e.y - e.h / 2 + 2);
              tag(gc, e.label, e.x, e.y - e.h - 16, { size: 16, bg: e.kind === 'shot' ? '#FFE3E3' : '#FFFBF0', pad: 7 });
            } else if (e.kind === 'kid') {
              if (e.f) drawFunny(gc, e.f, e.x, e.y, S.t);
              else if (e.img) { const ih = 74; const iw = ih * (e.img.width / e.img.height); gc.drawImage(e.img, e.x - iw / 2, e.y - ih, iw, ih); }
              tag(gc, e.name, e.x, e.y - 84, { size: 12, bg: '#FFE3F0', pad: 6 });
              tag(gc, '⬆ 점프!', e.x, e.y - 104, { size: 11, bg: '#FFF4D6', pad: 5 });
            } else if (e.kind === 'puddle') {
              const wob = Math.sin(S.t * 6 + e.x * 0.05) * 2;
              gc.fillStyle = '#4FA3E8'; gc.beginPath(); gc.ellipse(e.x, gy + 3, e.w / 2 + wob, 7, 0, 0, 7); gc.fill();
              gc.fillStyle = '#8FD8FF'; gc.beginPath(); gc.ellipse(e.x - 6, gy + 2, e.w / 3, 3.5, 0, 0, 7); gc.fill();
              gc.strokeStyle = 'rgba(255,255,255,.8)'; gc.lineWidth = 1.5; gc.beginPath(); gc.ellipse(e.x + 10, gy + 3, 8 + (S.t * 10 % 8), 2.5, 0, 0, 7); gc.stroke();
              if (!e.tip) tag(gc, '💧 점프!', e.x, gy - 18, { size: 11, bg: '#E2F4FF', pad: 5 });
            } else if (e.kind === 'cone') {
              gc.fillStyle = '#FF8A3D'; gc.beginPath(); gc.moveTo(e.x, e.y - e.h); gc.lineTo(e.x + 14, e.y); gc.lineTo(e.x - 14, e.y); gc.fill();
              gc.fillStyle = '#fff'; gc.fillRect(e.x - 8, e.y - 16, 16, 5);
            } else if (e.kind === 'crate') {
              roundRect(gc, e.x - 15, e.y - 30, 30, 30, 5); gc.fillStyle = '#E8B47E'; gc.fill(); gc.strokeStyle = '#B07A4F'; gc.lineWidth = 3; gc.stroke();
            } else if (e.kind === 'bar') {
              gc.fillStyle = '#B07A4F'; gc.fillRect(e.x - e.w / 2, e.y - e.h, 6, gy - e.y + e.h); gc.fillRect(e.x + e.w / 2 - 6, e.y - e.h, 6, gy - e.y + e.h);
              roundRect(gc, e.x - e.w / 2, e.y - e.h, e.w, e.h, 6);
              gc.fillStyle = '#FF9ECB'; gc.fill();
              tag(gc, '⬇ 슬라이드', e.x, e.y - e.h - 12, { size: 11, bg: '#fff' });
            } else if (e.kind === 'heart') {
              const hy = e.y - 14 + Math.sin(S.t * 6) * 4;
              gc.fillStyle = '#FF6FA8'; gc.beginPath(); gc.moveTo(e.x, hy + 10);
              gc.bezierCurveTo(e.x - 18, hy - 2, e.x - 10, hy - 16, e.x, hy - 6); gc.bezierCurveTo(e.x + 10, hy - 16, e.x + 18, hy - 2, e.x, hy + 10); gc.fill();
              gc.strokeStyle = '#fff'; gc.lineWidth = 2; gc.stroke();
            } else if (e.kind === 'taco') {
              gc.fillStyle = '#F2C14E'; gc.beginPath(); gc.arc(e.x, e.y - 6, 17, Math.PI, 0); gc.fill();
              gc.fillStyle = '#7ED07A'; gc.fillRect(e.x - 14, e.y - 9, 28, 4);
              gc.fillStyle = '#E0453A'; gc.fillRect(e.x - 10, e.y - 12, 6, 3); gc.fillRect(e.x + 3, e.y - 12, 6, 3);
              tag(gc, '🌮 타코', e.x, e.y - 34, { size: 12, bg: '#FFF4D6' });
            }
          }

          // Ted 선생님 빼꼼 (수풀 위로 고개만)
          if (peek.on && ted) {
            const up = Math.min(1, peek.on * 2, (2.6 - peek.on) * 3);
            const ih = 70; const iw = ih * (ted.width / ted.height);
            gc.save(); gc.beginPath(); gc.rect(peek.x - 60, gy - 120, 120, 120 - 6); gc.clip();
            gc.drawImage(ted, peek.x - iw / 2, gy - 6 - ih * 0.55 * up, iw, ih);
            gc.restore();
            gc.fillStyle = '#5FB85A'; gc.beginPath(); gc.arc(peek.x - 26, gy - 6, 20, Math.PI, 0); gc.arc(peek.x + 4, gy - 10, 24, Math.PI, 0); gc.arc(peek.x + 32, gy - 6, 18, Math.PI, 0); gc.fill();
            if (up > 0.8) tag(gc, peek.say, peek.x + 34, gy - 6 - ih * 0.55 - 6, { size: 13, bg: '#FFF4D6', pad: 6 });
          }
          // 플레이어 (DOM 캐릭터를 캔버스 좌표에 맞춘다)
          {
            const sc = ctx.scale || 1;
            const PW = form === 'ted' ? 64 : 52;
            const FOOT = form === 'ted' ? PW * 146 / 105 * (141 - 2.6) / 146 : PW * 82 / 64;
            const sliding = S.slide > 0 && S.y === 0;
            const want = sliding ? 'slide' : form === 'ted' ? (S.y < 0 ? 'tj' : 'tr') : (S.y < 0 ? 'jump' : 'run');
            if (!P.classList.contains(want)) { P.classList.remove('run', 'jump', 'idle', 'tr', 'tj', 'ti', 'slide'); P.classList.add(want); }
            // 슬라이딩: 발을 축으로 뒤로 눕기 (축구 슬라이딩 태클)
            const squash = sliding ? ' translateX(14px) rotate(-68deg)' : '';
            if (sliding && Math.random() < 0.5) ctx.burst(PX + 18, gy - 2, 2, ['#E8C89A', '#fff']);
            P.style.width = `${PW * sc}px`;
            P.style.transformOrigin = '50% 100%';
            P.style.transform = `translate(${(PX - PW / 2) * sc}px,${(gy + S.y - FOOT) * sc}px)${squash}`;
            P.style.opacity = S.inv > 0 && Math.floor(S.inv * 12) % 2 ? 0.35 : 1;
            if (S.taco > 0) { gc.strokeStyle = `rgba(255,212,59,${0.5 + 0.4 * Math.sin(S.t * 20)})`; gc.lineWidth = 4; gc.beginPath(); gc.arc(PX, gy + S.y - PH / 2, PH * 0.62, 0, 7); gc.stroke(); }
          }
          gc.fillStyle = 'rgba(43,35,80,.18)'; gc.beginPath(); gc.ellipse(PX, gy + 3, 22 + S.y * 0.05, 5, 0, 0, 7); gc.fill();
        },
      };
    },
  });
}

/** 익살 방해 캐릭터 (간단한 그림) — 발 위치 (x, y) */
function drawFunny(g, f, x, y, t) {
  const ink = '#2B2350';
  g.lineWidth = 2.5; g.strokeStyle = ink; g.lineJoin = 'round'; g.lineCap = 'round';
  const bob = Math.sin(t * 8) * 2;
  if (f === 'oldman') {
    // 늙크크: 빗어 넘긴 머리 · 콧수염 · 비닐봉지
    g.fillStyle = '#5A5F6B'; g.fillRect(x - 9, y - 22, 7, 22); g.fillRect(x + 2, y - 22, 7, 22);
    g.fillStyle = '#fff'; g.beginPath(); g.roundRect(x - 15, y - 50, 30, 30, 6); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.ellipse(x + 20, y - 28 + bob, 7, 9, 0, 0, 7); g.fill(); g.stroke();
    g.fillStyle = '#F2C9A0'; g.beginPath(); g.arc(x, y - 62 + bob, 13, 0, 7); g.fill(); g.stroke();
    g.strokeStyle = '#3A332E'; g.beginPath(); g.moveTo(x - 9, y - 70 + bob); g.quadraticCurveTo(x, y - 78 + bob, x + 10, y - 70 + bob); g.stroke();
    g.lineWidth = 3.5; g.beginPath(); g.moveTo(x - 6, y - 56 + bob); g.lineTo(x + 6, y - 56 + bob); g.stroke();
    g.fillStyle = ink; g.beginPath(); g.arc(x - 4, y - 63 + bob, 1.6, 0, 7); g.arc(x + 4, y - 63 + bob, 1.6, 0, 7); g.fill();
  } else if (f === 'teen') {
    // 영크크: 거꾸로 쓴 모자 · 후드 · 가방 메고 전력 질주
    g.fillStyle = '#2E4A78'; g.fillRect(x - 9, y - 24, 7, 24 + bob); g.fillRect(x + 2, y - 24, 7, 24 - bob);
    g.fillStyle = '#28A064'; g.beginPath(); g.roundRect(x - 14, y - 52, 28, 30, 7); g.fill(); g.stroke();
    g.fillStyle = '#F2A01E'; g.fillRect(x + 12, y - 50, 8, 18); g.strokeRect(x + 12, y - 50, 8, 18);
    g.fillStyle = '#FFE0C2'; g.beginPath(); g.arc(x, y - 63, 12, 0, 7); g.fill(); g.stroke();
    g.fillStyle = '#E0453A'; g.beginPath(); g.arc(x, y - 66, 12, Math.PI, 0); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(x + 8, y - 68); g.lineTo(x + 20, y - 66); g.lineTo(x + 8, y - 63); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = ink; g.beginPath(); g.arc(x - 4, y - 61, 1.6, 0, 7); g.arc(x + 4, y - 61, 1.6, 0, 7); g.fill();
  } else if (f === 'hwmon') {
    // 숙제 괴물: 공책 더미에 눈과 이빨
    ['#FFFBF0', '#E2F4FF', '#FFE3F0', '#FFF4D6'].forEach((c, k) => { g.fillStyle = c; g.beginPath(); g.roundRect(x - 22 + (k % 2) * 3, y - 16 - k * 15 + (k === 3 ? bob : 0), 44, 15, 3); g.fill(); g.stroke(); });
    g.fillStyle = '#fff'; g.beginPath(); g.arc(x - 9, y - 58 + bob, 7, 0, 7); g.arc(x + 9, y - 58 + bob, 7, 0, 7); g.fill(); g.stroke();
    g.fillStyle = ink; g.beginPath(); g.arc(x - 8, y - 57 + bob, 3, 0, 7); g.arc(x + 10, y - 57 + bob, 3, 0, 7); g.fill();
    g.fillStyle = '#E0453A'; g.font = "900 10px 'Noto Sans KR', sans-serif"; g.textAlign = 'center'; g.fillText('HOMEWORK', x, y - 22);
    g.strokeStyle = ink; g.beginPath(); for (let k = 0; k < 5; k++) { g.lineTo(x - 12 + k * 6, y - 42 + (k % 2) * 5); } g.stroke();
  } else if (f === 'panda') {
    // 졸린 판다: 서서 꾸벅꾸벅
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(x, y - 26, 20, 24, 0, 0, 7); g.fill(); g.stroke();
    g.fillStyle = ink; g.beginPath(); g.ellipse(x - 12, y - 4, 7, 5, 0, 0, 7); g.ellipse(x + 12, y - 4, 7, 5, 0, 0, 7); g.fill();
    const nod = Math.sin(t * 2) * 0.2;
    g.save(); g.translate(x, y - 58); g.rotate(nod);
    g.fillStyle = ink; g.beginPath(); g.arc(-12, -12, 6, 0, 7); g.arc(12, -12, 6, 0, 7); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(0, 0, 16, 0, 7); g.fill(); g.stroke();
    g.fillStyle = ink; g.beginPath(); g.ellipse(-6, 0, 5, 4, -0.4, 0, 7); g.ellipse(6, 0, 5, 4, 0.4, 0, 7); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-8, 0); g.lineTo(-4, 1); g.moveTo(4, 1); g.lineTo(8, 0); g.stroke();
    g.restore();
    g.fillStyle = '#6B5F8A'; g.font = "400 14px Jua, sans-serif"; g.textAlign = 'center'; g.fillText('z z z', x + 20, y - 82 - Math.sin(t * 3) * 4);
  } else if (f === 'pigeon') {
    // 비둘기 떼: 땅바닥을 콕콕
    [-16, 2, 18].forEach((dx, k) => {
      const pk = Math.sin(t * 10 + k * 2) > 0.3 ? 4 : 0;
      g.fillStyle = '#9AA6B6'; g.beginPath(); g.ellipse(x + dx, y - 10, 11, 8, 0, 0, 7); g.fill(); g.stroke();
      g.fillStyle = '#7D8899'; g.beginPath(); g.arc(x + dx + 8, y - 18 + pk, 6, 0, 7); g.fill(); g.stroke();
      g.fillStyle = '#F2A01E'; g.beginPath(); g.moveTo(x + dx + 13, y - 18 + pk); g.lineTo(x + dx + 18, y - 16 + pk); g.lineTo(x + dx + 13, y - 15 + pk); g.fill();
      g.fillStyle = ink; g.beginPath(); g.arc(x + dx + 9, y - 19 + pk, 1.3, 0, 7); g.fill();
    });
  }
  g.lineCap = 'butt';
}
