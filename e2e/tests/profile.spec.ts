import { expect, test } from '@playwright/test'
import { ProfilePage } from '../pages/profile.page'

const AUTH_TOKEN = 'demo-token'

test.describe('Profile page', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('authToken', 'demo-token')
    })
  })

  test('displays profile details and toggles follow state', async ({ page }) => {
    const profilePage = new ProfilePage(page)

    await profilePage.mockProfile()
    await profilePage.goto()

    await profilePage.expectProfileLoaded()
    await profilePage.expectFollowButtonText('Follow')

    await profilePage.clickFollow()
    await profilePage.expectFollowButtonText('Unfollow')

    await profilePage.clickUnfollow()
    await profilePage.expectFollowButtonText('Follow')
  })
})
