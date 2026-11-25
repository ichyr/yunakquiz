import { z } from 'zod';

export const interfaceLanguageSchema = z.enum(['uk', 'en']);

export const DISPLAY_NAME_MIN_LENGTH = 2;
export const DISPLAY_NAME_MAX_LENGTH = 50;

const email = z.string().trim().toLowerCase().pipe(z.email());

const displayName = z.string().trim().min(DISPLAY_NAME_MIN_LENGTH).max(DISPLAY_NAME_MAX_LENGTH);

/**
 * The password is never trimmed or changed here: spaces are allowed, and the password rules
 * (`validatePassword`) and hashing normalise it themselves.
 */
export const registerInputSchema = z.object({
  email,
  displayName,
  password: z.string().min(1),
  interfaceLanguage: interfaceLanguageSchema,
});

/** Login applies no password rules: an old password must keep working if the rules change. */
export const loginInputSchema = z.object({
  email,
  password: z.string().min(1),
});

export const tokenInputSchema = z.object({ token: z.string().min(1).max(200) });

export const roleSchema = z.enum(['user', 'admin']);

/** The Account as the signed-in person sees it. Never contains the hash. */
export const accountSchema = z.object({
  email: z.string(),
  displayName: z.string(),
  role: roleSchema,
  verified: z.boolean(),
  interfaceLanguage: interfaceLanguageSchema,
});

export type InterfaceLanguage = z.infer<typeof interfaceLanguageSchema>;
export type RegisterInput = z.input<typeof registerInputSchema>;
export type LoginInput = z.input<typeof loginInputSchema>;
export type Account = z.infer<typeof accountSchema>;
