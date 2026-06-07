export function buildShareText(
  draftScore: number,
  result: string,
  formation: string,
  teamName: string
): string {
  const emoji = result === 'Champions' ? '🏆' : '⚽';
  return `${emoji} ${teamName} scored ${draftScore} in FUT Draft (${formation}) — ${result}! Can you beat 194?`;
}

export async function shareResult(
  draftScore: number,
  result: string,
  formation: string,
  teamName: string,
  url?: string
): Promise<'shared' | 'copied' | 'failed'> {
  const text = buildShareText(draftScore, result, formation, teamName);
  const shareUrl = url ?? (typeof window !== 'undefined' ? window.location.origin : '');

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
