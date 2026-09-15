import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const handler = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY
  ? clerkMiddleware()
  : () => NextResponse.next();

export default handler;

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|png|jpg|jpeg|gif|svg|ico|webp|avif|woff2?|ttf|map|txt|xml|pdf|zip)).*)",
    "/(api|trpc)(.*)",
  ],
};
