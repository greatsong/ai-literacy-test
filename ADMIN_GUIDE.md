# AI 리터러시 진단 - 멀티테넌트 관리 가이드

## 1. 배포 후 초기 세팅 순서

### Step 1: Firestore Security Rules 업데이트
1. [Firebase Console](https://console.firebase.google.com) 접속
2. `ai-literacy-test` 프로젝트 선택
3. **Firestore Database > Rules** 탭
4. `firestore.rules` 파일 내용을 복사하여 붙여넣기
5. **Publish** 클릭

### Step 2: 기존 데이터 마이그레이션
기존 `results` 컬렉션의 데이터를 `schools/default/responses`로 복사합니다.

1. 배포된 사이트에서 `/migrate-data.html` 접속
2. 관리자 계정으로 로그인
3. **미리보기** 클릭 → 데이터 건수 확인
4. **마이그레이션 실행** 클릭
5. 완료 후 admin 대시보드에서 데이터 확인
6. 정상 확인되면 Firebase Console에서 `results` 컬렉션 수동 삭제 (선택)

---

## 2. 새 학교 추가 방법

### Step 1: schools.json에 학교 등록
```json
{
  "school-code": {
    "id": "school-code",
    "schoolName": "학교 정식 명칭",
    "teacherName": "담당 선생님 성함",
    "tagline": "OOO 선생님 & AI와 함께하는 성장 여행",
    "grades": [1, 2, 3],
    "classes": {
      "default": 10
    }
  }
}
```

- `id`: URL에 사용되는 코드 (영문 소문자, 하이픈)
- `grades`: 사용할 학년 배열
- `classes.default`: 기본 반 수
- `classes.2`: 특정 학년에 선택과목 반이 있는 경우 (아래 예시)

```json
"classes": {
  "default": 10,
  "2": {
    "count": 10,
    "subjectClasses": ["과목A", "과목B"]
  }
}
```

### Step 2: 관리자 계정 생성
1. Firebase Console > **Authentication** > Users 탭
2. **Add user** 클릭
3. 해당 학교 선생님 이메일/비밀번호 입력
4. `admin.html`의 `SCHOOL_ADMINS`에 매핑 추가:

```javascript
const SCHOOL_ADMINS = {
    'teacher@school.kr': ['school-code']
};
```

### Step 3: 접속 URL 안내
학생용: `https://배포URL/?school=school-code`
관리자용: `https://배포URL/admin`

---

## 3. 슈퍼 관리자 관리

`admin.html`의 `SUPER_ADMINS` 배열에 등록된 이메일은 모든 학교 데이터를 조회할 수 있습니다.

```javascript
const SUPER_ADMINS = ['greatsong@gmail.com'];
```

---

## 4. 파일 구조

| 파일 | 설명 |
|------|------|
| `schools.json` | 학교별 설정 (이름, 선생님, 학년/반) |
| `index.html` | 학생 진단 화면 (학교 선택 포함) |
| `admin.html` | 선생님 대시보드 (학교별 필터링) |
| `firestore.rules` | Firestore 보안 규칙 (Console에 붙여넣기) |
| `migrate-data.html` | 기존 데이터 마이그레이션 도구 (1회용) |
