'use client'

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { LoginUserInput, RegisterUserInput, UserDTO } from '@auth/adapters'
import { api, refreshAccessToken, setAccessToken } from '@/lib/api'

// Reuses the DTO from adapters — the front never redeclares a contract the
// context package already owns.
type AuthenticatedUser = Pick<UserDTO, 'id' | 'email' | 'name'>

interface Auth {
  user: AuthenticatedUser | null
  loading: boolean
  login: (input: LoginUserInput) => Promise<void>
  register: (input: RegisterUserInput) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<Auth | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null)
  const [loading, setLoading] = useState(true)

  const loadUser = useCallback(async () => {
    const { data } = await api.get<AuthenticatedUser>('/user/me')
    setUser(data)
  }, [])

  // Silent refresh on boot: the access token lives in memory, so a reload starts
  // with nothing — the httpOnly refresh cookie is what recovers the session.
  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        await refreshAccessToken()
        if (active) await loadUser()
      } catch {
        if (active) {
          setAccessToken(null)
          setUser(null)
        }
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [loadUser])

  const login = useCallback(
    async (input: LoginUserInput) => {
      const { data } = await api.post<{ accessToken: string }>('/auth/login', input)
      setAccessToken(data.accessToken)
      await loadUser()
    },
    [loadUser],
  )

  // Signing up does not log anyone in — the user lands on the login screen with
  // their account created, which keeps one single path for "becoming logged in".
  const register = useCallback(async (input: RegisterUserInput) => {
    await api.post('/auth/register', input)
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/user/logout')
    } finally {
      setAccessToken(null)
      setUser(null)
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser: loadUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): Auth {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
