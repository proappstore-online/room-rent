// Component tests for EditListing load, save and preview lifecycle, run through
// the shared jsdom/ReactDOM App harness with synthetic data stubs.
import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { $, act, alice, bob, changeUser, click, deferred, flush, listing, mount, navigate, roomRent, setValue, window } from './support/app-harness.mjs'

const loftA = listing('loft-a', 'Alice Loft', { host_id: 'alice' })
const loftB = listing('loft-b', 'Alice Barn', { host_id: 'alice' })

function stubDb(overrides = () => ({})) {
  const calls = { getListing: [], updateListing: [] }
  roomRent.db = {
    getListing: async (id) => { calls.getListing.push(id); return { 'loft-a': loftA, 'loft-b': loftB }[id] ?? null },
    updateListing: async (...args) => { calls.updateListing.push(args) },
    // Pages reached after a save or redirect.
    getMyListings: async () => [],
    getHostBookings: async () => [],
    getReviewsForListing: async () => [],
    getBookingsForListing: async () => [],
    canLeaveReview: async () => false,
    ...overrides(calls),
  }
  return calls
}

// Object URLs are a browser API; record what the page creates and revokes.
const realCreate = URL.createObjectURL
const realRevoke = URL.revokeObjectURL
const revoked = []
URL.createObjectURL = (file) => `blob:${file.name}`
URL.revokeObjectURL = (url) => { revoked.push(url) }
after(() => {
  URL.createObjectURL = realCreate
  URL.revokeObjectURL = realRevoke
})

const text = () => $('#root').textContent
const button = (label) => [...document.querySelectorAll('#root button')].find((b) => b.textContent.trim() === label)
const titleInput = () => $('#root form input[type="text"]')
const submitButton = () => $('#root form button[type="submit"]')

