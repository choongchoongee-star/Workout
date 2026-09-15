import sharp from 'sharp'
import { mkdir, readFile } from 'node:fs/promises'

const target = 'release-artifacts/google-play'
await mkdir(target, { recursive: true })
const icon = await readFile('public/icon.svg')
await sharp(icon).resize(512, 512).flatten({ background: '#1D4533' }).png().toFile(`${target}/icon-512.png`)
const graphic = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500" viewBox="0 0 1024 500">
<rect width="1024" height="500" fill="#1D4533"/>
<circle cx="955" cy="480" r="260" fill="#25543e"/>
<circle cx="1040" cy="-40" r="235" fill="#25543e"/>
<text x="76" y="233" font-family="Arial, sans-serif" font-size="76" font-weight="700" fill="#F7EAE0">Steady Sets</text>
<text x="80" y="293" font-family="Arial, sans-serif" font-size="30" fill="#F9D2BA">Your simple workout journal.</text>
<g transform="translate(736 162) scale(1.1)">
<rect x="0" y="78" width="148" height="8" rx="2" fill="#F7EAE0"/>
<rect x="24" y="52" width="26" height="60" rx="5" fill="#F9D2BA"/>
<rect x="98" y="52" width="26" height="60" rx="5" fill="#F9D2BA"/>
<rect x="10" y="62" width="12" height="40" rx="3" fill="#F9D2BA"/>
<rect x="126" y="62" width="12" height="40" rx="3" fill="#F9D2BA"/>
</g></svg>`
await sharp(Buffer.from(graphic)).flatten({ background: '#1D4533' }).png().toFile(`${target}/feature-1024x500.png`)
console.log(`Prepared Play icon and feature graphic in ${target}/`)
