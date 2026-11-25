// Dev convenience: print the latest mail from LocalStack SES. Usage: pnpm mail:last [email]
const endpoint = process.env.AWS_ENDPOINT_URL ?? 'http://localhost:4566';
const recipient = process.argv[2];

const response = await fetch(`${endpoint}/_aws/ses`).catch(() => undefined);
if (!response?.ok) {
  console.error(`Cannot read ${endpoint}/_aws/ses. Is LocalStack up? Run pnpm db:up.`);
  process.exit(1);
}
const { messages } = (await response.json()) as {
  messages: {
    Source: string;
    Subject: string;
    Timestamp: string;
    Destination: { ToAddresses?: string[] };
    Body: { text_part?: string; html_part?: string };
  }[];
};
const matching = recipient
  ? messages.filter((m) => m.Destination.ToAddresses?.includes(recipient))
  : messages;
const latest = matching.toSorted((a, b) => a.Timestamp.localeCompare(b.Timestamp)).at(-1);
if (!latest) {
  console.error(recipient ? `No mail for ${recipient}.` : 'No mail yet.');
  process.exit(1);
}
console.log(`From:    ${latest.Source}`);
console.log(`To:      ${latest.Destination.ToAddresses?.join(', ')}`);
console.log(`Subject: ${latest.Subject}\n`);
console.log(latest.Body.text_part ?? latest.Body.html_part ?? '');
