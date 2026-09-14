import { expect, test } from "@playwright/test";

const STOCKS = [
  { companyName: "NVIDIA", ticker: "NVDA", realityTicker: "RNVDAUSDT", logoKey: "nvidia", markKind: "verified", perpTicker: "NVDAUSDT" },
  { companyName: "Apple", ticker: "AAPL", realityTicker: "RAAPLUSDT", logoKey: "apple", markKind: "verified", perpTicker: null },
  { companyName: "Stock ZZZ", ticker: "ZZZ", realityTicker: "RZZZUSDT", logoKey: "monogram", markKind: "fallback", perpTicker: null },
];

test.describe("P20 targeted corrections", () => {
  test("browse, search, and select a human-readable supported stock", async ({ page }) => {
    await page.route("**/api/stocks", async (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ stocks: STOCKS, count: STOCKS.length, verifiedMarkCount: 2, fallbackMarkCount: 1, source: "Bitget Reality instruments plus CLINCH spot research capability" }),
    }));
    await page.goto("/#app");
    await expect(page.getByText("CLINCH can research 3 supported Reality instruments. 2 verified brand marks; 1 ticker monogram fallback.")).toBeVisible();
    await page.getByRole("button", { name: "Browse supported stocks" }).click();
    await page.getByLabel("Search stocks").fill("nvidia");
    await expect(page.getByRole("option")).toHaveCount(1);
    await expect(page.getByText("NVIDIA").first()).toBeVisible();
    await expect(page.getByText("NVDA").first()).toBeVisible();
    await expect(page.locator(".stock-result .stock-token-meta")).toHaveText("Bitget rToken · rNVDA");
    await page.getByRole("option").click();
    await expect(page.getByLabel("Describe the trade you are considering")).toHaveValue("I am considering NVIDIA (NVDA). Should I buy now or wait?");
  });

  test("Research Again clears the historical locator and creates a fresh session request", async ({ page }) => {
    const oldId = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa";
    const newId = "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb";
    await page.route("**/api/stocks", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ stocks: STOCKS, count: STOCKS.length }) }));
    await page.route(`**/api/session?id=${oldId}`, async (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        session: {
          id: oldId, status: "stopped", read: "holding-off", stateVersion: 4,
          state: { intent: { asset: "NVDA", resolvedSymbol: "RNVDAUSDT", action: "wait" }, spotSymbol: "RNVDAUSDT", facts: {}, skips: [], hingeHistory: [], read: "holding-off" },
          brief: { decision: "Considering waiting on NVIDIA", read: "Holding off", why: "Historical fixture.", findings: [], completed: [], skipped: [], openQuestions: [], changeTriggers: [], freshness: "Fixture", sources: [], disclaimer: "Research support only." },
        }, steps: [],
      }),
    }));
    const bodies: string[] = [];
    await page.route("**/api/research/start", async (route) => {
      bodies.push(route.request().postData() ?? "");
      await route.fulfill({
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
        body: `event: session\ndata: ${JSON.stringify({ session: { id: newId, status: "awaiting", read: "undecided", stateVersion: 0 } })}\n\nevent: done\ndata: ${JSON.stringify({ sessionId: newId })}\n\n`,
      });
    });
    await page.goto(`/?s=${oldId}#app`);
    await expect(page.getByText("FINAL DECISION BRIEF")).toBeVisible();
    await page.getByRole("button", { name: "Start another decision" }).click();
    await expect(page).not.toHaveURL(new RegExp(`s=${oldId}`));
    await expect(page.getByText("FINAL DECISION BRIEF")).toBeHidden();
    await page.getByLabel("Describe the trade you are considering").fill("NVIDIA is drifting lower. Should I wait?");
    await page.getByRole("button", { name: "Find the Decision Hinge" }).click();
    await expect(page).toHaveURL(new RegExp(`s=${newId}`));
    expect(bodies).toHaveLength(1);
    expect(JSON.parse(bodies[0]).idempotencyKey).not.toContain(oldId);
  });
});
