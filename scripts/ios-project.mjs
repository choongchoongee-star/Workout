import { createRequire } from 'node:module'
import { resolve } from 'node:path'

const require = createRequire(import.meta.url)
// Capacitor 8.5.1 hard-codes ios/App/App.xcodeproj. Keep its copy/SPM behavior,
// supplying our EAS-compatible project path without modifying the dependency.
if (require('@capacitor/cli/package.json').version !== '8.5.1') {
  throw new Error('Review the iOS layout adapter before upgrading Capacitor CLI.')
}
const { loadConfig } = require('@capacitor/cli/dist/config.js')
const config = await loadConfig()
config.ios.nativeXcodeProjDir = 'App.xcodeproj'
config.ios.nativeXcodeProjDirAbs = resolve(config.ios.platformDirAbs, 'App.xcodeproj')
config.ios.webDirAbs = Promise.resolve(resolve(config.ios.nativeTargetDirAbs, 'public'))

if (process.argv[2] === 'open') {
  const { openIOS } = require('@capacitor/cli/dist/ios/open.js')
  await openIOS(config)
} else {
  const { copy } = require('@capacitor/cli/dist/tasks/copy.js')
  const { update } = require('@capacitor/cli/dist/tasks/update.js')
  // Use individual operations so a failed copy aborts the release.
  await copy(config, 'ios', false)
  await update(config, 'ios', false)
}
