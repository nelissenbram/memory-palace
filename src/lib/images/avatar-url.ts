/**
 * OPS-017/OPS-022 — avatars are stored as full-resolution Supabase public-storage
 * URLs but render in small slots (36–64px). Rewrite the stored URL to the Supabase
 * image-transform endpoint (`/render/image/public/`) so the server delivers a
 * small cover-cropped rendition (default 96px ≈ 2x for retina). Non-Supabase-storage
 * URLs pass through untouched; callers keep their own onError fallback to the
 * original URL (see PalaceCard onError chain).
 */
export function smallAvatarUrl(url: string, size = 96): string {
  const marker = "/storage/v1/object/public/";
  const i = url.indexOf(marker);
  if (i === -1) return url;
  const rest = url.slice(i + marker.length);
  const qIdx = rest.indexOf("?");
  const path = qIdx === -1 ? rest : rest.slice(0, qIdx);
  const origQuery = qIdx === -1 ? "" : `&${rest.slice(qIdx + 1)}`;
  return `${url.slice(0, i)}/storage/v1/render/image/public/${path}?width=${size}&height=${size}&resize=cover&quality=70${origQuery}`;
}
