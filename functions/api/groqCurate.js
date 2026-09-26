export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  }

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const GROQ_API_KEY = env.GROQ_API_KEY;
  if (!GROQ_API_KEY) {
    return new Response(JSON.stringify({ error: "Missing GROQ_API_KEY in environment" }), { status: 500 });
  }

  const origin = request.headers.get('Origin') || '';
  const clientHeader = request.headers.get('X-App-Client');

  if (clientHeader !== 'socialserv-client') {
    return new Response(JSON.stringify({ error: "Unauthorized client" }), { status: 403 });
  }

  if (origin && !origin.includes('localhost') && !origin.includes('127.0.0.1') && !origin.includes('socialserv')) {
    return new Response(JSON.stringify({ error: "Unauthorized origin" }), { status: 403 });
  }

  try {
    const body = await request.json();

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      throw new Error(`Groq API Network Error: ${res.status}`);
    }

    const data = await res.json();
    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
