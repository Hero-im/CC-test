export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'POST 요청만 허용됩니다.' });
    }

    const { text } = req.body;
    if (!text) {
        return res.status(400).json({ error: '텍스트가 없습니다.' });
    }

    try {
        const apiKey = process.env.GEMINI_API_KEY; // Vercel 환경변수에 설정한 API 키
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `다음 자막의 오탈자와 어색한 문맥을 자연스럽게 교정해줘. 결과만 딱 출력해:\n\n${text}`
                    }]
                }],
                // 💡 [핵심] 구글 AI의 예민한 안전 검열 필터를 모두 끄는 설정 (쓰레기, 벌레 등의 단어 허용)
                safetySettings: [
                    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                ]
            })
        });

        if (!response.ok) {
            throw new Error(`Gemini API 통신 에러: ${response.status}`);
        }

        const data = await response.json();

        // 💡 [핵심] AI가 엉뚱한 대답을 주거나 필터링에 걸렸을 때 서버가 죽지 않게(500 에러 방지) 방어
        if (data.candidates && data.candidates.length > 0 && data.candidates[0].content) {
            res.status(200).json({ result: data.candidates[0].content.parts[0].text });
        } else {
            console.error("AI 응답 형식 이상:", JSON.stringify(data));
            res.status(200).json({ result: text }); // 에러 나면 서버 죽이지 말고 그냥 원본을 돌려주기
        }

    } catch (error) {
        console.error('서버 내부 오류:', error);
        res.status(500).json({ error: '서버 내부 처리 중 오류가 발생했습니다.' });
    }
}