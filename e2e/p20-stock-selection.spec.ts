import { expect, Page, test } from "@playwright/test";

const STOCKS = [
  { companyName: "NVIDIA", ticker: "NVDA", logoKey: "nvidia", markKind: "verified" },
  { companyName: "Apple", ticker: "AAPL", logoKey: "apple", markKind: "verified" },
  { companyName: "Tesla", ticker: "TSLA", logoKey: "tesla", markKind: "verified" },
  { companyName: "Amazon", ticker: "AMZN", logoKey: "amazon", markKind: "verified" },
  { companyName: "Microsoft", ticker: "MSFT", logoKey: "microsoft", markKind: "verified" },
  { companyName: "Alphabet", ticker: "GOOGL", logoKey: "google", markKind: "verified" },
  { companyName: "Meta Platforms", ticker: "META", logoKey: "meta", markKind: "verified" },
  { companyName: "AMD", ticker: "AMD", logoKey: "amd", markKind: "verified" },
  { companyName: "Stock ZZZ", ticker: "ZZZ", logoKey: "monogram", markKind: "fallback" },
].map((stock) => ({ ...stock, realityTicker: `R${stock.ticker}USDT`, perpTicker: null }));

async function mockStocks(page: Page, stocks = STOCKS) {
  await page.route("**/api/stocks", async (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      stocks,
      count: stocks.length,
      verifiedMarkCount: stocks.filter((stock) => stock.markKind === "verified").length,
      fallbackMarkCount: stocks.filter((stock) => stock.markKind === "fallback").length,
      source: "Bitget Reality instruments plus CLINCH spot research capability",
    }),
  }));
}

async function openApp(page: Page, stocks = STOCKS) {
  await mockStocks(page, stocks);
  await page.goto("/#app");
  await expect(page.getByRole("heading", { name: "Choose a stock" })).toBeVisible();
}

