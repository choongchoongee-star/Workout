import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

// EAS local autoIncrement does not update every custom extension target.
// Keep the project formatting intact because it participates in the OTA hash.
export function synchronizeBuildNumbers(project, buildNumber) {
  assert.match(buildNumber, /^\d+$/, 'iOS build number must be a non-negative integer')
  let count = 0
  const updated = project.replace(/CURRENT_PROJECT_VERSION = [^;]+;/g, () => {
    count += 1
    return `CURRENT_PROJECT_VERSION = ${buildNumber};`
  })
  assert.ok(count >= 4, 'expected Debug/Release versions for app and widget')
  return updated
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const config = JSON.parse(await readFile('app.json', 'utf8'))
  const path = 'ios/App.xcodeproj/project.pbxproj'
  const source = await readFile(path, 'utf8')
  await writeFile(path, synchronizeBuildNumbers(source, config.expo.ios.buildNumber))
  console.log(`Synchronized all iOS target build numbers to ${config.expo.ios.buildNumber}.`)
}
