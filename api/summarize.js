export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'POST 요청만 허용됩니다.' });
    }

    const { text } = req.body;
    if (!text) {
        return res.status(400).json({ error: '텍스트가 없습니다.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const prompt = `다음은 대학 강의 자막 텍스트입니다. 아래 형식에 맞게 한국어로 요약해주세요.

형식:
[강의 주제]
1~2문장으로 이 강의가 무엇에 관한 내용인지 작성

[주요 내용]
• 핵심 내용을 bullet point 5~8개로 간결하게 작성

[핵심 키워드]
주요 키워드 5~10개를 쉼표로 구분하여 나열

규칙:
- 마크다운 문법(**굵게** 등) 사용 금지
- 자막에 없는 내용은 추가하지 말 것
- 간결하고 명확하게 작성

자막 텍스트:
${text}`;

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        if (response.status === 429) {
            return res.status(429).json({ error: '오늘 AI 분석 토큰이 모두 소진되었습니다. 내일 다시 이용해 주세요! 🥲' });
        }

        const data = await response.json();
        const summary = data.candidates[0].content.parts[0].text;

        res.status(200).json({ result: summary });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: '요약 중 오류가 발생했습니다.' });
    }
}
