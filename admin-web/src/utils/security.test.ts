import { sanitizeUrl, stripControlCharacters } from './security';

describe('sanitizeUrl', () => {
  it.each([
    ['https://example.com/a?b=1', 'https://example.com/a?b=1'],
    ['mailto:team@example.com', 'mailto:team@example.com'],
    ['/relative/path', 'http://localhost/relative/path'],
  ])('allows %s', (input, expected) => {
    expect(sanitizeUrl(input)).toBe(expected);
  });

  it.each([
    'javascript:alert(1)',
    ' JavaScript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:x',
    '',
    null,
  ])('blocks %p', (input) => {
    expect(sanitizeUrl(input)).toBeNull();
  });
});

describe('stripControlCharacters', () => {
  it('removes control and bidi override characters but keeps normal text', () => {
    expect(stripControlCharacters('invoice\u202Efdp.exe\u0007 ok')).toBe('invoicefdp.exe ok');
  });
});
