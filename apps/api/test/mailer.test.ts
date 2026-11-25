import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createFakeMailer } from '../src/mailer.ts';
import { createTestSesMailer, waitForMail } from './mail.ts';

const uniqueRecipient = () => `user-${randomUUID()}@test.local`;

describe('fake mailer', () => {
  it('keeps mails in its own outbox', async () => {
    const a = createFakeMailer();
    const b = createFakeMailer();
    await a.send({ to: 'x@test.local', subject: 's', text: 't' });
    expect(a.outbox).toHaveLength(1);
    expect(b.outbox).toHaveLength(0);
  });
});

describe('SES mailer against LocalStack', () => {
  it('delivers a mail that waitForMail reads back', async () => {
    const to = uniqueRecipient();
    await createTestSesMailer().send({ to, subject: 'Hello', text: 'Plain', html: '<p>Html</p>' });
    const mail = await waitForMail(to);
    expect(mail.Subject).toBe('Hello');
    expect(mail.Body.text_part).toBe('Plain');
    expect(mail.Body.html_part).toBe('<p>Html</p>');
  });

  it('never shows one recipient the mail of another', async () => {
    const [first, second] = [uniqueRecipient(), uniqueRecipient()];
    const mailer = createTestSesMailer();
    await Promise.all([
      mailer.send({ to: first, subject: 'for first', text: '1' }),
      mailer.send({ to: second, subject: 'for second', text: '2' }),
    ]);
    const [a, b] = await Promise.all([waitForMail(first), waitForMail(second)]);
    expect(a.Subject).toBe('for first');
    expect(b.Subject).toBe('for second');
  });

  it('times out when no mail arrives', async () => {
    await expect(waitForMail(uniqueRecipient(), { timeoutMs: 300 })).rejects.toThrow(/No mail/);
  });
});
