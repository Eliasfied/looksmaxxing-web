import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.join(root, 'apps/web/.env.local');
execFileSync('git', ['check-ignore', '--quiet', 'apps/web/.env.local'], { cwd: root });
const existing = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
if (/^TOOL_REPORT_SECRET=.+$/m.test(existing)) {
  console.log('TOOL_REPORT_SECRET is already set; left unchanged.');
} else {
  fs.appendFileSync(target, '\n# Local tool report encryption key. Do not rotate while reports are in use.\nTOOL_REPORT_SECRET=' + randomBytes(32).toString('hex') + '\n');
  console.log('Created TOOL_REPORT_SECRET in ignored apps/web/.env.local; value not printed.');
}
