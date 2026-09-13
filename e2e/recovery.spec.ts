import { expect, test } from "@playwright/test";
import { DatabaseSync } from "node:sqlite";
import { STALE_RUN_MS } from "../config/thresholds";

// P15 browser recovery gate. Exactly ONE live Bitget loop (serial, shared sid);
// everything else is API contexts or synthetic intercepted fixtures (labeled as
// such inline — fixtures test rendering/hydration logic, never live evidence).
test.describe.serial("CLINCH recovery", () => {
  let sid = "";
  let ownerCookie: {
    name: string; value: string; domain: string; path: string; expires: number;
    httpOnly: boolean; secure: boolean; sameSite: "Strict" | "Lax" | "None";
  } | undefined;
  let readBefore = "";
  let hingeCount = 0;
  let stepCount = 0;

  test("live loop completes and anchors the locator", async ({ page }) => {
    await page.goto("/#app");
    await page.getByLabel("Describe the trade you are considering").fill(
      "rNVDA drifted lower this evening and I wonder about a small entry.");
    await page.getByRole("button", { name: "Find the Decision Hinge" }).click();
    await expect(page.getByText("Research finished. The trading decision is yours.")).toBeVisible({ timeout: 150_000 });
    readBefore = (await page.locator(".result-read-block .result-value").textContent()) ?? "";
    expect(readBefore.length).toBeGreaterThan(0);
    expect(new URL(page.url()).searchParams.get("s")).toMatch(/^[0-9a-f-]{36}$/i);
    sid = new URL(page.url()).searchParams.get("s")!;
    ownerCookie = (await page.context().cookies()).find((c) => c.name === "clinch_owner");
    expect(ownerCookie).toBeDefined();
    const g = await page.request.get(`/api/session?id=${sid}`);
    expect(g.ok()).toBe(true);
    const persisted = (await g.json()) as { steps: unknown[]; session: { state?: { hingeHistory?: unknown[] } } };
    hingeCount = persisted.session.state?.hingeHistory?.length ?? 0;
    stepCount = persisted.steps.length;
    expect(stepCount).toBeGreaterThan(0);
  });

  test("completed refresh restores brief, read, hinge and skip history with zero rerun", async ({ page }) => {
    if (ownerCookie) await page.context().addCookies([ownerCookie]);
    await page.goto(`/?s=${sid}`);
    await expect(page.getByText("Research finished. The trading decision is yours.")).toBeVisible({ timeout: 30_000 });
    expect(await page.locator(".result-read-block .result-value").textContent()).toBe(readBefore);
    expect(await page.locator(".result-hinge-question").count()).toBeGreaterThan(0);
    expect(new URL(page.url()).searchParams.get("s")).toBe(sid);
    const g = await page.request.get(`/api/session?id=${sid}`);
    expect(((await g.json()) as { steps: unknown[] }).steps.length).toBe(stepCount);
    // Same-owner second context can read with its cookie state.
    const state = await page.context().storageState();
    const ctx2 = await page.context().browser()!.newContext({ storageState: state });
    try {
      const g2 = await ctx2.request.get(`/api/session?id=${sid}`);
      expect(g2.status()).toBe(200);
    } finally {
      await ctx2.close();
    }
  });

  test("recent lists the research with a real timestamp and reopens it", async ({ page }) => {
    if (ownerCookie) await page.context().addCookies([ownerCookie]);
    await page.goto("/?s=" + sid);
    await expect(page.getByText("Research finished. The trading decision is yours.")).toBeVisible({ timeout: 30_000 });
    await page.goto("/recent");
    const open = page.locator(`a[href*="${sid}"]`, { hasText: "Open research" });
    await expect(open).toBeVisible({ timeout: 15_000 });
    const row = await open.evaluateHandle((a) => a.closest("section") ?? a.parentElement);
    const rowText = (await row.evaluate((el) => (el as HTMLElement).innerText)) ?? "";
    expect(rowText).toMatch(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/);
    await open.click();
    await expect(page.getByText("Research finished. The trading decision is yours.")).toBeVisible({ timeout: 30_000 });
    expect(new URL(page.url()).searchParams.get("s")).toBe(sid);
  });

  test("active run hydrates truthfully and refuses a competing resume", async ({ page }) => {
    await page.goto("/#app");
    await page.getByLabel("Describe the trade you are considering").fill("rNVDA evening drift, small entry?");
    await page.getByRole("button", { name: "Find the Decision Hinge" }).click();
    await expect(page.getByText("Decision Hinge 1", { exact: false }).first()).toBeVisible({ timeout: 90_000 });
    await page.reload();
    await expect(page.getByRole("heading", { name: "Research is still running" })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Research finished. The trading decision is yours.")).toBeHidden();
    await page.getByRole("button", { name: "Re-check now" }).click();
    await expect(page.getByText("still running elsewhere").first()).toBeVisible({ timeout: 30_000 });
  });

  test("stale interrupted work resumes without rerunning the completed family", async ({ page }) => {
    // Test-only persisted state: it is deliberately written into the local
    // SQLite test database, never exposed through a product endpoint.
    const dbPath = process.env.SQLITE_PATH ?? "data/clinch-dev.db";
    const db = new DatabaseSync(dbPath);
    try {
      const staleState = {
        dilemma: "rNVDA structure was already checked; should positioning change the wait?",
        intent: {
          asset: "RNVDA", resolvedSymbol: "RNVDAUSDT", action: "enter-now",
          timeframeContext: "", decisionQuestion: "Should I enter now or wait?",
          clarificationNeeded: false, clarificationQuestion: null,
        },
        read: "wait", resolvedTopics: ["move-reality", "structure-direction"],
        facts: {
          spot: { last: 218.24, spreadWide: true, topBidSize: 0.5, topAskSize: 0.4, windowMovePcnt: -2, supportLevel: 218.5 },
          perp: { fundingRate: 0.0012, openInterest: 1000, markIndexDislocationBps: 0 },
        },
        skips: [], uncertainty: [], retries: 0,
        hingeHistory: [
          { hinge: "q-a-move-reality", topic: "move-reality", verdict: "thin-artifact :: read now wait" },
          { hinge: "q-a-structure-direction", topic: "structure-direction", verdict: "exhaustion :: read now wait" },
        ],
        stopReason: null, briefStatus: "researching", spotSymbol: "RNVDAUSDT", perpSymbol: "NVDAUSDT",
        context: "", known: [], clarificationRound: 0,
        data: { "spot-structure": "fresh", "perp-positioning": "fresh" },
      };
      db.prepare("DELETE FROM research_steps WHERE session_id = ?").run(sid);
      db.prepare("UPDATE research_sessions SET status = ?, read = ?, state = ?, brief = ?, state_version = ?, updated_at = ? WHERE id = ?")
        .run("researching", "wait", JSON.stringify(staleState), null, 0,
          new Date(Date.now() - STALE_RUN_MS - 1_000).toISOString(), sid);
    } finally {
      db.close();
    }
    if (ownerCookie) await page.context().addCookies([ownerCookie]);

    await page.goto(`/?s=${sid}`);
    await expect(page.getByRole("heading", { name: "Research paused safely" })).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Re-check now" }).click();
    await expect(page.getByText("Research finished. The trading decision is yours.")).toBeVisible({ timeout: 120_000 });
    const restored = await page.request.get(`/api/session?id=${sid}`);
    expect(restored.ok()).toBe(true);
    const steps = ((await restored.json()) as { steps: { kind: string; family: string | null }[] }).steps;
    expect(steps.some((step) => step.kind === "research" && step.family === "spot-structure")).toBe(false);
    expect(steps.some((step) => step.kind === "research" && step.family === "perp-positioning")).toBe(true);
  });
  test("stranger with only the ID cannot read; owner secret stays out of reach", async ({ browser }) => {
    const a = await browser.newContext();
    const b = await browser.newContext();
    try {
      const r = await a.request.post("/api/research/start", {
        data: { dilemma: "Should I buy or wait?", idempotencyKey: `p15-stranger-${Date.now()}` },
      });
      expect(r.ok()).toBe(true);
      const text = await r.text();
      const m = text.match(/"id":"([0-9a-f-]{36})"/);
      expect(m).not.toBeNull();
      const id = m![1];
      const gb = await b.request.get(`/api/session?id=${id}`);
      expect(gb.status()).toBe(401);
      const db = await b.request.post("/api/session/delete", { data: { sessionId: id } });
      expect(db.status()).toBe(401);
      await a.request.post("/api/session/delete", { data: { sessionId: id } });
    } finally {
      await a.close();
      await b.close();
    }
  });

  test("synthetic skip fixture restores the skip card with its reason", async ({ page }) => {
    // Fixture only: proves hydration renders persisted skips. Not live evidence.
    const fid = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa";
    await page.route(`**/api/session?id=${fid}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          session: {
            id: fid, status: "stopped", read: "holding-off", stateVersion: 3,
            state: {
              skips: [{ check: "perp-positioning", reason: "counterfactual reason" }],
              hingeHistory: [{ hinge: "h1", verdict: "thin-artifact :: read now holding-off" }],
              read: "holding-off",
            },
            brief: {
              decision: "Wait", read: "Holding off", why: "Counterfactual fixture.",
              findings: ["Saved structure finding (restored from this session)."],
              completed: [], skipped: [{ check: "perp-positioning", reason: "counterfactual reason" }],
              openQuestions: [], changeTriggers: ["Fresh live data"],
              freshness: "Fixture; not live market evidence.",
              sources: [], disclaimer: "Synthetic fixture.",
            },
          },
          steps: [],
        }),
      });
    });
    await page.goto(`/?s=${fid}`);
    await expect(page.getByText("Research finished. The trading decision is yours.")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("counterfactual reason").first()).toBeVisible();
    await expect(page.locator(".result-hinge-question")).toBeVisible();
    await page.unroute(`**/api/session?id=${fid}`);
  });

  test("synthetic interrupted fixture restores workspace with Resume", async ({ page }) => {
    // Fixture only: proves interrupted hydration shows read, history, saved
    // findings and a Resume action instead of an empty page.
    const fid = "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb";
    await page.route(`**/api/session?id=${fid}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          session: {
            id: fid, status: "researching", read: "undecided", stateVersion: 2,
            state: {
              skips: [],
              hingeHistory: [{ hinge: "h1", topic: "move-reality", verdict: "thin-artifact :: read now stand-aside" }],
              read: "stand-aside",
            },
            brief: null,
          },
          steps: [
            { ord: 1001, kind: "hinge", family: "spot-structure", requestSummary: '{"hinge":"h1"}', resultSummary: {}, provenance: null, finishedAt: "2026-09-12T00:00:00.000Z" },
            { ord: 1002, kind: "research", family: "spot-structure", requestSummary: '{"hinge":"h1","status":"ok"}', resultSummary: {}, provenance: null, finishedAt: "2026-09-12T00:00:01.000Z" },
          ],
        }),
      });
    });
    await page.goto(`/?s=${fid}`);
    await expect(page.getByRole("heading", { name: "Research paused safely" })).toBeVisible({ timeout: 15_000 });
    await expect(page.locator(".result-hinge-question")).toBeVisible();
    await expect(page.getByText("Saved spot-structure finding", { exact: false })).toBeVisible();
    await expect(page.getByRole("button", { name: "Re-check now" })).toBeVisible();
    await expect(page.getByText("Research finished. The trading decision is yours.")).toBeHidden();
    // Resume against a nonexistent session must fail honestly, never fake success.
    await page.getByRole("button", { name: "Re-check now" }).click();
    await expect(page.getByText("Resume is not available for this research right now.")).toBeVisible({ timeout: 15_000 });
    await page.unroute(`**/api/session?id=${fid}`);
  });

  test("failed delete keeps the brief; successful delete removes it everywhere", async ({ page }) => {
    if (ownerCookie) await page.context().addCookies([ownerCookie]);
    await page.goto(`/?s=${sid}`);
    await expect(page.getByText("Research finished. The trading decision is yours.")).toBeVisible({ timeout: 30_000 });
    let failOnce = true;
    await page.route("**/api/session/delete", async (route) => {
      if (failOnce) {
        failOnce = false;
        await route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
      } else {
        await route.continue();
      }
    });
    await page.getByRole("button", { name: "Delete this research" }).click();
    await page.getByRole("button", { name: "Delete it" }).click();
    await expect(page.getByText("Delete did not complete.")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Research finished. The trading decision is yours.")).toBeVisible();
    await page.goto("/recent");
    await expect(page.locator(`a[href*="${sid}"]`)).toBeVisible();
    await page.goto(`/?s=${sid}`);
    await expect(page.getByText("Research finished. The trading decision is yours.")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Delete this research" }).click();
    await page.getByRole("button", { name: "Delete it" }).click();
    await expect(page.getByText("Research finished. The trading decision is yours.")).toBeHidden({ timeout: 15_000 });
    await page.goto("/recent");
    await expect(page.locator(`a[href*="${sid}"]`)).toHaveCount(0);
    await page.unroute("**/api/session/delete");
  });

  test("owner secret never touches localStorage or readable cookies", async ({ page }) => {
    await page.goto("/#app");
    await page.evaluate(() => window.localStorage.clear());
    await page.getByLabel("Describe the trade you are considering").fill("Should I buy or wait?");
    await page.getByRole("button", { name: "Find the Decision Hinge" }).click();
    await expect(page.getByText("What are you deciding?", { exact: false }).first()).toBeVisible({ timeout: 30_000 });
    const audit = await page.evaluate(() => {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k) keys.push(`${k}=${(localStorage.getItem(k) ?? "").slice(0, 60)}`);
      }
      return { keys, cookie: document.cookie };
    });
    expect(audit.keys.join("|")).not.toMatch(/clinch_owner|verifier|pepper|BITGET_QWEN|DATABASE/i);
    expect(audit.cookie).not.toMatch(/clinch_owner/i);
    expect(audit.keys.some((k) => k.startsWith("clinch-recent"))).toBe(true);
    const cookies = await page.context().cookies();
    const owner = cookies.find((c) => c.name === "clinch_owner");
    expect(owner?.httpOnly).toBe(true);
  });

  test("mobile viewport stays usable", async ({ browser }) => {
    const m = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    try {
      const p = await m.newPage();
      await p.goto("/#app");
      await expect(p.getByRole("button", { name: "Find the Decision Hinge" })).toBeVisible();
      await p.getByLabel("Describe the trade you are considering").fill("Should I buy or wait?");
      await p.getByRole("button", { name: "Find the Decision Hinge" }).click();
      await expect(p.getByText("What are you deciding?", { exact: false }).first()).toBeVisible({ timeout: 30_000 });
      const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
    } finally {
      await m.close();
    }
  });
});
