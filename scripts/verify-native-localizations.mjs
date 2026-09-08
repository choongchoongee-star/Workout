import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import xcode from 'xcode'

const unquote = value => value?.replace(/^"|"$/g, '')

// Follow target -> Resources -> build file -> variant group -> disk file.
// CFBundleLocalizations alone does not establish App Store language support.
export async function verifyNativeLocalizations(objects, root = resolve('ios')) {
  const groups = { ...objects.PBXGroup, ...objects.PBXVariantGroup }
  function directory(id, seen = new Set()) {
    assert.ok(!seen.has(id), 'cyclic Xcode group hierarchy')
    seen.add(id)
    const group = groups[id]
    if (!group) return root
    const parent = Object.entries(groups).find(([, item]) => item.children?.some(child => child.value === id))
    const base = unquote(group.sourceTree) === 'SOURCE_ROOT' || !parent ? root : directory(parent[0], seen)
    return resolve(base, unquote(group.path) || '')
  }
  for (const name of ['App', 'RestTimerActivity']) {
    const target = Object.values(objects.PBXNativeTarget).find(item => unquote(item.name) === name)
    assert.ok(target, `missing target: ${name}`)
    const resources = target.buildPhases.flatMap(ref => objects.PBXResourcesBuildPhase[ref.value]?.files || [])
    const variants = resources.map(ref => objects.PBXBuildFile[ref.value]?.fileRef)
      .filter(id => unquote(objects.PBXVariantGroup[id]?.name) === 'InfoPlist.strings')
    assert.equal(variants.length, 1, `${name}: localized InfoPlist.strings must be copied exactly once`)
    const variantId = variants[0]
    const files = objects.PBXVariantGroup[variantId].children.map(ref => objects.PBXFileReference[ref.value])
    assert.deepEqual(files.map(file => unquote(file.name)).sort(), ['en', 'ko'], `${name}: missing language resource`)
    for (const file of files) {
      const language = unquote(file.name)
      const path = unquote(file.path)
      assert.ok(path.endsWith(`${language}.lproj/InfoPlist.strings`), `${name}: incorrect localization path`)
      assert.equal(file.lastKnownFileType, 'text.plist.strings')
      const base = unquote(file.sourceTree) === 'SOURCE_ROOT' ? root : directory(variantId)
      const content = await readFile(resolve(base, path), 'utf8')
      assert.match(content, /^"CFBundleDisplayName"\s*=\s*"[^"\n]+";\s*$/, `${name}/${language}: invalid or empty strings file`)
    }
  }
}

const project = xcode.project('ios/App.xcodeproj/project.pbxproj')
project.parseSync()
await verifyNativeLocalizations(project.hash.project.objects)

// Prove the gate catches the original failure even with en/ko in Info.plist.
const missingResources = structuredClone(project.hash.project.objects)
for (const phase of Object.values(missingResources.PBXResourcesBuildPhase)) {
  if (phase.files) phase.files = []
}
await assert.rejects(verifyNativeLocalizations(missingResources), /must be copied exactly once/)
const missingKorean = structuredClone(project.hash.project.objects)
for (const group of Object.values(missingKorean.PBXVariantGroup)) {
  if (unquote(group.name) === 'InfoPlist.strings') {
    group.children = group.children.filter(ref => unquote(missingKorean.PBXFileReference[ref.value].name) !== 'ko')
  }
}
await assert.rejects(verifyNativeLocalizations(missingKorean), /missing language resource/)
console.log('PASS: app and widget en/ko resources resolve through their build targets; missing-resource and missing-Korean regressions rejected.')
