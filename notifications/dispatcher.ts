import type { WatchRow, WatchStore } from "@/persistence/watch";
import { notificationChannel } from "./index";
import type { DecisionChangedEvent, NotificationDestination } from "./channel";

export async function dispatchDecisionChanged(store: WatchStore, watch: WatchRow, event: DecisionChangedEvent): Promise<"sent" | "deduped" | "unavailable" | "failed" | "retryable"> {
  const destinationRow = await store.getConnection(watch.accountUserId, watch.notificationChannel);
  const adapter = notificationChannel(watch.notificationChannel);
  if (!destinationRow || destinationRow.status !== "CONNECTED" || !adapter) return "unavailable";
  const destination: NotificationDestination = {
    channel: destinationRow.channel,
    accountUserId: destinationRow.accountUserId,
    address: destinationRow.address,
  };
  const canDeliver = await adapter.canDeliver(destination);
  if (!canDeliver.ok) return "unavailable";
  const transitionKey = [watch.id, event.nextRead, String(event.evidenceVersion)].join(":");
  const claim = await store.claimNotification(watch.id, transitionKey, watch.notificationChannel);
  if (!claim) return "deduped";
  const result = await adapter.sendDecisionChanged(destination, event);
  if (result.accepted) {
    await store.markNotificationSent(claim.id, result.providerMessageId ?? null);
    return "sent";
  }
  const policy = adapter.handleDeliveryFailure({
    channel: watch.notificationChannel,
    reason: result.reason ?? "DELIVERY_FAILED",
    retryable: result.retryable,
  });
  await store.markNotificationFailed(claim.id, result.reason ?? "DELIVERY_FAILED");
  return policy.retry && !policy.pauseWatch ? "retryable" : "failed";
}
