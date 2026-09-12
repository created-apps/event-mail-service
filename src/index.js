import http from 'node:http';
import cron from 'node-cron';
import { config } from './config.js';
import { serviceAccountEmail } from './sheets.js';
import { ingestJob } from './jobs/ingest.js';
import { statusJob } from './jobs/status.js';

const state = {
  startedAt: new Date().toISOString(),
  ingest: { running: false, lastRun: null, lastError: null, sent: 0 },
  status: { running: false, lastRun: null, lastError: null, sent: 0 },
};

/** Never let a slow tick overlap with the next one. */
function guarded(name, fn) {
  return async () => {
    const s = state[name];
    if (s.running) {
      console.warn(`[${name}] previous tick still running — skipping this one`);
      return;
    }
    s.running = true;
    try {
      const res = await fn();
      s.sent += res.sent;
      s.lastError = null;
    } catch (err) {
      s.lastError = err.message;
      console.error(`[${name}] tick crashed: ${err.stack || err.message}`);
    } finally {
      s.running = false;
      s.lastRun = new Date().toISOString();
    }
  };
}

const runIngest = guarded('ingest', ingestJob);
const runStatus = guarded('status', statusJob);

function main() {
  console.log('CreatED Labs email automation');
  console.log(`  spreadsheet : ${config.google.spreadsheetId}`);
  console.log(`  sheet       : ${config.google.sheetName}`);
  console.log(`  service acct: ${serviceAccountEmail()}`);
  console.log(`  from        : ${config.sendgrid.fromName} <${config.sendgrid.fromEmail}>`);
  console.log(`  timezone    : ${config.crons.timezone}`);
  console.log(`  ingest cron : ${config.crons.ingest}`);
  console.log(`  status cron : ${config.crons.status}`);
  console.log(`  max/tick    : ${config.maxPerTick}`);
  if (config.dryRun) console.log('  DRY_RUN     : ON — no emails sent, no cells written');
  if (!config.links.booking) console.warn('  warning: BOOKING_LINK not set — enrollment emails will be held');
  if (!config.links.consultation) console.warn('  warning: CONSULTATION_LINK not set — rejection emails will be held');

  const opts = { timezone: config.crons.timezone };
  cron.schedule(config.crons.ingest, runIngest, opts);
  cron.schedule(config.crons.status, runStatus, opts);

  if (config.runOnBoot) {
    runIngest().then(runStatus);
  }

  if (process.env.PORT) {
    http
      .createServer((req, res) => {
        if (req.url === '/healthz') {
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end(JSON.stringify(state, null, 2));
          return;
        }
        res.writeHead(404).end();
      })
      .listen(Number(process.env.PORT), () =>
        console.log(`  health      : http://localhost:${process.env.PORT}/healthz`)
      );
  }
}

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    console.log(`\n${sig} received — shutting down`);
    process.exit(0);
  });
}

main();
