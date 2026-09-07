import { useSyncExternalStore } from 'react'
import { storage } from './storage'
import { getRemainingSeconds } from './restTimer'
import { cancelRestNotification, notifyRestComplete, prepareRestNotification, scheduleRestNotification } from './restNotification'

// App-wide state outlives route components. The deadline, not tick count, is authoritative.
let timer = { active: false, remaining: 0, total: 0, endsAt: null }
const listeners = new Set()
let interval = null
function emit(next) {
  timer = next
  listeners.forEach(listener => listener())
}
function tick() {
  if (!timer.active) return
  const remaining = getRemainingSeconds(timer.endsAt)
  if (remaining === timer.remaining) return
  emit({ ...timer, remaining, active: remaining > 0 })
  if (!remaining) void notifyRestComplete()
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
  const endsAt = Date.now() + seconds * 1000
  void scheduleRestNotification(endsAt)
  emit({ active: true, remaining: seconds, total: seconds, endsAt })
}
export function skipRestTimer() {
  void cancelRestNotification()
  emit({ ...timer, active: false })
}
export function useRestTimer() {
  return useSyncExternalStore(subscribe, () => timer)
}
