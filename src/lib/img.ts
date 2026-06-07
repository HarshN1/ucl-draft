/**
 * Rewrite a sofifa CDN image URL to go through our same-origin proxy
 * (/api/img), which is required because sofifa blocks cross-origin hotlinking.
 * Non-sofifa or empty URLs are returned unchanged (e.g. local fallback SVG).
 */
export function proxied(url: string | undefined | null): string {
  if (!url) return '';
  if (!url.startsWith('http')) return url; // local asset
  return `/api/img?u=${encodeURIComponent(url)}`;
}
