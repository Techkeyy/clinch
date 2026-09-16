import type { NotificationChannel } from "./channel";
import { TelegramChannel } from "./telegram";

const channels: Record<string, NotificationChannel> = {
  TELEGRAM: new TelegramChannel(),
};

export function notificationChannel(id: string): NotificationChannel | null {
  return channels[id] ?? null;
}
