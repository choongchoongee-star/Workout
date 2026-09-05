import { Capacitor } from '@capacitor/core'
import { LiveUpdate } from '@capawesome/capacitor-live-update'

export const UPDATE_BASE = 'https://choongchoongee-star.github.io/Workout/ota/'

export function validateUpdate(manifest, runtime) {
  if (manifest?.schema !== 1 || manifest.runtime !== runtime) throw new Error('Incompatible update')
  if (manifest.bundle === null) return null
  const bundle = manifest.bundle
  if (!bundle || !/^[a-f0-9]{64}$/.test(bundle.bundleId) || bundle.checksum !== bundle.bundleId ||
      typeof bundle.signature !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(bundle.signature) ||
      bundle.url !== `${UPDATE_BASE}${runtime}/${bundle.bundleId}.zip`) throw new Error('Invalid update')
  return bundle
}

export function createUpdater({ native = () => Capacitor.getPlatform() === 'ios', plugin = LiveUpdate, fetcher = fetch } = {}) {
  let startup
  let checking
  async function check() {
    if (!native()) return 'web'
    if (checking) return checking
    checking = (async () => {
      try {
        await (startup ??= plugin.ready())
        const { channel: runtime } = await plugin.getChannel()
        if (!/^ios-[a-f0-9]{16}$/.test(runtime || '')) return 'unavailable'
        const response = await fetcher(`${UPDATE_BASE}${runtime}/latest.json`, {
          cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(10000),
        })
        if (response.status === 404) return 'current'
        if (!response.ok) throw new Error('Update check failed')
        const bundle = validateUpdate(await response.json(), runtime)
        if (!bundle) {
          await plugin.reset()
          return 'current'
        }
        const { bundleId: current } = await plugin.getCurrentBundle()
        if (current === bundle.bundleId) return 'current'
        const { bundleIds: blocked } = await plugin.getBlockedBundles()
        if (blocked.includes(bundle.bundleId)) return 'blocked'
        const { bundleIds: downloaded } = await plugin.getDownloadedBundles()
        if (!downloaded.includes(bundle.bundleId)) await plugin.downloadBundle({ ...bundle, artifactType: 'zip' })
        await plugin.setNextBundle({ bundleId: bundle.bundleId })
        return 'pending'
      } catch {
        return 'unavailable'
      }
    })()
    try { return await checking } finally { checking = null }
  }
  return { check }
}

export const otaUpdater = createUpdater()
