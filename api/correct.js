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
    const prompt = `다음은 대학 교양 강의(문화예술창업실무 등)의 자동 생성 자막입니다. 
    문맥을 파악해서 발음이 비슷하게 잘못 인식된 오탈자나 어색한 단어를 개연성에 맞게 교정해주세요. 
    (예: '창업도 유소가' -> '창업의 요소가', '엔터 엔터프라이즈' -> '앙트레프레너' 등)
    원본의 의미는 절대 훼손하지 말고 자연스러운 문장으로만 다듬어서 결과만 출력해 주세요.
    \n\n원본 데이터:\n${text}`;
// 기존 api/correct.js 내용 중 fetch 통신하는 부분(try 블록 내부)을 이렇게 수정합니다.

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