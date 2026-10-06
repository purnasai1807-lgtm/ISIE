import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: "Audio transcription is disabled in this non-operational prototype. No audio was accepted or uploaded.",
      capability: "unavailable",
      productionReady: false,
    },
    { status: 503 }
  );
}
