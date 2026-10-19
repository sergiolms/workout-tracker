import { readFile, mkdir, stat } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';

// Convert the dataset's animations to small, seekable local videos.
const root = process.cwd();
const catalog = JSON.parse(await readFile(path.join(root, 'lib/exercise-catalog.json'), 'utf8'));
const output = path.join(root, 'public/exercise-videos');
await mkdir(output, { recursive: true });
let cursor = 0;
let converted = 0;
const failures = [];
await Promise.all(Array.from({ length: 4 }, async () => {
  while (cursor < catalog.length) {
    const item = catalog[cursor++];
    const name = item.image.replace(/\.jpg$/, '');
    const destination = path.join(output, name + '.mp4');
    if (await stat(destination).then(s => s.size > 0).catch(() => false)) continue;
    const source = path.join(root, 'exercises-dataset/videos', name + '.gif');
    const result = await new Promise(resolve => {
      const proc = spawn('ffmpeg', ['-nostdin', '-loglevel', 'error', '-y', '-i', source,
        '-an', '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-c:v', 'libx264',
        '-threads', '1', '-preset', 'fast', '-crf', '25', '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart', destination], { stdio: 'ignore' });
      proc.on('error', () => resolve(false));
      proc.on('close', code => resolve(code === 0));
    });
    if (result) converted++; else failures.push(item.id);
  }
}));
console.log(JSON.stringify({ converted, failures }));
if (failures.length) process.exitCode = 1;
