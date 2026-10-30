import { NextResponse, type NextRequest } from "next/server";
import { runOrderDeadlines } from "@/lib/scheduled";

// The scheduled job, every 15 minutes. Vercel Cron (or pg_cron) calls it with
// the CRON_SECRET.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  return NextResponse.json(await runOrderDeadlines());
}
