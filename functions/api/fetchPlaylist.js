export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      }
    });
  }

  const origin = request.headers.get('Origin') || '';
  const clientHeader = request.headers.get('X-App-Client') || request.headers.get('x-app-client');

  if (clientHeader !== 'HearApp') {
    return Response.json({ error: "Unauthorized client" }, { status: 403, headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  if (origin && !origin.includes('localhost') && !origin.includes('127.0.0.1') && !origin.includes('socialserv')) {
    return Response.json({ error: "Unauthorized origin" }, { status: 403, headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  const playlistUrl = url.searchParams.get('playlistUrl');

  if (!playlistUrl || !/(open\.spotify\.com\/(playlist|s|album)\/|spotify\.link\/|spoti\.fi\/)/i.test(playlistUrl)) {
    return Response.json({ error: 'Invalid or missing Spotify URL' }, { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  try {
    let finalUrl = playlistUrl;
    
    // Resolve short links first
    if (finalUrl.includes('spotify.link/') || finalUrl.includes('spoti.fi/') || finalUrl.includes('open.spotify.com/s/')) {
      const redirectResponse = await fetch(finalUrl, { 
        redirect: 'manual',
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
      });
      
      const location = redirectResponse.headers.get('location');
      if (!location) {
        return Response.json({ error: 'Failed to resolve short link: no location header found' }, { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } });
      }
      finalUrl = location;
    }

    let embedUrl = finalUrl;
    if (finalUrl.includes('/playlist/')) {
        const match = finalUrl.match(/\/playlist\/([a-zA-Z0-9]+)/);
        if (match) {
            embedUrl = `https://open.spotify.com/embed/playlist/${match[1]}`;
        } else {
            return Response.json({ error: 'Invalid Spotify playlist URL' }, { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } });
        }
    } else if (finalUrl.includes('/album/')) {
        const match = finalUrl.match(/\/album\/([a-zA-Z0-9]+)/);
        if (match) {
            embedUrl = `https://open.spotify.com/embed/album/${match[1]}`;
        } else {
            return Response.json({ error: 'Invalid Spotify album URL' }, { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } });
        }
    } else {
        return Response.json({ error: 'Could not extract playlist or album ID from URL' }, { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    console.log("Server API fetching:", embedUrl);
    const response = await fetch(embedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      return Response.json({ error: `Spotify API blocked the request: ${response.status} ${response.statusText}` }, { status: response.status, headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    const html = await response.text();
    const tagStart = '<script id="__NEXT_DATA__" type="application/json">';
    const startIdx = html.indexOf(tagStart);

    if (startIdx === -1) {
      return Response.json({ error: 'Metadata block not found in Spotify response' }, { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    const jsonStart = startIdx + tagStart.length;
    const jsonEnd = html.indexOf('</script>', jsonStart);
    const rawJson = html.substring(jsonStart, jsonEnd);

    const parsed = JSON.parse(rawJson);
    const trackList = parsed?.props?.pageProps?.state?.data?.entity?.trackList || [];

    if (trackList.length === 0) {
      return Response.json({ error: 'No tracks found in the playlist' }, { status: 404, headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    const format = url.searchParams.get('format');

    if (format === 'json') {
      const formattedJson = trackList.map((t, index) => ({
         rank: index + 1,
         id: t.uid || t.id || `track_${index}`,
         title: t.title,
         artists: t.subtitle,
         albumArt: t.coverArt?.sources?.[0]?.url || '',
         durationMs: t.duration || 0,
         previewUrl: t.audioPreview?.url || null
      }));
      return Response.json({ 
        name: parsed?.props?.pageProps?.state?.data?.entity?.name || 'Playlist',
        tracks: formattedJson 
      }, { headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    // Format the tracks into a clean string directly on the server to save client processing
    const formattedTracks = trackList.map(t => `${t.title} - ${t.subtitle}`).filter(t => t !== ' - ').join('\n');

    return Response.json({ tracks: formattedTracks }, { headers: { 'Access-Control-Allow-Origin': '*' } });

  } catch (error) {
    console.error("Server API Error:", error);
    return Response.json({ error: 'Internal server error while fetching playlist' }, { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
  }
}
