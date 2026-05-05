import { expect, test } from '@playwright/test'
import { OnboardingPage } from '../pages/onboarding.page'

test.describe('Onboarding flow', () => {
  test('authenticates with mocked Pi OAuth and finishes onboarding', async ({ page }) => {
    const onboarding = new OnboardingPage(page)

    await onboarding.mockPiAuthResponse()
    await onboarding.mockCompleteProfile()
    await onboarding.goto()

    await onboarding.start()
    await onboarding.continueWithPi()
    await onboarding.expectAuthenticated()

    const token = await page.evaluate(() => localStorage.getItem('authToken'))
    expect(token).toBe('demo-token')

    await onboarding.continueUsername()
    await onboarding.selectInterest('DeFi')
    await onboarding.followSuggestedUser()
    await onboarding.skipTutorial()
    await onboarding.finishOnboarding()

    await onboarding.createFirstPost()
    await expect(page).toHaveURL('http://127.0.0.1:4173/')
    await expect(page.locator('text=Home Page')).toBeVisible()
  })
})
