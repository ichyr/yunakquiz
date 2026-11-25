import { hash, parseOptions, verify } from '@node-rs/argon2';

/** See docs/password-hashing.md and ADR 0008. */

// OWASP minimum for argon2id: 19 MiB, 2 iterations, parallelism 1. 2 is Algorithm.Argon2id; the
// package's `const enum` cannot be imported when TypeScript is only stripped, not compiled.
const ARGON2ID = 2;
const argonParams = { algorithm: ARGON2ID, memoryCost: 19_456, timeCost: 2, parallelism: 1 };

const MIN_PEPPER_LENGTH = 16;

export type Pepper = { version: string; secret: string };

/**
 * Parses `PASSWORD_PEPPERS=v2:<secret>,v1:<secret>`. The first entry is current.
 * Throws on a missing, empty or malformed value, so the API never starts unpeppered.
 */
export function parsePeppers(raw: string | undefined): Pepper[] {
  const entries = (raw ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (entries.length === 0) {
    throw new Error('PASSWORD_PEPPERS must hold at least one pepper, as version:secret');
  }
  const peppers = entries.map((entry) => {
    const separator = entry.indexOf(':');
    const version = entry.slice(0, separator);
    const secret = entry.slice(separator + 1);
    if (separator < 1 || !/^[A-Za-z0-9_-]+$/.test(version)) {
      throw new Error('PASSWORD_PEPPERS entries must look like version:secret');
    }
    if (secret.length < MIN_PEPPER_LENGTH) {
      throw new Error(`PASSWORD_PEPPERS secrets must be at least ${MIN_PEPPER_LENGTH} characters`);
    }
    return { version, secret };
  });
  if (new Set(peppers.map((pepper) => pepper.version)).size !== peppers.length) {
    throw new Error('PASSWORD_PEPPERS lists a version twice');
  }
  return peppers;
}

export type StoredPassword = { passwordHash: string; pepperVersion: string };

export type PasswordVerdict = {
  ok: boolean;
  /** Set when the password was right but the stored hash is not current. Save it. */
  rehash?: StoredPassword;
};

// The same Unicode form validatePassword checks, so a password hashes the same wherever typed.
const prepare = (password: string) => password.normalize('NFKC');

export function createPasswordHasher(peppers: Pepper[]) {
  const current = peppers[0];
  if (!current) throw new Error('PASSWORD_PEPPERS must hold at least one pepper');
  const byVersion = new Map(peppers.map((pepper) => [pepper.version, pepper.secret]));
  const secretOf = (version: string) => {
    const secret = byVersion.get(version);
    return secret === undefined ? undefined : Buffer.from(secret);
  };

  async function hashPassword(password: string): Promise<StoredPassword> {
    const passwordHash = await hash(prepare(password), {
      ...argonParams,
      secret: Buffer.from(current!.secret),
    });
    return { passwordHash, pepperVersion: current!.version };
  }

  // Verified when the email is unknown or its pepper is retired, so those paths cost the same.
  let dummy: Promise<string> | undefined;
  const dummyHash = () =>
    (dummy ??= hashPassword(crypto.randomUUID()).then((stored) => stored.passwordHash));

  function isCurrent(stored: StoredPassword) {
    if (stored.pepperVersion !== current!.version) return false;
    try {
      const options = parseOptions(stored.passwordHash);
      return (
        options.algorithm === argonParams.algorithm &&
        options.memoryCost === argonParams.memoryCost &&
        options.timeCost === argonParams.timeCost &&
        options.parallelism === argonParams.parallelism
      );
    } catch {
      return false;
    }
  }

  return {
    hash: hashPassword,

    /** Takes the time of one verification even when there is no stored hash to check. */
    async verifyAgainstNothing(password: string): Promise<void> {
      await verify(await dummyHash(), prepare(password), { secret: Buffer.from(current!.secret) });
    },

    async verify(stored: StoredPassword, password: string): Promise<PasswordVerdict> {
      const secret = secretOf(stored.pepperVersion);
      if (!secret) {
        await this.verifyAgainstNothing(password);
        return { ok: false };
      }
      let ok = false;
      try {
        ok = await verify(stored.passwordHash, prepare(password), { secret });
      } catch {
        ok = false;
      }
      if (!ok) return { ok: false };
      return isCurrent(stored) ? { ok: true } : { ok: true, rehash: await hashPassword(password) };
    },
  };
}

export type PasswordHasher = ReturnType<typeof createPasswordHasher>;
