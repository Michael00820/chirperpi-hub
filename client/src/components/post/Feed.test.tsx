import { describe, it, expect, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Feed from './Feed'

const mockUseInView = vi.fn(() => ({ ref: vi.fn(), inView: false }))

vi.mock('react-intersection-observer', () => ({
  useInView: mockUseInView
}))

describe('Feed', () => {
  const mockOnFeedUpdate = vi.fn()
  const mockPosts = [
    {
      id: '1',
      content: 'Test post content',
      mediaUrls: [],
      createdAt: new Date().toISOString(),
      likesCount: 10,
      commentsCount: 5,
      userId: 'user-1',
      user: {
        id: 'user-1',
        username: 'testuser',
        displayName: 'Test User',
        avatarUrl: 'https://via.placeholder.com/40'
      },
      postType: 'text' as const,
      privacy: 'public' as const,
      reactions: [{ type: 'like', count: 10 }]
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseInView.mockReturnValue({ ref: vi.fn(), inView: false })
  })

  it('renders filter tabs and composer placeholder', () => {
    render(<Feed onFeedUpdate={mockOnFeedUpdate} />)

    expect(screen.getByText('Latest')).toBeInTheDocument()
    expect(screen.getByText('Trending')).toBeInTheDocument()
    expect(screen.getByText('Pi Community')).toBeInTheDocument()
  })

  it('renders posts from initialPosts prop', () => {
    render(<Feed initialPosts={mockPosts} onFeedUpdate={mockOnFeedUpdate} />)

    expect(screen.getByText('Test post content')).toBeInTheDocument()
    expect(screen.getByText('Test User')).toBeInTheDocument()
  })

  it('shows empty state when no posts and not loading', () => {
    render(<Feed onFeedUpdate={mockOnFeedUpdate} />)

    expect(screen.getByText('No posts yet')).toBeInTheDocument()
    expect(screen.getByText('Load Sample Posts')).toBeInTheDocument()
  })

  it('shows loading indicator when feed is fetching more posts', () => {
    mockUseInView.mockReturnValueOnce({ ref: vi.fn(), inView: true })

    render(<Feed onFeedUpdate={mockOnFeedUpdate} />)

    expect(screen.getByText('Loading more posts...')).toBeInTheDocument()
  })

  it('loads sample posts when button is clicked', async () => {
    const user = userEvent.setup()
    render(<Feed onFeedUpdate={mockOnFeedUpdate} />)

    const loadButton = screen.getByText('Load Sample Posts')
    await user.click(loadButton)

    expect(screen.getByText('Welcome to PiConnect! 🍕')).toBeInTheDocument()
  })

  it('allows changing filters', async () => {
    const user = userEvent.setup()
    render(<Feed initialPosts={mockPosts} onFeedUpdate={mockOnFeedUpdate} />)

    const trendingButton = screen.getByText('Trending')
    await user.click(trendingButton)

    expect(trendingButton).toHaveClass('bg-blue-500')
  })
})