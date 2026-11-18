const SAFE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);

/**
 * Returns the URL if it is safe to put in an href/src, otherwise null. React does not block
 * `javascript:` URLs in attributes, so links built from user content must go through this.
 */
export function sanitizeUrl(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  try {
    const url = new URL(trimmed, window.location.origin);
    return SAFE_PROTOCOLS.has(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

/** C0 controls except tab/newline/CR, DEL, and Unicode bidi embedding/override/isolate characters. */
/* eslint-disable no-control-regex -- matching control characters is the point */
const CONTROL_CHARACTERS =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u202A-\u202E\u2066-\u2069]/g;
/* eslint-enable no-control-regex */

/** Removes control characters (incl. bidi overrides used to disguise text) from user content. */
export function stripControlCharacters(value: string): string {
  return value.replace(CONTROL_CHARACTERS, '');
}
