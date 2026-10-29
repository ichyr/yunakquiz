import { describe, expect, it } from 'vitest';
import { splitParagraphs } from './paragraphs.ts';

describe('splitParagraphs', () => {
  it('keeps a single paragraph whole, including single line breaks', () => {
    expect(splitParagraphs('One line\nand the next')).toEqual(['One line\nand the next']);
  });

  it('splits at blank lines, including ones with whitespace or CRLF', () => {
    expect(splitParagraphs('First\n\nSecond\r\n \r\nThird')).toEqual(['First', 'Second', 'Third']);
  });

  it('drops leading, trailing and repeated blank lines', () => {
    expect(splitParagraphs('\n\nFirst\n\n\n\nSecond\n\n')).toEqual(['First', 'Second']);
  });
});
