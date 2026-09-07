import sharp from 'sharp'
import { readFile } from 'node:fs/promises'

const svg = await readFile(new URL('../public/icon.svg', import.meta.url))
const outputs = [
  ['public/icon-192.png', 192],
  ['public/icon-512.png', 512],
  ['ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png', 1024],
]
for (const [path, size] of outputs) {
  await sharp(svg).resize(size, size).removeAlpha().png().toFile(path)
  const metadata = await sharp(path).metadata()
  if (metadata.width !== size || metadata.height !== size || metadata.hasAlpha) {
    throw new Error(`Invalid icon output: ${path}`)
  }
}
console.log('Generated opaque iOS 1024 and PWA 192/512 icons from public/icon.svg.')
