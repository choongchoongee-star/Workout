let preparedAudioContext = null

function createBrowserAudioContext() {
  if (typeof window === 'undefined') return null
  const AudioContext = window.AudioContext || window.webkitAudioContext
  return AudioContext ? new AudioContext() : null
}

function browserVibrate(duration) {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return false
  return navigator.vibrate(duration)
}

export function prepareRestNotification(createContext = createBrowserAudioContext) {
  try {
    preparedAudioContext ??= createContext()
    if (!preparedAudioContext) return false
    if (preparedAudioContext.state === 'suspended') {
      preparedAudioContext.resume().catch(() => {})
    }
    return true
  } catch {
    return false
  }
}

export function playRestTone(context) {
  const now = context.currentTime
  const oscillator = context.createOscillator()
  const gain = context.createGain()

  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(880, now)
  gain.gain.setValueAtTime(0.16, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25)
  oscillator.connect(gain)
  gain.connect(context.destination)
  oscillator.start(now)
  oscillator.stop(now + 0.25)
}

export async function notifyRestComplete({
  context = preparedAudioContext,
  createContext = createBrowserAudioContext,
  vibrate = browserVibrate,
} = {}) {
  try {
    const audioContext = context || createContext()
    if (!audioContext) throw new Error('Web Audio is unavailable')
    if (audioContext.state === 'suspended') await audioContext.resume()
    if (audioContext.state && audioContext.state !== 'running') {
      throw new Error('Web Audio is not running')
    }
    preparedAudioContext = audioContext
    playRestTone(audioContext)
    return 'sound'
  } catch {
    return vibrate(250) ? 'vibration' : 'none'
  }
}
