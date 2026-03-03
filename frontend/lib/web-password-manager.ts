/**
 * Web-compatible password manager shim.
 * Replaces Electron's native keychain (win-hello / macOS Keychain) with
 * localStorage + SHA-256 hashing via the Web Crypto API.
 *
 * This is injected at app startup when window.electron is not present,
 * so all existing code that calls window.electron.password.* works unchanged.
 */

const STORAGE_KEY = 'peta_master_password_hash'

async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export const webPasswordManager = {
  async has(): Promise<{ hasPassword: boolean }> {
    const hash = localStorage.getItem(STORAGE_KEY)
    return { hasPassword: !!hash }
  },

  async store(password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const hash = await sha256(password)
      localStorage.setItem(STORAGE_KEY, hash)
      return { success: true }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  },

  async verify(password: string): Promise<{ success: boolean }> {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return { success: false }
      const hash = await sha256(password)
      return { success: hash === stored }
    } catch {
      return { success: false }
    }
  },

  async update(
    oldPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    const verified = await webPasswordManager.verify(oldPassword)
    if (!verified.success) {
      return { success: false, error: 'Current password is incorrect' }
    }
    return webPasswordManager.store(newPassword)
  },
}

/**
 * Inject the web password manager shim into window.electron
 * when running in a browser (no Electron context).
 */
export function injectWebPasswordManager() {
  if (typeof window === 'undefined') return
  if (window.electron) return // Already have Electron — don't override

  // Polyfill window.electron with web-safe implementations
  ;(window as any).electron = {
    password: webPasswordManager,
    biometric: {
      isAvailable: async () => ({
        touchID: false,
        faceID: false,
        windowsHello: false,
      }),
    },
  }
}
