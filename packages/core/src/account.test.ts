import { describe, expect, it } from 'vitest';
import { loginInputSchema, registerInputSchema } from './index.ts';

const valid = {
  email: 'Olena@Example.com ',
  displayName: '  Олена  ',
  password: 'bright lantern over quiet harbour',
  interfaceLanguage: 'uk',
};

describe('registerInputSchema', () => {
  it('trims and lower-cases the email and trims the display name', () => {
    const parsed = registerInputSchema.parse(valid);
    expect(parsed.email).toBe('olena@example.com');
    expect(parsed.displayName).toBe('Олена');
  });

  it('keeps the password exactly as typed, spaces included', () => {
    expect(registerInputSchema.parse(valid).password).toBe(valid.password);
  });

  it('rejects a display name outside 2 to 50 characters', () => {
    expect(registerInputSchema.safeParse({ ...valid, displayName: 'O' }).success).toBe(false);
    expect(registerInputSchema.safeParse({ ...valid, displayName: 'O'.repeat(51) }).success).toBe(
      false,
    );
    expect(registerInputSchema.safeParse({ ...valid, displayName: 'O'.repeat(50) }).success).toBe(
      true,
    );
  });

  it('rejects an invalid email and an unknown Interface Language', () => {
    expect(registerInputSchema.safeParse({ ...valid, email: 'nope' }).success).toBe(false);
    expect(registerInputSchema.safeParse({ ...valid, interfaceLanguage: 'de' }).success).toBe(
      false,
    );
  });
});

describe('loginInputSchema', () => {
  it('needs a non-empty password but applies no password rules', () => {
    expect(loginInputSchema.safeParse({ email: 'a@b.co', password: 'x' }).success).toBe(true);
    expect(loginInputSchema.safeParse({ email: 'a@b.co', password: '' }).success).toBe(false);
  });
});
