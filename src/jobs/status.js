import { config } from '../config.js';
import { runTick, studentName, isTrue, isFalse, isBlank } from './shared.js';
import { selected, enrolled, notSelected } from '../templates/index.js';

/**
 * Every 5 minutes: acts on the Selected / PAID / whatsapp-link columns.
 *
 *   Selected TRUE  + selected_sent_at blank   -> acceptance email
 *   Selected TRUE  + PAID TRUE + paid_sent_at blank -> enrollment email
 *   Selected FALSE + rejected_sent_at blank   -> rejection email
 *   Selected blank                            -> still under review, nothing sent
 *
 * At most one email per row per tick; the acceptance always goes first, and the
 * enrollment waits for the next tick so the two never land together.
 */
export function statusJob() {
  return runTick('status', (row) => {
    const name = studentName(row) || 'there';

    if (isTrue(row.selected)) {
      if (isBlank(row.selected_sent_at)) {
        return {
          tag: 'selected',
          stampField: 'selected_sent_at',
          build: () => selected({ name }),
        };
      }

      if (isTrue(row.paid) && isBlank(row.paid_sent_at)) {
        if (isBlank(row.whatsappGroup)) {
          return { error: 'PAID is TRUE but Whatsapp-drive-link is empty — not sending enrollment email' };
        }
        if (!config.links.booking) {
          return { error: 'BOOKING_LINK env var is not set — not sending enrollment email' };
        }
        return {
          tag: 'enrolled',
          stampField: 'paid_sent_at',
          build: () => enrolled({ name, whatsappGroupLink: row.whatsappGroup }),
        };
      }
      return null;
    }

    // Explicit FALSE only. Blank means "not reviewed yet" and is never rejected.
    if (isFalse(row.selected) && isBlank(row.rejected_sent_at)) {
      if (!config.links.consultation) {
        return { error: 'CONSULTATION_LINK env var is not set — not sending rejection email' };
      }
      return {
        tag: 'not-selected',
        stampField: 'rejected_sent_at',
        build: () => notSelected({ name }),
      };
    }

    return null;
  });
}
