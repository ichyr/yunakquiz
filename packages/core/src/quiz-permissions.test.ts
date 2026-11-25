import { describe, expect, it } from 'vitest';
import {
  canChangeSlug,
  canCreateQuiz,
  canDeleteQuiz,
  canEditQuiz,
  canPublish,
  type Actor,
} from './permissions.ts';

const admin: Actor = { id: 1, role: 'admin', verified: true };
const user: Actor = { id: 3, role: 'user', verified: true };
const unverifiedUser: Actor = { id: 3, role: 'user', verified: false };
const unverifiedAdmin: Actor = { id: 4, role: 'admin', verified: false };
const own = { authorId: 3 };
const other = { authorId: 9 };
const ownerless = { authorId: null };

describe('canCreateQuiz', () => {
  it('lets only verified Accounts create', () => {
    expect(canCreateQuiz(user)).toBe(true);
    expect(canCreateQuiz(admin)).toBe(true);
    expect(canCreateQuiz(unverifiedUser)).toBe(false);
    expect(canCreateQuiz(unverifiedAdmin)).toBe(false);
    expect(canCreateQuiz(null)).toBe(false);
  });
});

describe.each([
  ['canEditQuiz', canEditQuiz],
  ['canDeleteQuiz', canDeleteQuiz],
  ['canPublish', canPublish],
] as const)('%s', (_name, can) => {
  it('allows the Author and any Admin, ownerless Quizzes included', () => {
    expect(can(user, own)).toBe(true);
    expect(can(admin, own)).toBe(true);
    expect(can(admin, other)).toBe(true);
    expect(can(admin, ownerless)).toBe(true);
  });

  it('denies other Users, ownerless Quizzes to Users, and Guests', () => {
    expect(can(user, other)).toBe(false);
    expect(can(user, ownerless)).toBe(false);
    expect(can(null, own)).toBe(false);
    expect(can(null, ownerless)).toBe(false);
  });

  it('denies unverified Accounts, an unverified Admin included', () => {
    expect(can(unverifiedUser, own)).toBe(false);
    expect(can(unverifiedAdmin, ownerless)).toBe(false);
  });
});

describe('canChangeSlug', () => {
  it('locks the slug for an Author after first publish, never for an Admin', () => {
    expect(canChangeSlug(user, { ...own, everPublished: false })).toBe(true);
    expect(canChangeSlug(user, { ...own, everPublished: true })).toBe(false);
    expect(canChangeSlug(admin, { ...own, everPublished: true })).toBe(true);
    expect(canChangeSlug(admin, { ...ownerless, everPublished: true })).toBe(true);
  });

  it('is denied to anyone who cannot edit the Quiz', () => {
    expect(canChangeSlug(user, { ...other, everPublished: false })).toBe(false);
    expect(canChangeSlug(null, { ...own, everPublished: false })).toBe(false);
    expect(canChangeSlug(unverifiedUser, { ...own, everPublished: false })).toBe(false);
  });
});
