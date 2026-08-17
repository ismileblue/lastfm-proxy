export default async function handler(req, res) {
  // 1. 안드로이드 앱에서 보낸 요청 파라미터(예: method, artist 등)를 가져옵니다.
  const query = req.query;
  
  // 2. Vercel 환경 변수에서 숨겨둔 API 키를 불러옵니다.
  const API_KEY = process.env.LASTFM_API_KEY;
  const API_SECRET = process.env.LASTFM_API_SECRET; // 시크릿 키 불러오기
  if (!API_KEY) {
    return res.status(500).json({ error: "API Key is not configured on server" });
  }

  // 3. 파라미터를 조합하여 실제 Last.fm API URL을 만듭니다.
  const queryParams = new URLSearchParams(query).toString();
  const targetUrl = `https://ws.audioscrobbler.com/2.0/?${queryParams}&api_key=${API_KEY}&format=json`;

  try {
    // 4. Last.fm 서버로 요청을 보냅니다.
    const response = await fetch(targetUrl);
    const data = await response.json();

    // 5. Last.fm에서 받은 결과를 그대로 내 안드로이드 앱으로 돌려줍니다.
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch from Last.fm" });
  }
}