import { clerkMiddleware, type ClerkMiddlewareOptions } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export const clerkMiddlewareOptions = {
  // Trim defensively: Clerk derives the session-cookie suffix as
  // base64url(SHA-1(publishableKey)) VERBATIM, while key parsing tolerates
  // pasted trailing whitespace (atob ignores it). An untrimmed value therefore
  // keeps working everywhere EXCEPT cookie selection, which silently desyncs
  // from the browser (session-token-and-uat-missing). Trimming is a no-op for
  // clean values.
  publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim(),
  authorizedParties: ["https://clinch-nine.vercel.app"],
  frontendApiProxy: {
    enabled: true,
  },
  contentSecurityPolicy: {
    strict: true,
    directives: {
      "base-uri": ["'self'"],
      "frame-ancestors": ["'none'"],
      "form-action": ["'self'"],
      "object-src": ["'none'"],
    },
  },
} satisfies ClerkMiddlewareOptions;

const handler = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY
  ? clerkMiddleware(clerkMiddlewareOptions)
  : () => NextResponse.next();

export default handler;

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|png|jpg|jpeg|gif|svg|ico|webp|avif|woff2?|ttf|map|txt|xml|pdf|zip)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
