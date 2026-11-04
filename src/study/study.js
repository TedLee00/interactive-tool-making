// 개념 학습 — 게임 전에 4챕터를 한 장씩 넘기며 공부하고, 챕터마다 OX 퀴즈로 확인한다.
// 용어·기호·색은 교재(「영문법 기초 · 언어의 이해」)와 게임 채점 기준(docs/textbook-summary.md)을 그대로 따른다.
import './study.css';

// 청크 표시: ○명사 □동사 (형용사) <부사> △접속사
const mk = (p, t) => {
  const open = { N: '○', V: '□', A: '(', D: '&lt;', C: '△' }[p];
  const close = { A: ')', D: '&gt;' }[p] || '';
  return `<span class="ck ck-${p}">${open}${t}${close}</span>`;
};
const N = (t) => mk('N', t); const V = (t) => mk('V', t); const A = (t) => mk('A', t); const D = (t) => mk('D', t); const C = (t) => mk('C', t);

const CHAPTERS = [
  {
    no: 1, title: '8품사', sub: '단어가 하는 일로 나눈 8개의 무리', color: '#C8372D',
    pages: [
      {
        h: '품사란?',
        body: `<p class="big">품사 = 단어가 문장에서 <em>하는 일</em>에 따라 나눈 무리</p>
          <p class="key">품사는 <b>생김새</b>가 아니라 <em>하는 일</em>로 정해진다!</p>
          <div class="grid2">
            <div class="box"><h4>뼈대 4품사 <small>문장의 몸통</small></h4>
              <ul><li><b class="cN">명사</b> 이름 — Tom, apple, love</li><li><b class="cV">동사</b> 동작·상태 — run, eat, is</li><li><b class="cA">형용사</b> 명사를 꾸밈 — tall, happy</li><li><b class="cD">부사</b> 동사를 꾸밈 — quickly, very</li></ul></div>
            <div class="box"><h4>도우미 4품사 <small>뼈대를 도움</small></h4>
              <ul><li><b>대명사</b> 명사 대신 — I, she, it</li><li><b>전치사</b> 명사 앞 — in, on, at</li><li><b class="cC">접속사</b> 연결 — and, but</li><li><b>감탄사</b> 감정 — wow, oops</li></ul></div>
          </div>
          <p class="note">💡 사전 단어의 99%가 명사·동사·형용사·부사! ★ 관사 a, an, the는 <b>형용사</b>로 봐요.</p>`,
      },
      {
        h: '누가 누구를 꾸밀까?',
        body: `<div class="arrows">
            <div class="ar"><b class="cA">형용사</b><i>➜</i><b class="cN">명사</b><span>어떤? — <u>cute</u> puppy</span></div>
            <div class="ar"><b class="cD">부사</b><i>➜</i><b class="cV">동사</b><span>어떻게·언제·어디서? — sleeps <u>quietly</u></span></div>
            <div class="ar"><b class="cD">부사</b><i>➜</i><b class="cA">형용사</b><span>얼마나? — <u>very</u> tall</span></div>
          </div>
          <p class="key">영어 문장은 결국 <em>"(어떤) 명사가 &lt;어떻게&gt; 동사한다"</em></p>
          <div class="ex">${A('The cute')} ${N('puppy')} ${D('quietly')} ${V('sleeps')} ${D('on the sofa')}.</div>
          <p class="tr">(귀여운) 강아지가 &lt;조용히&gt; 잔다 &lt;소파 위에서&gt;.</p>`,
      },
      {
        h: '한 단어, 여러 품사',
        body: `<p class="big">같은 단어도 <em>하는 일</em>이 바뀌면 품사가 바뀐다!</p>
          <table class="tb"><tr><th>단어</th><th>이렇게 쓰면</th><th>저렇게 쓰면</th></tr>
            <tr><td><b>run</b></td><td>I <u>run</u> every day. <b class="cV">동사</b></td><td>a home <u>run</u> <b class="cN">명사</b></td></tr>
            <tr><td><b>fast</b></td><td>a <u>fast</u> car <b class="cA">형용사</b></td><td>He runs <u>fast</u>. <b class="cD">부사</b></td></tr>
            <tr><td><b>light</b></td><td>The <u>light</u> is bright. <b class="cN">명사</b></td><td>This box is <u>light</u>. <b class="cA">형용사</b></td></tr></table>
          <p class="note">💡 꼬리로도 알 수 있어요: -ness·-ment·-tion = 명사 / -ful·-ous·-ive = 형용사 / 형용사+-ly = 부사</p>`,
      },
    ],
    ox: [
      { q: '형용사는 <b>동사</b>를 꾸민다.', a: false, why: '형용사는 <b>명사</b>를 꾸며요. 동사를 꾸미는 건 부사!' },
      { q: '<b>happiness</b>는 명사다.', a: true, why: '-ness는 명사 꼬리! happy(형용사) → happiness(명사)' },
      { q: 'He runs <b>fast</b>. 의 fast는 형용사다.', a: false, why: '동사 runs를 꾸미니까 <b>부사</b>! (a fast car의 fast는 형용사)' },
    ],
  },
  {
    no: 2, title: '5품사로 묶기', sub: '단어를 덩어리(청크)로 크게 보기', color: '#1F5FB8',
    pages: [
      {
        h: '품사는 "덩어리"에도 붙는다',
        body: `<p class="big">단어 → <em>구</em> → <em>절</em> 모두 한 품사처럼 일해요</p>
          <table class="tb"><tr><th></th><th>단어</th><th>구</th><th>절</th></tr>
            <tr><td><b class="cN">명사</b></td><td>Jane</td><td>her phone number</td><td>that she likes me</td></tr>
            <tr><td><b class="cD">부사</b></td><td>late</td><td>after dinner</td><td>because he was sick</td></tr></table>
          <div class="grid2"><div class="box"><h4>구 phrase</h4><p>두 단어 이상, <b>주어+동사 없음</b><br>in the park · to eat lunch</p></div>
            <div class="box"><h4>절 clause</h4><p><b>주어+동사가 있음</b><br>because it rained · when I was young</p></div></div>
          <p class="key">주어 + 동사가 있으면 <em>절</em>!</p>`,
      },
      {
        h: '8품사를 5품사로 묶어 보기',
        body: `<p class="big">청크 독해에서는 8품사를 <em>5개</em>로 크게 봐요</p>
          <div class="five">
            <div><b class="sym cN">○</b><b class="cN">명사</b><small>대명사도 명사 무리<br>the·my + 명사 = 명사구</small></div>
            <div><b class="sym cV">□</b><b class="cV">동사</b><small>is sleeping, can be<br>통째로 한 덩어리</small></div>
            <div><b class="sym cA">( )</b><b class="cA">형용사</b><small>명사를 꾸미는 덩어리<br>(on the desk)</small></div>
            <div><b class="sym cD">&lt; &gt;</b><b class="cD">부사</b><small>동사를 꾸미는 덩어리<br>&lt;after school&gt;</small></div>
            <div><b class="sym cC">△</b><b class="cC">접속사</b><small>and, but<br>(잘 안 나와요)</small></div>
          </div>
          <p class="note">💡 전치사 + 명사(전명구)는 명사를 꾸미면 ( ) 형용사구, 동사를 꾸미면 &lt; &gt; 부사구!</p>`,
      },
      {
        h: '5품사 청크 독해 법칙',
        body: `<p class="key">묶을 수 있는 건 <em>최대한 크게</em> 묶는다!</p>
          <div class="rule"><b>법칙 ①</b> 명사 앞의 형용사(a, the, my 포함)는 <em>명사의 일부</em> → 통째로 명사구 ○<div class="ex">${N('The pretty girl')} ${A('in the red cap')}</div></div>
          <div class="rule"><b>법칙 ②</b> 보어 자리 형용사 앞의 부사는 <em>형용사의 일부</em> → 통째로 형용사구 ( )<div class="ex">${N('The movie')} ${V('was')} ${A('very long')}.</div></div>
          <div class="ex">${N('My tall friend')} ${V('reads')} ${N('an interesting book')} ${D('in the library')} ${D('after school')}.</div>
          <p class="tr">덩어리 순서대로 읽기: 키 큰 내 친구는 / 읽는다 / 재미있는 책을 / 도서관에서 / 방과 후에</p>`,
      },
    ],
    ox: [
      { q: '<b>in the park</b>는 구(phrase)다.', a: true, why: '두 단어 이상이고 주어+동사가 없으니 <b>구</b>! 동사를 꾸미면 부사구 &lt; &gt;' },
      { q: '<b>because it rained</b>는 구다.', a: false, why: '주어 it + 동사 rained가 있으니 <b>절</b>! → 부사절 &lt; &gt;' },
      { q: '청크로 묶으면 <b>The pretty girl</b>은 통째로 명사구 ○', a: true, why: '법칙 ① 명사 앞 형용사(the, pretty)는 명사의 일부!' },
    ],
  },
  {
    no: 3, title: '문장 성분', sub: '품사가 앉는 5개의 "의자"', color: '#2E8B57',
    pages: [
      {
        h: '품사는 사람, 문장 성분은 의자',
        body: `<p class="big">품사 = 단어의 <em>신분</em> · 문장 성분 = 문장 속 <em>자리(의자)</em></p>
          <p class="note">반장(신분)이 오늘은 발표자(자리)가 될 수도, 청중이 될 수도 있는 것처럼!</p>
          <div class="chairs">
            <div><i>🪑</i><b>S 주어</b><small>누가</small><em class="cN">명사</em></div>
            <div><i>🪑</i><b>V 서술어(동사)</b><small>한다·이다</small><em class="cV">동사</em></div>
            <div><i>🪑</i><b>O 목적어</b><small>~을/를</small><em class="cN">명사</em></div>
            <div><i>🪑</i><b>C 보어</b><small>= 설명</small><em><span class="cN">명사</span>·<span class="cA">형용사</span></em></div>
            <div><i>🎀</i><b>M 수식어</b><small>빼도 되는 리본</small><em><span class="cA">형</span>·<span class="cD">부</span></em></div>
          </div>
          <p class="key">품사는 <em>8가지</em>, 문장 성분은 <em>5가지</em>!</p>`,
      },
      {
        h: '의자에 앉혀 보기',
        body: `<div class="seat"><span><b>Music</b><small>명사</small><em>S</em></span><span><b>makes</b><small>동사</small><em>V</em></span><span><b>me</b><small>대명사</small><em>O</em></span><span><b>happy</b><small>형용사</small><em>C</em></span></div>
          <p class="big">같은 명사 music도 앉는 의자에 따라 S → O → C로 바뀐다</p>
          <ul class="lst"><li><b>Music</b> is fun. → 주어 S</li><li>I love <b>music</b>. → 목적어 O</li><li>My hobby is <b>music</b>. → 보어 C</li></ul>
          <div class="rule"><b>보어 vs 목적어</b> "=" 를 넣어 보자! She = a doctor → 보어 C / She ≠ a book → 목적어 O<br>⚠ 보어 자리엔 <em>명사·형용사만</em>! She is happy ⭕ / She is happily ❌</div>`,
      },
      {
        h: '뼈대 찾기 — 동사부터!',
        body: `<ol class="steps"><li><b>동사(V)</b>부터 찾기 — 문장의 심장</li><li>동사 앞 = <b>주어(S)</b></li><li>동사 뒤 = <b>O</b> 또는 <b>C</b></li><li>나머지 = <b>수식어(M)</b> → ( ) &lt; &gt; 로 묶기</li></ol>
          <div class="ex">${D('Yesterday')} ${N('my brother')} ${A('in Seoul')} ${V('called')} ${N('me')} ${D('at midnight')}.</div>
          <p class="tr">리본(수식어)을 걷어내면 뼈대: <b>brother called me</b> (S V O)</p>
          <table class="tb small"><tr><th>뼈대</th><th>예문</th></tr><tr><td>S V</td><td>Birds sing.</td></tr><tr><td>S V C</td><td>She is happy.</td></tr><tr><td>S V O</td><td>I love music.</td></tr><tr><td>S V O O</td><td>Mom gave me a gift.</td></tr><tr><td>S V O C</td><td>The news made me happy.</td></tr></table>`,
      },
    ],
    ox: [
      { q: '문장 성분은 5가지, 품사는 8가지다.', a: true, why: '성분: 주어·서술어(동사)·목적어·보어·수식어 / 품사: 8품사' },
      { q: '보어 자리에 <b>부사</b>가 앉을 수 있다.', a: false, why: '보어 자리엔 명사·형용사만! She is happy ⭕ / happily ❌' },
      { q: 'She is <b>happy</b>. 의 happy는 보어(C)다.', a: true, why: 'She = happy, 주어를 설명하는 자리 → 보어 C' },
    ],
  },
  {
    no: 4, title: '관사와 기타', sub: 'a / an / the — 작지만 꼭!', color: '#E4801A',
    pages: [
      {
        h: '관사는 형용사!',
        body: `<p class="big">관사 = 명사 앞에서 명사를 꾸미는 <em>가장 작은 꾸밈말</em></p>
          <div class="grid2"><div class="box"><h4>a / an = 하나의, 어떤</h4><ul><li>처음 말하는 셀 수 있는 <b>단수</b> 명사 앞</li><li>첫 <em>소리</em>가 모음 → <b>an</b> apple, <b>an</b> hour</li><li>첫 소리가 자음 → <b>a</b> university</li></ul></div>
            <div class="box"><h4>the = 그 (바로 그것)</h4><ul><li>앞에서 말한 것: I have a dog. <b>The</b> dog is cute.</li><li>서로 아는 것: Close <b>the</b> door.</li><li>하나뿐: <b>the</b> sun, <b>the</b> moon</li></ul></div></div>
          <p class="note">💡 형용사가 붙으면 형용사 소리로: <b>an</b> old car / <b>a</b> big apple</p>`,
      },
      {
        h: 'the ✔ vs 관사 없음 ✘',
        body: `<table class="tb"><tr><th></th><th>the</th><th>관사 없음 (X)</th></tr>
            <tr><td>play</td><td>play <b>the</b> piano (악기)</td><td>play soccer (운동)</td></tr>
            <tr><td>장소</td><td>in <b>the</b> park</td><td>go to school / bed</td></tr>
            <tr><td>시간</td><td>in <b>the</b> morning</td><td>at night, on Sunday</td></tr>
            <tr><td>식사·교통</td><td>take <b>the</b> bus</td><td>have breakfast, by bus</td></tr>
            <tr><td>과목</td><td>—</td><td>study math, speak English</td></tr></table>
          <p class="note">💡 go to school = 공부하러(본래 목적) / go to the school = 그 학교 건물에</p>`,
      },
      {
        h: '실수 주의 ⚠',
        body: `<ul class="lst warn"><li><s>my the book</s> → my book / the book <small>소유격·this·that과 관사는 함께 못 써요</small></li>
            <li><s>a water</s>, <s>an information</s> <small>a / an은 셀 수 있는 단수에만!</small></li>
            <li><b>a very tall boy</b> <small>관사는 형용사보다 맨 앞에</small></li></ul>
          <p class="key">한 장 정리: <em>8품사</em>를 덩어리로 묶어 <em>5품사</em>로 보고, 그 덩어리를 <em>5개의 의자</em>(문장 성분)에 앉힌다!</p>
          <div class="ex">${N('The little boy')} ${V('plays')} ${N('the piano')} ${D('after school')}.</div>
          <p class="tr">S(명사구) · V(동사) · O(명사구) · M(부사구)</p>`,
      },
    ],
    ox: [
      { q: '<b>an hour</b> 는 맞는 표현이다.', a: true, why: 'hour는 h가 소리 나지 않아 첫 소리가 모음 [아우어] → an!' },
      { q: '<b>play the soccer</b> 가 맞다.', a: false, why: '운동 앞엔 관사 없음 → play soccer / 악기는 play the piano' },
      { q: '<b>a water</b> 처럼 셀 수 없는 명사에도 a를 쓴다.', a: false, why: 'a / an은 셀 수 있는 단수에만! → some water' },
    ],
  },
];

