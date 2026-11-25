export type RegistrationMode = 'open' | 'closed';

/** REGISTRATION_MODE: `open` (default) or `closed`. Anything else fails at startup, never silently opens. */
export function parseRegistrationMode(value: string | undefined): RegistrationMode {
  if (value === undefined || value === '') return 'open';
  if (value === 'open' || value === 'closed') return value;
  throw new Error(`REGISTRATION_MODE must be "open" or "closed", got "${value}"`);
}
