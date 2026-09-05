import { mkdir, copyFile } from 'node:fs/promises'

await mkdir('site-dist/privacy', { recursive: true })
for (const [source, target] of [
  ['site/index.html', 'index.html'],
  ['site/index.html', '404.html'],
  ['site/sw.js', 'sw.js'],
  ['public/icon-192.png', 'icon-192.png'],
  ['public/privacy/index.html', 'privacy/index.html'],
]) await copyFile(source, `site-dist/${target}`)
console.log('Public information site prepared in site-dist/.')
