/**
 * Pure parsers for nuevoloquo.ch/com/es raw payload fields.
 */

/** Extract numeric ad ID from URL: /escort/{province}/{slug}/{id}/ → id */
export const parseSourceIdFromUrl = (url: string): string => {
  const m = url.match(/\/(\d+)\/?(?:[?#].*)?$/);
  return m ? m[1]! : new URL(url).pathname;
};

export const parseNuevoloquoAge = (raw: string | undefined): number | undefined => {
  if (!raw) return undefined;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

export const parseNuevoloquoHeightCm = (raw: string | undefined): number | undefined => {
  if (!raw) return undefined;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

export const parseNuevoloquoWeightKg = (raw: string | undefined): number | undefined => {
  if (!raw) return undefined;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

export const slugifyNuevoloquo = (str: string | undefined): string | undefined => {
  if (!str) return undefined;
  const slug = str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || undefined;
};
