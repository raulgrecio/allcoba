/**
 * Pure parsers for the discovery catch-all adapter.
 */

import { Buffer } from 'buffer';

/** Hash estable de la URL → sourceId consistente entre corridas. */
export const hashUrl = (url: string): string => {
  const b64 = Buffer.from(url).toString('base64').replace(/[^a-z0-9]/gi, '');
  return `disc_${b64.substring(0, 8)}${b64.substring(b64.length - 8)}`;
};
