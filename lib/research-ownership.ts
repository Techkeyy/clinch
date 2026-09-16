export type ResearchOwnership = "guest" | "account";

export type ResearchSurfaceState =
  | "loading"
  | "guest-guest"
  | "signed-in-guest"
  | "signed-in-account"
  | "signed-out-account";

export function resolveResearchSurfaceState(input: {
  isSignedIn: boolean;
  ownership: ResearchOwnership | null;
}): ResearchSurfaceState {
  if (!input.ownership) return "loading";
  if (input.ownership === "account") {
    return input.isSignedIn ? "signed-in-account" : "signed-out-account";
  }
  return input.isSignedIn ? "signed-in-guest" : "guest-guest";
}
