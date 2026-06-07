import { NextRequest, NextResponse } from 'next/server';

/**
 * Same-origin image proxy for sofifa CDN assets.
 *
 * sofifa's CDN blocks cross-origin <img> hotlinking from other domains, so player
 * faces / club badges / nation flags won't load directly in the browser. This route
 * fetches them server-side (where they're reachable) and streams them back from our
 * own origin, with long-lived caching.
 *
 * Locked to cdn.sofifa.net to avoid being an open proxy (SSRF protection).
 */

const ALLOWED_HOST = 'cdn.sofifa.net';

export async function GET(req: NextRequest) {
  const u = req.nextUrl.searchParams.get('u');
  if (!u) return new NextResponse('Missing url', { status: 400 });

  let target: URL;
  try {
    target = new URL(u);
  } catch {
    return new NextResponse('Bad url', { status: 400 });
  }

  if (target.hostname !== ALLOWED_HOST) {
    return new NextResponse('Forbidden host', { status: 403 });
  }

  try {
    const upstream = await fetch(target.toString(), {
      headers: { Referer: 'https://sofifa.com/', 'User-Agent': 'Mozilla/5.0' },
      // Cache upstream fetches on the server
      next: { revalidate: 60 * 60 * 24 * 7 },
    });

    if (!upstream.ok) {
      return new NextResponse('Upstream error', { status: upstream.status });
    }

    const buf = await upstream.arrayBuffer();
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': upstream.headers.get('content-type') || 'image/png',
        'Cache-Control': 'public, max-age=604800, immutable',
      },
    });
  } catch {
    return new NextResponse('Fetch failed', { status: 502 });
  }
}
