import { describe, expect, it } from 'vitest';
import {
  changeDisplayNameInputSchema,
  changeEmailInputSchema,
  changePasswordInputSchema,
  deleteAccountInputSchema,
  loginInputSchema,
  PASSWORD_INPUT_MAX_LENGTH,
  registerInputSchema,
} from './index.ts';

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

describe('account change inputs', () => {
  const tooLong = 'a'.repeat(PASSWORD_INPUT_MAX_LENGTH + 1);

  it('bounds every password field, so a request cannot force huge hashing work', () => {
    expect(
      changePasswordInputSchema.safeParse({ currentPassword: tooLong, newPassword: 'x' }).success,
    ).toBe(false);
    expect(
      changePasswordInputSchema.safeParse({ currentPassword: 'x', newPassword: tooLong }).success,
    ).toBe(false);
    expect(
      changeEmailInputSchema.safeParse({ newEmail: 'a@b.co', currentPassword: tooLong }).success,
    ).toBe(false);
    expect(deleteAccountInputSchema.safeParse({ currentPassword: tooLong }).success).toBe(false);
  });

  it('normalises the new email and display name like registration does', () => {
    expect(
      changeEmailInputSchema.parse({ newEmail: ' New@Example.com ', currentPassword: 'x' })
        .newEmail,
    ).toBe('new@example.com');
    expect(changeDisplayNameInputSchema.parse({ displayName: '  Олена ' }).displayName).toBe(
      'Олена',
    );
    expect(changeDisplayNameInputSchema.safeParse({ displayName: 'O' }).success).toBe(false);
  });
});
