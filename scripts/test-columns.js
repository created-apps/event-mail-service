/** Offline check: the real form header maps to the right canonical fields. */
import assert from 'node:assert';

// Runs without a real .env — nothing here touches the network.
process.env.DRY_RUN = 'true';
for (const k of ['GOOGLE_CREDENTIALS_BASE64', 'SPREADSHEET_ID', 'SENDGRID_API_KEY']) {
  if (!process.env[k]) process.env[k] = 'offline-test';
}
const { resolveColumns, columnLetter, isTrue, isFalse } = await import('../src/sheets.js');

const header = ['Timestamp','Student First Name','Student Last Name','Student Email Address','Student Phone number (do NOT put +91)','Parent/Guardian First Name','Parent/Guardian Last Name','Parent Email Address','Parent Phone number (do NOT put +91)','Are you applying individually or with a partner?','Fill only if applicable, Partner First Name','Fill only if applicable, Partner Last Name','Fill only if applicable, Partner Email Address','What academic school grade are you currently in? ','Which curriculum do you currently follow?','Which of the following subjects are you currently studying? \nSelect all that apply','Upload your most recent report card.','Have you previously worked on a research project or research paper?','If you\'ve worked on an assignment or a project...','Which sub-category... [Biochemistry]','Which sub-category... [Chemical Engineering]','Which sub-category... [Materials Science]','What are 2–3 real-world problems...','How did you hear about this CreatED Program?  ',' Please save this number on WhatsApp: +91 8655700705...','I acknowledge and confirm...','I confirm that the information provided...','Whatsapp-drive-link','Selected(TRUE/FALSE)','PAID( TRUE/ LEAVE EMPTY FOR FALSE)','','',''];

const cols = await resolveColumns(header);

const expect = {
  timestamp: 0, studentFirst: 1, studentLast: 2, studentEmail: 3, studentPhone: 4,
  parentFirst: 5, parentLast: 6, parentEmail: 7, applyingWith: 9,
  partnerFirst: 10, partnerLast: 11, partnerEmail: 12,
  whatsappGroup: 27, selected: 28, paid: 29,
  ack_sent_at: 30, selected_sent_at: 31, paid_sent_at: 32, rejected_sent_at: 33, email_error: 34,
};

for (const [k, v] of Object.entries(expect)) {
  assert.strictEqual(cols[k], v, `${k}: expected ${columnLetter(v)}, got ${cols[k] === undefined ? 'MISSING' : columnLetter(cols[k])}`);
}

assert.strictEqual(columnLetter(0), 'A');
assert.strictEqual(columnLetter(25), 'Z');
assert.strictEqual(columnLetter(26), 'AA');
assert.strictEqual(columnLetter(34), 'AI');

assert.ok(isTrue('TRUE') && isTrue(true) && isTrue('true'));
assert.ok(!isTrue('') && !isTrue('FALSE'));
assert.ok(isFalse('FALSE') && isFalse(false));
assert.ok(!isFalse('') && !isFalse('TRUE'), 'blank must never count as a rejection');

console.log('column mapping OK — status columns land at AE..AI');
