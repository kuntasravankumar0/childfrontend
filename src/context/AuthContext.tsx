import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import api from '../lib/api'

interface AuthUser {
  login: string
  name: string
  role: string
}

interface AuthContextType {
  user: AuthUser | null
  login: (loginId: string, password: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem('mdm_user')
    return stored ? JSON.parse(stored) : null
  })

  const login = useCallback(async (loginId: string, password: string) => {
    const res = await api.post('/auth/login', { login: loginId, password })
    const { token, login: userLogin, name, role } = res.data.data
    localStorage.setItem('mdm_token', token)
    const authUser = { login: userLogin, name, role }
    localStorage.setItem('mdm_user', JSON.stringify(authUser))
    setUser(authUser)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('mdm_token')
    localStorage.removeItem('mdm_user')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
