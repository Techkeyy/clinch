// Telegram companion message builders (pure functions, no I/O).
// Security: these builders never authorize anything. Every mutation path must
// resolve the Clerk account from the linked chat, load the watch, and prove
// watch.accountUserId matches before writing (see webhook route).
// Copy rules: state-change language only. Never buy/sell, never guarantees,
// never claims CLINCH owns or trades the user's position.
import type { WatchRow } from "@/persistence/watch";

export const CLINCH_APP_URL = "https://clinch-nine.vercel.app";

export interface TelegramButton {
  text: string;
  url?: string;
  callback_data?: string;
}

export interface TelegramMessage {
  text: string;
  reply_markup?: { inline_keyboard: TelegramButton[][] };
}

export function readLabel(read: string): string {
  const key = read.trim().toLowerCase();
  if (key === "enter-now" || key === "leaning-in" || key === "slightly favorable") return "Slightly favorable";
  if (key === "wait" || key === "holding-off" || key === "better to wait") return "Better to wait";
  if (key === "stand-aside" || key === "standing-aside" || key === "no clear advantage") return "No clear advantage";
  if (key === "cannot-resolve" || key === "undecided" || key === "not enough evidence yet") return "Not enough evidence yet";
  return read;
}

export function shortTime(iso: string | null): string {
  if (!iso) return "Not yet";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Not yet";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
}

function openResearchButton(sessionId: string): TelegramButton {
  return { text: "Open Research", url: `${CLINCH_APP_URL}/?s=${encodeURIComponent(sessionId)}#app` };
}

export function homeMessage(): TelegramMessage {
  return {
    text: "CLINCH\nResearch the decision. You decide.\n\nUse CLINCH here to check what you're monitoring, or open the full research desk.",
    reply_markup: {
      inline_keyboard: [
        [{ text: "My Watches", callback_data: "home:watches" }],
        [{ text: "Recent Research", callback_data: "home:recent" }],
        [{ text: "Open CLINCH", url: `${CLINCH_APP_URL}/#app` }],
      ],
    },
  };
}

export function helpMessage(): TelegramMessage {
  return {
    text: "CLINCH commands:\n/start - home menu\n/watches - your Decision Watches\n/recent - your recent research\n/help - this help\n\nCLINCH researches decisions. It never places trades.",
    reply_markup: { inline_keyboard: [[{ text: "Open CLINCH", url: `${CLINCH_APP_URL}/#app` }]] },
  };
}

export function linkRequiredMessage(): TelegramMessage {
  return {
    text: "This Telegram chat is not linked to a CLINCH account yet.\n\nOpen CLINCH, sign in (or create an account), then use Connect Telegram. After pressing Start here with the link, this chat can show your watches.",
    reply_markup: {
      inline_keyboard: [
        [{ text: "Link CLINCH account", url: `${CLINCH_APP_URL}/#app` }],
        [{ text: "Open CLINCH", url: `${CLINCH_APP_URL}/#app` }],
      ],
    },
  };
}

export function statusLabel(status: string): string {
  if (status === "TRIGGERED") return "Target reached";
  if (status === "PAUSED") return "Paused";
  if (status === "CANCELLED") return "Stopped";
  return "Active";
}

function watchActions(watch: WatchRow): TelegramButton[][] {
  const rows: TelegramButton[][] = [[openResearchButton(watch.sourceSessionId)]];
  if (watch.status === "ACTIVE") rows.push([{ text: "Pause", callback_data: `w:pause:${watch.id}` }, { text: "Stop", callback_data: `w:stop:${watch.id}` }]);
  else if (watch.status === "PAUSED") rows.push([{ text: "Resume", callback_data: `w:resume:${watch.id}` }, { text: "Stop", callback_data: `w:stop:${watch.id}` }]);
  return rows;
}

export function watchDetailMessage(watch: WatchRow): TelegramMessage {
  const lines = [
    `${watch.assetLabel} · ${statusLabel(watch.status).toUpperCase()}`,
    "",
    "Current read",
    readLabel(watch.currentRead),
    "",
    "Target",
    readLabel(watch.targetRead),
    "",
    `Last checked\n${shortTime(watch.lastCheckedAt)}`,
    `Next check\n${shortTime(watch.nextCheckAt)}`,
    "",
    "Question",
    watch.humanKeyQuestion,
    "",
    "CLINCH will notify you only if the evidence reaches the watched state. It will not place a trade.",
  ];
  return { text: lines.join("\n"), reply_markup: { inline_keyboard: watchActions(watch) } };
}

export function watchesMessage(watches: WatchRow[]): TelegramMessage {
  if (!watches.length) {
    return {
      text: "You have no Decision Watches yet.\n\nCreate one from eligible research in the CLINCH app, then check back here.",
      reply_markup: { inline_keyboard: [[{ text: "Open CLINCH", url: `${CLINCH_APP_URL}/#app` }]] },
    };
  }
  const shown = watches.slice(0, 10);
  const lines = ["Your Decision Watches:", ""];
  for (const watch of shown) {
    lines.push(`${watch.assetLabel} · ${statusLabel(watch.status)}`);
    lines.push(`${readLabel(watch.currentRead)} → ${readLabel(watch.targetRead)}`);
    lines.push(`Last checked: ${shortTime(watch.lastCheckedAt)}`);
    lines.push("");
  }
  if (watches.length > shown.length) lines.push(`…and ${watches.length - shown.length} more in the app.`);
  return {
    text: lines.join("\n").trimEnd(),
    reply_markup: {
      inline_keyboard: [
        ...shown.map((watch): TelegramButton[] => [{ text: `${watch.assetLabel} · ${statusLabel(watch.status)}`, callback_data: `w:detail:${watch.id}` }]),
        [{ text: "Open CLINCH", url: `${CLINCH_APP_URL}/#app` }],
      ],
    },
  };
}

export interface RecentResearchItem {
  id: string;
  asset: string | null;
  decision: string;
  read: string;
  updatedAt: string;
}

export function recentMessage(items: RecentResearchItem[]): TelegramMessage {
  if (!items.length) {
    return {
      text: "No account research yet.\n\nRun a research decision in the CLINCH app and it will appear here.",
      reply_markup: { inline_keyboard: [[{ text: "Open CLINCH", url: `${CLINCH_APP_URL}/#app` }]] },
    };
  }
  const shown = items.slice(0, 5);
  const lines = ["Recent research:", ""];
  for (const item of shown) {
    lines.push(item.asset ? `${item.asset} · ${item.decision.slice(0, 60)}` : item.decision.slice(0, 80));
    lines.push(`${readLabel(item.read)} · ${shortTime(item.updatedAt)}`);
    lines.push("");
  }
  return {
    text: lines.join("\n").trimEnd(),
    reply_markup: {
      inline_keyboard: [
        ...shown.map((item): TelegramButton[] => [openResearchButton(item.id)]),
      ],
    },
  };
}

const WATCH_CALLBACK = /^w:(detail|pause|resume|stop):([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

/** Strictly parse watch callbacks. Unknown or malformed data returns null (ack, no mutation). */
export function parseWatchCallback(data: string): { action: "detail" | "pause" | "resume" | "stop"; id: string } | null {
  const match = data.trim().match(WATCH_CALLBACK);
  if (!match) return null;
  return { action: match[1].toLowerCase() as "detail" | "pause" | "resume" | "stop", id: match[2] };
}

const HOME_CALLBACKS = new Set(["home:watches", "home:recent", "home:help", "home:home"]);

export function isHomeCallback(data: string): boolean {
  return HOME_CALLBACKS.has(data.trim());
}
