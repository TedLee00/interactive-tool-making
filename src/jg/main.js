// 📚 정관중 1학년 2학기 기말 · Lesson 7·8 학습 앱 (공용 엔진: ./app.js)
import data from '../../data/jg1-l78.json';
import { startLesson } from './app.js';

startLesson({
  id: 'jg78', demo: 'ted5821', data, tab: '정관중L78', kartQ: 5,
  hero: { kick: '정관중학교 1학년 · 2학기 기말', h1: 'Lesson <b>7·8</b><br>단어 · 문법 · 영작', sub: 'Find Your Dream · Be Smart Online' },
  // 🛣️ 카트 단어 레인에 나올 어려운 단어들
  hard: ['photography', 'photographer', 'permission', 'wrangler', 'storytelling', 'capture', 'forgive', 'personal', 'unique', 'shocking', 'asleep', 'break into', 'in surprise', 'location', 'signal', 'editor', 'cottage', 'follower', 'be in charge of', 'take care of'],
  // 🛣️ 단어 레인 매력적인 오답: 철자 · 뜻이 비슷해서 헷갈리는 말 (ko = 영어→뜻 레인, en = 뜻→영어 레인)
  conf: {
    photography: { ko: ['사진작가', '사진 찍다'], en: ['photographer', 'photograph'] },
    photographer: { ko: ['사진술', '사진 찍다'], en: ['photography', 'photograph'] },
    permission: { ko: ['허락하다', '임무'], en: ['permit', 'mission'] },
    wrangler: { ko: ['레슬링 선수', '말다툼하다'], en: ['wrestler', 'stranger'] },
    storytelling: { ko: ['이야기꾼', '이야기책'], en: ['storyteller', 'storybook'] },
    capture: { ko: ['녹화하다', '편집하다'], en: ['record', 'shoot'] },
    forgive: { ko: ['잊어버리다', '금지하다'], en: ['forget', 'forbid'] },
    personal: { ko: ['사람', '사회적인'], en: ['person', 'social'] },
    unique: { ko: ['통일된', '평범한'], en: ['united', 'union'] },
    shocking: { ko: ['충격받은', '놀란'], en: ['shocked', 'surprised'] },
    asleep: { ko: ['잠자다', '깨어 있는'], en: ['sleep', 'awake'] },
    'break into': { ko: ['고장 나다', '헤어지다'], en: ['break down', 'break up'] },
    'in surprise': { ko: ['놀라운', '갑자기'], en: ['surprising', 'by surprise'] },
    location: { ko: ['지역의', '위치시키다'], en: ['local', 'locate'] },
    signal: { ko: ['서명', '표지판'], en: ['signature', 'sign'] },
    editor: { ko: ['편집하다', '판(版)'], en: ['edit', 'edition'] },
    cottage: { ko: ['성', '대학'], en: ['castle', 'college'] },
    follower: { ko: ['따라가다', '지도자'], en: ['follow', 'leader'] },
    'be in charge of': { ko: ['~을 돌보다', '~에 관심이 있다'], en: ['take care of', 'be interested in'] },
    'take care of': { ko: ['~을 담당하다', '~을 조심하다'], en: ['be in charge of', 'be careful of'] },
  },
  phrPos: { 'in the future': '부사', 'in surprise': '부사' },
  extraCats: ['수여동사', 'to부정사', '시간의 접속사'],
  gramLabel: 'to부정사 · 비인칭 주어 it · 수여동사 · 시간의 접속사', gramShort: 'to부정사 · 비인칭 it · 수여동사 · 시간 접속사',
});
