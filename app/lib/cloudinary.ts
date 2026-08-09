const CLOUDINARY_REGEX =
  /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)/;

function isCloudinaryUrl(url: string): boolean {
  return CLOUDINARY_REGEX.test(url);
}

export function getOptimizedImageUrl(
  url: string | undefined | null,
  width: number,
  height?: number,
  quality?: string,
): string | undefined {
  if (!url) return undefined;

  if (quality === "original") return url;

  const match = url.match(CLOUDINARY_REGEX);
  if (!match) return url;

  const base = match[1];
  const rest = url.slice(base.length);
  const h = height ?? width;
  const transform = `w_${width},h_${h},c_fill,${quality ?? "q_auto"},f_auto`;
  return `${base}${transform}/${rest}`;
}

export function getBlurPlaceholderUrl(
  url: string | undefined | null,
): string | undefined {
  if (!url) return undefined;
  if (!isCloudinaryUrl(url)) return undefined;

  const match = url.match(CLOUDINARY_REGEX);
  if (!match) return undefined;

  const base = match[1];
  const rest = url.slice(base.length);
  return `${base}w_20,e_blur:1000,q_auto,f_webp/${rest}`;
}
