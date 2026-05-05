import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider, useAuth } from './AuthContext'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// Test component that uses the auth context
const TestComponent = () => {
  const { user, isLoading, login, logout, isAuthenticated } = useAuth()

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <div data-testid="auth-status">
        {isAuthenticated ? 'Authenticated' : 'Not authenticated'}
      </div>
      <div data-testid="user-info">
        {user ? `User: ${user.username}` : 'No user'}
      </div>
      <button onClick={() => login('test-token')}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorageMock.clear()
  })

  it('provides default unauthenticated state', () => {
    localStorageMock.getItem.mockReturnValue(null)

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    expect(screen.getByTestId('auth-status')).toHaveTextContent('Not authenticated')
    expect(screen.getByTestId('user-info')).toHaveTextContent('No user')
  })

  it('loads user from localStorage token on mount', async () => {
    localStorageMock.getItem.mockReturnValue('existing-token')

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated')
      expect(screen.getByTestId('user-info')).toHaveTextContent('User: testuser')
    })
  })

  it('shows loading state initially', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('handles login correctly', async () => {
    const user = userEvent.setup()
    localStorageMock.getItem.mockReturnValue(null)

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })

    const loginButton = screen.getByText('Login')
    await user.click(loginButton)

    expect(localStorageMock.setItem).toHaveBeenCalledWith('authToken', 'test-token')
    expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated')
    expect(screen.getByTestId('user-info')).toHaveTextContent('User: testuser')
  })

  it('handles logout correctly', async () => {
    const user = userEvent.setup()
    localStorageMock.getItem.mockReturnValue('existing-token')

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated')
    })

    const logoutButton = screen.getByText('Logout')
    await user.click(logoutButton)

    expect(localStorageMock.removeItem).toHaveBeenCalledWith('authToken')
    expect(screen.getByTestId('auth-status')).toHaveTextContent('Not authenticated')
    expect(screen.getByTestId('user-info')).toHaveTextContent('No user')
  })

  it('throws error when useAuth is used outside provider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      render(<TestComponent />)
    }).toThrow('useAuth must be used within an AuthProvider')

    consoleSpy.mockRestore()
  })
})