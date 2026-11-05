import { useState } from "react";
import { Bell } from "lucide-react";
import { ApiError, apiRequest, tokenStorage } from "../lib/api";

function decodeApplicationServerKey(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

function readNotificationPreference(userId?: string) {
  if (!userId) return false;
  try {
    const settings = localStorage.getItem(`ordemy:notifications:${userId}`);
    return settings ? Boolean((JSON.parse(settings) as { browser?: boolean }).browser) : false;
  } catch {
    return false;
  }
}

export function BrowserPushSetting({ userId }: { userId?: string }) {
  const [enabledState, setEnabledState] = useState(() => ({
    userId,
    enabled: readNotificationPreference(userId),
  }));
  const enabled = enabledState.userId === userId
    ? enabledState.enabled
    : readNotificationPreference(userId);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function persist(enabledValue: boolean) {
    if (userId) {
      try {
        const key = `ordemy:notifications:${userId}`;
        const saved = localStorage.getItem(key);
        const current = saved ? JSON.parse(saved) as Record<string, boolean> : {};
        localStorage.setItem(key, JSON.stringify({ ...current, browser: enabledValue }));
      } catch {
        setError("The notification preference could not be saved on this device.");
        return;
      }
    }
    setEnabledState({ userId, enabled: enabledValue });
  }

  async function toggle() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (!userId) throw new Error("Sign in again to manage browser notifications.");
      const token = tokenStorage.get();
      if (!token) throw new Error("Your session has expired. Please sign in again.");
      if (enabled) {
        const registration = await navigator.serviceWorker.getRegistration("/");
        const subscription = await registration?.pushManager.getSubscription();
        if (subscription) {
          await apiRequest("/api/notifications/push-subscriptions", {
            method: "DELETE",
            token,
            body: { endpoint: subscription.endpoint },
          });
          await subscription.unsubscribe();
        }
        persist(false);
        return;
      }
      if (!("Notification" in window) || !("serviceWorker" in navigator)) {
        throw new Error("This browser does not support web push notifications.");
      }
      const response = await apiRequest<{ data: { publicKey: string | null } }>(
        "/api/notifications/push-config",
        { token, cache: "no-store" },
      );
      if (!response.data.publicKey) {
        throw new Error("Push notifications are not configured on the API. Ask an administrator to set the VAPID keys.");
      }
      if (await Notification.requestPermission() !== "granted") {
        throw new Error("Allow notifications in your browser settings to enable push alerts.");
      }
      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeApplicationServerKey(response.data.publicKey),
      });
      await apiRequest("/api/notifications/push-subscriptions", {
        method: "POST",
        token,
        body: subscription.toJSON(),
      });
      persist(true);
    } catch (toggleError: unknown) {
      setError(
        toggleError instanceof ApiError || toggleError instanceof Error
          ? toggleError.message
          : "Browser notifications could not be updated.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-[#F0ECFF] p-3 sm:p-4">
      <div className="flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#F1EDFF] text-[#2501FF]">
          <Bell size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#0B1030]">Browser push notifications</p>
          <p className="text-xs leading-5 text-slate-500">Receive direct-chat alerts even when Ordemy is closed.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Browser push notifications"
          disabled={busy}
          onClick={() => void toggle()}
          className={`relative h-11 w-12 shrink-0 rounded-full p-2 transition-colors disabled:opacity-50 ${
            enabled ? "bg-[#2501FF]" : "bg-slate-200"
          }`}
        >
          <span
            className={`absolute left-2 top-1/2 size-5 -translate-y-1/2 rounded-full bg-white shadow-sm transition-transform ${
              enabled ? "translate-x-4" : "translate-x-0"
            }`}
            aria-hidden="true"
          />
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-rose-700" role="alert">{error}</p>}
      {busy && <p className="mt-2 text-xs text-slate-500" role="status">Updating notification settings…</p>}
    </div>
  );
}