async function submit() {
  await act(async () => $('#root form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })))
  await flush()
}

async function addFiles(...names) {
  const input = $('#root input[type="file"]')
  const files = names.map((name) => new window.File(['x'], name, { type: 'image/png' }))
  Object.defineProperty(input, 'files', { value: files, configurable: true })
  await act(async () => input.dispatchEvent(new window.Event('change', { bubbles: true })))
}

test('a rejected load shows an error and retry renders the form', async () => {
  let fail = true
  const calls = stubDb((calls) => ({
    getListing: async (id) => {
      calls.getListing.push(id)
      if (fail) throw new Error('offline')
      return loftA
    },
  }))
  await mount('#/host/edit/loft-a', alice)
  assert.match(text(), /Unable to load this listing\. Please try again\./)
  assert.equal($('#root form'), null)

  fail = false
  await click(button('Try again'))
  assert.equal(titleInput().value, 'Alice Loft')
  assert.doesNotMatch(text(), /Unable to load/)
  assert.deepEqual(calls.getListing, ['loft-a', 'loft-a'])
})

test('malformed stored amenities, rules and images load as empty lists', async () => {
  stubDb(() => ({
    getListing: async () => ({ ...loftA, amenities: '{not json', house_rules: '{"a":1}', images: '["ok.jpg", 7' }),
  }))
  await mount('#/host/edit/loft-a', alice)
  assert.equal(titleInput().value, 'Alice Loft')
  assert.doesNotMatch(text(), /Unable to load/)
  assert.equal($('#root form img'), null)
})

for (const outcome of ['resolve', 'reject']) {
  test(`a late ${outcome} for the previous listing is ignored after switching listings`, async () => {
    const loadA = deferred()
    stubDb((calls) => ({
      getListing: (id) => { calls.getListing.push(id); return id === 'loft-a' ? loadA.promise : Promise.resolve(loftB) },
    }))
    await mount('#/host/edit/loft-a', alice)
    await navigate('#/host/edit/loft-b')
    assert.equal(titleInput().value, 'Alice Barn')

    // A late not-owned result would otherwise redirect away from the new listing.
    if (outcome === 'resolve') loadA.resolve({ ...loftA, host_id: 'someone-else' })
    else loadA.reject(new Error('late failure'))
    await flush()
    assert.equal(window.location.hash, '#/host/edit/loft-b')
    assert.equal(titleInput().value, 'Alice Barn')
    assert.doesNotMatch(text(), /Unable to load/)
  })
}

test('switching accounts immediately hides the previous draft and re-checks ownership', async () => {
  const bobLoad = deferred()
  stubDb((calls) => ({
    getListing: (id) => { calls.getListing.push(id); return calls.getListing.length === 1 ? Promise.resolve(loftA) : bobLoad.promise },
  }))
  await mount('#/host/edit/loft-a', alice)
  await setValue(titleInput(), 'Alice private draft')

  await changeUser(bob)
  assert.equal($('#root form'), null)
  assert.doesNotMatch(text(), /Alice private draft/)

  bobLoad.resolve(loftA)
  await flush()
  assert.equal(window.location.hash, '#/host')
  assert.doesNotMatch(text(), /Alice private draft/)
})

for (const outcome of ['resolve', 'reject']) {
  test(`a late save ${outcome} from the previous listing does not touch the new one`, async () => {
    const saveA = deferred()
    const calls = stubDb((calls) => ({
      updateListing: (...args) => { calls.updateListing.push(args); return saveA.promise },
    }))
    await mount('#/host/edit/loft-a', alice)
    await setValue(titleInput(), 'Alice Loft renamed')
    await submit()
    await navigate('#/host/edit/loft-b')
    assert.equal(titleInput().value, 'Alice Barn')
    assert.equal(submitButton().disabled, false)

    if (outcome === 'resolve') saveA.resolve()
    else saveA.reject(new Error('late denial'))
    await flush()
    assert.equal(window.location.hash, '#/host/edit/loft-b')
    assert.equal(titleInput().value, 'Alice Barn')
    assert.doesNotMatch(text(), /late denial/)
    assert.equal(calls.updateListing.length, 1)
    assert.equal(calls.updateListing[0][0], 'loft-a')
  })
}

test('a failed save keeps the draft and a retry saves it', async () => {
  let fail = true
  const calls = stubDb((calls) => ({
    updateListing: async (...args) => {
      calls.updateListing.push(args)
      if (fail) throw new Error('Save denied')
    },
  }))
  await mount('#/host/edit/loft-a', alice)
  await setValue(titleInput(), 'Alice Loft renamed')
  await submit()
  assert.match(text(), /Save denied/)
  assert.equal(titleInput().value, 'Alice Loft renamed')
  assert.equal(submitButton().disabled, false)
  assert.equal(window.location.hash, '#/host/edit/loft-a')

  fail = false
  await submit()
  assert.equal(window.location.hash, '#/listing/loft-a')
  assert.deepEqual(calls.updateListing.map(([id, data]) => [id, data.title]), [
    ['loft-a', 'Alice Loft renamed'],
    ['loft-a', 'Alice Loft renamed'],
  ])
})

test('a second submit while a save is pending is ignored', async () => {
  const save = deferred()
  const calls = stubDb((calls) => ({
    updateListing: (...args) => { calls.updateListing.push(args); return save.promise },
  }))
  await mount('#/host/edit/loft-a', alice)
  await submit()
  assert.equal(submitButton().disabled, true)
  await submit()
  assert.equal(calls.updateListing.length, 1)

  save.resolve()
  await flush()
  assert.equal(window.location.hash, '#/listing/loft-a')
  assert.equal(calls.updateListing.length, 1)
})

test('preview object URLs are revoked on removal, listing/account reset and leaving the page', async () => {
  stubDb()
  revoked.length = 0
  await mount('#/host/edit/loft-a', alice)
  await addFiles('a1.png', 'a2.png')
  await click([...document.querySelectorAll('#root form button')].find((b) => b.textContent === '×'))
  assert.deepEqual(revoked, ['blob:a1.png'])

  await navigate('#/host/edit/loft-b')
  assert.deepEqual(revoked, ['blob:a1.png', 'blob:a2.png'])

  await addFiles('b1.png')
  await changeUser(bob)
  assert.deepEqual(revoked, ['blob:a1.png', 'blob:a2.png', 'blob:b1.png'])

  await changeUser(alice)
  await navigate('#/host/edit/loft-a')
  await addFiles('a3.png')
  await navigate('#/host')
  assert.deepEqual(revoked, ['blob:a1.png', 'blob:a2.png', 'blob:b1.png', 'blob:a3.png'])
})
