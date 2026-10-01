import { Capacitor, registerPlugin } from '@capacitor/core'

const plugin = registerPlugin('RestLiveActivity')

export function createRestLiveActivity({ available = () => Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('RestLiveActivity'), bridge = plugin } = {}) {
  let queue = Promise.resolve()
  function invoke(method, input = {}) {
    const result = queue.then(async () => {
      if (!available()) return { status: 'unsupported' }
      try { return await bridge[method](input) }
      catch { return { status: 'unavailable' } }
    })
    queue = result.catch(() => {})
    return result
  }
  return {
    start: ({ timerID, startedAt, endsAt, notificationID }) => invoke('start', { timerID, startedAt, endsAt, ...(notificationID == null ? {} : { notificationID }) }),
    end: timerID => invoke('end', { timerID }),
    getState: () => invoke('getState'),
    async onCancel(listener) {
      if (!available()) return { remove() {} }
      try { return await bridge.addListener('cancelled', listener) }
      catch { return { remove() {} } }
    },
  }
}

export const restLiveActivity = createRestLiveActivity()
