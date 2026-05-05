import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User } from 'shared/auth'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (token: string) => void
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for existing token on mount
    const token = localStorage.getItem('authToken')
    if (token) {
      // In a real app, you'd validate the token with the server
      // For now, we'll just set a mock user
      setUser({
        id: 'user-1',
        username: 'testuser',
        displayName: 'Test User',
        avatarUrl: 'https://via.placeholder.com/40',
        verificationStatus: 'verified'
      })
    }
    setIsLoading(false)
  }, [])

  const login = (token: string) => {
    localStorage.setItem('authToken', token)
    setUser({
      id: 'user-1',
      username: 'testuser',
      displayName: 'Test User',
      avatarUrl: 'https://via.placeholder.com/40',
      verificationStatus: 'verified'
    })
  }

  const logout = () => {
    localStorage.removeItem('authToken')
    setUser(null)
  }

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    logout,
    isAuthenticated: !!user
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext