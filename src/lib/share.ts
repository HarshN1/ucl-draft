export function buildDraftShareText(
  draftScore: number,
  formation: string,
  teamName: string
): string {
  return `⚽ ${teamName} — ${draftScore} pts (${formation}) · FUT Draft`;
}

export async function shareDraft(
  draftScore: number,
  formation: string,
  teamName: string,
  squadUrl?: string
): Promise<'shared' | 'copied' | 'failed'> {
  const text = buildDraftShareText(draftScore, formation, teamName);
  const shareUrl = squadUrl ?? (typeof window !== 'undefined' ? window.location.origin : '');

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title: 'FUT Draft', text, url: shareUrl });
      return 'shared';
    } catch (err) {
      if ((err as Error).name === 'AbortError') return 'failed';
    }
  }

  try {
    await navigator.clipboard.writeText(`${text}\n${shareUrl}`);
    return 'copied';
  } catch {
    return 'failed';
  }
}

export function buildShareText(
  draftScore: number,
  result: string,
  formation: string,
  teamName: string
): string {
  const emoji = result === 'Champions' ? '🏆' : '⚽';
  return `${emoji} ${teamName} — ${draftScore} pts (${formation}) · ${result}`;
}

export async function shareResult(
  draftScore: number,
  result: string,
  formation: string,
  teamName: string,
  squadUrl?: string
): Promise<'shared' | 'copied' | 'failed'> {
  const text = buildShareText(draftScore, result, formation, teamName);
  const shareUrl = squadUrl ?? (typeof window !== 'undefined' ? window.location.origin : '');

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title: 'FUT Draft', text, url: shareUrl });
      return 'shared';
    } catch (err) {
      if ((err as Error).name === 'AbortError') return 'failed';
    }
  }

  try {
    await navigator.clipboard.writeText(`${text}\n${shareUrl}`);
    return 'copied';
  } catch {
    return 'failed';
  }
}
