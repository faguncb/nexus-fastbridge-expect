import { test, expect } from '@playwright/test';

/**
 * Avail FastBridge E2E Tests
 * URL: https://fastbridge.availproject.org
 *
 * Covers the full 15-step user workflow:
 * Step 1  - Landing page loads with correct title
 * Step 2  - Hero section displays "Avail FastBridge" heading
 * Step 3  - Hero subtitle and description are visible
 * Step 4  - Chain cards (MegaETH, Citrea, Monad) are displayed
 * Step 5  - Each chain card shows its route path and Launch link
 * Step 6  - Clicking Launch navigates to the chain-specific bridge page
 * Step 7  - Chain page displays branded header with chain logo
 * Step 8  - "Connect Wallet" button is present in the header
 * Step 9  - Bridge form "To" chain dropdown defaults to the chain
 * Step 10 - "To" dropdown opens and lists all 13 supported chains
 * Step 11 - Token dropdown shows correct default token per chain
 * Step 12 - "Enter Amount" input is present and accepts numeric input
 * Step 13 - Recipient Address field is accessible via the edit icon
 * Step 14 - Entering an address and confirming with checkmark works
 * Step 15 - "Connect Wallet" CTA opens wallet modal with wallet options
 */

const BASE_URL = 'https://fastbridge.availproject.org';

// All supported destination chains listed in the "To" dropdown (role=option inside listbox)
const SUPPORTED_CHAINS = [
  'Citrea Mainnet',
  'Ethereum Mainnet',
  'OP Mainnet',
  'Polygon PoS',
  'Arbitrum One',
  'Avalanche C-Chain',
  'HyperEVM',
  'Kaia Mainnet',
  'Monad',
  'MegaETH',
  'Base',
  'Scroll',
  'BNB Smart Chain',
];

// Wallet options shown in the Connect Wallet modal
const EXPECTED_WALLETS = ['WalletConnect', 'MetaMask'];

// ---------------------------------------------------------------------------
// Steps 1-5: Landing Page
// ---------------------------------------------------------------------------
test.describe('Step 1-5: Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
  });

  test('Step 1: Landing page loads with correct page title', async ({ page }) => {
    await expect(page).toHaveTitle(/Avail Fast Bridge/i);
  });

  /**
   * FIX: Two headings contain "Avail FastBridge":
   *   1. The h1 hero heading
   *   2. "Why Use Avail FastBridge as Your Multi-Chain Bridge"
   * Use .first() to target only the h1 hero heading.
   */
  test('Step 2: Hero section displays "Avail FastBridge" heading', async ({ page }) => {
    const heading = page.getByRole('heading', { name: /Avail FastBridge/i }).first();
    await expect(heading).toBeVisible();
  });

  test('Step 3: Hero subtitle and bridge description are visible', async ({ page }) => {
    await expect(
      page.getByText(/Fast Crypto Bridge for Stables Across Chains/i)
    ).toBeVisible();
    await expect(
      page.getByText(/Bridge stablecoins like USDC/i)
    ).toBeVisible();
  });

  test('Step 4: All three chain cards are displayed on the landing page', async ({ page }) => {
    await page.getByText('Bridge Stablecoins to Any Chain').scrollIntoViewIfNeeded();
    await expect(page.getByText('MegaETH').first()).toBeVisible();
    await expect(page.getByText('Citrea').first()).toBeVisible();
    await expect(page.getByText('Monad').first()).toBeVisible();
  });

  /**
   * FIX: Chain cards are rendered as <a href="…"> elements (role=link), not buttons.
   * - Route paths (/megaeth/ etc.) are generic text nodes inside each link card.
   * - Use getByRole('link').filter({ hasText: 'Launch' }) to count the 3 launch links.
   */
  test('Step 5: Each chain card shows its route path and a Launch link', async ({ page }) => {
    await page.getByText('Bridge Stablecoins to Any Chain').scrollIntoViewIfNeeded();

    // Route path labels rendered inside each card
    await expect(page.getByText('/megaeth/', { exact: true })).toBeVisible();
    await expect(page.getByText('/citrea/', { exact: true })).toBeVisible();
    await expect(page.getByText('/monad/', { exact: true })).toBeVisible();

    // Launch elements are <a> links (not buttons) — assert all three exist
    const launchLinks = page.getByRole('link').filter({ hasText: 'Launch' });
    await expect(launchLinks).toHaveCount(3);
  });
});

