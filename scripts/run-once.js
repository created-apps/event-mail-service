import { ingestJob } from '../src/jobs/ingest.js';
import { statusJob } from '../src/jobs/status.js';

const which = process.argv[2];
const jobs = { ingest: ingestJob, status: statusJob };

if (!jobs[which]) {
  console.error('usage: node scripts/run-once.js <ingest|status>');
  process.exit(1);
}

const res = await jobs[which]();
console.log(`done: ${JSON.stringify(res)}`);
