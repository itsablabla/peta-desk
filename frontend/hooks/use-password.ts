'use client'
import { useState, useEffect } from 'react'

const STORAGE_KEY = 'peta_master_password_hash'

async function sha256(text: string): Promise<string> {
  const enc = new TextEncoder()
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(text))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

const webPM = {
  has: async (): Promise<{ hasPassword: boolean }> => {
    if (typeof window !== 'undefined' && (window as any).electron?.password) {
      return (window as any).electron.password.has()
    }
    return { hasPassword: !!localStorage.getItem(STORAGE_KEY) }
  },
  store: async (password: string): Promise<{ success: boolean; error?: string }> => {
    if (typeof window !== 'undefined' && (window as any).electron?.password) {
      return (window as any).electron.password.store(password)
    }
    try {
      const hash = await sha256(password)
      localStorage.setItem(STORAGE_KEY, hash)
      return { success: true }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  },
  verify: async (password: string): Promise<{ success: boolean }> => {
    if (typeof window !== 'undefined' && (window as any).electron?.password) {
      return (window as any).electron.password.verify(password)
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return { success: false }
      const hash = await sha256(password)
      return { success: hash === stored }
    } catch {
      return { success: false }
    }
  },
  update: async (oldPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (typeof window !== 'undefined' && (window as any).electron?.password) {
      return (window as any).electron.password.update(oldPassword, newPassword)
    }
    const verified = await webPM.verify(oldPassword)
    if (!verified.success) {
      return { success: false, error: 'Current password is incorrect' }
    }
    return webPM.store(newPassword)
  },
}

export function usePassword() {
  const [hasPassword, setHasPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkHasPassword()
  }, [])

  const checkHasPassword = async () => {
    try {
      const result = await webPM.has()
      setHasPassword(result.hasPassword)
    } catch (error) {
      console.error('Failed to check password status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const verifyPassword = async (password: string): Promise<boolean> => {
    try {
      const result = await webPM.verify(password)
      return result.success
    } catch (error) {
      console.error('Failed to verify password:', error)
      return false
    }
  }

  const setPassword = async (password: string): Promise<boolean> => {
    try {
      const result = await webPM.store(password)
      if (result.success) {
        setHasPassword(true)
        localStorage.setItem('masterPasswordSet', 'true')
      }
      return result.success
    } catch (error) {
      console.error('Failed to set password:', error)
      return false
    }
  }

  const updatePassword = async (oldPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    try {
      return await webPM.update(oldPassword, newPassword)
    } catch (error) {
      console.error('Failed to update password:', error)
      return { success: false, error: 'Failed to update password' }
    }
  }

  return {
    hasPassword,
    isLoading,
    verifyPassword,
    setPassword,
    updatePassword,
    checkHasPassword,
  }
}
