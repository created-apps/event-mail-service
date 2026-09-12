import 'dotenv/config';

function required(name) {
  const v = process.env[name];
  if (!v || !v.trim()) throw new Error(`Missing required env var: ${name}`);
  return v.trim();
}

function bool(name, fallback = false) {
  const v = process.env[name];
  if (v === undefined || v === '') return fallback;
  return ['1', 'true', 'yes', 'y', 'on'].includes(v.trim().toLowerCase());
}

export const config = {
  google: {
    // Base64-encoded service-account JSON key file
    credentialsB64: required('GOOGLE_CREDENTIALS_BASE64'),
    spreadsheetId: required('SPREADSHEET_ID'),
    sheetName: process.env.SHEET_NAME?.trim() || 'Form Responses 1',
  },
  sendgrid: {
    apiKey: required('SENDGRID_API_KEY'),
    fromEmail: process.env.FROM_EMAIL?.trim() || 'labs@create-ed.in',
    fromName: process.env.FROM_NAME?.trim() || 'Team CreatED',
    replyTo: process.env.REPLY_TO?.trim() || 'labs@create-ed.in',
  },
  links: {
    parentForm:
      process.env.PARENT_FORM_LINK?.trim() || 'https://forms.gle/CFF6CpAcB2M2VB2r6',
    booking: process.env.BOOKING_LINK?.trim() || '',
    consultation: process.env.CONSULTATION_LINK?.trim() || '',
  },
  crons: {
    ingest: process.env.CRON_INGEST?.trim() || '* * * * *',
    status: process.env.CRON_STATUS?.trim() || '*/5 * * * *',
    timezone: process.env.CRON_TIMEZONE?.trim() || 'Asia/Kolkata',
  },
  // When true, nothing is sent and nothing is written back — everything is logged.
  dryRun: bool('DRY_RUN', false),
  // Max emails a single cron tick will send (throttle / blast guard).
  maxPerTick: Number(process.env.MAX_EMAILS_PER_TICK || 25),
  runOnBoot: bool('RUN_ON_BOOT', false),
};
