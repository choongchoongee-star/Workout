import { spawnSync } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'

const result = spawnSync(process.execPath, ['node_modules/@capacitor/cli/bin/capacitor', 'sync', 'android'], { stdio: 'inherit' })
if (result.error) throw result.error
if (result.status !== 0) process.exit(result.status ?? 1)

// Android ships its embedded bundle; the existing update channel belongs to iOS.
const path = 'android/app/src/main/assets/capacitor.config.json'
const config = JSON.parse(await readFile(path, 'utf8'))
delete config.plugins.LiveUpdate
await writeFile(path, JSON.stringify(config, null, 2) + '\n')
console.log('Android synced. iOS OTA configuration excluded from Android assets.')
