import assert from 'node:assert/strict'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { createServer } from 'vite'
import { readFile } from 'node:fs/promises'

const server = await createServer({
  server: { middlewareMode: true }, appType: 'custom',
  plugins: [{
    name: 'loaded-ssr-fixture', enforce: 'pre',
    transform(code, id) {
      if (id.replaceAll('\\', '/').endsWith('/src/lib/activeRestTimer.js')) {
        return code.replace('useSyncExternalStore(subscribe, () => timer)',
          'useSyncExternalStore(subscribe, () => timer, () => timer)')
      }
      // SSR does not run the provider's async disk-loading effect.
      if (id.replaceAll('\\', '/').endsWith('/src/context/AppContext.jsx')) {
        return code.replace('loaded: false,', 'loaded: true,')
      }
    },
  }],
})
try {
  const { setLanguage } = await server.ssrLoadModule('/src/lib/i18n.js')
  const { AppProvider } = await server.ssrLoadModule('/src/context/AppContext.jsx')
  const load = async path => (await server.ssrLoadModule(`/src/${path}.jsx`)).default
  const [Settings, Form, Stepper, Equipment, Layout, Privacy] = await Promise.all([
    'screens/Settings', 'components/AddExerciseForm', 'components/StepperInput',
    'components/EquipmentSelect', 'components/Layout', 'screens/Privacy',
  ].map(load))
  function render(component, props = {}) {
    return renderToStaticMarkup(h(MemoryRouter, null, h(AppProvider, null, h(component, props))))
  }
  for (const language of ['ko', 'en']) {
    setLanguage(language)
    const settings = render(Settings)
    assert.ok(settings.includes(language === 'ko' ? '설정 저장' : 'Save preferences'))
    assert.ok(settings.includes(language === 'ko' ? '전체 운동 기록 0개' : 'Download all 0'))
    assert.ok(!settings.includes('Preferred Language'))
    const form = render(Form)
    assert.match(form, /value="Chest"/)
    assert.match(form, /value="weight"/)
    assert.ok(form.includes(language === 'ko' ? '가슴' : 'Chest'))
    const equipment = render(Equipment, { name: 'Bench Press', value: 'barbell', options: ['barbell', 'smith', 'unspecified'] })
    assert.match(equipment, /value="barbell" selected=""/)
    assert.ok(equipment.includes(language === 'ko' ? '바벨' : 'Barbell'))
    const stepper = render(Stepper, { value: 10, unit: 'reps' })
    assert.ok(stepper.includes(language === 'ko' ? '회 1 늘리기' : 'Increase reps by 1'))
    assert.ok(stepper.includes(language === 'ko' ? '횟수 수정' : 'Edit reps'))
    const layout = render(Layout)
    assert.ok(layout.includes(language === 'ko' ? '운동별 기록' : 'Progress'))
    assert.ok(render(Privacy).includes(language === 'ko' ? '개인정보처리방침' : 'Privacy Policy'))
  }
  const plist = await readFile('ios/App/App/Info.plist', 'utf8')
  assert.match(plist, /CFBundleLocalizations[\s\S]*?<string>en<\/string><string>ko<\/string>/)
  const bridge = await readFile('ios/App/App/AppSettingsPlugin.swift', 'utf8')
  assert.match(bridge, /Bundle.main.preferredLocalizations.first/)
  const session = await readFile('src/screens/Session.jsx', 'utf8')
  assert.match(session, /onUpdate\('reps', v\)/)
  console.log('PASS: Korean/English rendered settings, navigation, privacy, category/equipment values, stepper labels, and native language contract.')
} finally {
  await server.close()
}
