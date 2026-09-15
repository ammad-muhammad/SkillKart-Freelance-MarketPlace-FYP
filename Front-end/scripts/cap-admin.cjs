// Runs a `cap` command against the standalone admin app's native project
// instead of the client/freelancer app's.
//
// Capacitor's CLI has no --config flag and always reads a hardcoded
// `capacitor.config.json` at the project root (confirmed against
// @capacitor/cli's own source) — the only way to point `add`/`sync`/`copy`
// at a different native folder is that file's own `android.path` key. Since
// the FILENAME can't be parameterized but its CONTENT can, this swaps
// capacitor.admin.config.json in, runs the real `cap` command, then restores
// the original file — so the client/freelancer app's config is never
// permanently touched, even if this script is interrupted mid-run.
//
// .cjs (not .js): package.json has "type": "module", which would otherwise
// make Node reject the require() calls below as an ES module.
//
// Usage: node scripts/cap-admin.cjs <add|sync|copy|open> android
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const MAIN = path.join(ROOT, 'capacitor.config.json');
const ADMIN = path.join(ROOT, 'capacitor.admin.config.json');
const BAK = path.join(ROOT, 'capacitor.config.json.bak');

if (!fs.existsSync(ADMIN)) {
  console.error(`Missing ${ADMIN} — create it before running this script.`);
  process.exit(1);
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node scripts/cap-admin.cjs <add|sync|copy|open> android');
  process.exit(1);
}

fs.copyFileSync(MAIN, BAK);
try {
  fs.copyFileSync(ADMIN, MAIN);
  execSync(`npx cap ${args.join(' ')}`, { stdio: 'inherit', cwd: ROOT });
} finally {
  fs.copyFileSync(BAK, MAIN);
  fs.unlinkSync(BAK);
}
