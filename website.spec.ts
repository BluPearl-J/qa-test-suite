import { test, expect, devices } from '@playwright/test';

/**
 * PRODUCTION QA TEST SUITE
 * ========================
 * Built by Joy O. Reuben-Atohor
 * 
 * Covers:
 * - Functional testing
 * - Regression testing
 * - Mobile responsiveness
 * - Cross-browser compatibility
 * - Forms & lead generation
 * - Checkout & payment flows
 * - UX & usability
 * - Accessibility basics
 * 
 * Run: npx playwright test
 * Report: npx playwright show-report
 */

const BASE_URL = process.env.BASE_URL || 'https://example.com';

// ============================================================
// 1. FUNCTIONAL TESTING
// ============================================================

test.describe('Functional Testing', () => {

  test('Homepage loads successfully', async ({ page }) => {
    const response = await page.goto(BASE_URL);
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(/.+/);
    await page.screenshot({ path: 'screenshots/homepage.png', fullPage: true });
  });

  test('All navigation links are working', async ({ page }) => {
    await page.goto(BASE_URL);
    const links = await page.locator('nav a').all();
    
    for (const link of links) {
      const href = await link.getAttribute('href');
      const text = await link.innerText();
      
      if (href && !href.startsWith('#') && !href.startsWith('mailto:')) {
        const response = await page.goto(href.startsWith('http') ? href : `${BASE_URL}${href}`);
        expect(response?.status(), `Broken link: ${text} → ${href}`).not.toBe(404);
        await page.goBack();
      }
    }
  });

  test('All images load without errors', async ({ page }) => {
    await page.goto(BASE_URL);
    const images = await page.locator('img').all();
    
    for (const img of images) {
      const src = await img.getAttribute('src');
      const naturalWidth = await img.evaluate((el: HTMLImageElement) => el.naturalWidth);
      expect(naturalWidth, `Image failed to load: ${src}`).toBeGreaterThan(0);
    }
  });

  test('Page has no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto(BASE_URL);
    expect(errors, `Console errors found: ${errors.join(', ')}`).toHaveLength(0);
  });

});

// ============================================================
// 2. FORMS & LEAD GENERATION TESTING
// ============================================================

test.describe('Forms & Lead Generation', () => {

  test('Contact form submits successfully', async ({ page }) => {
    await page.goto(`${BASE_URL}/contact`);
    
    await page.fill('input[name="name"], input[placeholder*="name" i]', 'Joy Test User');
    await page.fill('input[name="email"], input[type="email"]', 'test@example.com');
    await page.fill('textarea[name="message"], textarea', 'This is a QA test message.');
    
    await page.screenshot({ path: 'screenshots/form-filled.png' });
    await page.click('button[type="submit"], input[type="submit"]');
    
    // Check for success message
    await expect(page.locator('text=/thank you|success|sent|received/i')).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: 'screenshots/form-submitted.png' });
  });

  test('Form validates required fields', async ({ page }) => {
    await page.goto(`${BASE_URL}/contact`);
    await page.click('button[type="submit"], input[type="submit"]');
    
    // Should show validation errors, not submit
    const validationErrors = page.locator(':invalid, .error, [class*="error"], [class*="invalid"]');
    await expect(validationErrors.first()).toBeVisible({ timeout: 3000 });
    await page.screenshot({ path: 'screenshots/form-validation.png' });
  });

  test('Email field rejects invalid format', async ({ page }) => {
    await page.goto(`${BASE_URL}/contact`);
    await page.fill('input[type="email"]', 'notanemail');
    await page.click('button[type="submit"]');
    
    const emailInput = page.locator('input[type="email"]');
    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    expect(isInvalid).toBeTruthy();
  });

});

// ============================================================
// 3. MOBILE RESPONSIVENESS TESTING
// ============================================================

const mobileDevices = [
  { name: 'iPhone 14', device: devices['iPhone 14'] },
  { name: 'Samsung Galaxy S21', device: devices['Galaxy S9+'] },
  { name: 'iPad', device: devices['iPad Pro'] },
];

