import sharp from 'sharp'
import { mkdir, readFile, writeFile } from 'node:fs/promises'

const root = 'android/app/src/main/res'
const source = await readFile('public/icon.svg')
for (const [density, size] of Object.entries({ mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 })) {
  const dir = `${root}/mipmap-${density}`
  await mkdir(dir, { recursive: true })
  for (const name of ['ic_launcher', 'ic_launcher_round']) {
    await sharp(source).resize(size, size).png().toFile(`${dir}/${name}.png`)
  }
  // Adaptive icons reserve outer space for device-specific masks and motion.
  const canvas = Math.round(size * 108 / 48)
  const art = Math.round(canvas * 0.62)
  const inset = Math.floor((canvas - art) / 2)
  const foreground = await sharp(source).resize(art, art).png().toBuffer()
  await sharp({ create: { width: canvas, height: canvas, channels: 4, background: '#1D4533' } })
    .composite([{ input: foreground, top: inset, left: inset }]).png().toFile(`${dir}/ic_launcher_foreground.png`)
}
for (const name of ['ic_launcher', 'ic_launcher_round']) {
  await writeFile(`${root}/mipmap-anydpi-v26/${name}.xml`, `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
`)
}
console.log('Generated Android launcher icons from public/icon.svg.')
