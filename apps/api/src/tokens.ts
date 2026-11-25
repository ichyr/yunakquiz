import { createHash, randomBytes } from 'node:crypto';

/** A secret for a cookie or a mailed link: 32 random bytes, base64url. */
export const newToken = () => randomBytes(32).toString('base64url');

/** What the database stores instead of the token, so a leaked table holds no working secret. */
export const hashToken = (token: string) => createHash('sha256').update(token).digest('base64url');
