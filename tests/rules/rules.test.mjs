// firestore.rules 검증. demo- 프로젝트의 에뮬레이터에서만 실행되며 운영 DB에 닿지 않는다.
// 실행: cd tests/rules && npm install && npm test  (Java 21 이상 필요)
import { after, before, beforeEach, test } from 'node:test';
import { readFileSync } from 'node:fs';
import {
    assertFails,
    assertSucceeds,
    initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
    collection,
    deleteDoc,
    deleteField,
    doc,
    getDoc,
    getDocs,
    serverTimestamp,
    setDoc,
    updateDoc,
    writeBatch,
} from 'firebase/firestore';

// 최종 규칙 시험: RULES_FILE=firestore.rules.final npm test
const rulesFile = process.env.RULES_FILE || 'firestore.rules';
const rules = readFileSync(new URL(`../../${rulesFile}`, import.meta.url), 'utf8');
const enforcesVerifiedEmail = rules.includes("get('email_verified', false) == true");
// 과도기 규칙: 기존 계정을 UID로 고정하고 schools.admins도 인정한다. 최종 규칙에서는 false다.
const superUid = rules.match(/request\.auth\.uid in \['([^']+)'/)?.[1];
const schoolPin = rules.match(/request\.auth\.uid == '([^']+)' && schoolId == '([^']+)'/);
const isTransition = Boolean(superUid);
const AUTO_ID = 'AbCdEfGhIjKlMnOpQrSt';
const AUTO_ID_2 = 'ZyXwVuTsRqPoNmLkJiHg';
const SUPER = 'greatsong@gmail.com';
const TEACHER = 'teacher@school.kr';

let env;
const anon = () => env.authenticatedContext('anon-1', { firebase: { sign_in_provider: 'anonymous' } }).firestore();
const account = (uid, email, verified = true) =>
    env.authenticatedContext(uid, { email, email_verified: verified }).firestore();
const nobody = () => env.unauthenticatedContext().firestore();
const superAdmin = () => account('super', SUPER);
const teacher = () => account('teacher', TEACHER);

// index.html의 saveResultToFirebase가 보내는 값과 같은 형식
const response = (overrides = {}) => ({
    schoolId: 's1',
    grade: '2',
    class: '3',
    subjectClass: null,
    number: null,
    name: '익명',
    totalScore: 42,
    levelTitle: 'Level 3. 모범 드라이버',
    categoryScores: { Critical_Thinking: { score: 9, total: 12 } },
    details: [{ qId: 1, score: 3, userAnswer: '보기' }],
    timestamp: serverTimestamp(),
    ...overrides,
});

// teacher-guide.html의 sendRequest가 보내는 값과 같은 형식
const schoolRequest = (overrides = {}) => ({
    schoolName: '당곡고등학교',
    teacherName: '홍길동',
    grades: '1,2',
    classes: '10',
    email: 'new@school.kr',
    status: 'pending',
    requestedAt: serverTimestamp(),
    ...overrides,
});

before(async () => {
    env = await initializeTestEnvironment({
        projectId: 'demo-literacy',
        firestore: { rules, host: '127.0.0.1', port: 8180 },
    });
});
after(() => env.cleanup());
beforeEach(async () => {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async (ctx) => {
        const db = ctx.firestore();
        await setDoc(doc(db, 'schools/s1'), { schoolName: 'A', teacherName: 'T' });
        await setDoc(doc(db, 'schools/s2'), { schoolName: 'B', teacherName: 'U' });
        await setDoc(doc(db, 'schoolAdmins/s1'), { admins: [TEACHER] });
        await setDoc(doc(db, 'schoolAdmins/s2'), { admins: ['other@school.kr'] });
        await setDoc(doc(db, 'schools/s1/responses/r1'), { totalScore: 1 });
        await setDoc(doc(db, 'schools/s2/responses/r1'), { totalScore: 1 });
        await setDoc(doc(db, 'pendingSchools/p1'), { email: 'x@school.kr' });
        await setDoc(doc(db, 'results/old1'), { totalScore: 1 });
    });
});

test('학생 흐름: 비인증·익명 모두 학교 목록을 읽는다', async () => {
    await assertSucceeds(getDocs(collection(nobody(), 'schools')));
    await assertSucceeds(getDocs(collection(anon(), 'schools')));
});

