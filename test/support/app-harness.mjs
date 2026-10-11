// Shared component-test harness: mounts the real App with ReactDOM in jsdom.
// Only the data layer, SDK hooks and app client are replaced with in-memory
// synthetic stubs (`roomRent.db`, `setUser`), so no production reads or
// writes happen. Importing this module registers the setup/teardown hooks.
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { after, afterEach, before } from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

const webRoot = fileURLToPath(new URL('../../web/', import.meta.url))
const requireWeb = createRequire(`${webRoot}package.json`)
const { JSDOM } = requireWeb('jsdom')

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'https://room-rent.proappstore.online/#/',
  pretendToBeVisual: true,
})
export const { window } = dom
for (const key of ['window', 'document', 'location', 'navigator', 'HTMLElement', 'Node', 'Event']) {
  Object.defineProperty(globalThis, key, { value: key === 'window' ? window : window[key], configurable: true, writable: true })
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

export const React = requireWeb('react')
const { createRoot } = requireWeb('react-dom/client')
export const { act } = React

export const alice = { id: 'alice', login: 'alice', avatarUrl: '' }
export const bob = { id: 'bob', login: 'bob', avatarUrl: '' }

export function listing(id, title, overrides = {}) {
  return {
    id, title, host_id: 'host', host_name: 'Hosta', host_avatar: '', description: '', location: 'Somewhere',
    lat: 0, lng: 0, price_per_night: 100, capacity: 4, bedrooms: 1, bathrooms: 1, amenities: '[]',
    images: '[]', house_rules: '[]', cancellation_policy: 'flexible', check_in_time: '15:00',
    check_out_time: '11:00', instant_book: false, cleaning_fee: 0, service_fee_pct: 12, ical_url: '',
    created_at: 0, updated_at: 0, ...overrides,
  }
}

export function deferred() {
  let resolve
  let reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const authListeners = new Set()
let authState
export const roomRent = {
  React,
  auth: {
    get: () => authState,
    subscribe: (listener) => { authListeners.add(listener); return () => authListeners.delete(listener) },
  },
  db: {},
}
globalThis.__roomRent = roomRent

function setUser(user) {
  authState = { user, loading: false, signOut: () => setUser(null) }
  for (const listener of authListeners) listener()
}

// Every db export the app imports is routed to the per-test `roomRent.db` stubs.
const dbExports = [...readFileSync(new URL('src/lib/db/index.ts', `file://${webRoot}`), 'utf8')
  .matchAll(/^export async function (\w+)/gm)].map((m) => m[1])

const mocks = {
  name: 'room-rent-test-mocks',
  enforce: 'pre',
  resolveId(id) {
    if (id === '@proappstore/sdk/hooks') return '\0mock:hooks'
    const lib = id.match(/(?:^|\/)lib\/(db|app)$/)
    if (lib) return `\0mock:${lib[1]}`
  },
  load(id) {
    if (id === '\0mock:db') {
      return dbExports.map((name) => `export const ${name} = (...args) => globalThis.__roomRent.db.${name}(...args)`).join('\n')
    }
    if (id === '\0mock:app') return 'export const app = {}'
    if (id === '\0mock:hooks') {
      return `const { React, auth } = globalThis.__roomRent
export function useProAuth() { return React.useSyncExternalStore(auth.subscribe, auth.get) }
export function useProNotifications() { return { permission: 'default', isSubscribed: false, subscribe() {}, unsubscribe() {}, loading: false } }`
    }
  },
}

let server
let App
let root

before(async () => {
  const { createServer } = await import(pathToFileURL(requireWeb.resolve('vite')).href)
  server = await createServer({
    root: webRoot,
    configFile: false,
    logLevel: 'error',
    appType: 'custom',
    server: { middlewareMode: true, hmr: false, ws: false },
    oxc: { jsx: { runtime: 'automatic' } },
    // Let the stub resolver see SDK imports instead of externalizing them.
    ssr: { noExternal: ['@proappstore/sdk'] },
    plugins: [mocks],
  })
  App = (await server.ssrLoadModule('/src/App.tsx')).default
})

after(async () => {
  await server?.close()
  window.close()
})

afterEach(async () => {
  await act(async () => root?.unmount())
  root = undefined
})

export async function flush() {
  for (let i = 0; i < 3; i++) await act(() => new Promise((resolve) => setTimeout(resolve, 0)))
}

export async function mount(hash, user) {
  window.location.hash = hash
  setUser(user)
  root = createRoot(document.getElementById('root'))
  await act(async () => root.render(React.createElement(App)))
  await flush()
}

export async function navigate(hash) {
  window.location.hash = hash
  await flush()
}

export async function changeUser(user) {
  await act(async () => setUser(user))
  await flush()
}

export const $ = (selector) => document.querySelector(selector)

export async function setValue(el, value) {
  const proto = Object.getPrototypeOf(el)
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value)
  await act(async () => el.dispatchEvent(new window.Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })))
}

export async function click(el) {
  await act(async () => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })))
  await flush()
}
