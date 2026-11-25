import { describe, expect, it } from 'vitest';
import { validatePassword, type PasswordIssue } from './index.ts';

const who = { email: 'olena.kovalenko@example.com', name: 'Olena K' };
const strong = 'bright lantern over quiet harbour';
const issues = (password: string, identity = who): PasswordIssue[] => {
  const result = validatePassword(password, identity);
  return result.ok ? [] : result.issues;
};
// Varied text of exactly `length` characters that trips no other rule.
const padded = (length: number) => 'xq7'.repeat(length).slice(0, length - 1) + 'Z';

describe('validatePassword', () => {
  it('accepts a long passphrase with spaces and no composition rules', () => {
    expect(validatePassword(strong, who)).toEqual({ ok: true });
    expect(validatePassword('всі скаути люблять ватру', who)).toEqual({ ok: true });
  });

  describe('length', () => {
    it('rejects 14 characters and accepts 15', () => {
      expect(issues(padded(14))).toEqual(['too_short']);
      expect(issues(padded(15))).toEqual([]);
    });

    it('accepts 128 characters and rejects 129', () => {
      expect(issues(padded(128))).toEqual([]);
      expect(issues(padded(129))).toEqual(['too_long']);
    });

    it('counts characters, not UTF-16 units', () => {
      expect(issues('🏕🔥🌲⛺🧭🎒🪢🔦🌄🥾🏞🦌🐻🌙🪵')).toEqual([]);
      expect(issues('🏕🔥🌲⛺🧭🎒🪢🔦🌄🥾🏞🦌🐻🌙')).toEqual(['too_short']);
    });

    it('measures length after NFKC normalisation', () => {
      // "ﬃ" is one character that normalises to three letters: 5 x 3 + 1 = 16.
      expect(issues('ﬃ'.repeat(5) + 'x')).toEqual([]);
      // Fullwidth letters stay one character each: 14 of them is still too short.
      expect(issues('ｑｗｅｒｔｙｕｉｏｐａｓｄｆ')).toEqual(['too_short']);
    });
  });

  describe('common passwords', () => {
    it('rejects a listed password', () => {
      expect(issues('password')).toContain('common');
    });

    it('matches case-insensitively and after normalisation', () => {
      expect(issues('PASSWORD')).toContain('common');
      expect(issues('ｐａｓｓｗｏｒｄ')).toContain('common');
    });

    it('does not reject a passphrase that merely contains a common word', () => {
      expect(issues('my password is a lantern')).toEqual([]);
    });
  });

  describe('email and name', () => {
    it('rejects a password containing the email local part, ignoring case', () => {
      expect(issues('xx OLENA.kovalenko xx yy zz')).toEqual(['contains_email']);
    });

    it('rejects a password containing the display name, ignoring case', () => {
      expect(issues('my name is olena k really')).toEqual(['contains_name']);
    });

    it('ignores a domain that is not the local part', () => {
      expect(issues('visit example.com every day')).toEqual([]);
    });

    it('ignores identity parts too short to mean anything', () => {
      expect(issues(strong, { email: 'lo@example.com', name: 'Lo' })).toEqual([]);
    });
  });

  describe('sequences and repeats', () => {
    it('rejects ascending and descending digit runs, wrapping past 9', () => {
      expect(issues('123456789012345')).toEqual(['sequence']);
      expect(issues('987654321098765')).toEqual(['sequence']);
    });

    it('rejects alphabet runs', () => {
      expect(issues('abcdefghijklmnop')).toEqual(['sequence']);
      expect(issues('ZYXWVUTSRQPONMLK')).toEqual(['sequence']);
    });

    it('rejects one character repeated', () => {
      expect(issues('a'.repeat(20))).toEqual(['repeat']);
    });

    it('rejects a short unit repeated', () => {
      expect(issues('abcabcabcabcabc')).toEqual(['repeat']);
      expect(issues('ab12ab12ab12ab12')).toEqual(['repeat']);
    });

    it('accepts a sequence embedded in a longer, varied password', () => {
      expect(issues('1234 lantern over harbour')).toEqual([]);
    });
  });

  it('reports every failing rule', () => {
    expect(issues('aaa', { email: 'aaa@example.com', name: 'Olena' })).toEqual([
      'too_short',
      'contains_email',
      'repeat',
    ]);
  });
});
