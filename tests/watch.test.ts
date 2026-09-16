import { describe, expect, it } from "vitest";
import { compileWatchPlan, materialChange, transitionFor } from "../domain/watch";
import { notificationChannel } from "../notifications";

describe("Decision Watch architecture", () => {
  it("compiles a family-specific plan from the decision hinge", () => {
    const plan = compileWatchPlan({
      asset: "NVDA",
      action: "wait",
      currentRead: "undecided",
      hinge: { topic: "crowd-timing", question: "Is trader positioning still crowded?" },
      facts: { perp: { fundingRate: 0.0002, markIndexDislocationBps: 4 } },
    });
    expect(plan.family).toBe("perp-positioning");
    expect(plan.hingeTopic).toBe("crowd-timing");
    expect(plan.targetRead).toBe("enter-now");
    expect(plan.cadenceSeconds).toBe(600);
  });

  it("only emits a material-change transition when a calibrated gate moves", () => {
    const plan = compileWatchPlan({ asset: "NVDA", action: "wait", currentRead: "undecided", facts: { spot: { last: 100, movePct24h: -2, spreadWide: false } } });
    const previous = plan.baseline;
    const unchanged = materialChange(plan, previous, { spot: { last: 100, movePct24h: -2.1, spreadWide: false } });
    expect(unchanged.changed).toBe(false);
    const changed = materialChange(plan, previous, { spot: { last: 100, movePct24h: -1, spreadWide: false } });
    expect(changed.changed).toBe(true);
    const transition = transitionFor(plan, previous, { ...previous, read: "enter-now", evidenceVersion: 1 }, changed.reasons);
    expect(transition.targetReached).toBe(true);
    expect(transition.previousRead).toBe("undecided");
  });

  it("keeps Telegram behind the channel boundary and does not invent WhatsApp", () => {
    expect(notificationChannel("TELEGRAM")?.id).toBe("TELEGRAM");
    expect(notificationChannel("WHATSAPP")).toBeNull();
  });
});
