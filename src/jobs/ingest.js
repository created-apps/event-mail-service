import { runTick, studentName, isBlank } from './shared.js';
import { applicationReceived } from '../templates/index.js';

/**
 * Every minute: any row that has never received the acknowledgement gets it.
 * Rows already stamped with ack_sent_at are skipped forever.
 */
export function ingestJob() {
  return runTick('ingest', (row) => {
    if (!isBlank(row.ack_sent_at)) return null;
    if (isBlank(row.studentEmail)) return null; // blank/partial row, wait for it to fill in

    return {
      tag: 'application-received',
      stampField: 'ack_sent_at',
      build: () => applicationReceived({ name: studentName(row) || 'there' }),
    };
  });
}
