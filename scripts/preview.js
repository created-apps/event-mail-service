/**
 * Renders all four emails to ./preview/*.html with sample data. Sends nothing.
 */
import { mkdir, writeFile } from 'node:fs/promises';

for (const k of ['GOOGLE_CREDENTIALS_BASE64', 'SPREADSHEET_ID', 'SENDGRID_API_KEY']) {
  if (!process.env[k]) process.env[k] = 'preview-only';
}
const t = await import('../src/templates/index.js');

const name = process.argv[2] || 'Ananya Sharma';
const whatsappGroupLink = 'https://chat.whatsapp.com/EXAMPLE';

const mails = {
  '1-application-received': t.applicationReceived({ name }),
  '2a-selected': t.selected({ name }),
  '2b-enrolled': t.enrolled({ name, whatsappGroupLink }),
  '3-not-selected': t.notSelected({ name }),
};

await mkdir('preview', { recursive: true });
for (const [file, m] of Object.entries(mails)) {
  await writeFile(`preview/${file}.html`, m.html);
  console.log(`preview/${file}.html  —  ${m.subject}`);
}
