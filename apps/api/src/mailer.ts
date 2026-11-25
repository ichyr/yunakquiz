import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

export type Mail = { to: string; subject: string; text: string; html?: string };

export interface Mailer {
  send(mail: Mail): Promise<void>;
}

/** In-memory mailer for tests. Create one per app instance so parallel tests stay isolated. */
export type FakeMailer = Mailer & { readonly outbox: readonly Mail[] };

export function createFakeMailer(): FakeMailer {
  const outbox: Mail[] = [];
  return {
    outbox,
    async send(mail) {
      outbox.push(mail);
    },
  };
}

/** Uses SES API v1: LocalStack's free image emulates v1 only, and real SES accepts both. */
export function createSesMailer({ client, from }: { client: SESClient; from: string }): Mailer {
  return {
    async send({ to, subject, text, html }) {
      await client.send(
        new SendEmailCommand({
          Source: from,
          Destination: { ToAddresses: [to] },
          Message: {
            Subject: { Data: subject, Charset: 'UTF-8' },
            Body: {
              Text: { Data: text, Charset: 'UTF-8' },
              ...(html && { Html: { Data: html, Charset: 'UTF-8' } }),
            },
          },
        }),
      );
    },
  };
}
