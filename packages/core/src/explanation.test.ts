import { describe, expect, it } from 'vitest';
import { explanationParagraphs } from './index.ts';

describe('explanationParagraphs', () => {
  it('keeps a single paragraph whole, including single line breaks', () => {
    expect(explanationParagraphs('One line\nand the next')).toEqual(['One line\nand the next']);
  });

  it('splits at blank lines, including ones with whitespace or CRLF', () => {
    expect(explanationParagraphs('First\n\nSecond\r\n \r\nThird')).toEqual([
      'First',
      'Second',
      'Third',
    ]);
  });

  it('drops leading, trailing and repeated blank lines', () => {
    expect(explanationParagraphs('\n\nFirst\n\n\n\nSecond\n\n')).toEqual(['First', 'Second']);
  });
});
