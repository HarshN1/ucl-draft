import { NextRequest, NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { isKvConfigured, getRedis } from '@/lib/kv';
import { addEntry, getTop, validateEntry } from '@/lib/leaderboardStore';

const LOCAL_MODE_HEADER = 'X-Leaderboard-Mode';

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'anonymous'
  );
}

let _ratelimit: Ratelimit | null = null;

function getRatelimit(): Ratelimit {
  if (!_ratelimit) {
    _ratelimit = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(5, '1 h'),
      prefix: 'leaderboard:ratelimit',
    });
  }
  return _ratelimit;
}

export async function GET(req: NextRequest) {
  if (!isKvConfigured()) {
    return NextResponse.json([], {
      headers: { [LOCAL_MODE_HEADER]: 'local' },
    });
  }

  const limit = Math.min(
    100,
    Math.max(1, parseInt(req.nextUrl.searchParams.get('limit') ?? '10', 10) || 10)
  );

  try {
    const entries = await getTop(limit);
    return NextResponse.json(entries, {
      headers: { [LOCAL_MODE_HEADER]: 'global' },
    });
  } catch {
    return NextResponse.json([], {
      status: 503,
      headers: { [LOCAL_MODE_HEADER]: 'local' },
    });
  }
}

export async function POST(req: NextRequest) {
  if (!isKvConfigured()) {
    return NextResponse.json(
      { error: 'Leaderboard unavailable — KV not configured' },
      { status: 503, headers: { [LOCAL_MODE_HEADER]: 'local' } }
    );
  }

  const ip = getClientIp(req);
  const { success, reset } = await getRatelimit().limit(ip);
  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded (5 submissions per hour)' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)),
          [LOCAL_MODE_HEADER]: 'global',
        },
      }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const entry = {
    teamName: String(body.teamName ?? ''),
    formation: String(body.formation ?? ''),
    draftScore: Number(body.draftScore),
    result: String(body.result ?? ''),
    timestamp: Date.now(),
  };

  const validationError = validateEntry(entry);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  try {
    const saved = await addEntry(entry);
    return NextResponse.json(saved, {
      status: 201,
      headers: { [LOCAL_MODE_HEADER]: 'global' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save entry';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