test('학생 흐름: 익명 계정이 정상 응답을 제출한다', async () => {
    await assertSucceeds(setDoc(doc(anon(), `schools/s1/responses/${AUTO_ID}`), response()));
    await assertSucceeds(setDoc(doc(anon(), `schools/s1/responses/${AUTO_ID_2}`), response({ subjectClass: '정보과학' })));
});

test('교사 흐름: 익명 계정이 사용 신청을 제출한다', async () => {
    await assertSucceeds(setDoc(doc(anon(), `pendingSchools/${AUTO_ID}`), schoolRequest()));
    await assertSucceeds(setDoc(doc(anon(), `pendingSchools/${AUTO_ID_2}`), schoolRequest({ grades: '', classes: '' })));
});

test('비인증·익명·무관한 계정은 학생 응답을 읽지 못한다', async () => {
    for (const db of [nobody(), anon(), account('x', 'stranger@gmail.com')]) {
        await assertFails(getDocs(collection(db, 'schools/s1/responses')));
        await assertFails(getDocs(collection(db, 'schoolAdmins')));
        await assertFails(getDocs(collection(db, 'results')));
        await assertFails(getDocs(collection(db, 'pendingSchools')));
    }
});

test('공개 범위 밖의 관리자 이메일은 비인증·익명이 읽지 못한다', async () => {
    for (const db of [nobody(), anon()]) {
        await assertFails(getDoc(doc(db, 'schoolAdmins/s1')));
        await assertFails(getDocs(collection(db, 'schoolAdmins')));
    }
});

test('익명 계정은 형식에 어긋난 응답을 쓰지 못한다', async () => {
    const path = `schools/s1/responses/${AUTO_ID}`;
    const bad = [
        { levelTitle: 'x. <img src=x onerror=alert(1)>' },
        { levelTitle: 'x.\n<img src=x onerror=alert(1)>' },
        { totalScore: '<img src=x onerror=alert(1)>' },
        { name: '김학생' },
        { number: 12 },
        { schoolId: 's2' },
        { grade: '"><script>' },
        { extra: 'field' },
        { timestamp: new Date(0) },
    ];
    for (const overrides of bad) await assertFails(setDoc(doc(anon(), path), response(overrides)));
    await assertFails(setDoc(doc(anon(), `schools/s1/responses/x'onclick='alert(1)`), response()));
});

test('익명 계정은 형식에 어긋난 신청이나 옛 컬렉션 쓰기를 하지 못한다', async () => {
    await assertFails(setDoc(doc(anon(), "pendingSchools/x');alert(1);('"), schoolRequest()));
    await assertFails(setDoc(doc(anon(), `pendingSchools/${AUTO_ID}`), schoolRequest({ status: 'approved' })));
    await assertFails(setDoc(doc(anon(), `pendingSchools/${AUTO_ID}`), schoolRequest({ email: 'not-an-email' })));
    await assertFails(setDoc(doc(anon(), `results/${AUTO_ID}`), response()));
});

test('응답은 제출 뒤 수정할 수 없다', async () => {
    await assertFails(updateDoc(doc(anon(), 'schools/s1/responses/r1'), { totalScore: 60 }));
    await assertFails(updateDoc(doc(superAdmin(), 'schools/s1/responses/r1'), { totalScore: 60 }));
});

test('학교 관리자는 자기 학교만 읽고 지운다', async () => {
    await assertSucceeds(getDocs(collection(teacher(), 'schools/s1/responses')));
    await assertSucceeds(getDoc(doc(teacher(), 'schoolAdmins/s1')));
    await assertSucceeds(deleteDoc(doc(teacher(), 'schools/s1/responses/r1')));
    await assertFails(getDocs(collection(teacher(), 'schools/s2/responses')));
    await assertFails(getDoc(doc(teacher(), 'schoolAdmins/s2')));
    await assertFails(deleteDoc(doc(teacher(), 'schools/s2/responses/r1')));
});

