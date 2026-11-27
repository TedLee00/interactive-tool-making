// 📚 신정·서생중 2학년 2학기 기말 · Lesson 7·8 학습 앱 (공용 엔진: ../jg/app.js)
import data from '../../data/sj2-l78.json';
import { startLesson } from '../jg/app.js';

startLesson({
  id: 'sj78', demo: 'ted7342', data, tab: '신정서생중2_L78', kartQ: 7,
  hero: { kick: '신정·서생중 2학년 · 2학기 기말', h1: 'Lesson <b>7·8</b><br>단어 · 문법 · 영작', sub: 'Wonders in Words · Festival Fun' },
  // 🥁 곡마다 네 가지 문법 + 하나 더 (1곡 관계대명사 · 2곡 so~that · 3곡 의문사+to부정사)
  extraCats: ['목적격 관계대명사', 'so ~ that', '의문사 + to부정사'],
  gramLabel: '목적격 관계대명사 · 접속사 although · 의문사+to부정사 · so ~ that',
  gramShort: '관계대명사 · although · 의문사+to · so~that',
  // 🛣️ 카트 단어 레인에 나올 어려운 단어들
  hard: ['disappointed', 'latest', 'politely', 'expression', 'refuse', 'wonder', 'participate', 'unforgettable', 'sculpture', 'through', 'narrow', 'stuck', 'reveal', 'ancient', 'idiom', 'look forward to', 'be made up of', 'over time', 'treat', 'hold'],
  // 🛣️ 단어 레인 매력적인 오답 (ko = 영어→뜻 레인, en = 뜻→영어 레인)
  conf: {
    disappointed: { ko: ['실망스러운', '사라진'], en: ['disappointing', 'disappeared'] },
    latest: { ko: ['최근에', '나중에'], en: ['lately', 'later'] },
    politely: { ko: ['예의 바른', '정치적으로'], en: ['polite', 'politically'] },
    expression: { ko: ['표현하다', '인상'], en: ['express', 'impression'] },
    refuse: { ko: ['재사용하다', '쓰레기를 줄이다'], en: ['reuse', 'reduce'] },
    wonder: { ko: ['헤매다, 돌아다니다', '궁금한'], en: ['wander', 'wonderful'] },
    participate: { ko: ['특별한', '부분'], en: ['particular', 'part'] },
    unforgettable: { ko: ['용서할 수 없는', '잊어버린'], en: ['unforgivable', 'forgotten'] },
    sculpture: { ko: ['구조, 건축물', '조각가'], en: ['structure', 'sculptor'] },
    through: { ko: ['비록 ~이지만', '철저한'], en: ['though', 'thorough'] },
    narrow: { ko: ['화살', '넓은'], en: ['arrow', 'wide'] },
    stuck: { ko: ['쌓다, 더미', '찔린'], en: ['stack', 'struck'] },
    reveal: { ko: ['숨기다', '반복하다'], en: ['hide', 'review'] },
    ancient: { ko: ['조상', '현대의'], en: ['ancestor', 'modern'] },
    idiom: { ko: ['바보', '이상'], en: ['idiot', 'ideal'] },
    'look forward to': { ko: ['~을 찾다', '~을 돌보다'], en: ['look for', 'look after'] },
    'be made up of': { ko: ['~로 만들어지다(재료)', '화해하다'], en: ['be made of', 'make up with'] },
    'over time': { ko: ['제시간에', '늦게까지'], en: ['on time', 'in time'] },
    treat: { ko: ['나무', '여행'], en: ['tree', 'trip'] },
    hold: { ko: ['오래된', '구멍'], en: ['old', 'hole'] },
  },
  phrPos: { 'over time': '부사', 'go away': '동사', 'look forward to': '동사', 'be made up of': '동사', 'make it': '동사' },
  conj: [['although', '비록 ~이지만'], ['though', '~이지만'], ['because', '~때문에'], ['when', '~할 때'], ['so', '그래서'], ['and', '그리고'], ['but', '하지만']],
});
