import { expect, test } from "@playwright/test";

test.describe("P20 research semantics presentation", () => {
  test("renders an unresolved terminal honestly without a placeholder or kernel terms", async ({ page }) => {
    const sid = "cccccccc-3333-4333-8333-cccccccccccc";
    const sse = [
      "event: session\ndata: " + JSON.stringify({ session: { id: sid, status: "awaiting", read: "undecided", stateVersion: 0 } }) + "\n\n",
      "event: intent\ndata: " + JSON.stringify({
        intent: {
          asset: "NVDA",
          resolvedSymbol: "RNVDAUSDT",
          action: "wait",
          timeframeContext: "overnight",
          decisionQuestion: "NVIDIA is drifting lower and I am considering a small entry. Should I wait?",
        },
        assetIdentity: { companyName: "NVIDIA", normalTicker: "NVDA", realityTicker: "RNVDAUSDT", perpSymbol: "NVDAUSDT", universe: 1173 },
        spotSymbol: "RNVDAUSDT",
        perpSymbol: "NVDAUSDT",
        stateVersion: 1,
      }) + "\n\n",
      "event: baseline\ndata: " + JSON.stringify({ facts: { spot: { last: 212.37, spreadBps: 5.7 }, perp: { fundingRate: 0.0004 } }, problems: [], stateVersion: 2 }) + "\n\n",
      "event: stop\ndata: " + JSON.stringify({
        reason: "CLINCH established live context for NVDA, but none of its supported research paths can answer the remaining decision question right now.",
        cannotResolve: true,
        terminal: "unresolved",
        reasonCode: "NO_CAPABLE_FAMILY",
      }) + "\n\n",
      "event: brief\ndata: " + JSON.stringify({
        brief: {
          terminalStatus: "unresolved",
          terminalReasonCode: "NO_CAPABLE_FAMILY",
          decision: "Considering whether to wait before entering NVDA.",
          read: "Not enough evidence yet",
          why: "CLINCH established live context for NVDA, but none of its supported research paths can answer the remaining decision question right now.",
          findings: [],
          completed: [],
          skipped: [],
          openQuestions: ["The remaining decision question could not be answered with the supported live paths."],
          changeTriggers: ["A supported research path capable of answering the remaining decision question becomes available."],
          decisionImplication: {
            summary: "The available evidence does not answer the decision-changing question yet.",
            supportiveEvidence: [],
            cautionEvidence: [],
            contextEvidence: [],
            unresolvedPoint: "The decision-changing question remains unresolved.",
            changeTriggers: ["A supported finding that answers the remaining decision question would change the read."],
          },
          freshness: "Observed during this session.",
          sources: ["Bitget Reality market data"],
          disclaimer: "Research support only.",
        },
        status: "unresolved",
      }) + "\n\n",
      "event: done\ndata: " + JSON.stringify({ sessionId: sid }) + "\n\n",
    ].join("");
    await page.route("**/api/stocks", async (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ stocks: [], count: 0, verifiedMarkCount: 0, fallbackMarkCount: 0 }),
    }));
    await page.route("**/api/research/start", async (route) => route.fulfill({
      status: 200,
      headers: { "Content-Type": "text/event-stream" },
      body: sse,
    }));
    await page.goto("/#app");
    await page.getByLabel("Describe the trade you are considering").fill("NVIDIA is drifting lower and I am considering a small entry. Should I wait?");
    await page.getByRole("button", { name: "Find the Decision Hinge" }).click();
    await expect(page.getByText("Could not establish an answerable Hinge")).toBeVisible();
    await expect(page.getByText("Research not run")).toBeVisible();
    await expect(page.getByText("Return an unresolved brief")).toBeVisible();
    await expect(page.locator(".answer-surface")).toBeVisible();
    await expect(page.getByText("CLINCH READ", { exact: true })).toBeVisible();
    await expect(page.locator(".answer-read-value")).toHaveText("Not enough evidence yet");
    await page.getByText("See how CLINCH reached this", { exact: true }).click();
    await expect(page.getByText("THE KEY QUESTION", { exact: true })).toBeVisible();
    await expect(page.getByText("STOP", { exact: true })).toBeVisible();
    await expect(page.getByText("View technical evidence & sources", { exact: true })).toBeVisible();
    await expect(page.locator("body")).not.toContainText("NO-CAPABLE-FAMILY");
    await expect(page.locator("body")).not.toContainText("flippable");
  });

  test("renders completed but inconclusive research as a distinct unresolved terminal", async ({ page }) => {
    const sid = "dddddddd-4444-4444-8444-dddddddddddd";
    const sse = [
      "event: session\ndata: " + JSON.stringify({ session: { id: sid, status: "awaiting", read: "undecided", stateVersion: 0 } }) + "\n\n",
      "event: intent\ndata: " + JSON.stringify({
        intent: {
          asset: "NVDA",
          resolvedSymbol: "RNVDAUSDT",
          action: "wait",
          timeframeContext: "now",
          decisionQuestion: "Should I wait before entering NVIDIA?",
        },
        assetIdentity: { companyName: "NVIDIA", normalTicker: "NVDA", realityTicker: "RNVDAUSDT", perpSymbol: "NVDAUSDT", universe: 1173 },
        spotSymbol: "RNVDAUSDT",
        perpSymbol: "NVDAUSDT",
        stateVersion: 1,
      }) + "\n\n",
      "event: baseline\ndata: " + JSON.stringify({ facts: { spot: { last: 218.24, spreadBps: 2.8 }, perp: { fundingRate: 0.0004 } }, problems: [], stateVersion: 2 }) + "\n\n",
      "event: hinge\ndata: " + JSON.stringify({
        hinge: "q-b-structure-direction",
        question: "Is this drift exhausted (setup) or a new leg down?",
        why: "Direction decides whether any entry logic exists at all.",
        changes: "A clear break of nearby structure, or a hold that keeps the setup alive.",
        family: "spot-structure",
      }) + "\n\n",
      "event: research\ndata: " + JSON.stringify({ hinge: "q-b-structure-direction", family: "spot-structure" }) + "\n\n",
      "event: finding\ndata: " + JSON.stringify({
        hinge: "q-b-structure-direction",
        family: "spot-structure",
        summary: "The recent window was lower by 0.17%. Recent prices are ranging between 218.65 and 222.",
        facts: { windowMovePcnt: -0.17, spreadBps: 2.8, spreadWide: false, supportLevel: 218.65, resistanceLevel: 222 },
      }) + "\n\n",
      "event: skip\ndata: " + JSON.stringify({
        check: "perp-positioning",
        reason: "Futures trader positioning was unlikely to answer whether the recent price drop had stabilized.",
      }) + "\n\n",
      "event: stop\ndata: " + JSON.stringify({
        reason: "CLINCH checked the most relevant supported market evidence for NVDA, but it did not provide enough directional evidence for a clear read. The decision remains unresolved.",
        cannotResolve: true,
        terminal: "unresolved",
        reasonCode: "INCONCLUSIVE_EVIDENCE",
      }) + "\n\n",
      "event: brief\ndata: " + JSON.stringify({
        brief: {
          terminalStatus: "unresolved",
          terminalReasonCode: "INCONCLUSIVE_EVIDENCE",
          decision: "Considering whether to wait before entering NVDA.",
          read: "Not enough evidence yet",
          why: "CLINCH checked the most relevant supported market evidence for NVDA, but it did not provide enough directional evidence for a clear read. The decision remains unresolved.",
          findings: ["The recent window was lower by 0.17%. Recent prices are ranging between 218.65 and 222."],
          completed: ["Is this drift exhausted (setup) or a new leg down?"],
          skipped: [{ check: "perp-positioning", reason: "Futures trader positioning was unlikely to answer whether the recent price drop had stabilized." }],
          openQuestions: ["Has the recent drop on NVIDIA started stabilizing, or could the price keep falling?"],
          changeTriggers: ["A supported market-structure observation that distinguishes whether the move is stabilizing or downside is still extending would change this timing read."],
          decisionImplication: {
            summary: "The available evidence does not answer the decision-changing question yet.",
            supportiveEvidence: [],
            cautionEvidence: ["The observed window is still lower by 0.17%."],
            contextEvidence: ["Buying and selling prices are close together, so trading conditions look normal."],
            unresolvedPoint: "Has the recent drop on NVIDIA started stabilizing, or could the price keep falling?",
            changeTriggers: ["A supported market-structure observation that distinguishes whether the move is stabilizing or downside is still extending would change this timing read."],
          },
          freshness: "Observed during this session.",
          sources: ["Bitget Reality market data"],
          disclaimer: "Research support only.",
        },
        status: "unresolved",
      }) + "\n\n",
      "event: done\ndata: " + JSON.stringify({ sessionId: sid }) + "\n\n",
    ].join("");
    await page.route("**/api/stocks", async (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ stocks: [], count: 0, verifiedMarkCount: 0, fallbackMarkCount: 0 }),
    }));
    await page.route("**/api/research/start", async (route) => route.fulfill({
      status: 200,
      headers: { "Content-Type": "text/event-stream" },
      body: sse,
    }));
    await page.goto("/#app");
    await page.getByLabel("Describe the trade you are considering").fill("Should I wait before entering NVIDIA?");
    await page.getByRole("button", { name: "Find the Decision Hinge" }).click();
    await expect(page.getByText("Find the key question", { exact: true })).toBeVisible();
    await expect(page.getByText("Evidence was not decisive", { exact: true })).toBeVisible();
    await expect(page.getByText("Research not run", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Could not establish an answerable Hinge", { exact: true })).toHaveCount(0);
    await expect(page.locator(".answer-read-value")).toHaveText("Not enough evidence yet");
    await page.getByText("See how CLINCH reached this", { exact: true }).click();
    await expect(page.getByText("Futures trader positioning was unlikely to answer whether the recent price drop had stabilized.", { exact: true })).toBeVisible();
    await expect(page.locator(".answer-stop")).toContainText("CLINCH checked recent price behavior, but it did not provide enough directional evidence for a clear read.");
    await page.getByText("View technical evidence & sources", { exact: true }).click();
    await expect(page.getByText("INCONCLUSIVE_EVIDENCE", { exact: true })).toBeVisible();
    await expect(page.getByText("COMPLETED RESEARCH", { exact: true })).toBeVisible();
    await expect(page.getByText("SKIPPED RESEARCH", { exact: true })).toBeVisible();
  });
});
