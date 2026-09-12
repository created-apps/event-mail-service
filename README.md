# CreatED Labs 2026 — email automation

Node service that watches the applications Google Sheet and sends the four CreatED Labs
emails through SendGrid. Two crons, no database — send state lives in the sheet itself.

## What it sends

| Trigger | Email | Stamped in column |
|---|---|---|
| New row appears (every minute) | Thank you for submitting your Application | `ack_sent_at` |
| `Selected` = `TRUE` (every 5 min) | Congratulations! You've been selected | `selected_sent_at` |
| `Selected` = `TRUE` **and** `PAID` = `TRUE` | Welcome — you're officially enrolled | `paid_sent_at` |
| `Selected` = `FALSE` (literal) | An Update on your application | `rejected_sent_at` |

Rules baked in:

- **Blank `Selected` means "still under review."** Nothing is sent. Only a literal `FALSE`
  sends the rejection, so an unreviewed row can never be rejected by accident.
- **One email per row per tick.** If a row is marked selected *and* paid at the same time,
  the acceptance goes first and the enrollment follows on the next tick (5 min later) so the
  two don't land together.
- **To:** student. **Cc:** partner, only when `Partner Email Address` is filled in.
- The enrollment email is held back (and the reason written to `email_error`) if
  `Whatsapp-drive-link` is empty for that row — it would otherwise send a broken group link.

## Setup

### 1. Google service account

1. Google Cloud Console → new project → enable **Google Sheets API**.
2. IAM → Service Accounts → create one → Keys → **Add key → JSON**.
3. Share the spreadsheet with the service account's email as **Editor** (it needs to write
   the status columns back).
4. Base64 the key file:

```bash
base64 -i service-account.json | tr -d '\n' | pbcopy
```

### 2. SendGrid

Create an API key with **Mail Send** permission, and verify `labs@create-ed.in` as a sender
(Single Sender or, better, domain authentication so the mail doesn't land in spam).

### 3. Configure

```bash
cp .env.example .env
```

Fill in `GOOGLE_CREDENTIALS_BASE64`, `SPREADSHEET_ID`, `SENDGRID_API_KEY`, `BOOKING_LINK`
(ideation call) and `CONSULTATION_LINK` (rejection follow-up). `SHEET_NAME` must match the
tab name exactly — default is `Form Responses 1`.

`DRY_RUN=true` ships on by default: everything runs and logs, nothing is sent or written.

### 4. Verify before going live

```bash
npm install && npm run doctor
```

`doctor` checks the credentials, reads the sheet, prints which spreadsheet column each field
resolved to, validates the SendGrid key, and tells you how many emails are currently queued.
It sends nothing.

### 5. ⚠️ Stop the first run from emailing your back catalogue

If the sheet already has past applicants in it, the first ingest tick will email every one of
them. Stamp the existing rows as already-handled first:

```bash
npm run mark-existing          # preview
npm run mark-existing -- --apply
```

Only rows added *after* this point will be emailed.

### 6. Run

```bash
DRY_RUN=true npm start    # watch a few ticks first
npm start                 # live
```

On first run the app appends five columns to the right of your sheet — `ack_sent_at`,
`selected_sent_at`, `paid_sent_at`, `rejected_sent_at`, `email_error`. Leave them alone;
they are the send log.

## Day-to-day

```bash
npm run preview                  # render all 4 emails to preview/*.html
npm run once:ingest              # run one ingest tick by hand
npm run once:status              # run one status tick by hand
npm test                         # offline column-mapping check
```

**Resend an email to one person:** clear that row's stamp cell (e.g. delete `selected_sent_at`)
and the next tick re-sends it.

**A send failed:** the reason is in that row's `email_error` cell. Fix the cause (bad address,
missing WhatsApp link) and the row is retried automatically; `email_error` is cleared on success.

**Throttle:** `MAX_EMAILS_PER_TICK` (default 25) caps each tick. Overflow rolls to the next one.

## Deploying

Any always-on Node host works (Render, Railway, a VM with systemd/pm2). Set `PORT` to expose
`GET /healthz` for uptime checks. Ticks never overlap — a slow run causes the next one to skip
rather than double-send. If the process restarts mid-tick, at worst a row whose email was sent
but whose stamp wasn't written gets re-sent; the write-back failure is logged loudly.

Run exactly one instance. Two instances against the same sheet will double-send.

## Layout

```
src/config.js            env parsing
src/sheets.js            auth, header→field mapping, read/write
src/mailer.js            SendGrid
src/templates/index.js   the four emails (HTML + plain text)
src/jobs/shared.js       tick runner: send, stamp, record errors
src/jobs/ingest.js       every-minute job
src/jobs/status.js       every-5-minute job
src/index.js             cron wiring + /healthz
```

Column headers are matched loosely (case, whitespace and the multi-line form questions are
normalised), so re-wording a question in the Form won't break the mapping — but keep the
first words of `Student First Name`, `Student Email Address`, `Selected`, `PAID` and
`Whatsapp-drive-link` intact. `npm run doctor` prints the resolved mapping.
