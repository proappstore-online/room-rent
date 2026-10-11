import assert from 'node:assert/strict'
import test from 'node:test'
import { createLifecycleScope, settleIfCurrent } from '../web/src/lib/lifecycle.js'

function deferred() {
  let resolve
  let reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

test('a delayed current result is applied to its account context', async () => {
  const scope = createLifecycleScope('account-a')
  const request = scope.begin('account-a')
  const load = deferred()
  const applied = []

  const settled = settleIfCurrent(request, load.promise, {
    onSuccess: (value) => applied.push(value),
    onError: assert.fail,
  })
  load.resolve(['account-a-trip'])

  assert.equal(await settled, true)
  assert.deepEqual(applied, [['account-a-trip']])
})

test('a delayed listing/account result is ignored after its context changes', async () => {
  const scope = createLifecycleScope('listing-a:account-a')
  const request = scope.begin('listing-a:account-a')
  const load = deferred()
  const applied = []

  const settled = settleIfCurrent(request, load.promise, {
    onSuccess: (value) => applied.push(value),
    onError: (error) => applied.push(error),
  })
  scope.updateContext('listing-b:account-b')
  load.resolve('old private state')

  assert.equal(await settled, false)
  assert.deepEqual(applied, [])
})

test('a current rejection reaches retry UI while a stale rejection does not', async () => {
  const scope = createLifecycleScope('listing-a')
  const staleRequest = scope.begin('listing-a')
  const staleLoad = deferred()
  const staleErrors = []
  const staleSettled = settleIfCurrent(staleRequest, staleLoad.promise, {
    onSuccess: assert.fail,
    onError: (error) => staleErrors.push(error.message),
  })

  scope.updateContext('listing-b')
  staleLoad.reject(new Error('old request failed'))
  assert.equal(await staleSettled, false)
  assert.deepEqual(staleErrors, [])

  const currentRequest = scope.begin('listing-b')
  const currentLoad = deferred()
  const currentErrors = []
  const currentSettled = settleIfCurrent(currentRequest, currentLoad.promise, {
    onSuccess: assert.fail,
    onError: (error) => currentErrors.push(error.message),
  })
  currentLoad.reject(new Error('listing unavailable'))

  assert.equal(await currentSettled, true)
  assert.deepEqual(currentErrors, ['listing unavailable'])
})

test('a retry invalidates an earlier request in the same context', async () => {
  const scope = createLifecycleScope('listing-a')
  const firstRequest = scope.begin('listing-a')
  const firstLoad = deferred()
  const applied = []
  const firstSettled = settleIfCurrent(firstRequest, firstLoad.promise, {
    onSuccess: (value) => applied.push(value),
    onError: assert.fail,
  })

  const retryRequest = scope.begin('listing-a')
  const retryLoad = deferred()
  const retrySettled = settleIfCurrent(retryRequest, retryLoad.promise, {
    onSuccess: (value) => applied.push(value),
    onError: assert.fail,
  })
  firstLoad.resolve('first result')
  retryLoad.resolve('retry result')

  assert.equal(await firstSettled, false)
  assert.equal(await retrySettled, true)
  assert.deepEqual(applied, ['retry result'])
})
