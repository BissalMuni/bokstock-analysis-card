# Checklist — UX (사용자 경험)

사용자 관점에서 흐름이 자연스럽고 예측 가능한가?

## 네비게이션

- [ ] CHK101 - 진행 바에서 완료된 단계를 클릭해 직접 이동할 수 있는지 정의되어 있는가? [Coverage, FR-01]
- [ ] CHK102 - 마지막 단계(Step 6)에서 "다음" 버튼 대신 무엇을 보여줄지 명시되어 있는가? [Completeness, FR-01]
- [ ] CHK103 - 뒤로가기 시 이전에 선택한 값이 유지되는지 명시되어 있는가? [Clarity, FR-01]

## 로딩 & 피드백

- [ ] CHK104 - 분석 생성 중(Step 2→3 전환) 로딩 상태 UI가 정의되어 있는가? [Completeness, spec]
- [ ] CHK105 - Phase 2에서 API 응답 지연 시 타임아웃/재시도 UX가 정의되어 있는가? [Coverage, constitution]
- [ ] CHK106 - 빈 결과(분석 데이터 없음) 시 사용자에게 보여줄 화면이 정의되어 있는가? [Completeness, FR-04]

## 모바일

- [ ] CHK107 - 375px에서 꼭지 카드/칩이 어떻게 배치되는지 명시되어 있는가? (가로 스크롤? 줄바꿈?) [Clarity, constitution]
- [ ] CHK108 - 카드뉴스 슬라이드 넘기기가 모바일에서 스와이프를 지원하는지 정의되어 있는가? [Coverage, FR-07]

## 접근성

- [ ] CHK109 - 꼭지 선택(Step 2) 체크박스/칩에 키보드 탐색 순서가 정의되어 있는가? [Completeness, constitution]
- [ ] CHK110 - 카드뉴스 슬라이드에 스크린 리더 대체 텍스트 제공 여부가 명시되어 있는가? [Coverage, constitution]
