import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: "Search grounding is disabled in this non-operational prototype. No provider request was made.",
      capability: "unavailable",
      productionReady: false,
    },
    { status: 503 }
  );
}
