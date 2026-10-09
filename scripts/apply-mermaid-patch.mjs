// Only this project's reviewed, version-pinned patch. No discovery or globbing.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const version = JSON.parse(readFileSync(new URL('../node_modules/beautiful-mermaid/package.json', import.meta.url), 'utf8')).version;
if (version !== '1.0.2') throw new Error(`Patch requires beautiful-mermaid 1.0.2; found ${version}`);
const patch = 'patches/beautiful-mermaid+1.0.2.patch';
const git = args => spawnSync('git', ['apply', ...args, patch], { cwd: root, encoding: 'utf8', maxBuffer: 1024 * 1024 });
const check = git(['--check']);
if (check.status === 0) {
  const applied = git([]);
  if (applied.status !== 0) throw new Error(applied.error?.message ?? applied.stderr);
  console.log('Applied beautiful-mermaid 1.0.2 patch');
} else if (git(['--reverse', '--check']).status === 0) {
  console.log('beautiful-mermaid 1.0.2 patch already applied');
} else {
  throw new Error(check.error?.message ?? check.stderr);
}
