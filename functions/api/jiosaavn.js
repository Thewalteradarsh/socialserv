export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'x-app-client',
      }
    });
  }

  const origin = request.headers.get('Origin') || '';
  const clientHeader = request.headers.get('x-app-client') || request.headers.get('X-App-Client');

  if (clientHeader !== 'HearApp') {
    return Response.json({ error: "Unauthorized client" }, { status: 403, headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  if (origin && !origin.includes('localhost') && !origin.includes('127.0.0.1') && !origin.includes('socialserv')) {
    return Response.json({ error: "Unauthorized origin" }, { status: 403, headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  const endpoint = url.searchParams.get('endpoint');
  if (!endpoint) {
    return Response.json({ error: 'Missing endpoint parameter' }, { status: 400 });
  }

  // Remove endpoint so we don't pass it twice
  url.searchParams.delete('endpoint');

  const API_QUEUE = [
    // Primary Instances
    'https://saavn.dev/api',
    'https://saavn.me',
    'https://saavn.sumit.co',
    
    // Vercel Serverless Mirrors
    'https://jiosaavn-api-privatecvc2.vercel.app',
    'https://jiosaavn-api-v3.vercel.app',
    'https://nepotuneapi.vercel.app/api',
    'https://jiosaavn-api-lemon.vercel.app'
  ];

  let lastError = null;

  for (let i = 0; i < API_QUEUE.length; i++) {
    const baseUrl = API_QUEUE[i];
    const targetUrl = new URL(baseUrl);
    
    targetUrl.pathname = `${targetUrl.pathname === '/' ? '' : targetUrl.pathname}/${endpoint.startsWith('/') ? endpoint.slice(1) : endpoint}`;
    
    // Append all other query params
    url.searchParams.forEach((value, key) => {
      targetUrl.searchParams.append(key, value);
    });

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(targetUrl.toString(), {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.status === 429 || response.status >= 500) {
        throw new Error(`API returned HTTP ${response.status}`);
      }

      if (!response.ok) {
        if (response.status === 404) {
           return Response.json({ error: 'Not found' }, { status: 404, headers: { 'Access-Control-Allow-Origin': '*' } });
        }
        throw new Error(`API returned HTTP ${response.status}`);
      }

      const text = await response.text();
      if (text.startsWith('<')) {
        throw new Error('API returned HTML instead of JSON');
      }

      const data = JSON.parse(text);
      return Response.json(data, { headers: { 'Access-Control-Allow-Origin': '*' } });

    } catch (err) {
      lastError = err.message;
    }
  }

  return Response.json({ 
    error: 'All unofficial JioSaavn APIs failed to respond.',
    lastError 
  }, { status: 502, headers: { 'Access-Control-Allow-Origin': '*' } });
}
