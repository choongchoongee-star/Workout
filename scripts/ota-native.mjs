import { createHash } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'

// Exclude generated web assets and Xcode build numbers; include native code and plugin versions.
export async function nativeFingerprint() {
  const hash = createHash('sha256')
  async function walk(dir) {
    for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const path = `${dir}/${entry.name}`
      if (entry.isDirectory()) {
        if (!['public', 'Assets.xcassets'].includes(entry.name)) await walk(path)
      } else if (!['capacitor.config.json', 'config.xml'].includes(entry.name)) {
        hash.update(path).update((await readFile(path, 'utf8')).replaceAll('\r\n', '\n'))
      }
    }
  }
  await walk('ios/App/App')
  const lock = JSON.parse(await readFile('package-lock.json', 'utf8'))
  for (const [path, value] of Object.entries(lock.packages).sort()) {
    if (/node_modules\/@(capacitor|capawesome)\//.test(path)) hash.update(`${path}:${value.version}`)
  }
  const config = JSON.parse(await readFile('capacitor.config.json', 'utf8'))
  if (config.plugins?.LiveUpdate) delete config.plugins.LiveUpdate.defaultChannel
  hash.update(JSON.stringify(config))
  hash.update((await readFile('ios/App/CapApp-SPM/Package.swift', 'utf8')).replaceAll('\r\n', '\n'))
  hash.update((await readFile('ios/App/App.xcodeproj/project.pbxproj', 'utf8')).replaceAll('\r\n', '\n').replace(/CURRENT_PROJECT_VERSION = [^;]+;/g, 'CURRENT_PROJECT_VERSION = AUTO;'))
  return `ios-${hash.digest('hex').slice(0, 16)}`
}
