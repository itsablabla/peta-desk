/*
 * @Author: xudada 1820064201@qq.com
 * @Date: 2025-08-13 13:33:50
 * @LastEditors: xudada 1820064201@qq.com
 * @LastEditTime: 2025-11-12 11:57:48
 * @FilePath: /peta-desk/frontend/app/layout.tsx
 * App layout entry
 */
import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'
import { LockProvider } from '@/contexts/lock-context'
import LockWrapper from '@/components/common/lock-wrapper'
import { Toaster } from '@/components/ui/sonner'
import { ServerConfigProvider } from '@/contexts/server-config-provider'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { SocketProvider } from '@/contexts/socket-context'
import { ReconnectPasswordHandler } from '@/components/common/reconnect-password-handler'
import { UnlockProvider } from '@/contexts/unlock-context'
import { ProtocolUrlHandler } from '@/components/common/protocol-url-handler'
import { ThemeProvider } from '@/contexts/theme-context'
import { WebPasswordManagerInit } from '@/components/common/web-password-manager-init'

export const metadata: Metadata = {
  title: 'MCP Desktop Application',
  description: 'Model Context Protocol Gateway Management'
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('theme') || 'system';
                  let effectiveTheme = theme;
                  
                  if (theme === 'system') {
                    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    effectiveTheme = prefersDark ? 'dark' : 'light';
                  }
                  
                  if (effectiveTheme === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {
                  // Fallback to system preference if localStorage fails
                  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  if (prefersDark) {
                    document.documentElement.classList.add('dark');
                  }
                }
              })();
            `
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof window === 'undefined' || window.electron) return;
                async function sha256(text) {
                  const enc = new TextEncoder();
                  const buf = await crypto.subtle.digest('SHA-256', enc.encode(text));
                  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
                }
                var STORAGE_KEY = 'peta_master_password_hash';
                window.electron = {
                  password: {
                    has: function() { return Promise.resolve({ hasPassword: !!localStorage.getItem(STORAGE_KEY) }); },
                    store: function(pw) { return sha256(pw).then(function(h) { localStorage.setItem(STORAGE_KEY, h); return { success: true }; }); },
                    verify: function(pw) { return sha256(pw).then(function(h) { return { success: h === localStorage.getItem(STORAGE_KEY) }; }); },
                    update: function(old, nw) {
                      return sha256(old).then(function(h) {
                        if (h !== localStorage.getItem(STORAGE_KEY)) return { success: false, error: 'Current password is incorrect' };
                        return sha256(nw).then(function(h2) { localStorage.setItem(STORAGE_KEY, h2); return { success: true }; });
                      });
                    }
                  },
                  biometric: { isAvailable: function() { return Promise.resolve({ touchID: false, faceID: false, windowsHello: false }); } }
                };
              })();
            `
          }}
        />
      </head>
      <body className="antialiased">
        <WebPasswordManagerInit />
        <ThemeProvider>
          <div className="min-h-screen font-sans">
            <LockProvider>
              <UnlockProvider>
                <SocketProvider>
                  <ServerConfigProvider>
                    <LockWrapper>{children}</LockWrapper>
                  </ServerConfigProvider>
                  <Toaster />
                  <ConfirmDialog />
                  <ReconnectPasswordHandler />
                  <ProtocolUrlHandler />
                </SocketProvider>
              </UnlockProvider>
            </LockProvider>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
