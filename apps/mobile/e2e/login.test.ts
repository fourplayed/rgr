/**
 * E2E Test: Login Flow
 *
 * This test covers the basic login flow of the RGR Fleet Manager app.
 * It verifies that a user can:
 *   1. See the login screen on app launch
 *   2. Enter email and password
 *   3. Tap the sign-in button
 *   4. Be redirected to the home screen on success
 *   5. See proper error messages on failure
 *
 * Prerequisites:
 *   - Detox and its dependencies must be installed:
 *       npm install --save-dev detox @types/detox jest
 *   - A test user must exist in the database
 *   - The app must be built for the target simulator/emulator
 *
 * Usage:
 *   npx detox test --configuration ios.sim.debug
 */

import { by, device, element, expect } from 'detox';

// Replace with valid test credentials for your environment
const TEST_EMAIL = 'test@rgr.com.au';
const TEST_PASSWORD = 'TestPassword123!';

describe('Login Flow', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should display the login screen', async () => {
    // The email input should be visible with its accessibility label
    await expect(element(by.label('Email address'))).toBeVisible();
    await expect(element(by.label('Password'))).toBeVisible();
    await expect(element(by.label('Sign in'))).toBeVisible();
  });

  it('should show an error when submitting empty credentials', async () => {
    // Tap sign in without entering credentials
    await element(by.label('Sign in')).tap();

    // An error alert should appear
    // The AlertSheet component shows errors - wait for it to appear
    await waitFor(element(by.text('Please enter both email and password')))
      .toBeVisible()
      .withTimeout(5000);
  });

  it('should show an error with invalid credentials', async () => {
    // Enter invalid credentials
    await element(by.label('Email address')).typeText('invalid@example.com');
    await element(by.label('Password')).typeText('wrongpassword');

    // Dismiss keyboard
    await element(by.label('Sign in')).tap();

    // Wait for the error to appear
    await waitFor(element(by.text('Login Failed')))
      .toBeVisible()
      .withTimeout(10000);
  });

  it('should navigate to home screen with valid credentials', async () => {
    // Enter valid credentials
    await element(by.label('Email address')).clearText();
    await element(by.label('Email address')).typeText(TEST_EMAIL);
    await element(by.label('Password')).clearText();
    await element(by.label('Password')).typeText(TEST_PASSWORD);

    // Tap sign in
    await element(by.label('Sign in')).tap();

    // Wait for navigation to home screen
    // The home screen shows "Asset Overview" section title
    await waitFor(element(by.text('Asset Overview')))
      .toBeVisible()
      .withTimeout(15000);
  });

  it('should show the save credentials modal after first login', async () => {
    // Enter valid credentials
    await element(by.label('Email address')).clearText();
    await element(by.label('Email address')).typeText(TEST_EMAIL);
    await element(by.label('Password')).clearText();
    await element(by.label('Password')).typeText(TEST_PASSWORD);

    // Tap sign in
    await element(by.label('Sign in')).tap();

    // The save credentials modal should appear (on first login)
    // Note: This test may need adjustment depending on whether
    // auto-login has been previously enabled on the test device
    await waitFor(element(by.text('Save Credentials')).atIndex(0))
      .toBeVisible()
      .withTimeout(15000);
  });
});
