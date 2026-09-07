import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFileSync, existsSync } from 'node:fs'
const require = createRequire(import.meta.url)
const project = require('xcode').project('ios/App.xcodeproj/project.pbxproj')
project.parseSync()
const objects = project.hash.project.objects
const entries = section => Object.entries(objects[section]).filter(([, value]) => value?.isa)
const [appID, app] = entries('PBXNativeTarget').find(([, t]) => t.name === 'App')
const [widgetID, widget] = entries('PBXNativeTarget').find(([, t]) => t.name === 'RestTimerActivity')
const ref = item => typeof item === 'string' ? item : item.value
// Expo's target/version discovery destructures { value }; bare UUID strings
// parse in xcode but fail in the EAS CLI before a remote build is created.
for (const [, target] of entries('PBXNativeTarget')) {
  for (const item of target.dependencies ?? []) {
    assert.equal(typeof item.value, 'string', 'EAS dependency references require PBX comments')
    assert(project.getPBXGroupByKeyAndType(item.value, 'PBXTargetDependency')?.target)
  }
}
for (const [, list] of entries('XCConfigurationList')) {
  for (const item of list.buildConfigurations) {
    assert.equal(typeof item.value, 'string', 'EAS build configuration references require PBX comments')
  }
}
assert.equal(widget.productType.replaceAll('"', ''), 'com.apple.product-type.app-extension')
assert(app.dependencies.some(item => objects.PBXTargetDependency[ref(item)].target === widgetID))
const embed = app.buildPhases.map(ref).map(id => objects.PBXCopyFilesBuildPhase?.[id]).find(Boolean)
assert.equal(Number(embed.dstSubfolderSpec), 13)
assert(embed.files.some(item => objects.PBXBuildFile[ref(item)].fileRef === widget.productReference))
function sourcePaths(target) {
  return target.buildPhases.map(ref).flatMap(id => objects.PBXSourcesBuildPhase[id]?.files ?? [])
    .map(ref).map(id => objects.PBXFileReference[objects.PBXBuildFile[id].fileRef].path)
}
assert(sourcePaths(app).includes('App/App/RestLiveActivityPlugin.swift'))
assert(sourcePaths(app).includes('App/App/RestActivityAttributes.swift'))
assert(sourcePaths(widget).includes('App/App/RestActivityAttributes.swift'))
assert(sourcePaths(widget).includes('RestTimerActivity/RestTimerActivity.swift'))
for (const path of sourcePaths(widget)) assert(existsSync(`ios/${path}`))
const appConfig = JSON.parse(readFileSync('app.json')).expo
for (const configRef of objects.XCConfigurationList[widget.buildConfigurationList].buildConfigurations) {
  const settings = objects.XCBuildConfiguration[ref(configRef)].buildSettings
  assert.equal(Number(settings.IPHONEOS_DEPLOYMENT_TARGET), 16.2)
  assert.equal(String(settings.CURRENT_PROJECT_VERSION), appConfig.ios.buildNumber)
  assert.equal(settings.PRODUCT_BUNDLE_IDENTIFIER, `${appConfig.ios.bundleIdentifier}.RestTimerActivity`)
  assert.equal(settings.APPLICATION_EXTENSION_API_ONLY, 'YES')
  assert.equal(settings.SKIP_INSTALL, 'YES')
}
assert.match(readFileSync('ios/App/App/Info.plist', 'utf8'), /NSSupportsLiveActivities<\/key>\s*<true\/>/)
assert.match(readFileSync('ios/RestTimerActivity/Info.plist', 'utf8'), /com.apple.widgetkit-extension/)
assert.match(readFileSync('ios/App/App/AppBridgeViewController.swift', 'utf8'), /registerPluginInstance\(RestLiveActivityPlugin\(\)\)/)
assert.match(readFileSync('ios/App.xcodeproj/xcshareddata/xcschemes/App.xcscheme', 'utf8'), new RegExp(appID))
console.log('PASS: Xcode parser, app/extension source membership, target dependency, embedding, bundle/version and Live Activity registration. Swift compilation still requires Xcode.')
