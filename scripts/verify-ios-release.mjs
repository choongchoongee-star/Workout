import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { nativeFingerprint } from './ota-native.mjs'

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8')
const [appConfigText, capacitorText, project, plist, scheme, customBuild] = await Promise.all([
  read('app.json'),
  read('capacitor.config.json'),
  read('ios/App/App.xcodeproj/project.pbxproj'),
  read('ios/App/App/Info.plist'),
  read('ios/App/App.xcodeproj/xcshareddata/xcschemes/App.xcscheme'),
  read('.eas/build/ios-production.yml'),
])

const appConfig = JSON.parse(appConfigText).expo
const capacitor = JSON.parse(capacitorText)
assert.equal(await nativeFingerprint(), capacitor.plugins.LiveUpdate.defaultChannel, 'native runtime changed: prepare a new native runtime before release')
assert.ok(capacitor.plugins.LiveUpdate.publicKey, 'OTA signature verification must be configured')

assert.equal(appConfig.name, capacitor.appName, 'app names must match')
assert.equal(appConfig.ios.bundleIdentifier, capacitor.appId, 'bundle identifiers must match')
assert.equal(appConfig.orientation, 'portrait', 'Expo orientation must be portrait')
assert.deepEqual(appConfig.platforms, ['ios'], 'Expo platforms must be iOS-only')
assert.equal(appConfig.ios.supportsTablet, false, 'tablet support must remain disabled')
assert.equal(appConfig.ios.infoPlist.ITSAppUsesNonExemptEncryption, false, 'encryption declaration must be present')
assert.match(appConfig.extra?.eas?.projectId || '', /^[0-9a-f-]{36}$/, 'EAS project must be linked')

assert.match(project, /MARKETING_VERSION = 1\.0;/, 'native marketing version must be 1.0')
assert.match(project, /CURRENT_PROJECT_VERSION = 1;/, 'native build number must be 1 before EAS increments it')
assert.match(project, new RegExp(`PRODUCT_BUNDLE_IDENTIFIER = ${capacitor.appId.replaceAll('.', '\\.')};`), 'native bundle identifier must match Capacitor')
assert.match(project, /TARGETED_DEVICE_FAMILY = 1;/, 'native target must be iPhone-only')
assert.match(project, /AppSettingsPlugin\.swift in Sources/, 'Settings plugin must be compiled into the native target')
assert.match(project, /AppBridgeViewController\.swift in Sources/, 'custom bridge controller must be compiled into the native target')

assert.match(plist, /<key>ITSAppUsesNonExemptEncryption<\/key>\s*<false\/>/, 'native encryption declaration must be false')
assert.match(plist, /<key>UISupportedInterfaceOrientations<\/key>\s*<array>\s*<string>UIInterfaceOrientationPortrait<\/string>\s*<\/array>/, 'native orientations must contain portrait only')
assert.match(scheme, /BlueprintIdentifier = "504EC3031FED79650016851F"/, 'shared scheme must reference the App target')
assert.match(scheme, /<ArchiveAction\s+buildConfiguration = "Release"/, 'shared scheme must archive Release')

for (const requiredStep of [
  'eas/checkout',
  'eas/install_node_modules',
  'eas/resolve_build_config',
  'npm run ios:sync',
  'eas/configure_ios_credentials',
  'eas/configure_ios_version',
  'eas/generate_gymfile_from_template',
  'eas/run_fastlane',
  'eas/find_and_upload_build_artifacts',
]) {
  assert.ok(customBuild.includes(requiredStep), `custom build must include ${requiredStep}`)
}
assert.doesNotMatch(customBuild, /pod install|eas\/prebuild/, 'Capacitor SPM builds must not run CocoaPods or Expo prebuild')

console.log('iOS release configuration is internally consistent.')
