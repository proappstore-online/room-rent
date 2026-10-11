export interface LifecycleRequest {
  isCurrent(): boolean
}

export interface LifecycleScope {
  updateContext(nextContext: string): void
  begin(nextContext?: string): LifecycleRequest
  capture(): LifecycleRequest
}

export function createLifecycleScope(initialContext: string): LifecycleScope

export function settleIfCurrent<T>(
  request: LifecycleRequest,
  operation: Promise<T>,
  handlers: { onSuccess(value: T): void; onError(error: unknown): void },
): Promise<boolean>
