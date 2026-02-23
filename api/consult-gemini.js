const { GoogleGenerativeAI } = require('@google/generative-ai');

export default async function handler(req, res) {
    // CORS Setup
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { stats, weakCategory, weakQuestion, weakQuestionText } = req.body;

    const API_KEY = process.env.GEMINI_API_KEY;

    if (!API_KEY) {
        return res.status(500).json({ error: 'Server API Key not configured' });
    }

    try {
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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
