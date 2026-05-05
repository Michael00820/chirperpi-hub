import { expect, Page } from '@playwright/test'

export class ProfilePage {
  readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  async mockProfile(profile = {
    id: '1',
    username: 'pi_guardian',
    displayName: 'Pi Guardian',
    bio: 'Verified Pi creator building community experiences.',
    location: 'Pi Network',
    website: 'https://pi.network',
    piWalletAddress: 'pi_1234567890abcdef',
    verificationStatus: 'verified',
    isOwnProfile: false,
    isFollowing: false,
    avatarUrl: '/default-avatar.png',
    coverPhoto: null,
    postsCount: 1,
    followersCount: 120,
    followingCount: 28,
  },
  posts = [
    {
      id: 'post-1',
      content: 'Hello from Pi Guardian!',
      createdAt: new Date().toISOString(),
      likesCount: 5,
      commentsCount: 1,
      isLiked: false,
    },
  ]) {
    await this.page.route('**/api/users/pi_guardian', (route: any) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(profile),
      })
    )

    await this.page.route('**/api/users/pi_guardian/posts**', (route: any) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ posts }),
      })
    )

    await this.page.route('**/api/users/1/follow', (route: any) => {
      const method = route.request().method()
      if (method === 'POST' || method === 'DELETE') {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
      } else {
        route.fallback()
      }
    })
  }

  async goto() {
    await this.page.goto('/profile/pi_guardian')
  }

  async expectProfileLoaded() {
    await expect(this.page.locator('text=@pi_guardian')).toBeVisible()
    await expect(this.page.locator('text=Pi Guardian')).toBeVisible()
  }

  async clickFollow() {
    await this.page.click('button:has-text("Follow")')
  }

  async clickUnfollow() {
    await this.page.click('button:has-text("Unfollow")')
  }

  async expectFollowButtonText(text: string) {
    await expect(this.page.locator(`button:has-text("${text}")`)).toBeVisible()
  }
}
