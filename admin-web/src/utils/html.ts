/**
 * True when editor HTML has visible text or an image, as the backend's content sanitizers require.
 * Parsed inertly (`DOMParser` never runs scripts or loads images).
 */
export function hasVisibleContent(html: string): boolean {
  if (!html) return false;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent ?? '').trim() !== '' || doc.body.querySelector('img') !== null;
}
