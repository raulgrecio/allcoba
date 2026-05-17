/**
 * Extract the embedded `window.profileData` JSON from a TopEscortBabes
 * profile HTML document.
 *
 * The site exposes the full profile as a JS literal inside a `<script>` tag.
 * It is JSON-compatible in practice but not strictly JSON (no quotes around
 * keys is rare here — the page outputs valid JSON-like object literals).
 * We use a `new Function` evaluation in a sandboxed string to avoid the
 * fragility of strict JSON.parse.
 *
 * Pure: takes a string of HTML, returns a typed payload or null. No I/O.
 */

import type { CheerioAPI } from 'cheerio';
import * as cheerio from 'cheerio';

import type { TopEscortBabesPayload } from './topescortbabes.types.js';

const SCRIPT_SELECTOR = 'script:contains("window.profileData")';

/** Extract from a Cheerio handle (when caller already loaded the HTML). */
export const extractProfileDataFromCheerio = (
  $: CheerioAPI,
): TopEscortBabesPayload | null => {
  const script = $(SCRIPT_SELECTOR).html();
  if (!script) return null;
  return parseProfileDataScript(script);
};

/** Extract from a raw HTML string. */
export const extractProfileDataFromHtml = (
  html: string,
): TopEscortBabesPayload | null => {
  return extractProfileDataFromCheerio(cheerio.load(html));
};

/**
 * Parse the body of a `<script>` tag that contains `window.profileData = {…};`.
 * Returns null when the pattern is absent or evaluation throws.
 */
export const parseProfileDataScript = (script: string): TopEscortBabesPayload | null => {
  const match = script.match(
    /window\.profileData\s*=\s*(\{[\s\S]*?\});(?:\s*(?:window|var\s+_req|<)|$)/,
  );
  if (!match || !match[1]) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
    const value = new Function(`return ${match[1]};`)();
    return value as TopEscortBabesPayload;
  } catch {
    return null;
  }
};
