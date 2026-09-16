import type { WatchChannel } from "@/domain/watch";

export interface NotificationDestination {
  channel: WatchChannel;
  accountUserId: string;
  address: string;
}

export interface DecisionChangedEvent {
  eventType: "decision_changed";
  watchId: string;
  assetLabel: string;
  originalQuestion: string;
  previousRead: string;
  nextRead: string;
  whatChanged: string[];
  evidenceVersion: number;
}

export interface ConnectionConfirmationEvent {
  eventType: "connection_confirmation";
  channel: WatchChannel;
  accountUserId: string;
}

export interface DeliveryResult {
  accepted: boolean;
  providerMessageId?: string;
  retryable: boolean;
  reason?: string;
}

export interface DeliveryFailure {
  channel: WatchChannel;
  reason: string;
  retryable: boolean;
}

export interface NotificationChannel {
  readonly id: WatchChannel;
  canDeliver(destination: NotificationDestination): Promise<{ ok: boolean; reason?: string }>;
  sendDecisionChanged(destination: NotificationDestination, event: DecisionChangedEvent): Promise<DeliveryResult>;
  sendConnectionConfirmation(destination: NotificationDestination, event: ConnectionConfirmationEvent): Promise<DeliveryResult>;
  handleDeliveryFailure(failure: DeliveryFailure): { pauseWatch: boolean; retry: boolean };
}
