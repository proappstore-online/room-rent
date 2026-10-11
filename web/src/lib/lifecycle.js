/** Keeps async work tied to the route/account context that started it. */
export function createLifecycleScope(initialContext) {
  let context = initialContext
  let version = 0

  return {
    updateContext(nextContext) {
      if (context !== nextContext) {
        context = nextContext
        version += 1
      }
    },
    begin(nextContext = context) {
      this.updateContext(nextContext)
      version += 1
      const requestContext = context
      const requestVersion = version
      return { isCurrent: () => context === requestContext && version === requestVersion }
    },
    capture() {
      const requestContext = context
      const requestVersion = version
      return { isCurrent: () => context === requestContext && version === requestVersion }
    },
  }
}

/** Applies an outcome only while its originating context remains current. */
export async function settleIfCurrent(request, operation, { onSuccess, onError }) {
  try {
    const value = await operation
    if (!request.isCurrent()) return false
    onSuccess(value)
    return true
  } catch (error) {
    if (!request.isCurrent()) return false
    onError(error)
    return true
  }
}
