export type AccountControlState = "disabled" | "loading" | "signed-out" | "signed-in" | "unavailable";

export function resolveAccountControlState({
  enabled,
  isLoaded,
  isSignedIn,
  timedOut,
}: {
  enabled: boolean;
  isLoaded: boolean;
  isSignedIn: boolean | undefined;
  timedOut: boolean;
}): AccountControlState {
  if (!enabled) return "disabled";
  if (!isLoaded) return timedOut ? "unavailable" : "loading";
  return isSignedIn ? "signed-in" : "signed-out";
}
