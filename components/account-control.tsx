"use client";

import { useState } from "react";
import { Show, SignInButton, UserButton, useAuth } from "@clerk/nextjs";
import { readRecentIds } from "@/lib/recent";

const enabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export function AccountControl() {
  if (!enabled) return null;
  return <div className="account-control" aria-label="Account"><Show when="signed-out"><SignInButton mode="modal"><button type="button" className="text-nav-link">Sign in</button></SignInButton></Show><Show when="signed-in"><UserButton /></Show></div>;
}

export function SaveResearchPrompt({ sessionId }: { sessionId: string | null }) {
  const { isSignedIn } = useAuth();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  if (!enabled || !isSignedIn) return null;
  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const sessionIds = Array.from(new Set([sessionId, ...readRecentIds()].filter((id): id is string => Boolean(id)))).slice(0, 10);
      const res = await fetch("/api/account/claim", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionIds }) });
      const data = await res.json() as { claimed?: number };
      setMessage(res.ok ? `${data.claimed ?? 0} research ${data.claimed === 1 ? "session" : "sessions"} saved to your account.` : "We could not save this research yet.");
    } catch { setMessage("We could not save this research yet."); }
    finally { setSaving(false); }
  };
  return <div className="account-save-prompt"><div><p className="eyebrow">KEEP YOUR WORK</p><p className="body-text">Sign in to keep your CLINCH research across devices.</p></div><button type="button" className="button-secondary" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save browser research"}</button>{message && <p className="secondary-text" role="status">{message}</p>}</div>;
}
