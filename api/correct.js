export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'POST 요청만 허용됩니다.' });
    }

    const { text } = req.body;
    if (!text) {
        return res.status(400).json({ error: '텍스트가 없습니다.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;
    const body = JSON.stringify({
        contents: [{
            parts: [{
                text: `다음은 강의 영상의 자동 음성 인식(STT)으로 생성된 자막입니다.\n발음이 비슷해서 잘못 인식된 단어만 실제 강사가 말한 단어로 수정해줘.\n주의사항:\n- 문장을 재작성하거나 표현을 다듬지 마\n- 문맥상 어색해 보여도 원문 단어를 함부로 바꾸지 마\n- 오직 음성 인식 오류(발음이 비슷한 단어로 잘못 인식된 것)만 수정해\n- 원문 문장 구조와 어순은 그대로 유지해\n결과만 딱 출력해:\n\n${text}`
            }]
        }]
    });

    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 3000;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body
            });

            if (response.status === 503) {
                const errorDetails = await response.text();
                console.warn(`Gemini 503 과부하 (${attempt}/${MAX_RETRIES}회):`, errorDetails);
                if (attempt < MAX_RETRIES) {
                    await new Promise(r => setTimeout(r, RETRY_DELAY_MS * attempt));
                    continue;
                }
                return res.status(503).json({ error: 'AI 서버 과부하 상태입니다. 잠시 후 다시 시도해주세요.' });
            }

            if (!response.ok) {
                const errorDetails = await response.text();
                console.error(`Gemini API 통신 에러 (${response.status}):`, errorDetails);
                return res.status(500).json({ error: `Gemini API 통신 에러: ${response.status}` });
            }

            const data = await response.json();

            if (data.candidates && data.candidates.length > 0 && data.candidates[0].content) {
                return res.status(200).json({ result: data.candidates[0].content.parts[0].text });
            } else {
                console.error("AI 응답 형식 이상:", JSON.stringify(data));
                return res.status(200).json({ result: text });
            }

        } catch (error) {
            console.error(`서버 내부 오류 (${attempt}/${MAX_RETRIES}회):`, error);
            if (attempt === MAX_RETRIES) {
                return res.status(500).json({ error: '서버 내부 처리 중 오류가 발생했습니다.' });
            }
            await new Promise(r => setTimeout(r, RETRY_DELAY_MS * attempt));
        }
    }
}