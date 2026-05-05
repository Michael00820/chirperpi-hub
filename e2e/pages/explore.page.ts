import { expect, Page } from '@playwright/test'

export class ExplorePage {
  readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  async mockExploreSummary(summary = {
    trendingTopics: [
      { tag: 'defi', count: 42, example: 'DeFi governance is gaining momentum.' },
    ],
    newsItems: [
      {
        id: 'news-1',
        title: 'Pi network update',
        summary: 'New community features are available.',
        source: 'Pi Team',
        publishedAt: new Date().toISOString(),
        url: 'https://pi.network',
      },
    ],
    suggestedUsers: [
      {
        id: '1',
        username: 'pi_guardian',
        displayName: 'Pi Guardian',
        avatarUrl: '/default-avatar.png',
        verificationStatus: 'verified',
      },
    ],
    activeGroups: [],
    communityServices: [],
    popularPosts: [
      {
        id: 'post-1',
        content: 'Connecting with the Pi community.',
        createdAt: new Date().toISOString(),
        user: {
          id: '2',
          username: 'pi_builder',
          displayName: 'Pi Builder',
          avatarUrl: '/default-avatar.png',
        },
        commentsCount: 3,
        likesCount: 12,
        reactions: [],
      },
    ],
  }) {
    await this.page.route('**/api/explore', (route: any) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(summary),
      })
    )
  }

  async mockUserSearch(searchResults = {
    users: [
      {
        id: '10',
        username: 'pi_search',
        displayName: 'Pi Search',
        avatarUrl: '/default-avatar.png',
        verificationStatus: 'verified',
      },
    ],
  }) {
    await this.page.route('**/api/users/search**', (route: any) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(searchResults),
      })
    )
  }

  async goto() {
    await this.page.goto('/explore')
  }

  async expectLoaded() {
    await expect(this.page.locator('text=Explore PiConnect')).toBeVisible()
  }

  async searchUsers(query: string) {
    await this.page.click('button:has-text("Users")')
    await this.page.fill('input[type="search"]', query)
    await this.page.click('button:has-text("Search")')
  }

  async expectUserResult(username: string) {
    await expect(this.page.locator(`text=@${username}`)).toBeVisible()
  }
}
