'use client'

import { useEffect } from 'react'
import { injectWebPasswordManager } from '@/lib/web-password-manager'

/**
 * Injects the web-compatible password manager shim into window.electron
 * when running in a browser (no Electron context).
 * Must be rendered client-side at the root layout level.
 */
export function WebPasswordManagerInit() {
  useEffect(() => {
    injectWebPasswordManager()
  }, [])

  return null
}