/** 학습 화면을 띄운다 → Promise<{ correct, total }> */
export function runStudy({ sfx = () => {} } = {}) {
  return new Promise((resolve) => {
    // 페이지 목록: [표지] + 챕터마다 (챕터 표지, 내용들, OX들) + [끝]
    const pages = [{ kind: 'cover' }];
    CHAPTERS.forEach((ch) => {
      pages.push({ kind: 'chapter', ch });
      ch.pages.forEach((p) => pages.push({ kind: 'page', ch, p }));
      ch.ox.forEach((q, k) => pages.push({ kind: 'ox', ch, q, k }));
    });
    pages.push({ kind: 'end' });
    const answers = new Map(); // ox page index → true/false (맞혔는지)
    const oxTotal = pages.filter((p) => p.kind === 'ox').length;
    let i = 0;

    const ov = document.createElement('div');
    ov.className = 'study';
    document.body.appendChild(ov);

    const correct = () => [...answers.values()].filter(Boolean).length;
    function draw() {
      const P = pages[i];
      const ch = P.ch;
      const dots = CHAPTERS.map((c) => `<span class="${ch && c.no === ch.no ? 'on' : ''}" style="--cc:${c.color}">${c.no}</span>`).join('');
      let inner = '';
      if (P.kind === 'cover') {
        inner = `<div class="cover"><div class="kick">CHUNK QUEST · 품사 원정대</div><h1>출발 전<br>개념 학습</h1>
          <ol class="toc">${CHAPTERS.map((c) => `<li style="--cc:${c.color}"><b>CHAPTER ${c.no}</b> ${c.title}<small>${c.sub}</small></li>`).join('')}</ol>
          <p class="note">한 장씩 넘기며 읽고, 챕터 끝 <b>OX 퀴즈</b>로 확인해요!</p></div>`;
      } else if (P.kind === 'chapter') {
        inner = `<div class="chap" style="--cc:${ch.color}"><div class="cno">CHAPTER ${ch.no}</div><h2>${ch.title}</h2><p>${ch.sub}</p></div>`;
      } else if (P.kind === 'page') {
        inner = `<div class="pg" style="--cc:${ch.color}"><h3><span>CH${ch.no}</span>${P.p.h}</h3>${P.p.body}</div>`;
      } else if (P.kind === 'ox') {
        const done = answers.has(i);
        const picked = P.picked;
        inner = `<div class="oxq" style="--cc:${ch.color}"><div class="cno">CHAPTER ${ch.no} · OX 퀴즈 ${P.k + 1}/${ch.ox.length}</div>
          <p class="q">${P.q.q}</p>
          <div class="oxb"><button class="o ${done && P.q.a ? 'right' : ''} ${done && picked === true && !P.q.a ? 'wrong' : ''}" data-v="1" ${done ? 'disabled' : ''}>O</button>
            <button class="x ${done && !P.q.a ? 'right' : ''} ${done && picked === false && P.q.a ? 'wrong' : ''}" data-v="0" ${done ? 'disabled' : ''}>X</button></div>
          ${done ? `<div class="fb ${answers.get(i) ? 'ok' : 'no'}"><b>${answers.get(i) ? '정답! 👏' : '아쉬워요!'}</b> 정답은 <b>${P.q.a ? 'O' : 'X'}</b><p>💡 ${P.q.why}</p></div>` : ''}</div>`;
      } else {
        inner = `<div class="cover end"><div class="kick">학습 완료!</div><h1>OX <b>${correct()}</b> / ${oxTotal}</h1>
          <p class="key">8품사 → <em>5품사</em> 덩어리 → <em>5개의 의자</em>(문장 성분)</p>
          <p class="note">이제 원정을 떠나 볼까요? 게임 속 문제에서 오늘 배운 걸 써 먹어요!</p></div>`;
      }
      const isOx = P.kind === 'ox';
      const locked = isOx && !answers.has(i);
      ov.innerHTML = `<div class="sbar"><button class="close" id="stX">✕ 그만하기</button><div class="dots">${dots}</div><span class="pn">${i + 1}/${pages.length}</span></div>
        <div class="scard">${inner}</div>
        <div class="snav"><button class="ghost" id="stPrev" ${i === 0 ? 'disabled' : ''}>◀ 이전</button>
          <button class="primary" id="stNext" ${locked ? 'disabled' : ''}>${P.kind === 'end' ? '게임 시작! ▶' : locked ? 'O / X를 골라요' : '다음 ▶'}</button></div>`;
      ov.querySelector('#stX').onclick = finish;
      ov.querySelector('#stPrev').onclick = () => { if (i > 0) { i--; sfx('tap'); draw(); } };
      ov.querySelector('#stNext').onclick = () => { if (P.kind === 'end') return finish(); if (i < pages.length - 1) { i++; sfx('tap'); draw(); } };
      ov.querySelectorAll('.oxb button').forEach((b) => {
        b.onclick = () => {
          const v = b.dataset.v === '1';
          P.picked = v;
          const ok = v === P.q.a;
          answers.set(i, ok);
          sfx(ok ? 'ok' : 'no');
          draw();
        };
      });
      ov.querySelector('.scard').scrollTop = 0;
    }
    // 옆으로 쓸어 넘기기
    let sx = null;
    ov.addEventListener('pointerdown', (e) => { sx = e.clientX; });
    ov.addEventListener('pointerup', (e) => {
      if (sx === null) return;
      const dx = e.clientX - sx; sx = null;
      if (Math.abs(dx) < 70 || e.target.closest('button')) return;
      const P = pages[i];
      if (dx < 0 && !(P.kind === 'ox' && !answers.has(i)) && i < pages.length - 1) { i++; draw(); } else if (dx > 0 && i > 0) { i--; draw(); }
    });
    function finish() { ov.remove(); resolve({ correct: correct(), total: oxTotal }); }
    draw();
  });
}

/** "먼저 학습할까요?" 큰 질문 창 → Promise<boolean> */
export function askStudy() {
  return new Promise((resolve) => {
    const ov = document.createElement('div');
    ov.className = 'study-ask';
    ov.innerHTML = `<div class="sa-card"><div class="sa-ico">📚</div><h2>출발 전 개념 학습<br><em>먼저 학습할까요?</em></h2>
      <p>품사 · 5품사 청크 · 문장 성분 · 관사<br>4챕터를 넘기며 보고 <b>OX 퀴즈</b>로 확인해요 (약 5분)</p>
      <div class="sa-btns"><button class="primary big" id="saYes">네, 학습할래요!</button><button class="ghost big" id="saNo">아니오, 바로 게임!</button></div></div>`;
    document.body.appendChild(ov);
    ov.querySelector('#saYes').onclick = () => { ov.remove(); resolve(true); };
    ov.querySelector('#saNo').onclick = () => { ov.remove(); resolve(false); };
  });
}