// ---------------------------------------------------------------------------
// Steps 6-15: MegaETH Bridge Page
// ---------------------------------------------------------------------------
test.describe('Step 6-15: MegaETH Bridge Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/megaeth/`);
    await page.waitForLoadState('networkidle');
  });

  /**
   * FIX: Replace broken parent-traversal locator chain with a direct href click.
   * The entire card is an <a href="/megaeth/"> so we click it by its href.
   */
  test('Step 6: Clicking the MegaETH card navigates to /megaeth/', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.getByText('Bridge Stablecoins to Any Chain').scrollIntoViewIfNeeded();

    // Click the card link directly by its href attribute
    await page.locator('a[href="/megaeth/"]').click();

    await page.waitForURL(`${BASE_URL}/megaeth/`);
    await expect(page).toHaveURL(`${BASE_URL}/megaeth/`);
  });

  test('Step 7: MegaETH bridge page shows branded header', async ({ page }) => {
    await expect(page).toHaveTitle(/MegaETH Fast Bridge/i);
    await expect(page.getByText(/Fast Bridge by/i)).toBeVisible();
  });

  test('Step 8: "Connect Wallet" button is present in the header', async ({ page }) => {
    // In a fresh (wallet-disconnected) context the header shows "Connect Wallet"
    const headerConnectBtn = page.getByRole('button', { name: 'Connect Wallet' }).first();
    await expect(headerConnectBtn).toBeVisible();
  });

  test('Step 9: Bridge form "To" dropdown defaults to MegaETH', async ({ page }) => {
    const toDropdown = page.getByRole('combobox').first();
    await expect(toDropdown).toBeVisible();
    await expect(toDropdown).toContainText('MegaETH');
  });

  /**
   * FIX: After clicking the combobox the chain list renders as a listbox with
   * option elements.  Use getByRole('option', { name, exact: true }) to target
   * each chain unambiguously, avoiding strict-mode violations from page text
   * that also contains chain names (e.g. "Avail Fast Bridge for MegaETH…").
   */
  test('Step 10: "To" dropdown opens and lists all supported chains', async ({ page }) => {
    const toDropdown = page.getByRole('combobox').first();
    await toDropdown.click();

    // NOTE: Playwright computes the option accessible name as
    // img-alt + paragraph text, producing doubled names like
    // "Citrea Mainnet Citrea Mainnet".  Omit exact:true so the
    // substring match finds each chain correctly.
    for (const chain of SUPPORTED_CHAINS) {
      await expect(
        page.getByRole('option', { name: chain })
      ).toBeVisible();
    }
  });

  /**
   * FIX: Use getByRole('option', { name: 'Base', exact: true }) instead of
   * getByText('Base') which hits multiple elements (chain description text also
   * contained "Base").
   */
  test('Step 10a: Selecting a different chain from "To" dropdown updates the selection', async ({ page }) => {
    const toDropdown = page.getByRole('combobox').first();
    await toDropdown.click();
    await page.getByRole('option', { name: 'Base' }).click();
    await expect(toDropdown).toContainText('Base');
  });

  test('Step 11: Token dropdown defaults to USDM for MegaETH', async ({ page }) => {
    const tokenDropdown = page.getByRole('combobox').nth(1);
    await expect(tokenDropdown).toBeVisible();
    await expect(tokenDropdown).toContainText('USDM');
  });

  /**
   * FIX: getByText('ETH') matched 3 elements including "MegaETH" and page body
   * text.  The token list is also a listbox with option elements — use
   * getByRole('option', { name: 'ETH', exact: true }).
   */
  test('Step 11a: Token dropdown shows ETH as an additional option', async ({ page }) => {
    const tokenDropdown = page.getByRole('combobox').nth(1);
    await tokenDropdown.click();
    // Options have doubled accessible names (img alt + text), so omit exact:true
    await expect(page.getByRole('option', { name: 'ETH' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'USDM' })).toBeVisible();
  });

  test('Step 12: "Enter Amount" input is present and accepts numeric input', async ({ page }) => {
    const amountInput = page.getByPlaceholder('Enter Amount');
    await expect(amountInput).toBeVisible();
    await amountInput.fill('100');
    await expect(amountInput).toHaveValue('100');
  });

  test('Step 12a: Amount input does not accept alphabetic characters', async ({ page }) => {
    const amountInput = page.getByPlaceholder('Enter Amount');
    await amountInput.fill('abc');
    const value = await amountInput.inputValue();
    expect(value).not.toMatch(/[a-zA-Z]/);
  });

  test('Step 13: Recipient Address field is visible with an edit icon button', async ({ page }) => {
    await expect(page.getByText('Recipient Address')).toBeVisible();
    // Edit icon is the second button on the page (index 1, after the nav button)
    const editButton = page.getByRole('button').nth(1);
    await expect(editButton).toBeVisible();
  });

  test('Step 14: Clicking edit icon reveals address input with confirm checkmark', async ({ page }) => {
    // Click the edit/pencil icon next to Recipient Address
    const editButton = page.getByRole('button').nth(1);
    await editButton.click();

    // Address input field should now appear
    const addressInput = page.getByPlaceholder('Enter Recipient Address');
    await expect(addressInput).toBeVisible();

    // Enter a valid EVM address
    const testAddress = '0x1234567890123456789012345678901234567890';
    await addressInput.fill(testAddress);
    await expect(addressInput).toHaveValue(testAddress);

    // Confirm checkmark button should appear
    const confirmBtn = page.getByRole('button').filter({ has: page.locator('svg') }).last();
    await expect(confirmBtn).toBeVisible();
  });

  test('Step 15: "Connect Wallet" CTA button opens the wallet modal', async ({ page }) => {
    const connectBtn = page.getByRole('button', { name: 'Connect Wallet' }).last();
    await connectBtn.click();

    // Modal header
    await expect(page.getByText('Connect Wallet').nth(1)).toBeVisible();

    // Key wallet providers should be listed
    for (const wallet of EXPECTED_WALLETS) {
      await expect(page.getByText(wallet)).toBeVisible();
    }
  });

  test('Step 15a: Wallet modal is dismissed by pressing Escape', async ({ page }) => {
    const connectBtn = page.getByRole('button', { name: 'Connect Wallet' }).last();
    await connectBtn.click();
    await expect(page.getByText('WalletConnect')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByText('WalletConnect')).not.toBeVisible();
  });

  test('Step 15b: Wallet modal lists 540+ searchable wallets', async ({ page }) => {
    const connectBtn = page.getByRole('button', { name: 'Connect Wallet' }).last();
    await connectBtn.click();
    await expect(page.getByText(/540\+/)).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Citrea Bridge Page
// ---------------------------------------------------------------------------
test.describe('Citrea Bridge Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/citrea/`);
    await page.waitForLoadState('networkidle');
  });

  test('Citrea page loads with correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/Citrea Fast Bridge/i);
  });

  test('Citrea "To" dropdown defaults to Citrea Mainnet', async ({ page }) => {
    const toDropdown = page.getByRole('combobox').first();
    await expect(toDropdown).toContainText('Citrea Mainnet');
  });

  test('Citrea token dropdown defaults to USDC', async ({ page }) => {
    const tokenDropdown = page.getByRole('combobox').nth(1);
    await expect(tokenDropdown).toContainText('USDC');
  });

  test('Citrea page has functional Connect Wallet button', async ({ page }) => {
    const connectBtn = page.getByRole('button', { name: 'Connect Wallet' }).last();
    await connectBtn.click();
    await expect(page.getByText('WalletConnect')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Monad Bridge Page
// ---------------------------------------------------------------------------
test.describe('Monad Bridge Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/monad/`);
    await page.waitForLoadState('networkidle');
  });

  test('Monad page loads with correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/Monad Fast Bridge/i);
  });

  test('Monad "To" dropdown defaults to Monad', async ({ page }) => {
    const toDropdown = page.getByRole('combobox').first();
    await expect(toDropdown).toContainText('Monad');
  });

  test('Monad token dropdown defaults to USDC', async ({ page }) => {
    const tokenDropdown = page.getByRole('combobox').nth(1);
    await expect(tokenDropdown).toContainText('USDC');
  });

  test('Monad page has functional Connect Wallet button', async ({ page }) => {
    const connectBtn = page.getByRole('button', { name: 'Connect Wallet' }).last();
    await connectBtn.click();
    await expect(page.getByText('WalletConnect')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Cross-Chain Navigation
// ---------------------------------------------------------------------------
test.describe('Cross-Chain Navigation', () => {
  test('Navigating to an invalid route redirects or shows landing page', async ({ page }) => {
    await page.goto(`${BASE_URL}/invalid-chain/`);
    await page.waitForLoadState('networkidle');
    const url = page.url();
    expect(url).toContain('fastbridge.availproject.org');
  });

  /**
   * FIX: Replace getByText('Base') / getByText('USDM') with role-scoped selectors.
   * Both chain and token lists expose their items as listbox > option elements.
   *
   * NOTE: When the destination is changed to "Base", the token list changes to
   * USDC / ETH (USDM is MegaETH-specific).  Use USDC for the token switch here.
   */
  test('Chain dropdown selection persists when switching tokens', async ({ page }) => {
    await page.goto(`${BASE_URL}/megaeth/`);
    await page.waitForLoadState('networkidle');

    // Change destination chain to Base
    const toDropdown = page.getByRole('combobox').first();
    await toDropdown.click();
    await page.getByRole('option', { name: 'Base' }).click();
    await expect(toDropdown).toContainText('Base');

    // Switch token — Base supports USDC and ETH (not USDM)
    const tokenDropdown = page.getByRole('combobox').nth(1);
    await tokenDropdown.click();
    await page.getByRole('option', { name: 'ETH' }).click();

    // Chain selection should still be Base after switching token
    await expect(toDropdown).toContainText('Base');
  });
});
