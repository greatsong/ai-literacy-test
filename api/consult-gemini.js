import { GoogleGenerativeAI } from '@google/generative-ai';
import admin from 'firebase-admin';

// Firebase Admin 초기화 (Vercel serverless: cold start 시 1회)
if (!admin.apps.length) {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
        ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
        : null;
    admin.initializeApp(
        serviceAccount
            ? { credential: admin.credential.cert(serviceAccount) }
            : { projectId: 'ai-literacy-test' }
    );
}

// --- In-memory Rate Limiter ---
// NOTE: Vercel Serverless에서는 warm instance 내에서만 작동합니다.
// Cold start 시 초기화되므로 완벽한 rate limiting이 아닙니다.
// 프로덕션 수준이 필요하면 Vercel KV 또는 Upstash Redis를 고려하세요.
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1분
const RATE_LIMIT_MAX_REQUESTS = 10;      // 윈도우당 최대 요청 수
const rateLimitMap = new Map();           // IP -> [timestamp, timestamp, ...]

function getRateLimitResult(ip) {
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW_MS;

    // 해당 IP의 요청 기록 가져오기 (없으면 빈 배열)
    let timestamps = rateLimitMap.get(ip) || [];

    // 윈도우 밖의 오래된 기록 제거
    timestamps = timestamps.filter(t => t > windowStart);

    // 제한 초과 여부 확인
    if (timestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
        rateLimitMap.set(ip, timestamps);
        return { allowed: false, remaining: 0 };
    }

    // 현재 요청 기록 추가
    timestamps.push(now);
    rateLimitMap.set(ip, timestamps);

    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - timestamps.length };
}

export default async function handler(req, res) {
    // CORS Setup
    const allowedOrigins = [
        process.env.ALLOWED_ORIGIN || 'https://ai-literacy-test.vercel.app',
        'http://localhost:3000',
        'http://localhost:5173',
    ];
    const origin = req.headers.origin;
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', allowedOrigins.includes(origin) ? origin : allowedOrigins[0]);
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Accept, Authorization'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // --- Firebase ID Token 검증 (서명 검증 포함) ---
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: '인증이 필요합니다.' });
    }
    try {
        const token = authHeader.split('Bearer ')[1];
        await admin.auth().verifyIdToken(token);
    } catch (e) {
        return res.status(401).json({ error: '유효하지 않은 인증 토큰입니다.' });
    }

    // --- Rate Limit 체크 ---
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
        || req.headers['x-real-ip']
        || req.socket?.remoteAddress
        || 'unknown';

    const rateLimit = getRateLimitResult(clientIp);

    res.setHeader('X-RateLimit-Limit', RATE_LIMIT_MAX_REQUESTS);
    res.setHeader('X-RateLimit-Remaining', rateLimit.remaining);

    if (!rateLimit.allowed) {
        return res.status(429).json({
            error: '요청이 너무 많습니다. 1분 후에 다시 시도해주세요.',
        });
    }

    const { stats, weakCategory, weakQuestion, weakQuestionText } = req.body;

    const API_KEY = process.env.GEMINI_API_KEY;

    if (!API_KEY) {
        return res.status(500).json({ error: 'Server API Key not configured' });
    }

    try {
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const prompt = `
    당신은 교육 전문가입니다. 학생들의 'AI 협업 역량 진단' 결과입니다.

    [데이터]
    - 평균 점수: ${stats.avgScore} / 20
    - 취약 역량: ${weakCategory}
    - 가장 많이 틀린 문항: ${weakQuestion} ("${weakQuestionText}")

    선생님에게 3가지 구체적인 수업 지도 꿀팁을 제안해주세요.
    학생들이 이 취약점을 보완하기 위해 교실에서 해볼 수 있는 짧은 활동이나 설명 방식을 추천해주세요.
    마크다운 형식으로 깔끔하게 작성해주세요.
    `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        return res.status(200).json({ advice: text });

    } catch (error) {
        console.error("Gemini Error:", error);
        return res.status(500).json({ error: 'Failed to generate advice: ' + error.message });
    }
}
