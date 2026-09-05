// Retire the old PWA worker without touching local workout data.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    await self.registration.unregister()
    const windows = await self.clients.matchAll({ type: 'window' })
    for (const client of windows) {
      if (client.url.startsWith(self.registration.scope)) await client.navigate(self.registration.scope)
    }
  })())
})
