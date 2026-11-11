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

// 교재 순서 그대로: 1 8품사(단어의 이름) → 2 5품사로 묶기(덩어리) → 3 문장 성분(자리) → 4 관사(명사 앞 꾸밈말)
// 각 챕터 표지에 "왜 이 단계?"와 로드맵을 보여 줘서, 앞 단계가 다음 단계의 재료가 된다는 걸 느끼게 한다.
const ROAD = [
  { t: '8품사', s: '단어의 이름표' },
  { t: '5품사로 묶기', s: '의미 덩어리' },
  { t: '문장 성분', s: '덩어리의 자리' },
  { t: '관사', s: '명사 앞 꾸밈말' },
];

const CHAPTERS = [
  {
    no: 1, title: '8품사', sub: '영어 단어의 여덟 가지 무리', color: '#C8372D',
    why: `영어 문장은 단어라는 벽돌로 지은 집이에요.<br>집을 읽으려면 먼저 <em>벽돌 하나하나가 무슨 일을 하는지</em> 알아야 하죠.<br>그 이름표가 바로 <b>품사</b>!`,
    pages: [
      {
        h: '품사란? — 여덟 가지 무리',
        body: `<p class="big">품사 = 단어가 문장에서 <em>하는 일</em>에 따라 나눈 무리</p>
          <p class="lead">영어 단어는 모두 8개의 품사 중 하나에 속해요.</p>
          <table class="tb pos8">
            <tr class="grp"><td colspan="3">뼈대 4품사 — 문장의 몸통</td></tr>
            <tr><td><b class="cN">명사</b><small>noun</small></td><td>사람·사물·생각의 <b>이름</b></td><td>Tom, apple, love</td></tr>
            <tr><td><b class="cV">동사</b><small>verb</small></td><td>동작·상태<br>(~하다, ~이다)</td><td>run, eat, is</td></tr>
            <tr><td><b class="cA">형용사</b><small>adjective</small></td><td><b>명사</b>를 꾸미거나 설명</td><td>tall, happy, red</td></tr>
            <tr><td><b class="cD">부사</b><small>adverb</small></td><td><b>동사·형용사·문장</b>을 꾸밈</td><td>quickly, very, always</td></tr>
            <tr class="grp sub"><td colspan="3">도우미 4품사 — 뼈대를 돕는 작은 무리</td></tr>
            <tr><td><b>대명사</b><small>pronoun</small></td><td>명사를 대신하는 말</td><td>I, she, it, them</td></tr>
            <tr><td><b>전치사</b><small>preposition</small></td><td>명사 앞에서 위치·시간·방향</td><td>in, on, at, for</td></tr>
            <tr><td><b class="cC">접속사</b><small>conjunction</small></td><td>말과 말을 연결</td><td>and, but, because</td></tr>
            <tr><td><b>감탄사</b><small>interjection</small></td><td>감정을 표현</td><td>wow, oops, ouch</td></tr>
          </table>`,
      },
      {
        h: '사전 속 단어, 품사별 크기',
        body: `<p class="lead">옥스퍼드 영어사전 약 17만 개 단어를 품사별로 세어 보면…</p>
          <div class="bars">
            <div><span class="cN">명사</span><i style="--w:52%;--c:#C8372D">52%</i><small>약 89,000개</small></div>
            <div><span class="cA">형용사</span><i style="--w:25%;--c:#E4801A">25%</i><small>약 43,000개</small></div>
            <div><span class="cV">동사</span><i style="--w:14%;--c:#1F5FB8">14%</i><small>약 24,000개</small></div>
            <div><span class="cD">부사</span><i style="--w:9%;--c:#6A3FA0">9%</i><small>약 15,000개</small></div>
            <div><span>나머지 4</span><i style="--w:1%;--c:#9A90B5"></i><small>다 합쳐도 수백 개</small></div>
          </div>
          <p class="key">명사·형용사·동사·부사<br>= 사전 단어의 <em>99% 이상!</em></p>
          <p class="big c">→ 영어의 몸통은 바로 <em>명·동·형·부</em></p>
          <div class="note">💡 <b>한 단어가 두 품사</b>로 쓰이기도 해요 — 하는 일이 바뀌면 품사도 바뀐다!<br>
            a <u>fast</u> car <b class="cA">형</b> / He runs <u>fast</u>. <b class="cD">부</b> &nbsp;·&nbsp; a home <u>run</u> <b class="cN">명</b> / I <u>run</u>. <b class="cV">동</b></div>
          <div class="note">★ 관사 <b>a, an, the</b>는 8품사에서 <b class="cA">형용사</b>로 봐요. (Chapter 4)</div>`,
      },
      {
        h: '뼈대 4품사 vs 도우미 4품사',
        body: `<p class="lead">두 무리는 <em>하는 일이 완전히 달라요!</em></p>
          <div class="four">
            <div><b class="sym cN">○</b><b class="cN">명사</b><small>누가 · 무엇이 · 무엇을</small></div>
            <div><b class="sym cV">□</b><b class="cV">동사</b><small>~한다 · ~이다</small></div>
            <div><b class="sym cA">( )</b><b class="cA">형용사</b><small>명사를 꾸미고 설명</small></div>
            <div><b class="sym cD">&lt; &gt;</b><b class="cD">부사</b><small>동사·형용사·문장을 꾸밈</small></div>
          </div>
          <ul class="helpers">
            <li><b>대명사</b> 명사 대신 → <em>명사로 취급</em> ○</li>
            <li><b>전치사</b> 명사 앞에 붙어 (형용사)·&lt;부사&gt; <em>덩어리를 만듦</em></li>
            <li><b class="cC">접속사 △</b> 말과 말, 문장과 문장을 잇는다</li>
            <li><b>감탄사</b> 감정 표현 (문장 밖) → 분석에서 빠짐</li>
          </ul>
          <p class="key">문장은 <em>뼈대 4품사</em>로 세우고,<br>도우미 4품사는 뼈대에 붙어서 일한다!</p>
          <p class="bridge">그래서 문장을 읽을 땐 <b>명·동·형·부 + 접속사</b>, 다섯 가지만 보면 된다 → <b>Chapter 2</b></p>`,
      },
      {
        h: '헷갈리는 단어, 하는 일로 구별!',
        body: `<p class="lead">생김새·뜻이 비슷해도 <em>하는 일</em>이 다르면 품사가 달라요.</p>
          <table class="tb">
            <tr><th>단어</th><th>뜻</th><th>품사</th><th>왜?</th></tr>
            <tr><td><b>because</b></td><td>~ 때문에</td><td class="cC"><b>접</b></td><td>뒤에 <b>주어+동사</b>(문장)</td></tr>
            <tr><td><b>because of</b></td><td>~ 때문에</td><td><b>전</b></td><td>뒤에 <b>명사</b></td></tr>
            <tr><td><b>although</b></td><td>비록 ~지만</td><td class="cC"><b>접</b></td><td>문장과 문장 연결</td></tr>
            <tr><td><b>however</b></td><td>그러나</td><td class="cD"><b>부</b></td><td>문장 전체를 꾸밈</td></tr>
            <tr><td><b>in addition to</b></td><td>~에 더하여</td><td><b>전</b></td><td>여러 단어지만 한 전치사</td></tr>
            <tr><td><b>us / them</b></td><td>우리를 / 그들을</td><td><b>대</b></td><td>명사 대신</td></tr>
          </table>
          <div class="note">💡 꼬리로도 힌트를 얻어요: happi<b>ness</b>·excite<b>ment</b>·friend<b>ship</b> = <b class="cN">명</b> / beauti<b>ful</b>·delici<b>ous</b> = <b class="cA">형</b> / slow<b>ly</b>·quick<b>ly</b> = <b class="cD">부</b></div>`,
      },
      {
        h: '동사의 이해 — 멈춰 있는 vs 움직이는',
        body: `<p class="lead">동사는 4품사 중 <em>가장 많이 변하고 가장 복잡한</em> 품사예요. 시제·의문문·부정문 모두 동사가 바뀌어서 만들어지죠.</p>
          <p class="key">영어의 동사는 딱 두 종류<br><em>멈춰 있는 be동사</em> vs <em>움직이는 일반동사</em></p>
          <div class="grid2">
            <div class="box be"><h4>be동사 = 멈춰 있는 말<small>am · is · are · was · were</small></h4>
              <ul><li>동작이 없다 — <b>상태</b>만 이어 준다</li><li>진짜 뜻은 뒤의 <b>형용사·명사</b>가 전달</li><li>"~이다, ~(하)다, ~에 있다"</li></ul>
              <div class="ex sm">${N('She')} ${V('is')} ${A('tired')}.</div><small>뜻은 tired가!</small></div>
            <div class="box gen"><h4>일반동사 = 움직이는 말<small>run · eat · study · like · have …</small></h4>
              <ul><li>동사 <b>자체에 동작·의미</b>가 있다</li><li>동사 하나만 봐도 무엇을 하는지 안다</li><li>좋아하다·가지다·알다도 일반동사!</li></ul>
              <div class="ex sm">${N('She')} ${V('works')} ${D('hard')}.</div><small>뜻은 works가!</small></div>
          </div>`,
      },
      {
        h: '가벼운 컵 vs 무거운 컵 — 의문문·부정문',
        body: `<p class="lead">빈 컵은 앞으로 쏙, <b>not</b>은 빈 컵에 퐁당!</p>
          <div class="grid2 cups">
            <div class="box be"><h4>be동사 = 가볍고 텅 빈 컵</h4>
              <p>긍정 She <b class="cup">is</b> tired.</p>
              <p>의문 <b class="cup">Is</b> she tired? <small>가벼우니까 쏙 앞으로!</small></p>
              <p>부정 She <b class="cup">is not</b> tired. <small>빈 컵에 not을 담는다</small></p></div>
            <div class="box gen"><h4>일반동사 = 뜻이 꽉 찬 무거운 컵</h4>
              <p>긍정 She <b class="cup full">works</b> hard.</p>
              <p>의문 <b class="cup">Does</b> she <b class="cup full">work</b> hard? <small>무거워서 못 움직임 → 빈 컵 Does를 앞에 (-s는 Does가 가져감)</small></p>
              <p>부정 She <b class="cup">does not</b> <b class="cup full">work</b> hard. <small>빈 컵을 데려와 not을 담는다</small></p></div>
          </div>
          <table class="tb left"><tr><th colspan="2">영작 — 컵을 먼저 고르자!</th></tr>
            <tr><td>너는 지금 배고프니?</td><td><b>Are</b> you hungry now?</td></tr>
            <tr><td>그는 축구를 하지 않는다.</td><td>He <b>doesn't</b> play soccer.</td></tr>
            <tr><td>그 영화는 재미있지 않았다.</td><td>The movie <b>wasn't</b> interesting.</td></tr>
            <tr><td>너의 언니는 피아노를 치니?</td><td><b>Does</b> your sister play the piano?</td></tr></table>`,
      },
    ],
    ox: [
      { q: '명사·형용사·동사·부사가 사전 단어의 <b>99% 이상</b>이다.', a: true, why: '나머지 4품사(대·전·접·감)는 다 합쳐도 수백 개! 영어의 몸통은 <b>명·동·형·부</b>' },
      { q: '<b>however</b>(그러나)는 접속사다.', a: false, why: 'however는 문장 전체를 꾸미는 <b>부사</b>! 접속사는 but, although' },
      { q: '<b>because of</b> 뒤에는 명사가 온다.', a: true, why: 'because of는 <b>전치사</b> → 뒤에 명사 / because는 접속사 → 뒤에 주어+동사' },
      { q: '<b>Does</b> she <b>works</b> hard? 가 맞는 문장이다.', a: false, why: '-s는 빈 컵 Does가 가져가요 → Does she <b>work</b> hard?' },
    ],
  },
  {
    no: 2, title: '5품사로 묶기', sub: '최대한 크게, 의미 덩어리로!', color: '#1F5FB8',
    why: `8품사는 <b>단어 하나하나</b>의 이름이에요. 그런데 문장을 단어 하나씩 보면 너무 잘게 쪼개져 느리고 복잡해요.<br>문장을 세우는 건 <em>뼈대 4품사</em>뿐이니까,<br><em>의미 덩어리(청크)</em>로 크게 묶어 <b>명·동·형·부 + 접속사</b> 다섯 가지로만 봅니다!`,
    pages: [
      {
        h: '같은 문장, 다른 눈',
        body: `<div class="vs">
            <div class="v8"><h4>8품사식 <small>단어 하나씩 → 복잡!</small></h4>
              <div class="ex">${A('The')} ${A('cute')} ${A('little')} ${N('puppy')} ${V('sleeps')} ${D('very')} ${D('quietly')} ${D('on the soft sofa')}.</div></div>
            <div class="v5"><h4>5품사 분석법 <small>의미 덩어리로 크게!</small></h4>
              <div class="ex">${N('The cute little puppy')} ${V('sleeps')} ${D('very quietly')} ${D('on the soft sofa')}.</div>
              <p class="tr">귀여운 작은 강아지가 / 잔다 / 아주 조용히 / 푹신한 소파 위에서</p></div>
          </div>
          <p class="key">덩어리 <em>4개</em>만 순서대로 읽으면 끝!</p>
          <div class="rule"><b>왜 크게 묶을까?</b><br><b>앞 꾸밈</b>은 우리말과 순서가 같아서 묶어도 바로 읽혀요. (귀여운 작은 강아지)<br><b>뒤 꾸밈</b>만 우리말과 순서가 달라서 따로 표시해 눈에 띄게!</div>
          <p class="bridge">8품사를 배울 때는 <b>한 단어씩</b>, 문장을 읽을 때는 <b>5품사로 크게!</b></p>`,
      },
      {
        h: '5품사 기호와 묶는 법칙',
        body: `<div class="five">
            <div><b class="sym cN">○</b><b class="cN">명사</b></div>
            <div><b class="sym cV">□</b><b class="cV">동사</b></div>
            <div><b class="sym cA">( )</b><b class="cA">형용사</b></div>
            <div><b class="sym cD">&lt; &gt;</b><b class="cD">부사</b></div>
            <div><b class="sym cC">△</b><b class="cC">접속사</b></div>
          </div>
          <ol class="rules">
            <li><b>명사 앞의 꾸밈말</b>(관사·소유격·형용사)은 <em>명사와 함께 큰 ○</em><small>우리말과 순서가 같으니 한 덩어리!</small><div class="ex sm">${N('the cute little puppy')}</div></li>
            <li><b>형용사 앞의 부사</b>는 형용사와 함께 ( ), <b>부사 앞의 부사</b>는 함께 &lt; &gt;<small>돕는 말은 도움받는 말과 합친다</small><div class="ex sm">${N('She')} ${V('is')} ${A('really kind')}. ${N('He')} ${V('runs')} ${D('very fast')}.</div></li>
            <li><b>명사 뒤</b>에서 꾸미는 형용사 덩어리만 <em>따로 ( )</em><small>우리말과 순서가 반대 → 눈에 띄게 표시!</small><div class="ex sm">${N('The book')} ${A('on the desk')} ${V('is')} ${N('mine')}.</div></li>
            <li><b>보어 자리</b>의 형용사는 ( )<small>주어를 설명하는 말</small><div class="ex sm">${N('The soup')} ${V('smells')} ${A('very good')}.</div></li>
            <li>문장과 문장을 잇는 <b>접속사는 △</b><div class="ex sm">${N('I')} ${V('was')} ${A('tired')}, ${C('but')} ${N('I')} ${V('finished')} ${N('my homework')}.</div></li>
          </ol>`,
      },
      {
        h: '단어 → 구 → 절 : 품사는 "덩어리"에도 붙는다',
        body: `<p class="lead">명사·형용사·부사는 <b>단어</b>로도, <b>구</b>로도, <b>절</b>로도 나타나요. 동사는 단어와 구까지만 — <em>절은 없어요!</em></p>
          <table class="tb wgc"><tr><th></th><th>단어</th><th>구</th><th>절</th></tr>
            <tr><td><b class="cN">명사 ○</b></td><td>Jane</td><td>her phone number</td><td>that she likes me</td></tr>
            <tr><td><b class="cV">동사 □</b></td><td>run · eat · is</td><td>take care of · look for</td><td class="no">✕ 없음</td></tr>
            <tr><td><b class="cA">형용사 ( )</b></td><td>new</td><td>on the desk</td><td>which I bought</td></tr>
            <tr><td><b class="cD">부사 &lt; &gt;</b></td><td>late</td><td>after dinner</td><td>because he was sick</td></tr></table>
          <div class="grid2">
            <div class="box"><h4>구 (phrase)</h4><p>두 단어 이상이 모여 <b>한 품사처럼</b> 일하는 덩어리<br><em>주어 + 동사가 없다</em></p></div>
            <div class="box"><h4>절 (clause)</h4><p><em>주어 + 동사가 들어 있는</em> 덩어리<br>접속사(△)가 앞에서 이끈다</p></div>
          </div>
          <p class="key">품사는 단어 하나하나가 아니라<br><em>"덩어리(청크)"</em>로 나눠 본다!</p>
          <p class="note">Quick Check — quickly <b>단어</b> · in the park <b>구</b> · because it rained <b>절</b> · to eat lunch <b>구</b> · playing games <b>구</b> · when I was young <b>절</b></p>`,
      },
      {
        h: '전치사 + 명사 = 형용사구 또는 부사구!',
        body: `<p class="lead">"전명구"라는 이름보다 <em>(형용사구)</em>인지 <em>&lt;부사구&gt;</em>인지, <b>역할</b>이 중요해요.</p>
          <div class="pp">
            <div class="pa"><div class="ex sm">The ${N('book')} ${A('on the desk')} is mine.</div><p>명사 <b>book</b>을 꾸밈 → <b class="cA">형용사구 ( )</b></p></div>
            <div class="pd"><div class="ex sm">I ${V('put')} the book ${D('on the desk')}.</div><p>동사 <b>put</b>을 꾸밈 → <b class="cD">부사구 &lt; &gt;</b></p></div>
          </div>
          <p class="key">판별 비법<br>꾸미는 말이 <em>명사</em> → ( 형용사구 )<br>꾸미는 말이 <em>동사·형용사·문장</em> → &lt; 부사구 &gt;</p>
          <h4 class="mini">구는 명사 · 형용사 · 부사 역할을 한다</h4>
          <table class="tb left">
            <tr><td><b class="cN">명사 ○</b><small>~하는 것</small></td><td>${N('To swim in the sea')} ${V('is')} ${A('fun')}.<br>${N('Swimming in the sea')} ${V('is')} ${A('fun')}.</td></tr>
            <tr><td><b class="cA">형용사 ( )</b><small>~할</small></td><td>${N('I')} ${V('need')} ${N('some water')} ${A('to drink')}.</td></tr>
            <tr><td><b class="cD">부사 &lt; &gt;</b><small>~하려고</small></td><td>${N('I')} ${V('went')} ${D('to the store')} ${D('to buy milk')}.</td></tr></table>
          <p class="bridge">★ 덩어리가 길어져도 하는 일은 똑같다 — <b>명사 자리면 명사, 꾸미면 형용사·부사!</b></p>`,
      },
      {
        h: '실전! 5품사로 문장 읽기',
        body: `<p class="lead">최대한 큰 덩어리로 묶고, <b>덩어리 순서대로</b> 해석해요.</p>
          <div class="read">
            <div class="ex">${D('Every morning')}, ${N('my mom')} ${V('waters')} ${N('the plants')}.</div><p class="tr">매일 아침 / 엄마는 / 물을 준다 / 식물들에게</p>
            <div class="ex">${N('He')} ${V('plays')} ${N('computer games')} ${D('all day long')} ${D('because they are fun')}.</div><p class="tr">그는 / 한다 / 컴퓨터 게임을 / 하루 종일 / 재미있어서</p>
            <div class="ex">${D('When it snows')}, ${N('we')} ${V('build')} ${N('a big snowman')} ${D('in the yard')}.</div><p class="tr">눈이 오면 / 우리는 / 만든다 / 큰 눈사람을 / 마당에</p>
            <div class="ex">${N('The new student')} ${A('from Canada')} ${V('speaks')} ${N('Korean')} ${D('very well')}.</div><p class="tr">새 학생은 (캐나다에서 온) / 말한다 / 한국어를 / 아주 잘</p>
            <div class="ex">${N('I')} ${V('think')} ${N('that English is fun')}.</div><p class="tr">나는 / 생각한다 / 영어가 재미있다고</p>
          </div>`,
      },
    ],
    ox: [
      { q: '<b>the cute little puppy</b>는 통째로 큰 ○ 하나로 묶는다.', a: true, why: '명사 앞 꾸밈말(관사·형용사)은 우리말과 순서가 같아 <b>명사와 함께 큰 ○</b>!' },
      { q: '<b>because it rained</b>는 구(phrase)다.', a: false, why: '주어 it + 동사 rained가 있으니 <b>절</b>! (주어+동사가 있으면 절)' },
      { q: 'The book <b>on the desk</b> is mine. 의 on the desk는 부사구다.', a: false, why: '명사 book을 뒤에서 꾸미니까 <b>( 형용사구 )</b>! put the book &lt;on the desk&gt;일 때가 부사구' },
      { q: '동사는 <b>절</b>이 될 수 없다.', a: true, why: '명·형·부는 단어·구·절 모두 되지만, 동사는 단어와 구(take care of)까지만!' },
    ],
  },
  {
    no: 3, title: '문장 성분', sub: '품사가 앉는 "자리"', color: '#2E8B57',
    why: `덩어리를 찾았다면, 이제 그 덩어리가 문장 속 <em>어느 자리에 앉았는지</em> 볼 차례!<br>자리를 알면 <b>누가 / 한다 / 무엇을</b>이 한눈에 보이고,<br>해석도 영작도 정확해져요.`,
    pages: [
      {
        h: '품사는 "신분", 문장 성분은 "자리"',
        body: `<p class="big c">품사 = 단어의 <em>신분</em> · 문장 성분 = 문장 속 <em>자리(역할)</em></p>
          <p class="note c">반장(신분)이 오늘은 발표자(역할)가 될 수도, 청중이 될 수도 있는 것처럼!</p>
          <p class="lead c">문장 성분은 <b>의자</b>, 품사는 그 의자에 앉는 <b>사람</b></p>
          <div class="chairs">
            <div><i>🪑</i><b>S</b><small>주어</small><em class="cN">명사</em></div>
            <div><i>🪑</i><b>V</b><small>서술어</small><em class="cV">동사</em></div>
            <div><i>🪑</i><b>O</b><small>목적어</small><em class="cN">명사</em></div>
            <div><i>🪑</i><b>C</b><small>보어</small><em><span class="cN">명사</span><br><span class="cA">형용사</span></em></div>
            <div class="m"><i>🎀</i><b>M</b><small>수식어</small><em><span class="cA">형</span>·<span class="cD">부</span></em></div>
          </div>
          <p class="note">S·O 의자엔 명사 무리(대명사·명사구·명사절)가 앉아요. <b class="cD">&lt;부사&gt;</b>는 보통 문장 맨 뒤로! (목적어·보어 뒤)</p>
          <p class="key">의자(S·V·O·C) = <em>꼭 필요한 뼈대</em><br>리본(M 수식어) = <em>빼도 되는 장식</em></p>`,
      },
      {
        h: '의자에 앉혀 보기',
        body: `<p class="lead c">품사마다 앉는 의자(자리)가 정해져 있어요!</p>
          <div class="seat"><span><b class="cN">Music</b><small>명사</small><em>S</em></span><span><b class="cV">makes</b><small>동사</small><em>V</em></span><span><b class="cN">me</b><small>대명사</small><em>O</em></span><span><b class="cA">happy.</b><small>형용사</small><em>C</em></span></div>
          <ul class="lst"><li><b class="cN">명사</b> → S · O · C 의자</li><li><b class="cV">동사</b> → V 의자</li><li><b class="cA">형용사</b> → C 의자 (또는 리본 M)</li></ul>
          <p class="key">자리를 바꿔 앉을 수 없어요!</p>
          <h4 class="mini">리본(M)은 어디에? — 길이로 정해진다</h4>
          <div class="grid2">
            <div class="box"><h4>작은 리본 <small>짧은 꾸밈말 → 앞에</small></h4><p>${A('the cute')} puppy<br>She ${D('always')} plays. <small>(빈도부사)</small></p></div>
            <div class="box"><h4>큰 리본 <small>긴 꾸밈말 → 뒤에</small></h4><p>the puppy ${A('on the sofa')}<br>She plays ${D('in the park')}.</p></div>
          </div>`,
      },
      {
        h: '보어 vs 목적어 — "=" 를 넣어 보자',
        body: `<div class="grid2">
            <div class="box"><h4 class="cA">보어 C <small>주어 = 보어</small></h4>
              <div class="ex sm">${N('She')} ${V('is')} ${N('a doctor')}.</div><p>She = a doctor → <b>보어</b></p>
              <p>She is <b>happy</b>. ⭕<br>She is <s>happily</s>. ❌</p>
              <p class="warn">보어 자리엔 <em>명사·형용사만!</em><br>부사는 못 앉아요.</p></div>
            <div class="box"><h4 class="cN">목적어 O <small>주어 ≠ 목적어</small></h4>
              <div class="ex sm">${N('She')} ${V('met')} ${N('a doctor')}.</div><p>She ≠ a doctor → <b>목적어</b> (누구를?)</p>
              <p>I love <b>music</b>.<br>She ate <b>an apple</b>.</p>
              <p class="warn">목적어 자리엔 <em>명사·대명사</em><br>(명사구·명사절도)!</p></div>
          </div>
          <p class="key">같은 a doctor라도<br><em>주어와 같으면 보어</em>, <em>다르면 목적어</em>!</p>`,
      },
      {
        h: '성분 찾기 4단계 — 동사부터 찾아라!',
        body: `<ol class="steps4">
            <li><b>STEP 1</b> 동사(V) 찾기<small>문장의 심장부터!</small></li>
            <li><b>STEP 2</b> 동사 앞 = 주어(S)<small>누가 / 무엇이?</small></li>
            <li><b>STEP 3</b> 동사 뒤 = O 또는 C<small>누구를·무엇을? → O · 주어 설명 → C</small></li>
            <li><b>STEP 4</b> 나머지 = 수식어(M)<small>( ) &lt; &gt; 로 묶기</small></li>
          </ol>
          <div class="ex">${D('Yesterday')} ${N('my brother')} ${A('in Seoul')} ${V('called')} ${N('me')} ${D('at midnight')}.</div>
          <p class="tr">V: called → S: my brother → O: me → 나머지는 M ⇒ 뼈대: <b>brother called me</b></p>
          <table class="tb left"><tr><th colspan="2">Try — 수식어(M)를 걷어 내면 뼈대가 보인다</th></tr>
            <tr><td>The little girl happily ate a big sandwich at lunch.</td><td><b>girl ate sandwich</b><br>S V O</td></tr>
            <tr><td>My grandmother in Busan is always kind to everyone.</td><td><b>grandmother is kind</b><br>S V C</td></tr>
            <tr><td>The soup on the table smells really good.</td><td><b>soup smells good</b><br>S V C</td></tr>
            <tr><td>My brother became a famous singer last year.</td><td><b>brother became singer</b><br>S V C</td></tr>
            <tr><td>We watched an exciting movie at the theater yesterday.</td><td><b>We watched movie</b><br>S V O</td></tr></table>`,
      },
      {
        h: '품사와 성분, 함께 보기',
        body: `<p class="lead">밑줄 친 덩어리의 <b>신분(품사)</b>과 <b>자리(성분)</b>를 함께 말해 봐요.</p>
          <table class="tb ps">
            <tr><th>문장</th><th>품사</th><th>성분</th></tr>
            <tr><td><u>She</u> is a nurse.</td><td>대명사</td><td>S</td></tr>
            <tr><td>She is <u>a nurse</u>.</td><td class="cN">명사</td><td>C</td></tr>
            <tr><td>She looks <u>tired</u>.</td><td class="cA">형용사</td><td>C</td></tr>
            <tr><td>She <u>helps</u> sick people.</td><td class="cV">동사</td><td>V</td></tr>
            <tr><td>She helps <u>sick people</u>.</td><td class="cN">명사(구)</td><td>O</td></tr>
            <tr><td>She works <u>very hard</u>.</td><td class="cD">부사(구)</td><td>M</td></tr>
            <tr><td>The nurse <u>in the hospital</u> is kind.</td><td class="cA">형용사구</td><td>M</td></tr>
            <tr><td>I know <u>that she is kind</u>.</td><td class="cN">명사절</td><td>O</td></tr>
            <tr><td><u>To learn English</u> is fun.</td><td class="cN">명사구</td><td>S</td></tr>
            <tr><td>I met her <u>when I was sick</u>.</td><td class="cD">부사절</td><td>M</td></tr></table>
          <p class="bridge">같은 She도 품사는 <b>대명사</b>, 자리는 <b>S</b> — 신분과 자리는 따로!</p>`,
      },
    ],
    ox: [
      { q: '품사는 단어의 "신분", 문장 성분은 문장 속 "자리"다.', a: true, why: '반장(신분)이 발표자(역할)도, 청중(역할)도 될 수 있는 것처럼!' },
      { q: 'She is <b>happily</b>. 는 맞는 문장이다.', a: false, why: '보어 자리엔 <b>명사·형용사만</b>! → She is happy.' },
      { q: 'She <b>met</b> a doctor. 의 a doctor는 보어다.', a: false, why: 'She ≠ a doctor → <b>목적어 O</b> (누구를 만났니?) / She is a doctor면 보어' },
      { q: '성분을 찾을 땐 <b>동사(V)</b>부터 찾는다.', a: true, why: 'STEP 1 동사 → 2 앞 = 주어 → 3 뒤 = O/C → 4 나머지 = M' },
    ],
  },
  {
    no: 4, title: '관사', sub: 'a / an / the — 한 장 요약', color: '#E4801A',
    why: `관사는 <b>명사 앞에서 명사를 꾸미는 가장 작은 꾸밈말</b>, 즉 <em>형용사 ( )</em>예요.<br>5품사 분석법에서는 <em>명사와 함께 큰 ○</em> 안에 들어가죠.<br>작지만 매일 쓰고, 시험에 꼭 나와요!`,
    pages: [
      {
        h: '관사 = 명사 앞 가장 작은 꾸밈말',
        body: `<p class="big c">관사는 <em>형용사 ( )</em>! 5품사 분석에서는 <em>명사와 함께 큰 ○</em></p>
          <div class="ex">${N('a tall boy')} ${N('the old house')} ${N('an apple')}</div>
          <div class="art3">
            <div class="aa"><h4>a / an <small>"하나의"</small></h4><ul><li>처음 말하는 셀 수 있는 <b>단수</b></li><li>첫 <b>소리</b>가 모음이면 <b>an</b></li><li><b>an</b> apple, <b>an</b> hour, <b>a</b> uniform</li></ul></div>
            <div class="at"><h4>the <small>"바로 그"</small></h4><ul><li>앞에서 말한 것 · 서로 아는 것</li><li>하나뿐인 것: <b>the</b> sun, <b>the</b> moon</li><li>best · first · only 앞</li></ul></div>
            <div class="ax"><h4>관사 없음 X</h4><ul><li>셀 수 없는 명사: water, love</li><li>운동 · 식사 · 과목 · 언어</li><li>by bus, go to school (본래 목적)</li></ul></div>
          </div>
          <p class="note">💡 an은 철자가 아니라 <b>소리</b>! hour는 h가 소리 나지 않아 [아우어] → <b>an</b> hour / uniform은 [유]로 시작 → <b>a</b> uniform<br>I saw <b>a</b> cat. <b>The</b> cat was black. — 처음엔 a, 다시 말할 땐 the!</p>`,
      },
      {
        h: 'the를 쓴다 vs 아무것도 안 쓴다',
        body: `<p class="lead">시험에 자주 나오는 짝!</p>
          <table class="tb"><tr><th>구분</th><th>the ✔</th><th>관사 X ✘</th></tr>
            <tr><td><b>play + ?</b></td><td>play <b>the</b> piano <small>(악기)</small></td><td>play soccer <small>(운동)</small></td></tr>
            <tr><td><b>장소</b></td><td>in <b>the</b> room,<br>at <b>the</b> station</td><td>at home,<br>go to school / bed</td></tr>
            <tr><td><b>시간</b></td><td>in <b>the</b> morning / evening</td><td>at night, at noon,<br>on Sunday</td></tr>
            <tr><td><b>식사·교통</b></td><td>take <b>the</b> bus <small>("그" 버스)</small></td><td>have lunch, by bus</td></tr>
            <tr><td><b>과목·언어</b></td><td><b>the</b> English book <small>(명사를 꾸밀 때)</small></td><td>study math,<br>speak English</td></tr></table>
          <p class="note">💡 go to school = 공부하러(본래 목적) / go to bed = 자러 → 관사 X</p>`,
      },
      {
        h: '관사가 틀린 곳을 고쳐 보자',
        body: `<p class="lead">카드를 눌러 정답을 확인해요!</p>
          <div class="fix">
            <button><span>I have <s>a</s> umbrella.</span><b>a → <em>an</em></b><small>umbrella는 모음 소리로 시작</small></button>
            <button><span>She plays <s>the</s> soccer.</span><b>the soccer → <em>soccer</em></b><small>운동엔 관사 X</small></button>
            <button><span>Look at <s>a</s> sun!</span><b>a → <em>the</em></b><small>하나뿐인 것</small></button>
            <button><span>He goes to <s>the</s> bed at 10.</span><b>the bed → <em>bed</em></b><small>본래 목적(자러)</small></button>
            <button><span>I want <s>a</s> water.</span><b>a water → <em>water</em></b><small>셀 수 없는 명사</small></button>
            <button><span>This is <s>my the</s> bag.</span><b>my the → <em>my</em></b><small>소유격과 관사는 함께 못 써요</small></button>
          </div>
          <table class="tb left"><tr><th colspan="2">a / an / the / X 빈칸 채우기</th></tr>
            <tr><td>I play ___ guitar every day.</td><td><b>the</b></td></tr>
            <tr><td>He is ___ honest boy.</td><td><b>an</b> <small>(h 묵음)</small></td></tr>
            <tr><td>I have ___ breakfast at 7.</td><td><b>X</b></td></tr>
            <tr><td>She is ___ university student.</td><td><b>a</b> <small>([유] 소리)</small></td></tr>
            <tr><td>This is ___ best day of my life.</td><td><b>the</b></td></tr></table>`,
      },
    ],
    ox: [
      { q: '관사 a, an, the는 <b>형용사</b>로 본다.', a: true, why: '명사 앞 가장 작은 꾸밈말! 5품사 분석에서는 <b>명사와 함께 큰 ○</b>' },
      { q: '<b>an hour</b>는 맞는 표현이다.', a: true, why: 'h가 소리 나지 않아 첫 소리가 모음 [아우어] → an!' },
      { q: '<b>play the soccer</b>가 맞다.', a: false, why: '운동 앞엔 관사 X → play soccer / 악기는 play <b>the</b> piano' },
      { q: '<b>a uniform</b>은 틀렸다. (an uniform이 맞다)', a: false, why: '철자가 아니라 <b>소리</b>! uniform은 자음 소리 [유] → <b>a</b> uniform' },
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
        inner = `<div class="cover"><div class="kick">CHUNK QUEST · 품사 원정대</div><h1>출발 전<br>개념 학습<small>영문법 기초 · 언어의 이해</small></h1>
          <p class="lead c">단어 → 덩어리 → 자리 → 꾸밈말, <b>한 계단씩</b> 올라가요!</p>
          <ol class="toc">${CHAPTERS.map((c) => `<li style="--cc:${c.color}"><b>CHAPTER ${c.no}</b> ${c.title}<small>${ROAD[c.no - 1].s} — ${c.sub}</small></li>`).join('')}</ol>
          <p class="note">한 장씩 넘기며 읽고, 챕터 끝 <b>OX 퀴즈</b>로 확인해요!</p></div>`;
      } else if (P.kind === 'chapter') {
        const road = ROAD.map((r, k) => `<li class="${k + 1 < ch.no ? 'done' : k + 1 === ch.no ? 'now' : ''}" style="--cc:${CHAPTERS[k].color}"><b>${k + 1 < ch.no ? '✔' : k + 1}</b><span>${r.t}</span><small>${r.s}</small></li>`).join('');
        inner = `<div class="chap" style="--cc:${ch.color}"><div class="cno">CHAPTER ${ch.no}</div><h2>${ch.title}</h2><p>${ch.sub}</p></div>
          <ol class="road">${road}</ol>
          <div class="why" style="--cc:${ch.color}"><h4>🤔 왜 이 단계를 배울까?</h4><p>${ch.why}</p></div>`;
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
          <p class="lead c">한 문장을 네 단계의 눈으로 다시 볼까요?</p>
          <div class="journey">
            <div style="--cc:#C8372D"><b>① 8품사</b><p>The / cute / little / puppy / sleeps / very / quietly / on the soft sofa</p><small>단어마다 이름표를 붙이고</small></div>
            <div style="--cc:#1F5FB8"><b>② 5품사로 묶기</b><p>${N('The cute little puppy')} ${V('sleeps')} ${D('very quietly')} ${D('on the soft sofa')}</p><small>의미 덩어리로 크게 묶고</small></div>
            <div style="--cc:#2E8B57"><b>③ 문장 성분</b><p><b>S</b> 강아지가 · <b>V</b> 잔다 · <b>M</b> 아주 조용히 · <b>M</b> 소파 위에서</p><small>덩어리의 자리를 찾고</small></div>
            <div style="--cc:#E4801A"><b>④ 관사</b><p><b>The</b> = 바로 그 강아지 · <b>the</b> soft sofa</p><small>명사 앞 꾸밈말까지 정확하게!</small></div>
          </div>
          <p class="note c">이제 원정을 떠나 볼까요? 게임 속 문제에서 오늘 배운 걸 써 먹어요!</p></div>`;
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
          // 맞히면 잠깐 뒤 자동으로 다음 장 · 틀리면 해설을 읽고 '다음' 버튼
          if (ok) { const here = i; setTimeout(() => { if (i === here && i < pages.length - 1) { i++; draw(); } }, 1200); }
        };
      });
      ov.querySelectorAll('.fix button').forEach((b) => { b.onclick = () => { b.classList.toggle('open'); sfx('tap'); }; });
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
      <p>8품사 → 5품사로 묶기 → 문장 성분 → 관사<br>4챕터를 넘기며 보고 <b>OX 퀴즈</b>로 확인해요 (약 10분)</p>
      <div class="sa-btns"><button class="primary big" id="saYes">네, 학습할래요!</button><button class="ghost big" id="saNo">아니오, 바로 게임!</button></div></div>`;
    document.body.appendChild(ov);
    ov.querySelector('#saYes').onclick = () => { ov.remove(); resolve(true); };
    ov.querySelector('#saNo').onclick = () => { ov.remove(); resolve(false); };
  });
}
