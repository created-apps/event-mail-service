import { config } from '../config.js';
import { readRows, writeCells, isTrue, isFalse, isBlank } from '../sheets.js';
import { send, validEmail } from '../mailer.js';

export function studentName(row) {
  return [row.studentFirst, row.studentLast].filter(Boolean).join(' ').trim();
}

/** Partner is CC'd only when they applied as a pair and the email looks real. */
export function ccList(row) {
  return validEmail(row.partnerEmail) ? [row.partnerEmail] : [];
}

function nowStamp() {
  return new Date().toISOString();
}

/**
 * Runs one tick. `plan(row)` returns null, or:
 *   { tag, stampField, build: () => ({subject, html, text}), skipReason?: string }
 */
export async function runTick(jobName, plan) {
  const started = Date.now();
  const { columns, rows } = await readRows();

  const updates = [];
  let sent = 0;
  let failed = 0;
  let capped = 0;

  for (const row of rows) {
    if (sent >= config.maxPerTick) {
      capped += 1;
      continue;
    }

    let action;
    try {
      action = plan(row);
    } catch (err) {
      action = { error: err.message };
    }
    if (!action) continue;

    const name = studentName(row) || 'there';

    if (action.error) {
      console.warn(`[${jobName}] row ${row.rowNumber} (${name}): ${action.error}`);
      updates.push({
        rowNumber: row.rowNumber,
        field: 'email_error',
        value: `${nowStamp()} ${action.error}`,
      });
      failed += 1;
      continue;
    }

    if (!validEmail(row.studentEmail)) {
      const msg = `invalid student email "${row.studentEmail}"`;
      console.warn(`[${jobName}] row ${row.rowNumber} (${name}): ${msg}`);
      updates.push({
        rowNumber: row.rowNumber,
        field: 'email_error',
        value: `${nowStamp()} ${msg}`,
      });
      failed += 1;
      continue;
    }

    const msg = action.build();

    try {
      await send({
        to: row.studentEmail.trim(),
        cc: ccList(row),
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
        tag: action.tag,
      });
      sent += 1;
      console.log(
        `[${jobName}] sent ${action.tag} to ${row.studentEmail} (row ${row.rowNumber})`
      );
      updates.push({
        rowNumber: row.rowNumber,
        field: action.stampField,
        value: nowStamp(),
      });
      if (!isBlank(row.email_error)) {
        updates.push({ rowNumber: row.rowNumber, field: 'email_error', value: '' });
      }
    } catch (err) {
      failed += 1;
      const detail =
        err?.response?.body?.errors?.map((e) => e.message).join('; ') || err.message;
      console.error(
        `[${jobName}] FAILED ${action.tag} row ${row.rowNumber} (${row.studentEmail}): ${detail}`
      );
      updates.push({
        rowNumber: row.rowNumber,
        field: 'email_error',
        value: `${nowStamp()} ${action.tag}: ${detail}`.slice(0, 400),
      });
    }
  }

  try {
    await writeCells(columns, updates);
  } catch (err) {
    // Sheet write failed after sending — surface loudly, these rows may resend next tick.
    console.error(
      `[${jobName}] SHEET WRITE-BACK FAILED (${updates.length} updates): ${err.message}`
    );
  }

  const ms = Date.now() - started;
  if (sent || failed || capped) {
    console.log(
      `[${jobName}] tick done in ${ms}ms — sent=${sent} failed=${failed}${capped ? ` deferred=${capped} (MAX_EMAILS_PER_TICK)` : ''}`
    );
  }
  return { sent, failed, capped };
}

export { isTrue, isFalse, isBlank };
