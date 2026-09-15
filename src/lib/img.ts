/**
 * Rewrite a sofifa CDN image URL to go through our same-origin proxy
 * (/api/img), which is required because sofifa blocks cross-origin hotlinking.
 * Non-proxied hosts or empty URLs are returned unchanged (e.g. local fallback SVG).
 */
const PROXY_HOSTS = new Set(['cdn.sofifa.net', 'cdn3.futbin.com']);

export function proxied(url: string | undefined | null): string {
  if (!url) return '';
  if (!url.startsWith('http')) return url; // local asset
  try {
    const host = new URL(url).hostname;
    if (!PROXY_HOSTS.has(host)) return url;
  } catch {
    return url;
  }
  return `/api/img?u=${encodeURIComponent(url)}`;
}
