import { Then } from '@cucumber/cucumber'
import assert from 'assert'

Then('I should be on the login page', async function () {
  await this.page.waitForURL('**/login')
  const heading = await this.page.locator('h2').textContent()
  assert.strictEqual(heading, 'Login')
})

Then('I should be on the register page', async function () {
  await this.page.waitForURL('**/register')
  const heading = await this.page.locator('h2').textContent()
  assert.strictEqual(heading, 'Register')
})

Then('I should be on the game selection page', async function () {
  await this.page.waitForURL('**/gameSelection')
  const heading = await this.page.locator('header h2').textContent()
  assert.strictEqual(heading, 'SELECT YOUR GAME MODE')
})

Then('I should see an error message {string}', async function (expected) {
  const error = this.page.locator('[class*="errorMessage"]')
  await error.waitFor({ timeout: 5000 })
  const text = await error.textContent()
  assert.ok(
    text && text.includes(expected),
    `Expected error to include "${expected}", got: "${text}"`
  )
})
