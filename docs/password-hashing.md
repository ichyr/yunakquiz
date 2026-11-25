# Password hashing

How Yunakquiz stores passwords, and what a pepper and its rotation mean. Decisions: [ADR 0008](adr/0008-accounts-sessions-and-password-policy.md). We never store a password, only a hash of it.

## Salt: stored inside the hash

A salt is random data mixed into each password before hashing, so two Accounts with the same password get different hashes and precomputed tables are useless. argon2 generates a fresh salt per password and writes it into the encoded hash string:

```
$argon2id$v=19$m=19456,t=2,p=1$<salt>$<hash>
```

The string holds the algorithm (`argon2id`), version, parameters (memory in KiB, iterations, parallelism), the salt and the hash. There is no separate salt column. The salt is not secret.

## Pepper: a secret outside the database

A pepper is one secret shared by all Accounts, kept in the API's environment and never in the database. It is passed to argon2 as its `secret` parameter, so it changes every hash. Someone who steals only the database cannot test password guesses offline without it. Someone who steals the environment too gets no benefit from the pepper, so it complements the salt and does not replace it.

Config: `PASSWORD_PEPPERS=v2:<secret>,v1:<secret>`. Each entry is `version:secret`. The first entry is current. The API refuses to start with no pepper. Each Account row stores `pepper_version`, the version used for its hash.

## Verification

1. Load the Account by email. If none exists, verify against a dummy hash anyway, so the response time does not reveal it.
2. Read `pepper_version` from the row and pick that pepper. If the version is no longer configured, the login fails.
3. Verify the password against the encoded hash with that pepper. argon2 reads the salt and parameters from the string.
4. On success, if the hash used old parameters or `pepper_version` is not the current one, hash the password again with the current pepper and parameters, and save both.

Step 4 means nobody has to change a password when settings improve.

## Rotation

Rotating means adding a new pepper and moving Accounts onto it.

1. Add the new pepper at the front: `v3:<new>,v2:<old>`. The old one stays so existing hashes still verify. New and changed passwords use `v3`.
2. Lazy rehash: each login by an Account on `v2` verifies with `v2`, then rehashes under `v3` and updates `pepper_version`. Active Accounts migrate on their own.
3. Retiring `v2`: some Accounts never log in. Count the rows that still have `pepper_version = 'v2'`. Either wait for that tail to shrink, or force resets for the rest: delete their sessions and require the reset flow (a mailed link) to set a new password under the current pepper. Only then remove `v2` from the env. Removing it early locks those Accounts out until they reset.

A leaked pepper follows the same steps without the waiting: add a new pepper, then force resets for everyone still on the leaked one. v1 keeps peppers in an env variable; a secret store and a rotation runbook are a later roadmap ticket.
