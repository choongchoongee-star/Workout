import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises'
import { createHash, sign, verify } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { zipSync, unzipSync } from 'fflate'
import { nativeFingerprint } from './ota-native.mjs'

const config = JSON.parse(await readFile('capacitor.config.json', 'utf8'))
const runtime = await nativeFingerprint()
if (runtime !== config.plugins.LiveUpdate.defaultChannel) throw new Error('Native code changed. A new native runtime/build is required before OTA release.')
const key = await readFile('.ota-keys/private.pem')
// Always build fresh Capacitor assets; never package the web/PWA output by accident.
execFileSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--mode', 'capacitor'], { stdio: 'inherit' })
const files = {}
async function collect(dir, prefix = '') {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const relative = `${prefix}${entry.name}`
    if (entry.isDirectory()) await collect(`${dir}/${entry.name}`, `${relative}/`)
    else files[relative] = new Uint8Array(await readFile(`${dir}/${entry.name}`))
  }
}
await collect('dist')
if (!files['index.html'] || files['sw.js']) throw new Error('Expected a Capacitor bundle without a service worker')
const zip = zipSync(files)
const checksum = createHash('sha256').update(zip).digest('hex')
const signature = sign('sha256', zip, key).toString('base64')
if (!verify('sha256', zip, config.plugins.LiveUpdate.publicKey, Buffer.from(signature, 'base64'))) throw new Error('Signing key does not match the native app')
if (!unzipSync(zip)['index.html']) throw new Error('Invalid ZIP structure')
const output = `ota-release/${runtime}`
await mkdir(output, { recursive: true })
await writeFile(`${output}/${checksum}.zip`, zip)
await writeFile(`${output}/latest.json`, JSON.stringify({ schema: 1, runtime, bundle: {
  bundleId: checksum, checksum, signature,
  url: `https://choongchoongee-star.github.io/Workout/ota/${runtime}/${checksum}.zip`,
} }, null, 2) + '\n')
console.log(`Verified OTA artifact ready in ${output}. Nothing has been published.`)
