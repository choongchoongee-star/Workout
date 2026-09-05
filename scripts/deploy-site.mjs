import ghpages from 'gh-pages'
import './build-site.mjs'

// Remove old PWA assets, but preserve every previously published OTA runtime.
await new Promise((resolve, reject) => ghpages.publish('site-dist', {
  remove: ['**/*', '!ota', '!ota/**'],
  nojekyll: true,
  message: 'Publish iPhone app information and privacy policy',
}, error => error ? reject(error) : resolve()))
console.log('Information site published; OTA files preserved.')