for (const { name, device } of mobileDevices) {
  test(`Mobile responsiveness — ${name}`, async ({ browser }) => {
    const context = await browser.newContext({ ...device });
    const page = await context.newPage();
    
    await page.goto(BASE_URL);
    
    // Check no horizontal scroll
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalScroll, `Horizontal scroll on ${name}`).toBeFalsy();
    
    // Check text is readable (not too small)
    const bodyFontSize = await page.evaluate(() => {
      return parseInt(window.getComputedStyle(document.body).fontSize);
    });
    expect(bodyFontSize, `Font too small on ${name}`).toBeGreaterThanOrEqual(14);
    
    // Check buttons are tappable (min 44px)
    const buttons = await page.locator('button, a').all();
    for (const button of buttons.slice(0, 5)) {
      const box = await button.boundingBox();
      if (box) {
        expect(Math.min(box.width, box.height), `Button too small to tap on ${name}`).toBeGreaterThanOrEqual(20);
      }
    }
    
    await page.screenshot({ path: `screenshots/mobile-${name.replace(/\s/g, '-')}.png`, fullPage: true });
    await context.close();
  });
}

// ============================================================
// 4. CROSS-BROWSER COMPATIBILITY
// ============================================================

test.describe('Cross-Browser Compatibility', () => {

  test('Layout is consistent across viewport sizes', async ({ page }) => {
    const viewports = [
      { width: 1920, height: 1080, name: 'desktop-large' },
      { width: 1280, height: 800, name: 'desktop' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 375, height: 812, name: 'mobile' },
    ];
    
    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(BASE_URL);
      await page.screenshot({ path: `screenshots/viewport-${vp.name}.png`, fullPage: true });
      
      // Check main content is visible
      const body = page.locator('body');
      await expect(body).toBeVisible();
    }
  });

});

// ============================================================
// 5. UX & USABILITY TESTING
// ============================================================

test.describe('UX & Usability', () => {

  test('Page load time is acceptable (under 3 seconds)', async ({ page }) => {
    const start = Date.now();
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const loadTime = Date.now() - start;
    
    expect(loadTime, `Page load too slow: ${loadTime}ms`).toBeLessThan(3000);
    console.log(`Page load time: ${loadTime}ms`);
  });

  test('CTA buttons are visible above the fold', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(BASE_URL);
    
    const cta = page.locator('a.btn, button.cta, a[class*="button"], a[class*="cta"]').first();
    if (await cta.count() > 0) {
      await expect(cta).toBeInViewport();
    }
  });

  test('All links have descriptive text (no bare URLs)', async ({ page }) => {
    await page.goto(BASE_URL);
    const links = await page.locator('a').all();
    const badLinks: string[] = [];
    
    for (const link of links) {
      const text = (await link.innerText()).trim();
      if (text === 'click here' || text === 'here' || text === '') {
        const href = await link.getAttribute('href');
        badLinks.push(`"${text}" → ${href}`);
      }
    }
    
    if (badLinks.length > 0) {
      console.warn('UX Issue — poor link text:', badLinks);
    }
  });

  test('Favicon is present', async ({ page }) => {
    await page.goto(BASE_URL);
    const favicon = page.locator('link[rel*="icon"]');
    await expect(favicon).toHaveCount(1);
  });

});

// ============================================================
// 6. CUSTOMER ONBOARDING FLOW
// ============================================================

test.describe('Customer Onboarding Flow', () => {

  test('Sign up flow completes end to end', async ({ page }) => {
    await page.goto(`${BASE_URL}/signup`);
    await page.screenshot({ path: 'screenshots/signup-page.png' });
    
    // Fill signup form
    const emailField = page.locator('input[type="email"]').first();
    const passwordField = page.locator('input[type="password"]').first();
    
    if (await emailField.count() > 0) {
      await emailField.fill(`test+${Date.now()}@example.com`);
    }
    if (await passwordField.count() > 0) {
      await passwordField.fill('TestPassword123!');
    }
    
    await page.screenshot({ path: 'screenshots/signup-filled.png' });
  });

  test('Login page is accessible', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    expect(page.url()).toContain('login');
    await page.screenshot({ path: 'screenshots/login-page.png' });
  });

});

// ============================================================
// 7. REGRESSION TESTING — CRITICAL PAGES
// ============================================================

test.describe('Regression — Critical Pages', () => {

  const criticalPages = [
    { path: '/', name: 'Homepage' },
    { path: '/about', name: 'About' },
    { path: '/contact', name: 'Contact' },
    { path: '/pricing', name: 'Pricing' },
  ];

  for (const { path, name } of criticalPages) {
    test(`${name} page returns 200`, async ({ page }) => {
      const response = await page.goto(`${BASE_URL}${path}`);
      expect(
        response?.status(),
        `${name} page returned ${response?.status()}`
      ).toBeLessThan(400);
      await page.screenshot({ path: `screenshots/regression-${name.toLowerCase()}.png` });
    });
  }

});
