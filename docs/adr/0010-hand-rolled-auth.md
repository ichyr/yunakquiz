# Authentication is hand-rolled, not a library

Authentication is a Fastify plugin of about 200 lines, built on `@fastify/cookie` with Drizzle as the session store (design in ADR 0008). We chose this over a third-party auth library or hosted service because our needs are one client, email and password, and two roles. A library would bring its own tables, session model and upgrade path, and would hide the rules we want visible and tested: generic responses, equal timing, the pepper and rehash flow. The plugin is small enough to read in one sitting and API tests cover its behaviour.

Rejected: a hosted identity service, which adds a vendor and a network dependency for features we do not use; and a self-hosted library, whose own user table and hash format would compete with our Account table and `pepper_version` rehash.

**Revisit when any of these arrives**, since each is costly and easy to get wrong by hand:

- OAuth or social login.
- SSO or SAML.
- Passkeys or WebAuthn.
- MFA.
- A second client with different auth needs (the React Native app in ADR 0004 may need tokens instead of cookies).
- Organisation accounts.

At that point compare a library against extending the plugin, and migrate sessions and hashes deliberately. Existing argon2id hashes can be verified by the new system or rehashed at login (see [docs/password-hashing.md](../password-hashing.md)).
