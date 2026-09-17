"use client";

import { useEffect, useState } from "react";
import { SignInButton, useAuth } from "@clerk/nextjs";

type MonitorSetupProps = {
  sessionId: string;
  assetLabel: string;
  currentRead: string;
  targetReached?: boolean;
};

type ConnectResponse = { deepLink?: string; expiresInSeconds?: number; error?: string };
type WatchResponse = { error?: string; watch?: { status?: string } };

function errorCopy(error: string | undefined): string {
  if (error === "TELEGRAM_SETUP_REQUIRED") return "Telegram is not configured for this deployment yet.";
  if (error === "NOTIFICATION_CHANNEL_NOT_CONNECTED") return "Finish the Telegram connection, then try starting the watch again.";
  if (error === "WATCH_TARGET_ALREADY_REACHED") return "This decision is already slightly favorable, so there is no watch to add.";
  if (error === "WATCH_REQUIRES_COMPLETED_RESEARCH") return "Finish the current research before starting a watch.";
  return "We could not start monitoring yet. Please try again.";
}

export function MonitorSetup({ sessionId, assetLabel, currentRead, targetReached = false }: MonitorSetupProps) {
  const { isLoaded, isSignedIn } = useAuth();
  const [claiming, setClaiming] = useState(false);
  const [claimMessage, setClaimMessage] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const [watching, setWatching] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !sessionId) return;
    let cancelled = false;
    setClaiming(true);
    fetch("/api/account/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionIds: [sessionId] }),
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({})) as { claimed?: number; alreadyOwned?: number };
        if (!cancelled && response.ok && ((data.claimed ?? 0) + (data.alreadyOwned ?? 0)) > 0) {
          setClaimMessage("This research is now attached to your account.");
        }
      })
      .catch(() => { /* the watch endpoint will repeat its ownership check */ })
      .finally(() => { if (!cancelled) setClaiming(false); });
    return () => { cancelled = true; };
  }, [isLoaded, isSignedIn, sessionId]);

  const connectTelegram = async () => {
    setConnecting(true);
    setMessage(null);
    try {
      const response = await fetch("/api/notifications/telegram/connect", { method: "POST" });
      const data = await response.json() as ConnectResponse;
      if (!response.ok || !data.deepLink) {
        setMessage(errorCopy(data.error));
        return;
      }
      setDeepLink(data.deepLink);
      setMessage("Open Telegram, press Start, then return here to start the watch.");
    } catch {
      setMessage("We could not prepare the Telegram connection yet.");
    } finally {
      setConnecting(false);
    }
  };

  const startWatching = async () => {
    setWatching(true);
    setMessage(null);
    try {
      const response = await fetch("/api/watches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, channel: "TELEGRAM" }),
      });
      const data = await response.json() as WatchResponse;
      if (!response.ok) {
        setMessage(errorCopy(data.error));
        return;
      }
      setMessage("Decision Watch is active. CLINCH will check again when its plan says the evidence could matter.");
    } catch {
      setMessage("We could not start monitoring yet. Please try again.");
    } finally {
      setWatching(false);
    }
  };

  if (!isLoaded) return null;

  return (
    <section className="monitor-setup" aria-label="Monitor this decision">
      <div className="monitor-setup-heading">
        <div>
          <p className="eyebrow">DECISION WATCH</p>
          <h2 className="section-title">Monitor this decision</h2>
        </div>
        <span className="monitor-badge">ONE-TIME ALERT</span>
      </div>
      <p className="body-text monitor-setup-intro">CLINCH can check the evidence again and tell you if the read reaches a slightly favorable state. It will not send a buy signal.</p>
      <dl className="monitor-summary">
        <div><dt>Current read</dt><dd>{currentRead}</dd></div>
        <div><dt>Target</dt><dd>Slightly favorable</dd></div>
        <div><dt>Watching</dt><dd>{assetLabel}</dd></div>
        <div><dt>Notification</dt><dd>{targetReached ? "Not needed for this result" : "Telegram"}</dd></div>
      </dl>
      {targetReached ? (
        <div className="monitor-target-note" role="status">
          <p className="eyebrow">TARGET ALREADY REACHED</p>
          <p className="body-text">This decision is already slightly favorable, so Decision Watch has no later favorable change to wait for.</p>
        </div>
      ) : !isSignedIn ? (
        <div className="monitor-actions">
          <SignInButton mode="modal"><button type="button" className="cta-primary">Sign in to monitor <span aria-hidden="true">↗</span></button></SignInButton>
          <p className="secondary-text">Your guest research will be claimed safely after sign-in.</p>
        </div>
      ) : (
        <div className="monitor-actions">
          {claiming && <p className="secondary-text" role="status">Saving this research to your account...</p>}
          {claimMessage && <p className="secondary-text" role="status">{claimMessage}</p>}
          {deepLink && <a className="button-secondary" href={deepLink} target="_blank" rel="noopener noreferrer">Open Telegram <span aria-hidden="true">↗</span></a>}
          <div className="monitor-action-row">
            <button type="button" className="button-secondary" onClick={connectTelegram} disabled={connecting || watching}>{connecting ? "Preparing Telegram..." : "Connect Telegram"}</button>
            <button type="button" className="cta-primary" onClick={startWatching} disabled={watching || claiming}>{watching ? "Starting watch..." : "Start monitoring"}</button>
          </div>
          {message && <p className="secondary-text" role="status">{message}</p>}
        </div>
      )}
    </section>
  );
}
