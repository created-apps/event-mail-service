/**
 * Checks credentials, sheet access, column mapping and SendGrid — sends nothing.
 */
import { config } from '../src/config.js';
import { readRows, serviceAccountEmail, columnLetter, isTrue, isFalse, isBlank } from '../src/sheets.js';
import { validEmail } from '../src/mailer.js';

let problems = 0;
const fail = (m) => { problems++; console.log(`  ✗ ${m}`); };
const ok = (m) => console.log(`  ✓ ${m}`);

console.log('\n1. Google credentials');
try {
  ok(`service account: ${serviceAccountEmail()}`);
} catch (e) {
  fail(e.message);
  process.exit(1);
}

console.log('\n2. Sheet access + columns');
let data;
try {
  data = await readRows();
  ok(`read "${config.google.sheetName}" — ${data.rows.length} data rows`);
} catch (e) {
  fail(`${e.message}`);
  console.log(`\n  If this is a permission error, share the spreadsheet with ${serviceAccountEmail()} as Editor.`);
  process.exit(1);
}

for (const [field, idx] of Object.entries(data.columns)) {
  console.log(`     ${field.padEnd(16)} -> column ${columnLetter(idx)}`);
}

console.log('\n3. Data sanity');
const bad = data.rows.filter((r) => !isBlank(r.studentEmail) && !validEmail(r.studentEmail));
bad.length ? fail(`${bad.length} rows with an unusable student email (rows ${bad.map(r => r.rowNumber).join(', ')})`)
           : ok('all student emails parse');

const pendingAck = data.rows.filter((r) => isBlank(r.ack_sent_at) && !isBlank(r.studentEmail)).length;
const pendingSel = data.rows.filter((r) => isTrue(r.selected) && isBlank(r.selected_sent_at)).length;
const pendingPaid = data.rows.filter((r) => isTrue(r.selected) && isTrue(r.paid) && isBlank(r.paid_sent_at)).length;
const pendingRej = data.rows.filter((r) => isFalse(r.selected) && isBlank(r.rejected_sent_at)).length;
console.log(`     queued now: ack=${pendingAck} selected=${pendingSel} enrolled=${pendingPaid} rejected=${pendingRej}`);
if (pendingAck > 5) console.log(`     ⚠ ${pendingAck} acknowledgement emails would fire on the next tick. If these are historical rows, run: npm run mark-existing -- --apply`);

console.log('\n4. Links');
config.links.booking ? ok('BOOKING_LINK set') : fail('BOOKING_LINK missing — enrollment emails will be held');
config.links.consultation ? ok('CONSULTATION_LINK set') : fail('CONSULTATION_LINK missing — rejection emails will be held');
ok(`parent form: ${config.links.parentForm}`);

console.log('\n5. SendGrid');
const res = await fetch('https://api.sendgrid.com/v3/scopes', {
  headers: { Authorization: `Bearer ${config.sendgrid.apiKey}` },
});
res.ok ? ok(`API key valid (from: ${config.sendgrid.fromEmail})`)
       : fail(`API key rejected: HTTP ${res.status}`);

console.log(problems ? `\n${problems} problem(s) found.\n` : '\nAll good.\n');
process.exit(problems ? 1 : 0);
