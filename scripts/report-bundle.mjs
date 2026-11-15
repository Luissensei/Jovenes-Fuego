import {readdir, stat} from 'node:fs/promises';
import {join, relative} from 'node:path';
import {gzipSync} from 'node:zlib';

const root = new URL('../dist/', import.meta.url);
const rows = [];
async function walk(directory) {
  for (const entry of await readdir(directory, {withFileTypes: true})) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (/\\.js$/.test(entry.name)) {
      const [info, content] = await Promise.all([stat(path), import('node:fs/promises').then(fs => fs.readFile(path))]);
      rows.push({name: relative(new URL('../dist/', import.meta.url).pathname, path), bytes: info.size, gzip: gzipSync(content).length});
    }
  }
}
await walk(root.pathname);
rows.sort((a, b) => b.gzip - a.gzip);
const total = rows.reduce((sum, row) => sum + row.bytes, 0);
const compressed = rows.reduce((sum, row) => sum + row.gzip, 0);
const format = (value) => `${(value / 1024).toFixed(1)} KiB`;
console.log('\\nBundle report (JavaScript):');
for (const row of rows) console.log(`  ${format(row.gzip).padStart(10)} gzip  ${format(row.bytes).padStart(10)} raw  ${row.name}`);
console.log(`  TOTAL: ${format(compressed)} gzip / ${format(total)} raw across ${rows.length} JS files\\n`);
