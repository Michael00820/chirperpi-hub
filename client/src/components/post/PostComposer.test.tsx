import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PostComposer from './PostComposer'
import { createPost } from '../../services/postsService'

vi.mock('../../services/postsService', () => ({
  createPost: vi.fn()
}))

describe('PostComposer', () => {
  const mockOnPostCreated = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders correctly', () => {
    render(<PostComposer onPostCreated={mockOnPostCreated} />)

    expect(screen.getByPlaceholderText("What's on your mind?")).toBeInTheDocument()
    expect(screen.getByText('Post')).toBeInTheDocument()
    expect(screen.getByText('0/2000 characters')).toBeInTheDocument()
  })

  it('updates character count as user types', async () => {
    const user = userEvent.setup()
    render(<PostComposer onPostCreated={mockOnPostCreated} />)

    const textarea = screen.getByPlaceholderText("What's on your mind?")
    const charCount = screen.getByText('0/2000 characters')

    await user.type(textarea, 'Hello world!')
    expect(charCount).toHaveTextContent('12/2000 characters')
  })

  it('shows validation error when submitting empty content', async () => {
    const user = userEvent.setup()
    render(<PostComposer onPostCreated={mockOnPostCreated} />)

    const submitButton = screen.getByText('Post')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Post content required')).toBeInTheDocument()
    })
  })

  it('calls API on submit with correct data', async () => {
    vi.useFakeTimers()
    const user = userEvent.setup()
    const mockCreatePost = vi.mocked(createPost)
    mockCreatePost.mockResolvedValueOnce({ success: true })

    render(<PostComposer onPostCreated={mockOnPostCreated} />)

    const textarea = screen.getByPlaceholderText("What's on your mind?")
    const submitButton = screen.getByText('Post')

    await user.type(textarea, 'Test post content')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockCreatePost).toHaveBeenCalledWith({
        content: 'Test post content',
        groupId: undefined,
        mediaUrls: undefined,
        postType: 'text',
        privacy: 'public',
        hashtags: [],
        mentions: [],
        pollOptions: undefined,
        paymentAmount: undefined,
        isPiLocked: false,
        piUnlockAmount: undefined,
        donationGoal: undefined
      })
    })

    vi.runAllTimers()
    expect(mockOnPostCreated).toHaveBeenCalled()
  })

  it('shows success state after successful submission', async () => {
    const user = userEvent.setup()
    const mockCreatePost = vi.mocked(createPost)
    mockCreatePost.mockResolvedValueOnce({ success: true })

    render(<PostComposer onPostCreated={mockOnPostCreated} />)

    const textarea = screen.getByPlaceholderText("What's on your mind?")
    const submitButton = screen.getByText('Post')

    await user.type(textarea, 'Test post')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Posted!')).toBeInTheDocument()
    })
  })

  it('handles API errors gracefully', async () => {
    const user = userEvent.setup()
    const mockCreatePost = vi.mocked(createPost)
    mockCreatePost.mockRejectedValueOnce(new Error('API Error'))

    render(<PostComposer onPostCreated={mockOnPostCreated} />)

    const textarea = screen.getByPlaceholderText("What's on your mind?")
    const submitButton = screen.getByText('Post')

    await user.type(textarea, 'Test post')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.queryByText('Posted!')).not.toBeInTheDocument()
    })

    expect(submitButton).not.toBeDisabled()
  })
})