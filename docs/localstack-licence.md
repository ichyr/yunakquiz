# LocalStack licence check (#73, checked 2026-11-25)

Sources: LocalStack blog posts "The Road Ahead for LocalStack" (updated 2026-03-17) and "2026 upcoming pricing changes" (updated 2026-07-24).

- Since March 2026 the Community and Pro images are one image. `localstack/localstack:latest` needs an account and auth token.
- The free plan is for non-commercial use only. CI use is allowed within a fair-usage policy.
- Older pinned tags (the post names "4.12") keep running without a token, locally and in CI. They get no updates or security patches.
- Whether SES is in the free plan is not stated in these posts. Not verified.

Decision: `compose.yaml` pins `localstack/localstack:4.12`, so dev and CI need no token or account. LocalStack is a dev and test tool here only, never in production, so the non-commercial limit on the free plan is not a blocker either, but it would apply if we moved to `latest`. Unverified: that tag `4.12` exists on Docker Hub and supports SES (SES was in the community image before the merge); check on first `pnpm db:up`.

Finding on 4.12: SES API v2 (`sesv2`, the `@aws-sdk/client-sesv2` client) answers 501 "not included in your current license plan or not emulated". SES v1 works. So the mailer uses `@aws-sdk/client-ses`. Mail is read at `/_aws/ses` (`/_localstack/ses` returns 404 on 4.12).
