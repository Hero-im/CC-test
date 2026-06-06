// api/correct.js
export default async function handler(req, res) {
    // POST 요청만 받도록 처리
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'POST 요청만 허용됩니다.' });
    }

    const { text } = req.body;
    
    // Vercel 대시보드에서 설정할 환경변수 (여기에 키를 직접 적지 않습니다!)
    const apiKey = process.env.GEMINI_API_KEY; 

    // Gemini API 엔드포인트
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    // 프롬프트 엔지니어링
    const prompt = `다음은 강의 영상의 자동 음성 인식(STT)으로 생성된 자막입니다.\n발음이 비슷해서 잘못 인식된 단어만 실제 강사가 말한 단어로 수정해줘.\n주의사항:\n- 문장을 재작성하거나 표현을 다듬지 마\n- 문맥상 어색해 보여도 원문 단어를 함부로 바꾸지 마\n- 오직 음성 인식 오류(발음이 비슷한 단어로 잘못 인식된 것)만 수정해\n- 원문 문장 구조와 어순은 그대로 유지해\n- 교정한 단어는 반드시 <<원본단어::교정단어>> 형식으로 표시해. 예: <<미역::미감>>\n- 교정하지 않은 단어는 그냥 그대로 출력해\n- 마크다운(**굵게** 등) 절대 사용하지 마\n결과만 딱 출력해:\n\n${text}`;

try {
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
        })
    });
    
    // 이 두 줄을 추가해서 429 에러(한도 초과)를 콕 집어냅니다!
    if (response.status === 429) {
        return res.status(429).json({ error: '오늘 AI 분석 토큰이 모두 소진되었습니다. 내일 다시 이용해 주세요! 🥲' });
    }
    
    const data = await response.json();
    const fixedText = data.candidates[0].content.parts[0].text;
    
    res.status(200).json({ result: fixedText });
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: '자막 교정 중 오류가 발생했습니다.' });
    }
}