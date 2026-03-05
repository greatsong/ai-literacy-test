#!/usr/bin/env node
// Firestore REST API를 통해 학교 데이터를 등록하는 일회성 스크립트
// Firebase CLI의 저장된 인증 정보를 사용
const https = require('https');
const fs = require('fs');
const path = require('path');

const PROJECT_ID = 'ai-literacy-test';

// Firebase CLI 저장소에서 refresh token 읽기
function getRefreshToken() {
  const configPath = path.join(require('os').homedir(), '.config', 'configstore', 'firebase-tools.json');
  const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  return (data.tokens && data.tokens.refresh_token) ||
         (data.user && data.user.tokens && data.user.tokens.refresh_token);
}

// Google OAuth로 access token 발급
function getAccessToken(refreshToken) {
  return new Promise((resolve, reject) => {
    const body = `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}&client_id=563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com&client_secret=j9iVZfS8kkCEFUPaAeJV0sAi`;
    const req = https.request('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        const json = JSON.parse(data);
        if (json.access_token) resolve(json.access_token);
        else reject(new Error('Token error: ' + data));
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// Firestore REST API로 문서 생성/업데이트
function patchDoc(docId, docData, token) {
  const url = `/v1/projects/${PROJECT_ID}/databases/(default)/documents/schools/${docId}`;
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(docData);
    const req = https.request({
      hostname: 'firestore.googleapis.com',
      path: url,
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`  OK: schools/${docId}`);
          resolve();
        } else {
          reject(new Error(`${res.statusCode}: ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// 학교 데이터 (Firestore REST API 형식)
const schools = {
  "default": {
    fields: {
      schoolName: { stringValue: "" },
      teacherName: { stringValue: "석리송 선생님" },
      tagline: { stringValue: "석리송 선생님 & AI와 함께하는 성장 여행" },
      grades: { arrayValue: { values: [
        { integerValue: "1" }, { integerValue: "2" }, { integerValue: "3" }
      ]}},
      classes: { mapValue: { fields: {
        default: { integerValue: "12" },
        "2": { mapValue: { fields: {
          count: { integerValue: "12" },
          subjectClasses: { arrayValue: { values: [
            { stringValue: "AI피지컬" },
            { stringValue: "AI기초204E" },
            { stringValue: "AI기초205B" }
          ]}}
        }}}
      }}},
      admins: { arrayValue: { values: [
        { stringValue: "greatsong@gmail.com" }
      ]}}
    }
  },
  "jeonju-jungang": {
    fields: {
      schoolName: { stringValue: "전주중앙여자고등학교" },
      teacherName: { stringValue: "선생님" },
      tagline: { stringValue: "AI와 함께하는 성장 여행" },
      grades: { arrayValue: { values: [
        { integerValue: "1" }, { integerValue: "2" }, { integerValue: "3" }
      ]}},
      classes: { mapValue: { fields: {
        default: { integerValue: "12" }
      }}},
      admins: { arrayValue: { values: [] } }
    }
  }
};

async function main() {
  console.log('Firebase CLI 토큰으로 인증 중...');
  const refreshToken = getRefreshToken();
  const accessToken = await getAccessToken(refreshToken);
  console.log('인증 성공!\n');

  console.log('학교 데이터 등록 중...');
  for (const [id, data] of Object.entries(schools)) {
    await patchDoc(id, data, accessToken);
  }
  console.log('\n완료!');
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
