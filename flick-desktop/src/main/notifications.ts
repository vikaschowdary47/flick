import { Notification } from "electron";
import { APP_NAME } from "../shared/appName";
import type { ArrivalNotice } from "../shared/appSettings";

const seen = new Set<string>();
const active = new Set<Notification>();
export function notifyWindowsArrival(value: unknown, open: () => void): void {
  if (process.platform !== "win32" || !Notification.isSupported() || !value || typeof value !== "object") return;
  const notice = value as Partial<ArrivalNotice>;
  if ((notice.kind !== "file" && notice.kind !== "clip") || typeof notice.id !== "string" || !/^[0-9a-f-]{36}$/i.test(notice.id)) return;
  const key = `${notice.kind}:${notice.id}`;
  if (seen.has(key)) return;
  seen.add(key);
  if (seen.size > 512) seen.delete(seen.values().next().value!);
  // Do not put clipboard contents or file names on the Windows lock screen.
  const toast = new Notification({ title: notice.kind === "file" ? `A file arrived in ${APP_NAME}` : `A clip arrived in ${APP_NAME}`,
    body: notice.kind === "file" ? `A file from another device is ready. Click to open ${APP_NAME}.` : `A clip from another device is ready. Click to open ${APP_NAME}.` });
  if (active.size >= 5) { const oldest = active.values().next().value; oldest?.close(); if (oldest) active.delete(oldest); }
  active.add(toast);
  toast.on("click", open);
  toast.on("close", () => active.delete(toast));
  toast.on("failed", (_event, error) => { active.delete(toast); console.warn(`Couldn't show ${APP_NAME} notification:`, error); });
  toast.show();
}
