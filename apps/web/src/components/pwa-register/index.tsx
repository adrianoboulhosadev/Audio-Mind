'use client'

import { useServiceWorker } from './hooks/use-service-worker'

/**
 * No JSX of its own — just a mount point in the root layout for the service
 * worker registration effect (visual ≠ logic).
 */
export function PwaRegister() {
  useServiceWorker()
  return null
}
