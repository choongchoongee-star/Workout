export function getRemainingSeconds(endsAt, now = Date.now()) {
  if (!Number.isFinite(endsAt) || !Number.isFinite(now)) return 0
  return Math.max(0, Math.ceil((endsAt - now) / 1000))
}
