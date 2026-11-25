import { dictionary } from '@zxcvbn-ts/language-common';

/**
 * Password policy after NIST SP 800-63B: length and blocklist checks, no composition rules.
 * Pure and offline. Codes only; the web app turns them into copy per Interface Language.
 */

export const PASSWORD_MIN_LENGTH = 15;
export const PASSWORD_MAX_LENGTH = 128;

/** Identity parts shorter than this are skipped: "al" inside a password says nothing. */
const MIN_IDENTITY_LENGTH = 3;

export type PasswordIssue =
  'too_short' | 'too_long' | 'common' | 'contains_email' | 'contains_name' | 'sequence' | 'repeat';

export type PasswordResult = { ok: true } | { ok: false; issues: PasswordIssue[] };

export type PasswordIdentity = { email: string; name: string };

const normalise = (text: string) => text.normalize('NFKC').toLowerCase();

const commonPasswords = new Set(dictionary['passwords-common']?.map(normalise));

const cyclic = (alphabet: string, length: number) => {
  const run = alphabet.repeat(Math.ceil(length / alphabet.length) + 1);
  return [run, [...run].toReversed().join('')];
};
// Long enough to hold any 128-character run, so the digits wrap 9 -> 0 and z -> a.
const sequenceRuns = [
  ...cyclic('0123456789', PASSWORD_MAX_LENGTH),
  ...cyclic('abcdefghijklmnopqrstuvwxyz', PASSWORD_MAX_LENGTH),
];

const isSequence = (password: string) => sequenceRuns.some((run) => run.includes(password));
const isRepeat = (password: string) => /^(.+?)\1+$/su.test(password);

const containsPart = (password: string, part: string) =>
  part.length >= MIN_IDENTITY_LENGTH && password.includes(part);

export const validatePassword = (
  password: string,
  { email, name }: PasswordIdentity,
): PasswordResult => {
  // Reject first: the later checks (the repeat regex above all) must never see a huge input.
  const length = [...password.normalize('NFKC')].length;
  if (length > PASSWORD_MAX_LENGTH) return { ok: false, issues: ['too_long'] };
  const text = normalise(password);
  const localPart = normalise(email.slice(0, email.lastIndexOf('@')));
  const issues: PasswordIssue[] = [];

  if (length < PASSWORD_MIN_LENGTH) issues.push('too_short');
  if (commonPasswords.has(text)) issues.push('common');
  if (containsPart(text, localPart)) issues.push('contains_email');
  if (containsPart(text, normalise(name.trim()))) issues.push('contains_name');
  if (isSequence(text)) issues.push('sequence');
  if (isRepeat(text)) issues.push('repeat');

  return issues.length === 0 ? { ok: true } : { ok: false, issues };
};