test.describe("P20 canonical stock selection", () => {
  test("featured, Browse, and company/ticker/rToken search all select without starting research", async ({ page }) => {
    let researchStarts = 0;
    await page.route("**/api/research/start", async (route) => { researchStarts += 1; await route.abort(); });
    await openApp(page);

    await page.getByRole("button", { name: "Select NVIDIA, ticker NVDA" }).click();
    await expect(page.getByText("SELECTED STOCK")).toBeVisible();
    await expect(page.getByLabel("Describe the trade you are considering")).toHaveValue("");
    await expect(page.getByLabel("Describe the trade you are considering")).toHaveAttribute("placeholder", "It has been drifting lower tonight and I'm considering a small entry. Should I wait?");
    expect(researchStarts).toBe(0);

    await page.getByRole("button", { name: "Change" }).click();
    await page.getByLabel("Search by company, ticker, or rToken").fill("NVDA");
    await page.locator(".stock-result").click();
    await expect(page.getByText("NVIDIA").last()).toBeVisible();
    await expect(page.getByLabel("Describe the trade you are considering")).toHaveValue("");

    await page.getByRole("button", { name: "Change" }).click();
    await page.getByLabel("Search by company, ticker, or rToken").fill("rNVDA");
    await page.locator(".stock-result").click();
    await expect(page.getByText("Bitget rToken · rNVDA").last()).toBeVisible();
    expect(researchStarts).toBe(0);

    await page.getByRole("button", { name: "Select Tesla, ticker TSLA" }).click();
    await expect(page.getByText("Tesla").last()).toBeVisible();
    await expect(page.getByLabel("Describe the trade you are considering")).toHaveValue("");
    await expect(page.getByLabel("Describe the trade you are considering")).toHaveAttribute("placeholder", "It has been drifting lower tonight and I'm considering a small entry. Should I wait?");
    expect(researchStarts).toBe(0);
  });

  test("stock context renders before the composer and both entry modes submit truthfully", async ({ page }) => {
    let requestBody: { dilemma?: string } | null = null;
    await page.route("**/api/research/start", async (route) => {
      requestBody = JSON.parse(route.request().postData() ?? "{}") as { dilemma?: string };
      await route.fulfill({ status: 200, headers: { "Content-Type": "text/event-stream" }, body: "event: done\ndata: {}\n\n" });
    });
    await openApp(page);

    await expect(page.getByText("CHOOSE A STOCK · OPTIONAL")).toBeVisible();
    await expect(page.getByText("Search the supported Bitget universe, or describe the stock directly in your decision.")).toBeVisible();
    const orderIsCorrect = await page.locator(".workspace").evaluate((workspace) => {
      const discovery = workspace.querySelector(".stock-discovery");
      const composer = workspace.querySelector(".decision-composer");
      return Boolean(discovery && composer && (discovery.compareDocumentPosition(composer) & Node.DOCUMENT_POSITION_FOLLOWING));
    });
    expect(orderIsCorrect).toBe(true);

    await expect(page.getByLabel("Describe the trade you are considering")).toHaveAttribute("placeholder", "NVDA has been drifting lower tonight and I'm considering a small entry. Should I wait?");
    await page.getByRole("button", { name: "Select NVIDIA, ticker NVDA" }).click();
    await expect(page.getByText("SELECTED STOCK")).toBeVisible();
    await expect(page.getByLabel("Describe the trade you are considering")).toHaveAttribute("placeholder", "It has been drifting lower tonight and I'm considering a small entry. Should I wait?");
    await page.getByLabel("Describe the trade you are considering").fill("It is drifting lower tonight and I am considering a small entry.");
    await page.getByRole("button", { name: "Find the Decision Hinge" }).click();
    await expect.poll(() => requestBody?.dilemma).toContain("NVIDIA (NVDA) context:");
    await expect.poll(() => requestBody?.dilemma).toContain("It is drifting lower tonight");

    await page.reload();
    requestBody = null;
    await expect(page.getByLabel("Describe the trade you are considering")).toHaveAttribute("placeholder", "NVDA has been drifting lower tonight and I'm considering a small entry. Should I wait?");
    await page.getByLabel("Describe the trade you are considering").fill("I'm considering NVDA after tonight's move");
    await page.getByRole("button", { name: "Find the Decision Hinge" }).click();
    await expect.poll(() => requestBody?.dilemma).toBe("I'm considering NVDA after tonight's move");
  });

  test("keyboard selection, natural-language entry, empty search, and progressive Browse remain accessible", async ({ page }) => {
    await openApp(page);

    await page.getByRole("button", { name: "Select NVIDIA, ticker NVDA" }).press("Enter");
    await expect(page.getByText("SELECTED STOCK")).toBeVisible();
    await expect(page.getByLabel("Describe the trade you are considering")).toHaveValue("");
    await page.getByRole("button", { name: "Change" }).click();
    await page.getByRole("button", { name: "Select Tesla, ticker TSLA" }).press("Space");
    await expect(page.getByLabel("Describe the trade you are considering")).toHaveValue("");

    await page.getByRole("button", { name: "Change" }).click();
    await page.getByLabel("Describe the trade you are considering").fill("I am thinking about NVDA after tonight's move, but I am not ready to choose a stock card.");
    await expect(page.getByText("SELECTED STOCK")).toBeHidden();

    await page.getByLabel("Search by company, ticker, or rToken").fill("not-a-real-issuer");
    await expect(page.getByText("No supported stock matches that search.")).toBeVisible();

    await page.getByLabel("Search by company, ticker, or rToken").fill("");
    await page.getByRole("button", { name: "Browse supported stocks" }).click();
    await expect(page.locator(".stock-result")).toHaveCount(9);
  });

  test("long supported universe stays bounded, scrollable, and mobile-touchable", async ({ page }) => {
    const longStocks = [
      ...STOCKS,
      ...Array.from({ length: 1164 }, (_, index) => ({ companyName: `Stock ${index + 1}`, ticker: `Z${String(index + 1).padStart(3, "0")}`, logoKey: "monogram", markKind: "fallback", realityTicker: `RZ${String(index + 1).padStart(3, "0")}USDT`, perpTicker: null })),
    ];
    await openApp(page, longStocks);
    await page.getByRole("button", { name: "Browse supported stocks" }).click();
    await expect(page.locator(".stock-result")).toHaveCount(24);
    await expect(page.getByRole("button", { name: /Show more supported stocks/ })).toBeVisible();
    await page.getByRole("button", { name: /Show more supported stocks/ }).click();
    await expect(page.locator(".stock-result")).toHaveCount(48);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  });
});
