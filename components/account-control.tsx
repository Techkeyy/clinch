"use client";

import { useCallback, useEffect, useState } from "react";
import { Show, SignInButton, UserButton, useAuth } from "@clerk/nextjs";
import { readRecentIds } from "@/lib/recent";
import { resolveResearchSurfaceState, type ResearchOwnership } from "@/lib/research-ownership";

const enabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export function AccountControl() {
  if (!enabled) return null;
  return <div className="account-control" aria-label="Account"><Show when="signed-out"><SignInButton mode="modal"><button type="button" className="text-nav-link">Sign in</button></SignInButton></Show><Show when="signed-in"><UserButton /></Show></div>;
}

export function SaveResearchPrompt({ sessionId }: { sessionId: string | null }) {
  const { isLoaded, isSignedIn } = useAuth();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [ownership, setOwnership] = useState<ResearchOwnership | null>(null);

  const refreshOwnership = useCallback(async () => {
    if (!enabled || !isLoaded || !sessionId) {
      setOwnership(null);
      return;
    }
    try {
      const response = await fetch("/api/session?id=" + encodeURIComponent(sessionId), { cache: "no-store" });
      if (!response.ok) {
        setOwnership(null);
        return;
      }
      const data = await response.json() as { session?: { ownership?: ResearchOwnership } };
      setOwnership(data.session?.ownership === "account" ? "account" : data.session?.ownership === "guest" ? "guest" : null);
    } catch {
      setOwnership(null);
    }
  }, [isLoaded, isSignedIn, sessionId]);

  useEffect(() => {
    void refreshOwnership();
  }, [refreshOwnership]);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const sessionIds = Array.from(new Set([sessionId, ...readRecentIds()].filter((id): id is string => Boolean(id)))).slice(0, 10);
      const res = await fetch("/api/account/claim", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionIds }) });
      const data = await res.json() as { claimed?: number };
      if (res.ok && (data.claimed ?? 0) > 0) {
        setOwnership("account");
        setMessage("Saved privately to your CLINCH account.");
      } else if (res.ok) {
        await refreshOwnership();
      } else {
        setMessage("We could not save this research yet.");
      }
    } catch {
      setMessage("We could not save this research yet.");
    } finally {
      setSaving(false);
    }
  };

  if (!enabled || !isLoaded || !sessionId || !ownership) return null;
  const surface = resolveResearchSurfaceState({ isSignedIn: Boolean(isSignedIn), ownership });

  if (surface === "guest-guest") {
    return <div className="account-save-prompt"><div><p className="eyebrow">STORED IN THIS BROWSER</p><p className="body-text">Stored privately in this browser.</p></div><SignInButton mode="modal"><button type="button" className="button-secondary">Sign in to save across devices</button></SignInButton></div>;
  }
  if (surface === "signed-in-guest") {
    return <div className="account-save-prompt"><div><p className="eyebrow">READY TO SAVE</p><p className="body-text">Save this research to your account.</p></div><button type="button" className="button-secondary" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save to account"}</button>{message && <p className="secondary-text" role="status">{message}</p>}</div>;
  }
  if (surface === "signed-in-account") {
    return <p className="account-save-state" role="status">Saved privately to your CLINCH account.</p>;
  }
  return null;
}
