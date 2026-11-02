# 품사 원정대 (Chunk Quest)
「영어의 이해」 특강 내용으로 만드는 1인용 3D 보드게임. 기획서: `GAME_SPEC.md`

## 지금 단계 (3단계: 3D 보드·캐릭터·주사위)
- `index.html` — 게임 (타이틀 → 등록 → 캐릭터 선택 → 3D 보드)
- `data/board.json` — 40칸 여정 (지역 4곳, 칸 종류·유형)
- `data/characters.json` — 캐릭터 6명 + 안내 캐릭터 (이름·성격·대사)
- `public/assets/characters/*.svg` — 캐릭터 그림 (같은 이름의 파일로 바꾸면 교체됨)
- `src/board/` — 3D 보드·말·주사위

## 2단계 결과물
- `data/questions/01.json` ~ `12.json` — 문제 은행 (유형별 40문제 이상)
- `data/config.json` — 칸 보상·채점 설정 (코드 수정 없이 변경)
- `quiz-lab.html` — 퀴즈 연습장 (한 칸 = 5문제 엔진)
- `review.html` — 원장님용 문제 검수 페이지
- `docs/` — 교재 정리, 기존 게임 분석, 샘플 문제
- `legacy/` — 예전 앱 (Step Up 4 Movie Quiz) 원본 보관

## 명령어
```bash
npm install
npm run dev        # 개발 서버
npm test           # 채점 테스트 + 문제 은행 자기검사
npm run validate   # 문제 은행 형식 검사
npm run build      # 검사 후 dist/ 로 빌드
```
