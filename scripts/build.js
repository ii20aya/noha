import { cp, mkdir } from 'node:fs/promises';

await mkdir('dist', { recursive: true });
await Promise.all([
  cp('index.html', 'dist/index.html'),
  cp('src', 'dist/src', { recursive: true }),
  cp('public', 'dist', { recursive: true })
]);
console.log('Invitation built in dist/');

