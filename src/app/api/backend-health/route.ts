import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const backendUrl = process.env.ISIE_BACKEND_URL;
  if (!backendUrl) {
    return NextResponse.json(
      { status: "unavailable", reason: "Backend URL is not configured.", productionReady: false },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const response = await fetch(new URL("/health", backendUrl), {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) {
      return NextResponse.json(
        { status: "unavailable", reason: "Backend health check failed.", productionReady: false },
        { status: 502, headers: { "Cache-Control": "no-store" } }
      );
    }
    const health = await response.json();
    return NextResponse.json(
      {
        status: "limited",
        productionReady: false,
        authenticationConfigured: health.authenticationConfigured === true,
        persistenceConfigured: health.persistenceConfigured === true,
        persistenceHealthy: health.persistenceHealthy === true,
        auditIntegrity: health.auditIntegrity === true
          ? "valid"
          : health.auditIntegrity === false
          ? "invalid"
          : "unavailable",
        providersConfigured: health.providersConfigured === true,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { status: "unavailable", reason: "Backend could not be reached.", productionReady: false },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    );
  }
}
