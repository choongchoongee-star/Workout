import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import xcode from 'xcode'
import { synchronizeBuildNumbers } from './sync-ios-versions.mjs'

test('EAS-style app increment and stale widget converge without changing native runtime inputs', async () => {
  const source = await readFile('ios/App.xcodeproj/project.pbxproj', 'utf8')
  let index = 0
  const mixed = source.replace(/CURRENT_PROJECT_VERSION = [^;]+;/g, () => `CURRENT_PROJECT_VERSION = ${index++ < 2 ? '9' : '8'};`)
  const result = synchronizeBuildNumbers(mixed, '9')
  const parser = xcode.project('ios/App.xcodeproj/project.pbxproj')
  parser.parseSync()
  const objects = parser.hash.project.objects
  for (const target of Object.values(objects.PBXNativeTarget).filter(value => value?.isa)) {
    const configs = objects.XCConfigurationList[target.buildConfigurationList].buildConfigurations
    for (const { value: id } of configs) {
      const block = result.slice(result.indexOf(`${id} /*`, result.indexOf('/* Begin XCBuildConfiguration section */')))
      assert.match(block.slice(0, block.indexOf('name =') + 6), /CURRENT_PROJECT_VERSION = 9;/)
    }
  }
  const normalize = text => text.replace(/CURRENT_PROJECT_VERSION = [^;]+;/g, 'CURRENT_PROJECT_VERSION = AUTO;')
  assert.equal(normalize(result), normalize(source))
  assert.equal(synchronizeBuildNumbers(result, '9'), result)
})

test('invalid version or missing native targets aborts synchronization', () => {
  assert.throws(() => synchronizeBuildNumbers('', '9'), /expected Debug/)
  assert.throws(() => synchronizeBuildNumbers('', '9; bad'), /integer/)
})
