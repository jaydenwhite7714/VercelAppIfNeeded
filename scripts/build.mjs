import { spawnSync } from 'node:child_process';
import { Console } from 'node:console';
import process from 'node:process';
import { URL, fileURLToPath } from 'node:url';

const log = new Console(process.stdout, process.stderr);
const isNestedOpenNextBuild = process.env.UNBILLED_OPENNEXT_NESTED_BUILD === '1';
const isWorkersBuild = process.env.WORKERS_CI === '1' && !isNestedOpenNextBuild;
const cliPath = isWorkersBuild
  ? fileURLToPath(new URL('../node_modules/@opennextjs/cloudflare/dist/cli/index.js', import.meta.url))
  : fileURLToPath(new URL('../node_modules/next/dist/bin/next', import.meta.url));

// OpenNext invokes `npm run build` itself to create Next's standalone output.
// Mark that nested invocation so it runs Next directly instead of recursively
// starting another OpenNext build. Vercel and local builds remain plain Next.js.
const env = isWorkersBuild
  ? { ...process.env, UNBILLED_OPENNEXT_NESTED_BUILD: '1' }
  : process.env;
const result = spawnSync(process.execPath, [cliPath, 'build'], { stdio: 'inherit', env });

if (result.error) {
  log.error(`Failed to start the ${isWorkersBuild ? 'OpenNext Cloudflare' : 'Next.js'} build:`, result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
