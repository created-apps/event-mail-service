import { google } from 'googleapis';
import { config } from './config.js';

/* ------------------------------------------------------------------ auth */

function loadServiceAccount() {
  let json;
  try {
    json = Buffer.from(config.google.credentialsB64, 'base64').toString('utf8');
  } catch {
    throw new Error('GOOGLE_CREDENTIALS_BASE64 is not valid base64');
  }
  try {
    return JSON.parse(json);
  } catch {
    throw new Error(
      'GOOGLE_CREDENTIALS_BASE64 did not decode to JSON. Encode the whole service-account key file: base64 -i key.json'
    );
  }
}

let _sheets;
export function sheetsClient() {
  if (_sheets) return _sheets;
  const creds = loadServiceAccount();
  const auth = new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  _sheets = google.sheets({ version: 'v4', auth });
  _sheets.__serviceAccountEmail = creds.client_email;
  return _sheets;
}

export function serviceAccountEmail() {
  return loadServiceAccount().client_email;
}

/* --------------------------------------------------------------- columns */

export const STATUS_COLUMNS = [
  'ack_sent_at',
  'selected_sent_at',
  'paid_sent_at',
  'rejected_sent_at',
  'email_error',
];

// Canonical field -> predicate over the normalized header text.
const FIELD_MATCHERS = {
  timestamp: (h) => h === 'timestamp',
  studentFirst: (h) => h.startsWith('student first name'),
  studentLast: (h) => h.startsWith('student last name'),
  studentEmail: (h) => h.startsWith('student email'),
  studentPhone: (h) => h.startsWith('student phone'),
  parentFirst: (h) => h.startsWith('parent/guardian first name'),
  parentLast: (h) => h.startsWith('parent/guardian last name'),
  parentEmail: (h) => h.startsWith('parent email'),
  applyingWith: (h) => h.includes('applying individually or with a partner'),
  partnerFirst: (h) => h.includes('partner first name'),
  partnerLast: (h) => h.includes('partner last name'),
  partnerEmail: (h) => h.includes('partner email'),
  whatsappGroup: (h) => h.replace(/\s|-/g, '').startsWith('whatsappdrivelink'),
  selected: (h) => h.startsWith('selected'),
  paid: (h) => h.startsWith('paid'),
};

export function normalizeHeader(s) {
  return String(s ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function columnLetter(index0) {
  let n = index0 + 1;
  let out = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

/**
 * Maps canonical field names + status columns to 0-based column indexes.
 * Appends any missing status columns to the header row (unless dryRun).
 */
export async function resolveColumns(header) {
  const norm = header.map(normalizeHeader);
  const map = {};

  for (const [field, matches] of Object.entries(FIELD_MATCHERS)) {
    const idx = norm.findIndex((h) => h && matches(h));
    if (idx !== -1) map[field] = idx;
  }

  const missingCore = ['studentFirst', 'studentEmail', 'selected', 'paid'].filter(
    (f) => map[f] === undefined
  );
  if (missingCore.length) {
    throw new Error(
      `Could not find these columns in the sheet header: ${missingCore.join(', ')}. ` +
        `Check SHEET_NAME (currently "${config.google.sheetName}") and the header row.`
    );
  }

  // Status columns: reuse if present, otherwise plan an append.
  let nextFree = norm.reduce((last, h, i) => (h ? i : last), 0) + 1;
  const toCreate = [];
  for (const name of STATUS_COLUMNS) {
    const idx = norm.indexOf(name);
    if (idx !== -1) {
      map[name] = idx;
    } else {
      map[name] = nextFree;
      toCreate.push({ name, index: nextFree });
      nextFree += 1;
    }
  }

  if (toCreate.length && !config.dryRun) {
    const sheets = sheetsClient();
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: config.google.spreadsheetId,
      requestBody: {
        valueInputOption: 'RAW',
        data: toCreate.map(({ name, index }) => ({
          range: `${config.google.sheetName}!${columnLetter(index)}1`,
          values: [[name]],
        })),
      },
    });
    console.log(
      `[sheets] created status columns: ${toCreate
        .map((c) => `${c.name}(${columnLetter(c.index)})`)
        .join(', ')}`
    );
  }

  return map;
}

/* ------------------------------------------------------------------ read */

export async function readRows() {
  const sheets = sheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: config.google.spreadsheetId,
    range: config.google.sheetName,
    valueRenderOption: 'UNFORMATTED_VALUE',
    dateTimeRenderOption: 'FORMATTED_STRING',
  });

  const values = res.data.values || [];
  if (!values.length) return { columns: {}, rows: [] };

  const header = values[0];
  const columns = await resolveColumns(header);

  const cell = (row, field) => {
    const i = columns[field];
    if (i === undefined) return '';
    const v = row[i];
    return v === undefined || v === null ? '' : String(v).trim();
  };

  const rows = values.slice(1).map((row, i) => {
    const r = { rowNumber: i + 2, raw: row };
    for (const field of Object.keys(columns)) r[field] = cell(row, field);
    return r;
  });

  return { columns, rows, header };
}

/* ----------------------------------------------------------------- write */

/** updates: [{ rowNumber, field, value }] */
export async function writeCells(columns, updates) {
  if (!updates.length) return;
  if (config.dryRun) {
    for (const u of updates) {
      console.log(`[dry-run] would write ${u.field}="${u.value}" to row ${u.rowNumber}`);
    }
    return;
  }
  const sheets = sheetsClient();
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: config.google.spreadsheetId,
    requestBody: {
      valueInputOption: 'RAW',
      data: updates.map((u) => ({
        range: `${config.google.sheetName}!${columnLetter(columns[u.field])}${u.rowNumber}`,
        values: [[u.value]],
      })),
    },
  });
}

/* ---------------------------------------------------------------- helpers */

export function isTrue(value) {
  return ['true', 'yes', 'y', '1', 'selected', 'paid'].includes(
    String(value ?? '').trim().toLowerCase()
  );
}

export function isFalse(value) {
  return ['false', 'no', 'n', '0', 'rejected'].includes(
    String(value ?? '').trim().toLowerCase()
  );
}

export function isBlank(value) {
  return String(value ?? '').trim() === '';
}
