/**
 * Backfill guard. Stamps every existing row as "already emailed" WITHOUT sending
 * anything, so the first real cron run only picks up genuinely new submissions.
 *
 * Run this once, immediately after pointing the app at a sheet that already has
 * historical rows in it. Otherwise the first ingest tick emails everybody.
 *
 *   node scripts/mark-existing.js            # dry preview
 *   node scripts/mark-existing.js --apply    # actually stamp
 */
import { readRows, writeCells, isBlank, isTrue, isFalse } from '../src/sheets.js';
import { config } from '../src/config.js';

const apply = process.argv.includes('--apply');
const stamp = `backfilled:${new Date().toISOString()}`;

if (config.dryRun && apply) {
  console.error('DRY_RUN is on in .env — turn it off to apply.');
  process.exit(1);
}

const { columns, rows } = await readRows();
const updates = [];

for (const row of rows) {
  if (isBlank(row.studentEmail)) continue;
  if (isBlank(row.ack_sent_at)) updates.push({ rowNumber: row.rowNumber, field: 'ack_sent_at', value: stamp });
  if (isTrue(row.selected) && isBlank(row.selected_sent_at))
    updates.push({ rowNumber: row.rowNumber, field: 'selected_sent_at', value: stamp });
  if (isTrue(row.selected) && isTrue(row.paid) && isBlank(row.paid_sent_at))
    updates.push({ rowNumber: row.rowNumber, field: 'paid_sent_at', value: stamp });
  if (isFalse(row.selected) && isBlank(row.rejected_sent_at))
    updates.push({ rowNumber: row.rowNumber, field: 'rejected_sent_at', value: stamp });
}

console.log(`${rows.length} data rows, ${updates.length} cells to stamp.`);

if (!apply) {
  for (const u of updates.slice(0, 20)) console.log(`  row ${u.rowNumber}: ${u.field}`);
  if (updates.length > 20) console.log(`  ... and ${updates.length - 20} more`);
  console.log('\nPreview only. Re-run with --apply to write these stamps.');
  process.exit(0);
}

await writeCells(columns, updates);
console.log('Stamped. New submissions from here on will be emailed normally.');
