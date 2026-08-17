import crypto from 'crypto';

export default async function handler(req, res) {
  // CORS 설정 (모든 도메인 및 앱 접근 허용)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. Vercel 환경 변수 확인
  const API_KEY = process.env.LASTFM_API_KEY;
  const API_SECRET = process.env.LASTFM_API_SECRET;

  if (!API_KEY || !API_SECRET) {
    return res.status(500).json({ 
      error: "Vercel 환경 변수에 LASTFM_API_KEY 또는 LASTFM_API_SECRET이 설정되지 않았습니다." 
    });
  }

  // 2. GET(query) 및 POST(body - urlencoded/json) 파라미터 완벽 병합
  let params = {};
  if (req.query && typeof req.query === 'object') {
    params = { ...params, ...req.query };
  }

  if (req.body) {
    if (typeof req.body === 'object') {
      params = { ...params, ...req.body };
    } else if (typeof req.body === 'string') {
      try {
        const parsedJson = JSON.parse(req.body);
        params = { ...params, ...parsedJson };
      } catch (e) {
        const searchParams = new URLSearchParams(req.body);
        for (const [key, val] of searchParams.entries()) {
          params[key] = val;
        }
      }
    }
  }

  // 브라우저 웹 로그인 리다이렉트 지원
  if (params.method === 'auth') {
    return res.redirect(`http://www.last.fm/api/auth/?api_key=${API_KEY}&cb=y1%3A%2F%2Flastfm-callback`);
  }

  if (!params.method) {
    return res.status(400).json({ error: "Missing method parameter" });
  }

  // 3. API Key 주입
  params.api_key = API_KEY;

  // 4. Last.fm 규격 MD5 api_sig (서명) 자동 생성
  const keys = Object.keys(params)
    .filter(k => k !== 'format' && k !== 'callback' && k !== 'api_sig')
    .sort();

  let sigString = '';
  for (const k of keys) {
    sigString += k + params[k];
  }
  sigString += API_SECRET;

  const apiSig = crypto.createHash('md5').update(sigString, 'utf8').digest('hex');
  params.api_sig = apiSig;
  params.format = 'json';

  // 5. Last.fm 서버로 요청 전송
  const isPost = req.method === 'POST' || 
                 params.method === 'track.scrobble' || 
                 params.method === 'track.updateNowPlaying' ||
                 params.method === 'auth.getMobileSession';

  try {
    let response;
    if (isPost) {
      const formBody = new URLSearchParams(params).toString();
      response = await fetch('https://ws.audioscrobbler.com/2.0/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
        },
        body: formBody
      });
    } else {
      const queryStr = new URLSearchParams(params).toString();
      response = await fetch(`https://ws.audioscrobbler.com/2.0/?${queryStr}`, {
        method: 'GET'
      });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: "Last.fm communication error: " + error.message });
  }
}
