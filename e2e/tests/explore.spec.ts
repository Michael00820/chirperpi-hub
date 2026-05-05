import { expect, test } from '@playwright/test'
import { ExplorePage } from '../pages/explore.page'

const AUTH_TOKEN = 'demo-token'

test.describe('Explore page', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('authToken', 'demo-token')
    })
  })

  test('loads explore summary and searches for users', async ({ page }) => {
    const explore = new ExplorePage(page)

    await explore.mockExploreSummary()
    await explore.mockUserSearch()
    await explore.goto()

    await explore.expectLoaded()
    await explore.searchUsers('pi')
    await explore.expectUserResult('pi_search')
  })
})
