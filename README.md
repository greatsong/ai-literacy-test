# AI 리터러시 진단 (AI Literacy Test)

시나리오 기반 AI 협업 역량 진단 도구입니다. 학생들의 AI 활용 능력을 5가지 영역에서 측정하고, 교사를 위한 학급 단위 분석 대시보드를 제공합니다.

**배포 URL**: https://ai-literacy-test.vercel.app
**관리자 대시보드**: https://ai-literacy-test.vercel.app/admin

## 주요 기능

### 학생용 진단
- 20문항 시나리오 기반 진단 (4지선다, 문항 셔플)
- 5가지 역량 영역 측정: 비판적 사고, 윤리적 판단, 창의적 활용, 메타인지, 협업·소통
- 5단계 레벨 분류 (L1 입문 ~ L5 마스터)
- 레이더 차트 시각화 + PDF 리포트 다운로드
- Firebase 익명 인증 기반 결과 저장

### 교사용 관리자 대시보드
- 이메일/비밀번호 로그인 (사전 등록된 관리자만)
- 학급 전체 결과 통계 (평균, 분포, 취약 영역)
- 도넛 차트·바 차트·레이더 차트 시각화
- 개별 학생 결과 상세 조회
- Gemini API 기반 맞춤 수업 지도 조언

## 기술 스택

| 구분 | 기술 |
|------|------|
| 프론트엔드 | Tailwind CSS, Chart.js, html2canvas, jsPDF |
| 백엔드 | Vercel Serverless Functions (Node.js ESM) |
| 인증 | Firebase Authentication (익명 + 이메일) |
| 데이터베이스 | Firebase Firestore |
| AI | Google Gemini 2.0 Flash |
| 보안 | Firebase Admin SDK (JWT 검증), CORS 화이트리스트, Rate Limiting |

## 프로젝트 구조

```
ai-literacy-test/
├── index.html          # 학생용 진단 페이지
├── admin.html          # 교사용 관리자 대시보드
├── questions.json      # 20개 진단 문항 데이터
├── firebaseConfig.js   # Firebase 클라이언트 초기화
├── firebase-env.js     # Firebase 환경 설정
├── api/
│   └── consult-gemini.js  # Gemini AI 조언 API (Vercel Serverless)
├── vercel.json         # Vercel 배포 설정
├── package.json
└── build.js            # 빌드 스크립트
```

## 환경 변수 (Vercel)

| 변수명 | 설명 |
|--------|------|
| `GEMINI_API_KEY` | Google Gemini API 키 |
| `FIREBASE_API_KEY` | Firebase 클라이언트 API 키 |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase Admin SDK 서비스 계정 JSON |

## 진단 영역

| 영역 | 설명 | 문항 수 |
|------|------|---------|
| Critical_Thinking | AI 결과물에 대한 비판적 평가 | 4 |
| Ethical_Judgment | AI 활용의 윤리적 판단 | 4 |
| Creative_Utilization | AI를 활용한 창의적 문제 해결 | 4 |
| Meta_Cognition | AI 협업 과정에 대한 메타인지 | 4 |
| Communication | AI와의 효과적인 소통·협업 | 4 |

## 개발 도구

Claude Code로 개발되었습니다.
