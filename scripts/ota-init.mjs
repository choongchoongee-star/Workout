import { generateKeyPairSync } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { nativeFingerprint } from './ota-native.mjs'

const config = JSON.parse(await readFile('capacitor.config.json', 'utf8'))
if (config.plugins.LiveUpdate?.publicKey) throw new Error('OTA is already initialized. Never replace the signing key of an installed app casually.')
const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' }, privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
})
await mkdir('.ota-keys', { recursive: true })
await writeFile('.ota-keys/private.pem', privateKey, { flag: 'wx', mode: 0o600 })
config.plugins.LiveUpdate = {
  autoUpdateStrategy: 'none', readyTimeout: 30000,
  autoBlockRolledBackBundles: true, autoDeleteBundles: true, publicKey,
}
await writeFile('capacitor.config.json', JSON.stringify(config, null, 2) + '\n')
config.plugins.LiveUpdate.defaultChannel = await nativeFingerprint()
await writeFile('capacitor.config.json', JSON.stringify(config, null, 2) + '\n')
console.log('OTA key created locally and public key configured. Back up .ota-keys/private.pem privately; never commit it.')
