export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'POST 요청만 허용됩니다.' });
    }

    const { text } = req.body;
    if (!text) {
        return res.status(400).json({ error: '텍스트가 없습니다.' });
    }

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            // 💡 [핵심] role, safetySettings 등 에러를 유발할 수 있는 부가 옵션을 모두 제거한 순정 상태!
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `다음 자막의 오탈자와 어색한 문맥을 자연스럽게 교정해줘. 결과만 딱 출력해:\n\n${text}`
                    }]
                }]
            })
        });

        // 💡 [디버깅 강화] 만약 구글 서버가 400 에러를 뱉으면, 그 '진짜 이유'를 Vercel 로그에 출력하게 만듭니다.
        if (!response.ok) {
            const errorDetails = await response.text(); 
            console.error(`Gemini API 통신 에러 (${response.status}):`, errorDetails);
            throw new Error(`Gemini API 통신 에러: ${response.status}`);
        }

        const data = await response.json();

        // 결과 처리
        if (data.candidates && data.candidates.length > 0 && data.candidates[0].content) {
            res.status(200).json({ result: data.candidates[0].content.parts[0].text });
        } else {
            console.error("AI 응답 형식 이상:", JSON.stringify(data));
            res.status(200).json({ result: text }); // 실패 시 원본 반환
        }

    } catch (error) {
        console.error('서버 내부 오류:', error);
        res.status(500).json({ error: '서버 내부 처리 중 오류가 발생했습니다.' });
    }
}