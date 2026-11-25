import { describe, expect, it } from 'vitest';
import { categoryInputSchema } from './category-admin.ts';
import { canManageCategories, type Actor } from './permissions.ts';

const admin: Actor = { id: 1, role: 'admin', verified: true };
const user: Actor = { id: 2, role: 'user', verified: true };
const unverifiedAdmin: Actor = { id: 3, role: 'admin', verified: false };

describe('canManageCategories', () => {
  it('allows only a verified Admin', () => {
    expect(canManageCategories(admin)).toBe(true);
    expect(canManageCategories(user)).toBe(false);
    expect(canManageCategories(unverifiedAdmin)).toBe(false);
    expect(canManageCategories(null)).toBe(false);
  });
});

describe('categoryInputSchema', () => {
  it('accepts a name and a lowercase slug', () => {
    expect(
      categoryInputSchema.parse({ name: 'Історія України', slug: 'istoriia-ukrainy' }),
    ).toEqual({ name: 'Історія України', slug: 'istoriia-ukrainy' });
  });

  it('trims the name and rejects an empty one', () => {
    expect(categoryInputSchema.parse({ name: '  Знання  ', slug: 'znannia' }).name).toBe('Знання');
    expect(categoryInputSchema.safeParse({ name: '   ', slug: 'znannia' }).success).toBe(false);
  });

  it('rejects a slug that is not lowercase words joined by single hyphens', () => {
    for (const slug of ['Bad Slug', 'double--hyphen', '-leading', 'trailing-', '', 'ukrainian_s']) {
      expect(categoryInputSchema.safeParse({ name: 'X', slug }).success).toBe(false);
    }
  });

  it('caps the name length', () => {
    expect(categoryInputSchema.safeParse({ name: 'a'.repeat(101), slug: 'a' }).success).toBe(false);
  });
});
