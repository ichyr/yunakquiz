import { z } from 'zod';
import { PASSWORD_INPUT_MAX_LENGTH, registerInputSchema } from './account.ts';

/** Same email rules as register, so a typo is caught the same way everywhere. */
export const requestResetInputSchema = z.object({ email: registerInputSchema.shape.email });

/**
 * The new password is bounded here, and judged by `validatePassword` once the Account's email
 * and name are known (the API looks them up from the token).
 */
export const resetPasswordInputSchema = z.object({
  token: z.string().min(1).max(200),
  password: z.string().min(1).max(PASSWORD_INPUT_MAX_LENGTH),
});

export type RequestResetInput = z.input<typeof requestResetInputSchema>;
export type ResetPasswordInput = z.input<typeof resetPasswordInputSchema>;
