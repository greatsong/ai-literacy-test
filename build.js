const fs = require('fs');
const path = require('path');

// 배포에 포함할 파일 목록이다. 여기에 없는 파일은 공개되지 않는다.
// 저장소 루트를 그대로 서빙하면 규칙 파일, 내부 문서, 스크립트, .claude 폴더까지 노출된다.
const PUBLIC_FILES = [
    'index.html',
    'admin.html',
    'teacher-guide.html',
    'firebaseConfig.js',
    'questions.json',
    'schools.json',
];
const OUT_DIR = 'public';

fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR);

for (const file of PUBLIC_FILES) {
    fs.copyFileSync(file, path.join(OUT_DIR, file));
}

const firebaseApiKey = process.env.FIREBASE_API_KEY || '';
const content = `window.__FIREBASE_API_KEY__ = ${JSON.stringify(firebaseApiKey)};`;
fs.writeFileSync(path.join(OUT_DIR, 'firebase-env.js'), content);
console.log(`${OUT_DIR}/ generated (${PUBLIC_FILES.length + 1} files)`);
