import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { User } from 'shared/auth'
import api from '../services/api'
import { loadPiSdk } from '../utils/piSdk'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isSigningIn: boolean
  signInError: string | null
  signInWithPi: () => Promise<void>
  logout: () => Promise<void>
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

const TOKEN_KEY = 'authToken'

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [signInError, setSignInError] = useState<string | null>(null)

  const verifyToken = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      setUser(null)
      setIsLoading(false)
      return
    }
    try {
      const response = await api.get('/auth/verify')
      if (response.data?.success && response.data?.user) {
        const u = response.data.user
        setUser({
          id: u.userId || u.id,
          username: u.username,
          displayName: u.displayName || u.username,
          avatarUrl: u.avatarUrl,
          verificationStatus: u.verificationStatus || 'unverified'
        } as User)
      } else {
        localStorage.removeItem(TOKEN_KEY)
        setUser(null)
      }
    } catch {
      localStorage.removeItem(TOKEN_KEY)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    verifyToken()
  }, [verifyToken])

  const signInWithPi = useCallback(async () => {
    setIsSigningIn(true)
    setSignInError(null)
    try {
      const sdk = await loadPiSdk()
      if (!sdk || typeof sdk.authenticate !== 'function') {
        throw new Error('Pi SDK not available. Open this app in the Pi Browser to sign in.')
      }

      const scopes = ['username', 'payments']
      const onIncompletePaymentFound = (payment: any) => {
        // Surface the incomplete payment so the user can resume it elsewhere
        // in the app. Do NOT post to the HMAC-verified webhook endpoint.
        console.warn('Pi: incomplete payment found', payment?.identifier)
      }

      const authResult = await sdk.authenticate(scopes, onIncompletePaymentFound)
      const accessToken = authResult?.accessToken || authResult?.user?.accessToken
      if (!accessToken) {
        throw new Error('Pi authentication did not return an access token')
      }

      const response = await api.post('/auth/pi', { accessToken })
      if (!response.data?.success || !response.data?.token) {
        throw new Error(response.data?.error || 'Sign-in failed')
      }

      localStorage.setItem(TOKEN_KEY, response.data.token)
      const u = response.data.user
      setUser({
        id: u.id,
        username: u.username,
        displayName: u.displayName || u.username,
        avatarUrl: u.avatarUrl,
        verificationStatus: u.verificationStatus || 'unverified'
      } as User)
    } catch (err: any) {
      const msg = err?.message || 'Sign-in failed'
      setSignInError(msg)
      throw err
    } finally {
      setIsSigningIn(false)
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout').catch(() => undefined)
    } finally {
      localStorage.removeItem(TOKEN_KEY)
      setUser(null)
    }
  }, [])

  const value: AuthContextType = {
    user,
    isLoading,
    isSigningIn,
    signInError,
    signInWithPi,
    logout,
    isAuthenticated: !!user
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext
