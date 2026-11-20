import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const dist = path.resolve('dist');
const serviceWorker = path.join(dist, 'sw.js');

async function filesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(entry => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory()
      ? filesIn(fullPath)
      : Promise.resolve([fullPath]);
  }));
  return files.flat();
}

const files = (await filesIn(dist))
  .filter(file => file !== serviceWorker)
  .sort();

if (!files.length) throw new Error('No built app files found in dist/');

const hash = createHash('sha256');
for (const file of files) {
  hash.update(path.relative(dist, file));
  hash.update(await readFile(file));
}
const buildId = hash.digest('hex').slice(0, 20);

const source = await readFile(serviceWorker, 'utf8');
if (!source.includes('__BUILD_ID__')) {
  throw new Error('dist/sw.js does not contain the __BUILD_ID__ placeholder');
}
await writeFile(serviceWorker, source.replaceAll('__BUILD_ID__', buildId));
console.log(`Stamped service worker cache with ${buildId}`);
