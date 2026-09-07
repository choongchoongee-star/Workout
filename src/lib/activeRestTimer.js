import { useSyncExternalStore } from 'react'
import { storage } from './storage'
import { getRemainingSeconds } from './restTimer'
import { restLiveActivity } from './restLiveActivity'
import { cancelRestNotification, notifyRestComplete, prepareRestNotification, scheduleRestNotification } from './restNotification'

// App-wide state outlives route components. The deadline, not tick count, is authoritative.
let timer = { active: false, remaining: 0, total: 0, endsAt: null }
const listeners = new Set()
let interval = null
let revision = 0
function emit(next) {
  timer = next
  listeners.forEach(listener => listener())
}
function tick() {
  if (!timer.active) return
  const remaining = getRemainingSeconds(timer.endsAt)
  if (remaining === timer.remaining) return
  emit({ ...timer, remaining, active: remaining > 0 })
  if (!remaining) {
    void notifyRestComplete()
    void restLiveActivity.end(timer.timerID)
  }
}
function subscribe(listener) {
  listeners.add(listener)
  if (listeners.size === 1) {
    interval = setInterval(tick, 250)
    document.addEventListener('visibilitychange', tick)
    window.addEventListener('focus', tick)
    window.addEventListener('pageshow', tick)
    tick()
  }
  return () => {
    listeners.delete(listener)
    if (!listeners.size) {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', tick)
      window.removeEventListener('focus', tick)
      window.removeEventListener('pageshow', tick)
    }
  }
}
export function startRestTimer() {
  const seconds = storage.getRestSeconds()
  if (seconds <= 0) return
  prepareRestNotification()
  revision++
  const startedAt = Date.now()
  const endsAt = startedAt + seconds * 1000
  const timerID = crypto.randomUUID()
  void scheduleRestNotification(endsAt)
  emit({ active: true, remaining: seconds, total: seconds, endsAt, timerID })
  void restLiveActivity.start({ timerID, startedAt, endsAt })
}
export function skipRestTimer() {
  revision++
  void cancelRestNotification()
  void restLiveActivity.end(timer.timerID)
  emit({ ...timer, active: false })
}
export async function restoreRestTimer() {
  const requestedRevision = revision
  const state = await restLiveActivity.getState()
  if (revision !== requestedRevision || timer.active || state?.status !== 'active') return
  const remaining = getRemainingSeconds(state.endsAt)
  if (!remaining || !Number.isFinite(state.startedAt) || state.endsAt <= state.startedAt || typeof state.timerID !== 'string') return
  emit({ active: true, remaining, total: Math.ceil((state.endsAt - state.startedAt) / 1000), endsAt: state.endsAt, timerID: state.timerID })
}
export function useRestTimer() {
  return useSyncExternalStore(subscribe, () => timer)
}
