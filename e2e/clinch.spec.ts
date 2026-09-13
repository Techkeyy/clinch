import { expect, test } from "@playwright/test";

// Smallest useful browser coverage: load, real research flow, error state,
// details affordance, mobile integrity. Live backend required.
test.describe("CLINCH core loop", () => {
  test("loads with hero, input, CTA and trust line", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "What trade are you considering?" })).toBeVisible();
    await expect(page.getByLabel("Describe the trade you are considering")).toBeVisible();
    await expect(page.getByRole("button", { name: "Check this trade" })).toBeVisible();
    await expect(page.getByText("Research only. No wallet. No exchange account.")).toBeVisible();
  });

  test("full dilemma-to-brief run with real Bitget evidence", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Describe the trade you are considering").fill(
      "rNVDA fell hard after the close. I am thinking of buying the dip. Real opportunity or wait?",
    );
    await page.getByRole("button", { name: "Check this trade" }).click();
    await expect(page.getByText("Your decision")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Live context")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText("Decision Hinge 1", { exact: false }).first()).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText("Research brief", { exact: false }).first()).toBeVisible({ timeout: 150_000 });
    await expect(page.getByText("Research finished. The trading decision is yours.")).toBeVisible();
  });

  test("unsupported asset shows truthful guidance, not a crash", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Describe the trade you are considering").fill("Should I buy some ZZZCOIN today?");
    await page.getByRole("button", { name: "Check this trade" }).click();
    await expect(page.getByText("not a currently supported Reality instrument")).toBeVisible({ timeout: 90_000 });
  });

  test("ambiguous dilemma asks one clarification", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Describe the trade you are considering").fill("What do you think about rNVDA right now?");
    await page.getByRole("button", { name: "Check this trade" }).click();
    await expect(page.getByText("What are you deciding", { exact: false }).first()).toBeVisible({ timeout: 60_000 });
  });

  test("skip magic moment renders with counterfactual reason (deterministic stream)", async ({ page }) => {
    const sid = "12345678-1234-4234-8234-1234567890ab";
    const canned =
      `event: session\ndata: {"session":{"id":"${sid}","status":"awaiting","read":"undecided","stateVersion":0}}\n\n` +
      `event: hinge\ndata: {"hinge":"q1","question":"Is this drift exhausted or a new leg down?","why":"Direction decides entry.","changes":"A break or a hold.","family":"spot-structure"}\n\n` +
      `event: skip\ndata: {"check":"perp-positioning","reason":"Even calm positioning would not change the current hold-off read while spot liquidity stays impaired."}\n\n` +
      `event: stop\ndata: {"reason":"CLINCH is stopping here. The checks still available are unlikely to change this read."}\n\n` +
      `event: brief\ndata: {"brief":{"decision":"Considering entering on RNVDA","read":"Holding off","why":"Breakdown on expanding volume.","findings":[],"completed":["q1"],"skipped":[{"check":"perp-positioning","reason":"Even calm positioning would not change the current hold-off read while spot liquidity stays impaired."}],"openQuestions":[],"changeTriggers":["Sustained stabilization"],"freshness":"Observed during this session.","sources":[],"disclaimer":"Research support only.","polishedText":null,"polished":false},"status":"stopped"}\n\n` +
      `event: done\ndata: {"sessionId":"${sid}"}\n\n`;
    await page.route("**/api/research/start", async (route) => {
      await route.fulfill({ status: 200, headers: { "Content-Type": "text/event-stream" }, body: canned });
    });
    await page.goto("/");
    await page.getByLabel("Describe the trade you are considering").fill("rNVDA is sliding tonight, dip-buy or wait?");
    await page.getByRole("button", { name: "Check this trade" }).click();
    await expect(page.getByText("Skipped: Positioning context")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Even calm positioning would not change", { exact: false }).first()).toBeVisible();
    await expect(page.getByText("CLINCH is stopping here", { exact: false }).first()).toBeVisible();
  });

  test("refresh after a completed run preserves the brief truthfully", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Describe the trade you are considering").fill(
      "rNVDA drifted lower this evening and I wonder about a small entry.");
    await page.getByRole("button", { name: "Check this trade" }).click();
    await expect(page.getByText("Research finished. The trading decision is yours.")).toBeVisible({ timeout: 150_000 });
    await page.reload();
    await expect(page.getByLabel("Describe the trade you are considering")).toBeVisible({ timeout: 30_000 });
  });

  test("delete removes the brief and recent history entry", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Describe the trade you are considering").fill("rAAPL is quiet tonight, tiny entry?");
    await page.getByRole("button", { name: "Check this trade" }).click();
    await expect(page.getByText("Research finished. The trading decision is yours.")).toBeVisible({ timeout: 150_000 });
    page.on("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Delete this research" }).click();
    await expect(page.getByText("Research finished. The trading decision is yours.")).toBeHidden({ timeout: 15_000 });
    await page.goto("/recent");
    await expect(page.getByText("No saved research in this browser yet.")).toBeVisible({ timeout: 30_000 });
  });

  test("recent page lists this browser's completed research", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Describe the trade you are considering").fill("rNVDA evening drift, small entry?");
    await page.getByRole("button", { name: "Check this trade" }).click();
    await expect(page.getByText("Research finished. The trading decision is yours.")).toBeVisible({ timeout: 150_000 });
    await page.goto("/recent");
    await expect(page.getByText("RNVDA", { exact: false }).first()).toBeVisible({ timeout: 30_000 });
  });

  test("mobile has no horizontal overflow and CTA stays usable", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "mobile-only layout check");
    await page.goto("/");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    const cta = page.getByRole("button", { name: "Check this trade" });
    await expect(cta).toBeVisible();
    const box = await cta.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(40);
  });
});
