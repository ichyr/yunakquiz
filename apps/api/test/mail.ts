import { SESClient } from '@aws-sdk/client-ses';
import { createSesMailer } from '../src/mailer.ts';

export const localstackUrl = process.env.AWS_ENDPOINT_URL ?? 'http://localhost:4566';
export const testSender = 'noreply@yunakquiz.test';

export type LocalstackMessage = {
  Id: string;
  Source: string;
  Subject: string;
  Destination: { ToAddresses?: string[] };
  Body: { text_part?: string; html_part?: string };
  Timestamp: string;
};

export function createTestSesMailer() {
  const client = new SESClient({
    region: 'us-east-1',
    endpoint: localstackUrl,
    credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
  });
  return createSesMailer({ client, from: testSender });
}

export async function fetchMessages(recipient?: string): Promise<LocalstackMessage[]> {
  const response = await fetch(`${localstackUrl}/_aws/ses`);
  if (!response.ok) throw new Error(`LocalStack SES answered ${response.status}`);
  const { messages } = (await response.json()) as { messages: LocalstackMessage[] };
  // LocalStack filters by sender only, so filter by recipient here.
  return recipient
    ? messages.filter((m) => m.Destination.ToAddresses?.includes(recipient))
    : messages;
}

/** Poll LocalStack until a mail for `recipient` arrives. Never use "latest mail" in tests. */
export async function waitForMail(
  recipient: string,
  { timeoutMs = 5_000, intervalMs = 100 } = {},
): Promise<LocalstackMessage> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const [mail] = await fetchMessages(recipient);
    if (mail) return mail;
    if (Date.now() > deadline) throw new Error(`No mail for ${recipient} within ${timeoutMs} ms`);
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}