test('학교 관리자는 관리자 목록과 학교 존재를 바꾸지 못한다', async () => {
    await assertFails(setDoc(doc(teacher(), 'schoolAdmins/s1'), { admins: [TEACHER, 'friend@x.kr'] }));
    await assertFails(updateDoc(doc(teacher(), 'schools/s1'), { admins: [TEACHER] }));
    await assertFails(deleteDoc(doc(teacher(), 'schools/s1')));
    await assertFails(updateDoc(doc(teacher(), 'schools/s1'), { tagline: '안내' }));
    await assertFails(updateDoc(doc(teacher(), 'schools/s1'), { id: 's2' }));
});

test('슈퍼관리자 흐름: 학교 저장·승인·삭제·이전이 통과한다', async () => {
    const db = superAdmin();
    await assertSucceeds(getDocs(collection(db, 'schools/s1/responses')));
    await assertSucceeds(getDocs(collection(db, 'results')));
    await assertSucceeds(getDocs(collection(db, 'pendingSchools')));
    await assertSucceeds(getDocs(collection(db, 'schoolAdmins')));
    await assertSucceeds(updateDoc(doc(db, 'pendingSchools/p1'), { status: 'approved' }));

    const save = writeBatch(db);
    save.set(doc(db, 'schools/s3'), { schoolName: 'C', admins: deleteField() }, { merge: true });
    save.set(doc(db, 'schoolAdmins/s3'), { admins: ['c@school.kr'] });
    await assertSucceeds(save.commit());

    const remove = writeBatch(db);
    remove.delete(doc(db, 'schools/s3'));
    remove.delete(doc(db, 'schoolAdmins/s3'));
    await assertSucceeds(remove.commit());

    // migrate-data.html: 옛 형식 문서를 그대로 옮긴다
    await assertSucceeds(setDoc(doc(db, 'schools/default/responses/legacy1'), { name: '옛 기록', totalScore: 1 }));
});

test('이전 전 데이터: schools의 admins 필드도 인정한다 (과도기 규칙 전용)', { skip: !isTransition }, async () => {
    await env.withSecurityRulesDisabled((ctx) =>
        setDoc(doc(ctx.firestore(), 'schools/s4'), { schoolName: 'D', admins: [TEACHER] }));
    await assertSucceeds(getDocs(collection(teacher(), 'schools/s4/responses')));
    // 이메일이 없는 문서라도 평가 오류 없이 거부된다
    await assertFails(getDocs(collection(account('x', 'stranger@gmail.com'), 'schools/s4/responses')));
});

test('기존 관리자 계정은 이메일 미인증이어도 잠기지 않는다 (과도기 규칙 전용)', { skip: !isTransition }, async () => {
    await assertSucceeds(getDocs(collection(account(superUid, SUPER, false), 'pendingSchools')));
    await assertSucceeds(getDocs(collection(account(schoolPin[1], TEACHER, false), `schools/${schoolPin[2]}/responses`)));
});

test('고정된 학교 관리자는 이메일을 바꿔도 다른 역할을 얻지 못한다 (과도기 규칙 전용)', { skip: !isTransition }, async () => {
    const hijacked = account(schoolPin[1], SUPER, false);
    await assertFails(getDocs(collection(hijacked, 'pendingSchools')));
    await assertFails(getDocs(collection(hijacked, 'schools/s1/responses')));
    await assertFails(getDocs(collection(account(schoolPin[1], TEACHER, false), 'schools/s1/responses')));
});

test('공개 문서인 schools에 관리자 이메일을 다시 넣지 못한다 (최종 규칙 전용)', { skip: isTransition || !enforcesVerifiedEmail }, async () => {
    await assertFails(setDoc(doc(superAdmin(), 'schools/s5'), { schoolName: 'E', admins: [TEACHER] }));
    await assertFails(updateDoc(doc(superAdmin(), 'schools/s1'), { admins: [TEACHER] }));
});

test('이메일 미인증 신규 계정은 슈퍼관리자·학교 관리자가 되지 못한다', { skip: !enforcesVerifiedEmail }, async () => {
    const fakeSuper = account('fake', SUPER, false);
    const fakeTeacher = account('fake2', TEACHER, false);
    await assertFails(getDocs(collection(fakeSuper, 'schools/s1/responses')));
    await assertFails(getDocs(collection(fakeSuper, 'pendingSchools')));
    await assertFails(getDocs(collection(fakeTeacher, 'schools/s1/responses')));
    await assertFails(getDoc(doc(fakeTeacher, 'schoolAdmins/s1')));
});
