import { htmlToText } from '../src/utils/html';

describe('htmlToText', () => {
  it('turns block elements into paragraphs and drops tags', () => {
    expect(htmlToText('<h2>What we collect</h2><p>Your <b>name</b> &amp; email.</p>')).toBe('What we collect\nYour name & email.');
  });
  it('bullets list items and handles line breaks and entities', () => {
    expect(htmlToText('<ul><li>One</li><li>Two&nbsp;things</li></ul>Line<br/>two')).toBe('• One\n• Two things\n\nLine\ntwo');
  });
  it('collapses blank runs and trims', () => {
    expect(htmlToText('  <p>A</p><p></p><p></p><p>B</p>  ')).toBe('A\n\nB');
  });
  it('keeps unknown entities as they are', () => {
    expect(htmlToText('5 &lt; 6 &copy;')).toBe('5 < 6 &copy;');
  });
});
