import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Connectivity check only: does not claim that schema, login or workers are ready. */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const headers = { "Cache-Control": "no-store" };
  if (!url || !key) {
    return NextResponse.json({ connected: false, reason: "not_configured" }, { status: 503, headers });
  }
  try {
    const response = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: key },
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    if (!response.ok) {
      return NextResponse.json({ connected: false, reason: "upstream_unavailable" }, { status: 503, headers });
    }
    return NextResponse.json({ connected: true, scope: "supabase_api", musicGenerationEnabled: false }, { headers });
  } catch {
    return NextResponse.json({ connected: false, reason: "connection_failed" }, { status: 503, headers });
  }
}
