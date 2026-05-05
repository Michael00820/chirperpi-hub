import { expect, Page } from '@playwright/test'

export class OnboardingPage {
  readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  async mockPiAuthResponse(response = {
    success: true,
    token: 'demo-token',
    user: {
      id: '123',
      username: 'pi_user',
      displayName: 'Pi User',
      verificationStatus: 'verified',
    },
  }) {
    await this.page.route('**/api/auth/pi', (route: any) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response),
      })
    )
  }

  async mockCompleteProfile() {
    await this.page.route('**/api/users/profile', (route: any) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      })
    )
  }

  async goto() {
    await this.page.goto('/onboarding')
  }

  async start() {
    await this.page.click('button:has-text("Get started")')
  }

  async continueWithPi() {
    await this.page.click('button:has-text("Continue with Pi")')
  }

  async expectAuthenticated() {
    await expect(this.page.locator('text=Choose your PiConnect username')).toBeVisible()
  }

  async continueUsername() {
    await this.page.click('button:has-text("Continue")')
  }

  async selectInterest(tag: string) {
    await this.page.click(`button:has-text("${tag}")`)
  }

  async followSuggestedUser() {
    await this.page.click('button:has-text("Follow")')
  }

  async skipTutorial() {
    await this.page.click('button:has-text("Skip tutorial")')
  }

  async finishOnboarding() {
    await this.page.click('button:has-text("Finish onboarding")')
  }

  async createFirstPost() {
    await this.page.click('button:has-text("Create first post")')
  }
}
